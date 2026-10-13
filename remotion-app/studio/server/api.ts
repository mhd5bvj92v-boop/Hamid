// Creative Director Studio API (a Vite plugin: one local server for the UI,
// the media files and the Remotion renderer). Every route reads or writes the
// project document remotion-app/src/projects/<slug>/edit.json.
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";
import type { Concept, CreativeSegment, EditDoc, SfxItem } from "../../src/kit/project";
import { ANCHOR, GAIN_PRESETS, detectFormat, parseTranscript, validateTranscript } from "../../src/kit/project";
import { SoundMeta, beatFromConcept, docErrors, resolveAudio, sfxEventTime, sfxForBeat } from "../../src/kit/studio";
import { beatWindow, kitTiming } from "../../src/kit/timing";
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
const run = (cmd: string, args: string[], cwd = APP) =>
  new Promise<{ code: number; out: string }>((ok) => {
    const p = spawn(cmd, args, { cwd, env: process.env });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => ok({ code: code ?? 1, out }));
  });
const py = (script: string, args: string[]) => run("python3", [path.join(SCRIPTS, script), ...args]);

const docPath = (slug: string) => path.join(PROJECTS, slug, "edit.json");
const readDoc = (slug: string): EditDoc => JSON.parse(readFileSync(docPath(slug), "utf8"));
const writeDoc = (slug: string, doc: EditDoc) => {
  doc.updated = now();
  writeFileSync(docPath(slug), JSON.stringify(doc, null, 1) + "\n");
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
  if (!doc.approvals.some((a) => a.gate === "final")) throw new Error("PHASE 5 GATE: the final export needs the Creative Director's explicit final approval (Approve final).");
  const errs = docErrors(doc);
  if (errs.length) throw new Error(errs.join("; "));
  const wd = workDir(slug);
  const picture = path.join(wd, "renders", "picture.mp4");
  mkdirSync(path.dirname(picture), { recursive: true });
  j.log.push("1/5 Remotion: rendering the full-resolution picture (StudioEdit, edit.json)...");
  await media({ doc, layers: "all", concept: null, audio: null }, picture, { final: true, onProgress: (p) => (j.progress = 0.05 + 0.6 * p) });
  j.outputs.picture = picture;
  j.log.push("2/5 timeline + sound intents (export-sfx)...");
  const ex = await run("npx", ["--no-install", "tsx", "scripts/export-sfx.ts", slug, path.join(wd, "sound")]);
  j.log.push(ex.out.trim());
  if (ex.code) throw new Error("export-sfx failed");
  j.progress = 0.7;
  // cue sheet from the Studio's SFX track (same anchor rule as the Player)
  const timeline = JSON.parse(readFileSync(path.join(wd, "sound", "timeline.json"), "utf8"));
  const pass: Record<string, number> = { whoosh: 1, texture: 2, riser: 3, hit: 3 };
  const cues = doc.sfx
    .filter((s) => s.enabled && s.sound)
    .flatMap((s) => {
      const t = sfxEventTime(doc, s);
      if (t === null) return [];
      const p = GAIN_PRESETS[s.family];
      const outside = s.gainDb < p.min - 1e-6 || s.gainDb > p.max + 1e-6;
      return [{ id: s.id, pass: pass[s.family], family: s.family, t: +t.toFixed(5), sound: s.sound, gain_db: s.gainDb, anchor: ANCHOR[s.family],
        event: s.label, auditioned: [s.sound], link: { event_t: +t.toFixed(5), what: s.label }, ...(outside ? { gain_override_reason: s.gainReason || "set in the Studio" } : {}) }];
    });
  const cueSheet = { video: picture, dialogue: { file: manifest(slug).source.path, gain_db: 0 }, hook_end: doc.hookEnd, fullscreen_windows: timeline.fullscreen_windows,
    graphic_windows: [], music: null, mix: { ceiling_dbfs: -1.0 }, cues };
  const cuesPath = path.join(wd, "sound", "cues_studio.json");
  writeFileSync(cuesPath, JSON.stringify(cueSheet, null, 1));
  const v = nextVersion(path.join(wd, "sound"), "final_v");
  const outDir = path.join(wd, "sound", `final_v${v}`);
  j.log.push(`3/5 System D mix (${cues.length} sound effects, dialogue from the original, untouched) -> ${outDir}`);
  const mix = await py("sound_mix.py", [cuesPath, "--out", outDir, "--passes", "1,2,3"]);
  j.log.push(mix.out.trim());
  if (mix.code) throw new Error("sound_mix failed");
  j.progress = 0.85;
  j.log.push("4/5 sound_qc...");
  const sq = await py("sound_qc.py", [outDir]);
  j.log.push(sq.out.trim().split("\n").slice(-6).join("\n"));
  j.log.push("5/5 edit_qc (timeline, duration, dialogue, approval)...");
  const eq = await py("edit_qc.py", [slug, "--final", path.join(outDir, "final.mp4")]);
  j.log.push(eq.out.trim().split("\n").slice(-4).join("\n"));
  j.outputs.final = path.join(outDir, "final.mp4");
  j.outputs.soundQc = String(sq.code);
  j.outputs.editQc = String(eq.code);
  if (sq.code || eq.code) throw new Error("QC failed - see the log (the file exists but must not be delivered)");
  void origin;
};

