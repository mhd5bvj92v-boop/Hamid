// Creative Director Studio API (a Vite plugin: one local server for the UI,
// the media files and the Remotion renderer). Every route reads or writes the
// project document remotion-app/src/projects/<slug>/edit.json.
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import type { Concept, ConceptOption, CreativeSegment, EditDoc, SfxItem } from "../../src/kit/project";
import { GAIN_PRESETS, OPEN_REQUEST, detectFormat, normalizeDoc, parseTranscript, validateTranscript } from "../../src/kit/project";
import type { SoundMeta } from "../../src/kit/studio";
import type { DocPatch } from "../../src/kit/patch";
import { applyPatch } from "../../src/kit/patch";
import { draftConcepts } from "./drafts";
import { APP, getBundle, media, still } from "./render";

const SKILL = path.resolve(APP, "..", ".claude", "skills", "video-editing");
const SCRIPTS = path.join(SKILL, "scripts");
const PROJECTS = path.join(APP, "src", "projects");
const now = () => new Date().toISOString().slice(0, 19);

// ------------------------------------------------------------------ helpers
const send = (res: ServerResponse, code: number, body: unknown) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};
const body = (req: IncomingMessage) =>
  new Promise<Record<string, unknown>>((ok, bad) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      try {
        ok(s ? JSON.parse(s) : {});
      } catch (e) {
        bad(e);
      }
    });
  });