// ------------------------------------------------------------------ routes
type Ctx = { req: IncomingMessage; res: ServerResponse; m: RegExpMatchArray; origin: string };
const routes: [string, RegExp, (c: Ctx) => Promise<unknown> | unknown][] = [
  ["GET", /^\/api\/projects$/, () =>
    existsSync(PROJECTS)
      ? readdirSync(PROJECTS).filter((d) => existsSync(docPath(d))).map((slug) => {
          const d = readDoc(slug);
          return { slug, duration: d.source.sourceDurationSeconds, fps: d.source.fps, segments: d.segments.length, beats: d.beats.length };
        })
      : []],
  ["POST", /^\/api\/projects$/, async ({ req }) => {
    const b = await body(req);
    const args = [String(b.footage), "--slug", String(b.slug)];
    if (b.fps) args.push("--fps", String(b.fps));
    if (b.fit) args.push("--fit", "cover");
    const r = await py("edit_init.py", args);
    if (r.code) throw new Error(r.out);
    return { out: r.out, doc: readDoc(String(b.slug)) };
  }],
  ["GET", /^\/api\/project\/([\w-]+)$/, ({ m }) => {
    const doc = readDoc(m[1]);
    return { doc, issues: validateTranscript(doc.transcript.segments, doc.source.sourceDurationSeconds), errors: docErrors(doc), manifest: manifest(m[1]) };
  }],
  ["PUT", /^\/api\/project\/([\w-]+)$/, async ({ req, m }) => {
    const doc = (await body(req)) as unknown as EditDoc;
    const disk = readDoc(m[1]);
    // the source and the approvals are not editable from the UI
    doc.source = disk.source;
    doc.approvals = disk.approvals;
    writeDoc(m[1], doc);
    return { ok: true, updated: doc.updated, errors: docErrors(doc), issues: validateTranscript(doc.transcript.segments, doc.source.sourceDurationSeconds) };
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
  ["POST", /^\/api\/project\/([\w-]+)\/drafts$/, async ({ req, m }) => {
    const b = await body(req);
    const doc = readDoc(m[1]);
    const seg = doc.segments.find((s) => s.id === b.segmentId);
    if (!seg) throw new Error("unknown segment");
    const d = draftConcepts(seg);
    if (Object.keys(seg.concepts).length) {
      seg.history.push({ round: seg.round, concepts: seg.concepts, replaced: now() });
      seg.round += 1;
      seg.decision = null;
      if (doc.approvals.some((a) => a.gate === "direction")) doc.approvals = doc.approvals.filter((a) => a.gate !== "direction" && a.gate !== "preview" && a.gate !== "final");
    } else seg.round = 1;
    seg.concepts = { A: d.A, B: d.B, C: d.C };
    seg.recommend = d.recommend;
    writeDoc(m[1], doc);
    await syncLog(m[1]);
    return { doc };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/request$/, async ({ req, m }) => {
    const b = await body(req);
    const doc = readDoc(m[1]);
    const seg = doc.segments.find((s) => s.id === b.segmentId);
    if (!seg) throw new Error("unknown segment");
    seg.requests.push({ at: now(), note: String(b.note ?? "three new concepts") });
    writeDoc(m[1], doc);
    return { doc };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/concept-preview$/, async ({ req, m }) => {
    const b = await body(req);
    const slug = m[1];
    const doc = readDoc(slug);
    const seg = doc.segments.find((s) => s.id === b.segmentId);
    const opt = String(b.option) as "A" | "B" | "C";
    const c = seg?.concepts[opt];
    if (!seg || !c?.kind) throw new Error("no visual concept to preview");
    const beat = beatFromConcept(seg, c);
    const w = beatWindow(beat, kitTiming, doc.source.fps);
    const frame = Math.min(doc.source.durationInFrames - 1, w.from + w.durationInFrames - Math.max(2, Math.round(0.65 * doc.source.fps)));
    const dir = path.join(workDir(slug), "previews");
    mkdirSync(dir, { recursive: true });
    const name = `${seg.id}_${opt}_r${seg.round}_${Date.now() % 100000}.png`;
    await still({ doc, layers: "all", concept: { segmentId: seg.id, option: opt }, audio: null }, frame, path.join(dir, name), 0.5);
    const fresh = readDoc(slug);
    const s2 = fresh.segments.find((s) => s.id === seg.id)!;
    if (s2.concepts[opt]) s2.concepts[opt]!.preview = `/api/file/${slug}/previews/${name}`;
    writeDoc(slug, fresh);
    return { doc: fresh, url: `/api/file/${slug}/previews/${name}`, frame };
  }],
  ["POST", /^\/api\/project\/([\w-]+)\/choose$/, async ({ req, m }) => {
    const b = await body(req);
    const slug = m[1];
    const doc = readDoc(slug);
    const seg = doc.segments.find((s) => s.id === b.segmentId) as CreativeSegment | undefined;
    if (!seg) throw new Error("unknown segment");
    const option = String(b.option) as "A" | "B" | "C" | "D";
    const basedOn = (option === "D" ? b.basedOn : option) as "A" | "B" | "C" | undefined;
    if (option === "D" && !String(b.custom ?? "").trim()) throw new Error("describe your own idea (D)");
    seg.decision = { choice: option, round: seg.round, decided: now(), quote: b.quote ? String(b.quote) : undefined, ...(option === "D" ? { custom: String(b.custom), combine: (b.combine as string[]) ?? undefined, refs: (b.refs as string[]) ?? undefined } : {}) };
    // remove the segment's previous timeline item and its sounds
    doc.beats = doc.beats.filter((x) => x.segmentId !== seg.id);
    doc.sfx = doc.sfx.filter((s) => s.segmentId !== seg.id);
    seg.beatId = null;
    const concept: Concept | undefined = basedOn ? seg.concepts[basedOn] : undefined;
    if (concept?.kind) {
      const beat = beatFromConcept(seg, concept);
      doc.beats.push(beat as never);
      seg.beatId = beat.id;
      const sfx = sfxForBeat(beat, doc.source.fps).map((s) => ({ ...s, sound: pickSound(s.family) }));
      doc.sfx.push(...sfx);
    } else if (concept?.sfx) {
      const items: SfxItem[] = concept.sfx.map((c, i) => ({ id: `${seg.id}-snd${i + 1}`, family: c.family, link: { time: c.at === "start" ? seg.start : c.at === "end" ? seg.end : seg.start + c.at },
        sound: pickSound(c.family, c.roles), gainDb: GAIN_PRESETS[c.family].db, offsetFrames: 0, enabled: true, label: c.label, segmentId: seg.id }));
      doc.sfx.push(...items);
    }
    doc.beats.sort((a, b2) => a.at - b2.at);
    writeDoc(slug, doc);
    await syncLog(slug);
    return { doc, built: Boolean(concept?.kind || concept?.sfx), awaitingClaude: option === "D" && !basedOn };
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
          const audio = resolveAudio(doc, soundMeta(origin));
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
    symlinkSync(dir, link, "dir");
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
        if (!res.writableEnded) send(res, 400, { error: String((e as Error).message ?? e) });
      }
    });
  },
});