// The scripts read and write UTF-8 (edit.json, logs); Windows would otherwise use its ANSI code page.
const childEnv = { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" };
const run = (cmd: string, args: string[], cwd = APP) =>
  new Promise<{ code: number; out: string }>((ok) => {
    const p = spawn(cmd, args, { cwd, env: childEnv });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("error", (e) => ok({ code: 1, out: String(e.message) }));
    p.on("close", (code) => ok({ code: code ?? 1, out }));
  });
// Python 3 under its usual name on this system: $PYTHON, else `py -3` / `python` on Windows (where
// `python3` is often only the Microsoft Store shortcut), else `python3`.
let python: string[] | null = null;
const findPython = () => {
  if (python) return python;
  const tries = [
    ...(process.env.PYTHON ? [[process.env.PYTHON]] : []),
    ...(process.platform === "win32" ? [["py", "-3"], ["python"], ["python3"]] : [["python3"], ["python"]]),
  ];
  for (const t of tries) {
    const r = spawnSync(t[0], [...t.slice(1), "--version"], { encoding: "utf8" });
    if (r.status === 0 && /^Python 3\./.test(`${r.stdout}${r.stderr}`.trim())) return (python = t);
  }
  throw new Error(
    "Python 3 was not found. Install it from python.org (tick \"Add python.exe to PATH\"), run `python -m pip install numpy pillow`, then restart the Studio. " +
      "To use a specific Python, set the PYTHON environment variable to its path.",
  );
};
const py = (script: string, args: string[]) => {
  const [cmd, ...pre] = findPython();
  return run(cmd, [...pre, path.join(SCRIPTS, script), ...args]);
};
// tsx through node itself: `npx` is a .cmd file on Windows, which spawn cannot start without a shell
const tsx = (args: string[]) => run(process.execPath, [path.join(APP, "node_modules", "tsx", "dist", "cli.mjs"), ...args]);
/** edit_decisions.py: requests, decisions, reviews (one implementation for the Studio and Claude Code). Text is passed as --opt=value, verbatim. */
const decisions = async (args: string[]) => {
  const r = await py("edit_decisions.py", args);
  if (r.code) throw new Error(r.out.trim().split("\n").filter((l) => !l.startsWith("WARN")).slice(-3).join(" "));
  return r.out.trim();
};

// The kit's timing registry grows when Claude Code adds kinds (src/kit/custom/): load it through
// Vite on every use, so the server always knows the current kinds (no restart needed).
let vite: ViteDevServer | null = null;
type Kit = typeof import("../../src/kit/studio") & typeof import("../../src/kit/timing");
const kit = async (): Promise<Kit> => {
  if (!vite) throw new Error("server not ready");
  // "/@fs/<absolute path>" with forward slashes (Windows: /@fs/C:/Users/...)
  const id = (f: string) => "/@fs/" + path.join(APP, "src", "kit", f).replace(/\\/g, "/").replace(/^\//, "");
  const studio = await vite.ssrLoadModule(id("studio.ts"));
  const timing = await vite.ssrLoadModule(id("timing.ts"));
  return { ...studio, ...timing } as Kit;
};

const docPath = (slug: string) => path.join(PROJECTS, slug, "edit.json");
const readDoc = (slug: string): EditDoc => normalizeDoc(JSON.parse(readFileSync(docPath(slug), "utf8")));
const diskRev = (slug: string) => (JSON.parse(readFileSync(docPath(slug), "utf8")) as EditDoc).rev ?? 0;
class Conflict extends Error {}
/** Atomic, and refused if edit.json changed since `doc` was read (Claude Code / the CLI write the same file). */
const writeDoc = (slug: string, doc: EditDoc) => {
  const cur = diskRev(slug);
  if ((doc.rev ?? 0) !== cur) throw new Conflict(`edit.json changed outside the Studio (rev ${doc.rev} -> ${cur}), e.g. Claude Code processed a request`);
  doc.rev = cur + 1;
  doc.updated = now();
  const tmp = docPath(slug) + `.tmp${process.pid}`;
  writeFileSync(tmp, JSON.stringify(doc, null, 1) + "\n");
  renameSync(tmp, docPath(slug));
};
const manifest = (slug: string) => {
  const p = path.join(APP, "..", "work", slug, "project.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};
const workDir = (slug: string) => manifest(slug)?.work ?? path.join(APP, "..", "work", slug);
const syncLog = (slug: string) => py("edit_decisions.py", ["init", slug]); // regenerates CREATIVE-LOG.md from edit.json

const serveFile = (req: IncomingMessage, res: ServerResponse, file: string) => {
  if (!existsSync(file)) return send(res, 404, { error: "not found" });
  const size = statSync(file).size;
  const ext = path.extname(file).toLowerCase();
  const type = { ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".webm": "video/webm", ".md": "text/markdown" }[ext] ?? "application/octet-stream";
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", type);
  // the Remotion renderer's bundle runs on another local port and fetches sounds from here
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : 0;
    const end = range[2] ? parseInt(range[2], 10) : size - 1;
    res.statusCode = 206;
    res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
    res.setHeader("Content-Length", end - start + 1);
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.setHeader("Content-Length", size);
    createReadStream(file).pipe(res);
  }
};

// sound library (data/sounds.json, indexed in place by sfx_index.py)
type LibSound = { id: string; path: string; category: string; role?: string; metrics: { duration: number; peak_time: number; onset_time: number } };
const soundLib = (): LibSound[] => {
  const p = process.env.VV_SOUNDS_JSON ?? path.join(SKILL, "data", "sounds.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).sounds : [];
};
const soundMeta = (origin: string): Record<string, SoundMeta> =>
  Object.fromEntries(soundLib().map((s) => [s.id, { id: s.id, url: `${origin}/api/sound/${s.id}`, duration: s.metrics.duration, peak_time: s.metrics.peak_time, onset_time: s.metrics.onset_time, category: s.category, role: s.role }]));
const FAMILY_CATS: Record<string, string[]> = { whoosh: ["WSH"], texture: ["POP", "UI", "SCI", "MEC", "TEX"], riser: ["RIS"], hit: ["HIT"] };
const pickSound = (family: string, roles: string[] = []) => {
  const lib = soundLib();
  return (lib.find((s) => s.role && roles.includes(s.role)) ?? lib.find((s) => FAMILY_CATS[family]?.includes(s.category)))?.id ?? null;
};

const references = () => JSON.parse(readFileSync(path.join(SKILL, "data", "references.json"), "utf8")).references as {
  id: string; title: string; category: string; family: string; tags: string[]; file: string;
}[];

// ------------------------------------------------------------------ jobs (renders)
type Job = { id: string; slug: string; type: string; status: "running" | "done" | "error"; progress: number; log: string[]; outputs: Record<string, string>; started: string };
const jobs = new Map<string, Job>();
const newJob = (slug: string, type: string) => {
  const j: Job = { id: `${type}-${Date.now()}`, slug, type, status: "running", progress: 0, log: [], outputs: {}, started: now() };
  jobs.set(j.id, j);
  return j;
};

const nextVersion = (dir: string, prefix: string) => {
  mkdirSync(dir, { recursive: true });
  const n = readdirSync(dir).filter((f) => f.startsWith(prefix)).length;
  return n + 1;
};

const finalExport = async (j: Job, slug: string, origin: string) => {
  const doc = readDoc(slug);
  const K = await kit();
  if (doc.source.scriptOnly) throw new Error("Script-only project: attach your cut first (the final export needs the original footage and dialogue).");
  if (!doc.approvals.some((a) => a.gate === "final")) throw new Error("PHASE 5 GATE: the final export needs the Creative Director's explicit final approval (Approve final).");
  const waiting = (doc.requests ?? []).filter((r) => (r.type === "implement" || r.type === "revision") && OPEN_REQUEST.includes(r.status));
  if (waiting.length) throw new Error(`Animations still waiting for Claude Code: ${waiting.map((r) => `${r.segmentId} (${r.id})`).join(", ")}. Process or cancel them first.`);
  const errs = K.docErrors(doc);
  if (errs.length) throw new Error(errs.join("; "));
  const wd = workDir(slug);
  // Remotion-first: the final MP4 is the Remotion composition itself - original footage (dialogue at unity),
  // every animation layer and every sound effect, placed and mixed by Remotion. FFmpeg tools only inspect it.
  j.log.push("1/3 timeline windows (export-sfx, used by the QC)...");
  const ex = await tsx(["scripts/export-sfx.ts", slug, path.join(wd, "sound")]);
  if (ex.code) throw new Error("export-sfx failed: " + ex.out);
  const lib = soundMeta(origin);
  const audio = K.resolveAudio(doc, lib);
  const missing = doc.sfx.filter((s) => s.enabled && !s.sound).length;
  const v = nextVersion(path.join(wd, "renders"), "final_v");
  const out = path.join(wd, "renders", `final_v${v}.mp4`);
  j.log.push(`2/3 Remotion: rendering the final composition (footage + ${doc.beats.length} animation layer(s) + ${audio.length} sound effect(s)${missing ? `; ${missing} without a sound asset, not added` : ""})...`);
  await media({ doc, layers: "all", concept: null, audio }, out, { final: true, onProgress: (p) => (j.progress = 0.05 + 0.8 * p) });
  const placed = audio.map((p) => {
    const snd = lib[doc.sfx.find((x) => x.id === p.id)!.sound!];
    return { id: p.id, start: +p.start.toFixed(5), end: +(p.start + Math.max(0.05, snd.duration - p.clipIn)).toFixed(5), eventTime: +p.eventTime.toFixed(5), gainDb: p.gainDb };
  });
  const sfxJson = out.replace(/\.mp4$/, "_sfx.json");
  writeFileSync(sfxJson, JSON.stringify(placed, null, 1));
  j.outputs.render = out;
  j.outputs.sfx = sfxJson;
  j.progress = 0.88;
  j.log.push("3/3 edit_qc: timeline, duration, frames, dialogue untouched, effects present, no clipping...");
  const eq = await py("edit_qc.py", [slug, "--final", out, "--sfx", sfxJson]);
  j.log.push(eq.out.trim().split("\n").slice(-3).join("\n"));
  j.outputs.editQc = String(eq.code);
  if (eq.code) throw new Error("QC failed - see the log (the file exists but must not be delivered)");
  j.outputs.final = out; // only a render that passed QC is offered as the final
  void origin;
};

// ------------------------------------------------------------------ routes
type Ctx = { req: IncomingMessage; res: ServerResponse; m: RegExpMatchArray; origin: string };
const routes: [string, RegExp, (c: Ctx) => Promise<unknown> | unknown][] = [
  ["GET", /^\/api\/projects$/, () =>
    existsSync(PROJECTS)
      ? readdirSync(PROJECTS).filter((d) => existsSync(docPath(d))).map((slug) => {
          const d = readDoc(slug);
          return { slug, duration: d.source.sourceDurationSeconds, fps: d.source.fps, segments: d.segments.length, beats: d.beats.length,
            scriptOnly: !!d.source.scriptOnly, openRequests: (d.requests ?? []).filter((r) => OPEN_REQUEST.includes(r.status)).length };
        })
      : []],
  ["POST", /^\/api\/projects$/, async ({ req }) => {
    const b = await body(req);
    const args = b.scriptOnly ? ["--script-only", "--slug", String(b.slug), "--duration", String(b.duration)] : [String(b.footage), "--slug", String(b.slug)];
    if (b.fps) args.push("--fps", String(b.fps));
    if (b.fit) args.push("--fit", "cover");
    const r = await py("edit_init.py", args);
    if (r.code) throw new Error(r.out);
    return { out: r.out, doc: readDoc(String(b.slug)) };
  }],
  ["GET", /^\/api\/project\/([\w-]+)$/, async ({ m }) => {
    const doc = readDoc(m[1]);
    return { doc, issues: validateTranscript(doc.transcript.segments, doc.source.sourceDurationSeconds), errors: (await kit()).docErrors(doc), manifest: manifest(m[1]) };
  }],
  // the Studio polls this to pick up what Claude Code wrote (no reload needed)
  ["GET", /^\/api\/project\/([\w-]+)\/rev$/, ({ m }) => {
    const d = readDoc(m[1]);
    return { rev: d.rev ?? 0, updated: d.updated, open: (d.requests ?? []).filter((r) => OPEN_REQUEST.includes(r.status)).length };
  }],
  // The Studio's saves: the user's field-level changes applied to the current file (never a whole document)
  ["PATCH", /^\/api\/project\/([\w-]+)$/, async ({ req, m }) => {
    const b = await body(req);
    const disk = readDoc(m[1]);
    const patch = b.patch as DocPatch;
    // a "new" scene whose id already belongs to a different scene would overwrite it: refuse
    for (const [id, ch] of Object.entries(patch.segs ?? {})) {
      const d = ch.created && disk.segments.find((x) => x.id === id);
      if (d && JSON.stringify(d.transcriptIds) !== JSON.stringify(ch.created!.transcriptIds))
        throw new Error(`scene id ${id} is already used by another scene; reload the Studio and try again`);
    }
    const next = applyPatch(disk, patch);
    writeDoc(m[1], next);
    const doc = readDoc(m[1]);
    return { ok: true, rev: doc.rev, updated: doc.updated, doc, errors: (await kit()).docErrors(doc), issues: validateTranscript(doc.transcript.segments, doc.source.sourceDurationSeconds) };
  }],
  ["PUT", /^\/api\/project\/([\w-]+)$/, async ({ req, res, m }) => {
    const doc = normalizeDoc((await body(req)) as unknown as EditDoc);
    const disk = readDoc(m[1]);
    if ((doc.rev ?? 0) !== (disk.rev ?? 0)) {
      // someone else (Claude Code, the CLI) wrote edit.json since this copy was loaded: never overwrite it
      send(res, 409, { error: "edit.json was changed outside the Studio (for example Claude Code processed a request). The Studio reloaded it; redo your last change if it is missing.", doc: disk });
      return undefined;
    }
    // Scene fields owned by server actions and Claude Code (concepts, drafts, decisions, builds, plan
    // approvals) always come from disk: a UI save never undoes them. The UI owns times, type, words and plan text.
    const OWNED = ["concepts", "recommend", "history", "round", "drafts", "draftRound", "decision", "versions", "activeVersion", "review", "plan", "requests", "beatId"] as const;
    const onDisk = new Map(disk.segments.map((x) => [x.id, x]));
    doc.segments = doc.segments.map((x) => {
      const d = onDisk.get(x.id);
      if (!d) return x;
      const merged = { ...x } as Record<string, unknown>;
      for (const k of OWNED) merged[k] = (d as Record<string, unknown>)[k];
      // the user changed what an approved plan is about: it needs approving again
      if (d.plan?.status === "approved" && (x.sceneType !== d.sceneType || (x.onScreen ?? "") !== (d.onScreen ?? "") || x.text !== d.text || x.type !== d.type))
        merged.plan = { status: "draft" };
      return merged as unknown as CreativeSegment;
    });
    for (const d of disk.segments) if (!doc.segments.some((x) => x.id === d.id)) doc.segments.push(d);
    doc.segments.sort((x, y) => x.start - y.start);
    // the source, approvals and requests are not editable from the UI (approve/request actions change them)
    doc.source = disk.source;
    doc.approvals = disk.approvals;
    doc.requests = disk.requests;
    doc.nextRequest = disk.nextRequest;
    writeDoc(m[1], doc);
    return { ok: true, rev: doc.rev, updated: doc.updated, errors: (await kit()).docErrors(doc), issues: validateTranscript(doc.transcript.segments, doc.source.sourceDurationSeconds) };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/transcript$/, async ({ req, m }) => {
    const b = await body(req);
    const doc = readDoc(m[1]);
    if (doc.transcript.segments.length && !b.replace) throw new Error("a script is already imported - confirm replacing it");
    const raw = String(b.raw ?? "");
    const format = (b.format as never) ?? detectFormat(String(b.name ?? ""), raw);
    const segments = parseTranscript(format, raw);
    if (!segments.length) throw new Error("no lines found in the script");
    doc.transcript = { origin: "user-script", importedFrom: format, importedAt: now(), segments };
    writeDoc(m[1], doc);
    return { doc, issues: validateTranscript(segments, doc.source.sourceDurationSeconds) };
  }],
  ["GET", /^\/api\/references$/, ({ req }) => {
    const u = new URL(req.url ?? "", "http://x");
    const q = (u.searchParams.get("q") ?? "").toLowerCase().split(/\s+/).filter(Boolean);
    const cat = u.searchParams.get("cat");
    return references()
      .filter((r) => !cat || r.category === cat)
      .map((r) => ({ r, score: q.reduce((s, w) => s + (r.title.toLowerCase().includes(w) ? 2 : 0) + (r.tags.join(" ").toLowerCase().includes(w) ? 1 : 0) + (r.family.toLowerCase().includes(w) ? 1 : 0) + (r.id.toLowerCase() === w ? 5 : 0), 0) }))
      .filter((x) => !q.length || x.score > 0)
      .sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id))
      .slice(0, 60)
      .map(({ r }) => ({ id: r.id, title: r.title, category: r.category, family: r.family, tags: r.tags.slice(0, 6), img: `/api/refimg/${r.id}` }));
  }],
  ["GET", /^\/api\/refimg\/((?:ONS|TXT|FUL)-\d{3})$/, ({ req, res, m }) => {
    const r = references().find((x) => x.id === m[1]);
    if (!r) return send(res, 404, { error: "unknown reference" });
    serveFile(req, res, path.join(SKILL, r.file));
    return undefined;
  }],
  ["GET", /^\/api\/sounds$/, ({ origin }) => Object.values(soundMeta(origin))],
  ["GET", /^\/api\/sound\/([\w-]+)$/, ({ req, res, m }) => {
    const s = soundLib().find((x) => x.id === m[1]);
    if (!s) return send(res, 404, { error: "unknown sound" });
    serveFile(req, res, s.path);
    return undefined;
  }],
  // Quick Drafts: instant template variants (author "draft"), kept apart from Claude Concepts
  ["POST", /^\/api\/project\/([\w-]+)\/drafts$/, async ({ req, m }) => {
    const b = await body(req);
    const doc = readDoc(m[1]);
    const seg = doc.segments.find((s) => s.id === b.segmentId);
    if (!seg) throw new Error("unknown segment");
    const d = draftConcepts(seg);
    seg.draftRound = (seg.draftRound ?? 0) + 1;
    seg.drafts = { A: d.A, B: d.B, C: d.C };
    writeDoc(m[1], doc);
    await syncLog(m[1]);
    return { doc: readDoc(m[1]) };
  }],
  // "Generate with Claude" / "Regenerate concepts": a pending request in edit.json for Claude Code (no API call)
  ["POST", /^\/api\/project\/([\w-]+)\/claude-request$/, async ({ req, m }) => {
    const b = await body(req);
    const out = await decisions(["request", m[1], `--segment=${String(b.segmentId)}`, ...(b.note ? [`--note=${String(b.note)}`] : [])]);
    return { doc: readDoc(m[1]), out };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/cancel-request$/, async ({ req, m }) => {
    const b = await body(req);
    const out = await decisions(["cancel", m[1], `--request=${String(b.requestId)}`, `--reason=${String(b.reason ?? "cancelled in the Studio")}`]);
    return { doc: readDoc(m[1]), out };
  }],
  // Scene Planning: approve scene plans -> one build request per scene for Claude Code
  ["POST", /^\/api\/project\/([\w-]+)\/plan-approve$/, async ({ req, m }) => {
    const b = await body(req);
    const ids = ((b.segmentIds as string[]) ?? []).join(",");
    if (!ids) throw new Error("no scenes to approve");
    const out = await decisions(["plan-approve", m[1], `--segments=${ids}`, `--quote=${String(b.quote ?? "")}`]);
    await syncLog(m[1]);
    return { doc: readDoc(m[1]), out };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/review$/, async ({ req, m }) => {
    const b = await body(req);
    const args = ["review", m[1], `--segment=${String(b.segmentId)}`];
    if (b.action === "approve") args.push("--approve", ...(b.note ? [`--note=${String(b.note)}`] : []));
    else if (b.action === "changes") args.push(`--changes=${String(b.feedback ?? "")}`);
    else throw new Error("action must be approve or changes");
    const out = await decisions(args);
    return { doc: readDoc(m[1]), out };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/restore$/, async ({ req, m }) => {
    const b = await body(req);
    const out = await decisions(["restore", m[1], `--segment=${String(b.segmentId)}`, `--version=${Number(b.version)}`]);
    return { doc: readDoc(m[1]), out };
  }],
  // extra reference images for D (kept in work/<slug>/refs, never in git)
  ["POST", /^\/api\/project\/([\w-]+)\/upload$/, async ({ req, m }) => {
    const b = await body(req);
    const name = String(b.name ?? "image").replace(/[^\w.-]+/g, "_").slice(-80);
    if (!/\.(png|jpe?g|webp|gif)$/i.test(name)) throw new Error("images only (png, jpg, webp, gif)");
    const dir = path.join(workDir(m[1]), "refs");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}_${name}`);
    writeFileSync(file, Buffer.from(String(b.data ?? ""), "base64"));
    return { path: file, url: `/api/file/${m[1]}/refs/${path.basename(file)}` };
  }],
  // sounds indexed after the animation was built: fill the SFX that still have none (nothing is invented)
  ["POST", /^\/api\/project\/([\w-]+)\/assign-sounds$/, async ({ m }) => {
    const doc = readDoc(m[1]);
    let n = 0;
    for (const s of doc.sfx) {
      if (s.sound) continue;
      const id = pickSound(s.family);
      if (id) {
        s.sound = id;
        n++;
      }
    }
    if (n) writeDoc(m[1], doc);
    return { doc: readDoc(m[1]), assigned: n, missing: doc.sfx.filter((s) => !s.sound).length };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/concept-preview$/, async ({ req, m }) => {
    const b = await body(req);
    const slug = m[1];
    const doc = readDoc(slug);
    const K = await kit();
    const set = b.set === "draft" ? "draft" : "claude";
    const seg = doc.segments.find((s) => s.id === b.segmentId);
    const opt = String(b.option) as ConceptOption;
    const c = set === "draft" ? seg?.drafts?.[opt] : seg?.concepts[opt];
    if (!seg || !c?.kind || !(c.kind in K.kitTiming)) throw new Error("this concept has no Remotion component yet: it can be previewed after it is built");
    const beat = K.beatFromConcept(seg, c);
    const w = K.beatWindow(beat, K.kitTiming, doc.source.fps);
    const frame = Math.min(doc.source.durationInFrames - 1, w.from + w.durationInFrames - Math.max(2, Math.round(0.65 * doc.source.fps)));
    const dir = path.join(workDir(slug), "previews");
    mkdirSync(dir, { recursive: true });
    const name = `${seg.id}_${set}_${opt}_${Date.now() % 100000}.png`;
    await still({ doc, layers: "all", concept: { segmentId: seg.id, option: opt, set }, audio: null }, frame, path.join(dir, name), 0.5);
    const fresh = readDoc(slug);
    const s2 = fresh.segments.find((s) => s.id === seg.id)!;
    const c2 = set === "draft" ? s2.drafts?.[opt] : s2.concepts[opt];
    if (c2) c2.preview = `/api/file/${slug}/previews/${name}`;
    writeDoc(slug, fresh);
    return { doc: readDoc(slug), url: `/api/file/${slug}/previews/${name}`, frame };
  }],
  // A still of the segment's current timeline item (e.g. a Quick Draft), rendered by Remotion
  ["POST", /^\/api\/project\/([\w-]+)\/render-version$/, async ({ req, m }) => {
    const b = await body(req);
    const slug = m[1];
    const doc = readDoc(slug);
    const K = await kit();
    const seg = doc.segments.find((s) => s.id === b.segmentId);
    const beat = doc.beats.find((x) => x.segmentId === seg?.id);
    const ver = seg?.versions?.find((v) => v.v === seg.activeVersion);
    if (!seg || !beat || !ver) throw new Error("nothing built on this segment yet");
    const w = K.beatWindow(beat, K.kitTiming, doc.source.fps);
    const frame = Math.min(doc.source.durationInFrames - 1, w.from + w.durationInFrames - Math.max(2, Math.round(0.65 * doc.source.fps)));
    const name = `${seg.id}_v${ver.v}_${Date.now() % 100000}.png`;
    await still({ doc, layers: "all", concept: null, audio: null }, frame, path.join(workDir(slug), "previews", name), 0.5);
    const fresh = readDoc(slug);
    const v2 = fresh.segments.find((s) => s.id === seg.id)?.versions?.find((v) => v.v === ver.v);
    if (v2) v2.still = `/api/file/${slug}/previews/${name}`;
    writeDoc(slug, fresh);
    return { doc: readDoc(slug) };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/choose$/, async ({ req, m }) => {
    const b = await body(req);
    const slug = m[1];
    const option = String(b.option) as ConceptOption | "D";
    const set = option === "D" ? "own" : b.set === "draft" ? "draft" : "claude";
    if (set !== "draft") {
      // Claude Concepts and D: save the decision and create an implementation request for Claude Code
      if (option === "D" && !String(b.custom ?? "").trim()) throw new Error("describe your own idea (D)");
      const args = ["decide", slug, `--moments=${String(b.segmentId)}`, `--choice=${option}`];
      if (option === "D") {
        args.push(`--custom=${String(b.custom)}`); // exactly as typed
        if ((b.combine as string[] | undefined)?.length) args.push(`--combine=${(b.combine as string[]).join(",")}`);
        if (b.basedOn) args.push(`--based-on=${String(b.basedOn)}`);
        if ((b.refs as string[] | undefined)?.length) args.push(`--refs=${(b.refs as string[]).join(",")}`);
        if ((b.uploads as string[] | undefined)?.length) args.push(`--uploads=${(b.uploads as string[]).join(",")}`);
      }
      if (b.quote) args.push(`--quote=${String(b.quote)}`);
      const out = await decisions(args);
      await syncLog(slug);
      return { doc: readDoc(slug), built: false, awaitingClaude: true, out };
    }
    // Quick Draft: a template the kit already has, built on the timeline immediately
    const doc = readDoc(slug);
    const K = await kit();
    const seg = doc.segments.find((s) => s.id === b.segmentId) as CreativeSegment | undefined;
    if (!seg) throw new Error("unknown segment");
    const concept: Concept | undefined = seg.drafts?.[option as ConceptOption];
    if (!concept) throw new Error(`no Quick Draft ${option}`);
    const prev = seg.decision;
    if (prev && (prev.choice !== option || prev.source !== "draft") && doc.approvals.some((a) => a.gate === "direction"))
      doc.approvals = doc.approvals.filter((a) => a.gate !== "direction" && a.gate !== "preview" && a.gate !== "final");
    for (const r of doc.requests ?? [])
      if (r.segmentId === seg.id && (r.type === "implement" || r.type === "revision") && OPEN_REQUEST.includes(r.status)) {
        r.status = "cancelled";
        r.result = "superseded: a Quick Draft was chosen in the Studio";
        r.updated = now();
      }
    seg.decision = { choice: option as ConceptOption, round: seg.draftRound ?? 1, decided: now(), source: "draft", quote: b.quote ? String(b.quote) : undefined };
    doc.beats = doc.beats.filter((x) => x.segmentId !== seg.id);
    doc.sfx = doc.sfx.filter((s) => s.segmentId !== seg.id);
    let beat = null;
    let sfx: SfxItem[] = [];
    if (concept.kind) {
      beat = K.beatFromConcept(seg, concept);
      sfx = K.sfxForBeat(beat, doc.source.fps).map((s) => ({ ...s, sound: pickSound(s.family) }));
    } else if (concept.sfx) {
      sfx = concept.sfx.map((c, i) => ({ id: `${seg.id}-snd${i + 1}`, family: c.family, link: { time: c.at === "start" ? seg.start : c.at === "end" ? seg.end : seg.start + c.at },
        sound: pickSound(c.family, c.roles), gainDb: GAIN_PRESETS[c.family].db, offsetFrames: 0, enabled: true, label: c.label, segmentId: seg.id }));
    }
    if (beat) doc.beats.push(beat as never);
    doc.sfx.push(...sfx);
    seg.beatId = beat?.id ?? null;
    doc.beats.sort((a, b2) => a.at - b2.at);
    if (beat) {
      seg.versions ??= [];
      const v = seg.versions.length + 1;
      // only recorded as built once Remotion has rendered it inside the full composition
      const w = K.beatWindow(beat, K.kitTiming, doc.source.fps);
      const frame = Math.min(doc.source.durationInFrames - 1, w.from + w.durationInFrames - Math.max(2, Math.round(0.65 * doc.source.fps)));
      const name = `${seg.id}_v${v}_${Date.now() % 100000}.png`;
      mkdirSync(path.join(workDir(slug), "previews"), { recursive: true });
      await still({ doc, layers: "all", concept: null, audio: null }, frame, path.join(workDir(slug), "previews", name), 0.5);
      seg.versions.push({ v, at: now(), source: "draft", requestId: null, beat: beat as never, sfx, status: "built", notes: `Quick Draft ${option}: ${concept.title} (template)`,
        still: `/api/file/${slug}/previews/${name}` });
      seg.activeVersion = v;
      seg.review = null;
    }
    writeDoc(slug, doc);
    await syncLog(slug);
    return { doc: readDoc(slug), built: Boolean(beat || sfx.length), awaitingClaude: false };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/approve$/, async ({ req, m }) => {
    const b = await body(req);
    const r = await py("edit_decisions.py", ["approve", m[1], "--gate", String(b.gate), "--quote", String(b.quote ?? "")]);
    if (r.code) throw new Error(r.out.trim().split("\n").pop());
    return { doc: readDoc(m[1]), out: r.out };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/feedback$/, async ({ req, m }) => {
    const b = await body(req);
    const args = ["feedback", m[1], "--quote", String(b.quote ?? "")];
    for (const c of (b.changes as string[]) ?? []) args.push("--change", c);
    const r = await py("edit_decisions.py", args);
    if (r.code) throw new Error(r.out);
    return { doc: readDoc(m[1]) };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/render$/, async ({ req, m, origin }) => {
    const b = await body(req);
    const slug = m[1];
    const type = String(b.type ?? "preview");
    const j = newJob(slug, type);
    (async () => {
      try {
        if (type === "final") {
          await finalExport(j, slug, origin);
        } else {
          const doc = readDoc(slug);
          const audio = (await kit()).resolveAudio(doc, soundMeta(origin));
          const dir = path.join(workDir(slug), "previews");
          const v = nextVersion(dir, "preview_v");
          const out = path.join(dir, `preview_v${v}.mp4`);
          const range = (b.frameRange as [number, number]) ?? null;
          j.log.push(`Remotion: half-resolution preview${range ? ` frames ${range[0]}-${range[1]}` : ""} with dialogue + ${audio.length} draft sound(s)...`);
          await media({ doc, layers: "all", concept: null, audio }, out, { scale: Number(b.scale ?? 0.5), frameRange: range, onProgress: (p) => (j.progress = p) });
          j.outputs.preview = out;
          j.outputs.url = `/api/file/${slug}/previews/preview_v${v}.mp4`;
        }
        j.status = "done";
        j.progress = 1;
      } catch (e) {
        j.status = "error";
        j.log.push(String((e as Error).message ?? e));
      }
    })();
    return { job: j.id };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/proxy$/, async ({ m }) => {
    // Player-only preview proxy: VP9/Opus WebM, same frame rate, same duration, every frame kept.
    const slug = m[1];
    const doc = readDoc(slug);
    if (doc.source.scriptOnly) throw new Error("script-only project: there is no footage to make a proxy of yet");
    const src = manifest(slug).source.path as string;
    const dir = path.join(workDir(slug), "proxy");
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, "source_proxy.webm");
    const fps = String(doc.source.fps);
    const r = await run("ffmpeg", ["-v", "error", "-y", "-i", src, "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=540:-2", "-r", fps, "-c:v", "libvpx-vp9", "-deadline", "realtime",
      "-cpu-used", "8", "-row-mt", "1", "-b:v", "1500k", "-g", "15", "-c:a", "libopus", "-b:a", "96k", out]);
    if (r.code) throw new Error(r.out);
    const probe = await run("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames:format=duration", "-of", "json", out]);
    const pj = JSON.parse(probe.out);
    const frames = Number(pj.streams?.[0]?.nb_read_frames);
    const dur = Number(pj.format?.duration);
    if (Math.abs(frames - doc.source.durationInFrames) > 1 || Math.abs(dur - doc.source.sourceDurationSeconds) > 1 / doc.source.fps + 0.05)
      throw new Error(`proxy does not match the source timeline (${frames} frames / ${dur.toFixed(3)} s vs ${doc.source.durationInFrames} / ${doc.source.sourceDurationSeconds})`);
    const link = path.join(APP, "public", "projects", slug, "proxy");
    rmSync(link, { force: true, recursive: false });
    symlinkSync(path.resolve(dir), link, process.platform === "win32" ? "junction" : "dir"); // a junction needs no admin rights on Windows
    (doc.source as { previewSrc?: string }).previewSrc = `projects/${slug}/proxy/source_proxy.webm`;
    writeDoc(slug, doc);
    return { doc, frames, duration: dur };
  }],
  ["GET", /^\/api\/jobs\/([\w-]+)$/, ({ m }) => jobs.get(m[1]) ?? { status: "unknown" }],
  ["POST", /^\/api\/rebundle$/, async () => ({ url: await getBundle() })],
  ["GET", /^\/api\/file\/([\w-]+)\/(.+)$/, ({ req, res, m }) => {
    const wd = path.resolve(workDir(m[1]));
    const f = path.resolve(wd, decodeURIComponent(m[2]).split("?")[0]);
    if (!f.startsWith(wd + path.sep)) return send(res, 403, { error: "outside the project work folder" });
    serveFile(req, res, f);
    return undefined;
  }],
];

export const studioApi = (): Plugin => ({
  name: "creative-director-studio-api",
  configureServer(server) {
    vite = server;
    // a failing background render must not take the Studio down
    if (!process.listenerCount("unhandledRejection")) {
      process.on("unhandledRejection", (e) => server.config.logger.error(`[studio] background error: ${String((e as Error)?.message ?? e)}`));
    }
    server.middlewares.use(async (req, res, next) => {
      const url = (req.url ?? "").split("#")[0];
      if (!url.startsWith("/api/")) return next();
      const pathOnly = url.split("?")[0];
      const hit = routes.find(([method, re]) => method === req.method && re.test(pathOnly));
      if (!hit) return send(res, 404, { error: `no route ${req.method} ${pathOnly}` });
      const m = pathOnly.match(hit[1])!;
      const origin = `http://${req.headers.host ?? "localhost:3010"}`;
      try {
        const out = await hit[2]({ req, res, m, origin });
        if (out !== undefined && !res.writableEnded) send(res, 200, out);
      } catch (e) {
        if (!res.writableEnded) send(res, e instanceof Conflict ? 409 : 400, { error: String((e as Error).message ?? e) });
      }
    });
  },
});
