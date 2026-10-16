// End-to-end test of the motion controls, reference analysis, feedback preferences, quality presets,
// shape morphs and motion blur (npm run studio:test:upgrade). The Studio is driven in Chromium; renders go
// through the real CLI (edit_render.py still: the Edit-<slug> composition, i.e. the export path).
//
//  M1 motion controls set in the Studio are saved in edit.json and survive a reload
//  M2 the export render follows them: direction, glow and blur change the frame; defaults render exactly as before
//  M3 a scene override wins over the project; reset-to-project removes it
//  A1 a reference attached in D is measured and cached (content hash); the Studio shows "measured only" + palette
//  A2 an unreachable link is labelled "not accessible" (never "analysed") and offers an upload fallback that works
//  A3 "Ask Claude Code to analyse" creates an analysis request; Claude Code's observations (recorded with
//     ref_analysis.py) show as "analysed", with inferred motion kept apart; a still cannot get observed motion
//  A4 the analysis is reused in another scene; refresh re-measures and keeps the earlier observations in history
//  A5 Claude Code's build request prints the analysis of its references
//  P1 preferences saved in the Studio: project ones in edit.json, future ones in the library; they survive a reload
//  P2 "Remember this" on a change request saves a scene preference; Claude Code sees it on that scene only
//  P3 switching a preference off removes it from Claude Code's view; widening its scope is an explicit change
//  Q1 preview presets in the Studio: draft = 1/3 size, review = 1/2; each measured time is recorded and shown
//  Q2 draft keeps the layout and timing (same positions as review) and only drops decorative effects
//  Q3 the CLI preview takes --quality too and records its time
//  G1 "Shape morph" is off by default (the status icon crossfades); switched on in the Studio it is saved,
//     survives a reload and changes the export frame mid-change only (settled frames stay identical)
//  B1 "Motion blur" is off by default; light is saved with its render-cost note, changes the export frame
//     during the card's entrance only (a held frame stays identical), and its review render time is measured
//  Z1 platform zones: the preset is labelled unverified; the user's edited zones are saved in edit.json, drawn by
//     the Player guides, survive a reload, never reach the export, and reset back to the preset
// Usage: node studio/tests/upgrade.mjs [--keep]
import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO = path.resolve(APP, "..");
const SCRIPTS = path.join(REPO, ".claude", "skills", "video-editing", "scripts");
const SLUG = "upgrade-e2e";
const PORT = 3010;
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");
const tmp = mkdtempSync(path.join(os.tmpdir(), "upgrade_e2e_"));
const LIB = path.join(tmp, "library");
const env = { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md"), VV_LIBRARY: LIB };
const results = [];
const check = (n, ok, msg) => {
  results.push({ n, ok, msg });
  console.log(`${ok ? "PASS" : "FAIL"}  [${n}] ${msg}`);
};
const py = (script, ...args) => {
  const r = spawnSync("python3", [path.join(SCRIPTS, script), ...args], { cwd: REPO, env, encoding: "utf8" });
  return { ...r, out: (r.stdout ?? "") + (r.stderr ?? "") };
};
const docPath = path.join(APP, "src", "projects", SLUG, "edit.json");
const docOf = () => JSON.parse(readFileSync(docPath, "utf8"));
const writeDoc = (d) => writeFileSync(docPath, JSON.stringify({ ...d, rev: (d.rev ?? 0) + 1 }, null, 1));
/** CLI still of the export composition at time t (seconds) -> png path */
const still = (name, t) => {
  const out = path.join(tmp, `${name}.png`);
  const r = py("edit_render.py", "still", SLUG, "--t", String(t), "--out", out);
  if (r.status) throw new Error(`still ${name}: ${r.out.slice(-600)}`);
  return out;
};
/** mean absolute difference (0..255) between two images, optionally in a box [x0,y0,x1,y1] as fractions */
const diff = (a, b, box) =>
  Number(
    spawnSync("python3", ["-c", `
from PIL import Image, ImageChops, ImageStat
a = Image.open(${JSON.stringify(a)}).convert("RGB"); b = Image.open(${JSON.stringify(b)}).convert("RGB")
box = ${box ? JSON.stringify(box) : "None"}
if box:
    w, h = a.size; c = (int(box[0]*w), int(box[1]*h), int(box[2]*w), int(box[3]*h)); a = a.crop(c); b = b.crop(c)
print(sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3)
`], { encoding: "utf8" }).stdout.trim(),
  );
/** number of pixels that changed clearly (any channel by more than 40): finds small, local changes */
const changed = (a, b) =>
  Number(
    spawnSync("python3", ["-c", `
from PIL import Image, ImageChops
a = Image.open(${JSON.stringify(a)}).convert("RGB"); b = Image.open(${JSON.stringify(b)}).convert("RGB")
d = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > 40 else 0)
print(d.histogram()[255])
`], { encoding: "utf8" }).stdout.trim(),
  );
/** horizontal centre of mass of bright pixels (0..1) */
const centreX = (png) =>
  Number(
    spawnSync("python3", ["-c", `
from PIL import Image
im = Image.open(${JSON.stringify(png)}).convert("L"); w, h = im.size
px = im.load(); s = n = 0
for y in range(0, h, 4):
    for x in range(0, w, 4):
        if px[x, y] > 120: s += x; n += 1
print(s / n / w if n else -1)
`], { encoding: "utf8" }).stdout.trim(),
  );

// ---------------------------------------------------------------- project: script only, landscape, two full-screen beats
py("edit_init.py", "--slug", SLUG, "--remove");
rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
let r = py("edit_init.py", "--script-only", "--slug", SLUG, "--duration", "8", "--size", "1920x1080");
if (r.status) throw new Error(r.out);
{
  const d = docOf();
  d.transcript = {
    origin: "test",
    segments: [
      { id: "T001", start: 0.3, end: 3.6, text: "Your invoice was paid this morning" },
      { id: "T002", start: 4.0, end: 7.6, text: "Every payment shows up the same way" },
    ],
  };
  const seg = (id, t, start, end, text) => ({ id, transcriptIds: [t], start, end, text, type: "fullscreen", major: true, round: 0, concepts: {}, history: [], decision: null, beatId: id, requests: [] });
  d.segments = [seg("S01", "T001", 0.3, 3.6, "Your invoice was paid this morning"), seg("S02", "T002", 4.0, 7.6, "Every payment shows up the same way")];
  // S01 is built (v1, the user's own idea), so it can be reviewed and changes requested
  d.segments[0].decision = { choice: "D", round: 0, decided: "2026-10-16T00:00:00", source: "own", custom: "A card that turns Paid" };
  d.beats = [
    { id: "S01", kind: "DirectionalCard", at: 0.3, segmentId: "S01", props: { label: "Invoice #212", title: "Payment from Nova Studio", status: { from: "Pending", to: "Paid" }, icon: "check", fullscreen: true, background: "midnight-blue", travel: "offscreen", changeAt: 1.4, outAt: 2.9 } },
    { id: "S02", kind: "KineticText", at: 4.0, segmentId: "S02", props: { text: "Every payment shows up the same way", style: "word-rise", placement: "fullscreen", background: "near-black-light", accent: ["same way"], outAt: 3.2 } },
  ];
  // the constants the Studio fills in on its first save (DEFAULT_CONSTANTS), so the baseline matches it
  d.constants = { color60: "#0A0F1F", color30: "#1E2A44", accentColor: "#2F6BFF", camera: "push-in", cameraIntensity: "medium" };
  d.segments[0].versions = [{ v: 1, source: "own", beat: d.beats[0], sfx: [], status: "built", at: "2026-10-16T00:00:00" }];
  d.segments[0].activeVersion = 1;
  writeDoc(d);
}
// baseline stills before any motion setting (the defaults must render exactly as before)
const T_ENTER = 0.3 + 0.2; // card mid-entrance
const T_HOLD = 0.3 + 2.0; // card holding, after the change (glow visible)
const T_TEXT = 4.0 + 0.3; // text entering (blur)
const base = { enter: still("base-enter", T_ENTER), hold: still("base-hold", T_HOLD), text: still("base-text", T_TEXT) };

try {
  await fetch(`${BASE}/api/projects`);
  throw new Error(`port ${PORT} is already in use: stop the running Studio (npm run studio) first`);
} catch (e) {
  if (String(e.message).startsWith("port")) throw e;
}
const vite = spawn(path.join(APP, "node_modules", ".bin", "vite"), ["--config", "vite.config.ts"], { cwd: APP, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
let viteLog = "";
vite.stdout.on("data", (d) => (viteLog += d));
vite.stderr.on("data", (d) => (viteLog += d));
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`${BASE}/api/projects`)).ok) break;
  } catch {
    // not up yet
  }
  await new Promise((ok) => setTimeout(ok, 500));
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const shot = (name) => page.screenshot({ path: path.join(tmp, `${name}.png`) });
const waitFor = async (fn, what, timeout = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await fn()) return true;
    await page.waitForTimeout(250);
  }
  throw new Error(`timed out waiting for ${what}`);
};
const openProps = async (beatId) => {
  await page.getByTestId("tab-properties").click();
  const btn = page.locator(".props button", { hasText: `${beatId} ·` }).first();
  if (await btn.count()) await btn.click();
  await page.getByTestId("motion-controls").waitFor();
};

try {
  await page.goto(`${BASE}/?project=${SLUG}`);
  await page.getByTestId("ruler").waitFor();

  // ---------------------------------------------------------------- M1 set in the Studio, survive a reload
  await openProps("S01");
  await page.getByTestId("motion-scope-scene").click();
  await page.getByTestId("motion-direction").selectOption("left");
  await page.getByTestId("motion-glow").fill("1");
  await page.getByTestId("motion-scope-project").click();
  await page.getByTestId("motion-blur").fill("0");
  await waitFor(() => docOf().constants?.sceneMotion?.S01?.direction === "left" && docOf().constants?.motion?.blur === 0, "the motion settings in edit.json");
  await page.reload();
  await openProps("S01");
  const dirAfter = await page.getByTestId("motion-direction").inputValue();
  const glowAfter = await page.getByTestId("motion-glow").inputValue();
  const c1 = docOf().constants;
  check("M1", dirAfter === "left" && Number(glowAfter) === 1 && c1.sceneMotion.S01.glow === 1 && c1.motion.blur === 0 && !c1.sceneMotion.S01.blur,
    "direction left + glow 1 for S01 only, blur 0 for the whole project: saved in edit.json (constants.sceneMotion / motion) and shown again after a reload");
  await shot("motion-controls");

  // ---------------------------------------------------------------- M2 the export render follows them
  console.log("      constants before the export stills:", JSON.stringify({ motion: docOf().constants?.motion, sceneMotion: docOf().constants?.sceneMotion }));
  const now = { enter: still("now-enter", T_ENTER), hold: still("now-hold", T_HOLD), text: still("now-text", T_TEXT) };
  const xBase = centreX(base.enter);
  const xNow = centreX(now.enter);
  const dGlow = diff(base.hold, now.hold);
  const dText = diff(base.text, now.text);
  // back to defaults: identical to the baseline
  const d2 = docOf();
  delete d2.constants.motion;
  delete d2.constants.sceneMotion;
  writeDoc(d2);
  const again = still("again-hold", T_HOLD);
  const same = diff(base.hold, again);
  check("M2", xBase > 0.5 && xNow < 0.5 && dGlow > 0.3 && dText > 0.3 && same < 0.01,
    `export render: the card enters from the right by default (centre x ${xBase.toFixed(2)}) and from the left with the scene setting (${xNow.toFixed(2)}); glow changes the held frame (diff ${dGlow.toFixed(2)}); project blur 0 changes the text entrance (diff ${dText.toFixed(2)}); defaults render as before (diff ${same.toFixed(3)})`);

  // ---------------------------------------------------------------- M3 scene override vs project, reset
  await page.reload();
  await openProps("S01");
  await page.getByTestId("motion-scope-project").click();
  await page.getByTestId("motion-softness").fill("0.9");
  await page.getByTestId("motion-scope-scene").click();
  await page.getByTestId("motion-softness").fill("0.1");
  await waitFor(() => docOf().constants?.sceneMotion?.S01?.softness === 0.1 && docOf().constants?.motion?.softness === 0.9, "project 0.9 / scene 0.1");
  const sceneShown = await page.getByTestId("motion-softness").inputValue();
  await page.getByTestId("motion-reset").click();
  await waitFor(() => !docOf().constants?.sceneMotion?.S01, "the reset");
  const afterReset = await page.getByTestId("motion-softness").inputValue();
  check("M3", Number(sceneShown) === 0.1 && Number(afterReset) === 0.9 && docOf().constants.motion.softness === 0.9,
    "the scene's softness 0.1 overrides the project's 0.9; reset to project removes the override and the scene follows 0.9 again");


  // ---------------------------------------------------------------- A1 measured + cached
  const openD = async (id) => {
    await page.getByTestId(`seg-${id}`).click();
    await page.getByTestId("tab-creative").click();
    await waitFor(async () => (await page.getByTestId("creative-panel").locator("h2").first().innerText().catch(() => "")) === id, `the ${id} panel`);
  };
  await openD("S01");
  await page.getByTestId("d-text").fill("A dark card arrives from the right, the status turns Paid, it leaves left.");
  await page.getByTestId("d-ref-search").fill("ONS-024");
  await page.getByTestId("d-ref-add-ONS-024").click();
  await page.getByTestId("ra-status-ONS-024").waitFor({ timeout: 30000 });
  const st1 = await page.getByTestId("ra-status-ONS-024").innerText();
  const sw1 = await page.getByTestId("ref-analysis-ONS-024").locator(".swatch").count();
  const cached = existsSync(path.join(LIB, "analysis")) ? readdirSync(path.join(LIB, "analysis")).filter((f) => f.endsWith(".json")) : [];
  const onsSha = execSync(`sha256sum "${path.join(REPO, ".claude/skills/video-editing/assets/references/ONS")}"/ONS-024__*`).toString().split(" ")[0];
  check("A1", /measured only/.test(st1) && sw1 >= 3 && cached.includes(`${onsSha}.json`),
    `ONS-024 attached in D: measured and cached by content hash (library/analysis/${onsSha.slice(0, 12)}….json), the Studio shows "${st1}" with ${sw1} palette swatches`);

  // ---------------------------------------------------------------- A2 unreachable link
  await page.getByTestId("d-ref-url").fill("http://127.0.0.1:9/never-there.mp4");
  await page.getByTestId("d-ref-url-add").click();
  await page.getByTestId("ra-inaccessible-URL-1").waitFor({ timeout: 30000 });
  const offText = await page.getByTestId("ra-inaccessible-URL-1").innerText();
  const statusShown = await page.getByTestId("ra-status-URL-1").count();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByTestId("ra-upload-URL-1").click()]);
  await chooser.setFiles(path.join(tmp, "base-hold.png"));
  await waitFor(() => (docOf().segments.find((s) => s.id === "S01").dDraft?.attachments ?? []).some((a) => a.kind === "upload" && /instead of the link/.test(a.note ?? "")), "the fallback upload");
  check("A2", /Not accessible/.test(offText) && /upload/i.test(offText) && statusShown === 0,
    "an unreachable link is shown as \"Not accessible\" (never analysed) with the reason; \"Upload a screenshot or clip instead\" attaches the upload, noted as standing in for the link");

  // ---------------------------------------------------------------- A3 Claude Code's analysis
  await page.getByTestId("ra-ask-ONS-024").click();
  await waitFor(() => (docOf().requests ?? []).some((q) => q.type === "analysis" && q.brief.ref === "ONS-024" && q.status === "pending"), "the analysis request");
  const areq = docOf().requests.find((q) => q.type === "analysis");
  const ashow = py("edit_decisions.py", "show", SLUG, "--request", areq.id);
  writeFileSync(path.join(tmp, "bad.json"), JSON.stringify({ observed: { color: "deep navy" }, observedMotion: [{ t: 1, what: "glides" }] }));
  const bad = py("ref_analysis.py", "record", "ONS-024", "--file", path.join(tmp, "bad.json"));
  writeFileSync(path.join(tmp, "good.json"), JSON.stringify({
    observed: { color: "near-black navy card, one blue rim light at the bottom", typography: "small grey label, large white 400% numerals", layout: "stat top-left, bell curve across the middle" },
    inferredMotion: "the curve probably draws left to right and the dot settles on the peak",
    takeaways: "one bright accent on the key number only",
  }));
  const good = py("ref_analysis.py", "record", "ONS-024", "--file", path.join(tmp, "good.json"));
  const done = py("edit_decisions.py", "done", SLUG, "--request", areq.id, "--reason", "analysed ONS-024");
  await page.reload();
  await openD("S01");
  await page.getByTestId("ra-status-ONS-024").waitFor({ timeout: 30000 });
  const st3 = await page.getByTestId("ra-status-ONS-024").innerText();
  const box3 = await page.getByTestId("ref-analysis-ONS-024").innerText();
  check("A3", /REFERENCE TO ANALYSE: ONS-024/.test(ashow.out) && /palette/.test(ashow.out) && bad.status !== 0 && /still image does not show motion/.test(bad.out) && good.status === 0 && done.status === 0 &&
    /analysed by Claude Code/.test(st3) && /one blue rim light/.test(box3) && /Inferred motion \(a guess\)/.test(box3),
    "analysis request -> show prints the measured facts; recording observed motion for a still is refused; the recorded observations show as \"analysed by Claude Code\" with inferred motion labelled as a guess");

  // ---------------------------------------------------------------- A4 reuse + refresh
  const before = JSON.parse(py("ref_analysis.py", "show", "ONS-024", "--json").out.trim().split("\n").pop());
  await openD("S02");
  await page.getByTestId("d-ref-search").fill("ONS-024");
  await page.getByTestId("d-ref-add-ONS-024").click();
  await page.getByTestId("ra-status-ONS-024").waitFor({ timeout: 30000 });
  const st4 = await page.getByTestId("ra-status-ONS-024").innerText();
  await page.getByTestId("ra-ask-ONS-024").click();
  await waitFor(async () => /measured only/.test(await page.getByTestId("ra-status-ONS-024").innerText()), "the refreshed (re-measured) analysis");
  const after = JSON.parse(py("ref_analysis.py", "show", "ONS-024", "--json").out.trim().split("\n").pop());
  check("A4", /analysed by Claude Code/.test(st4) && after.measuredAt >= before.measuredAt && after.status === "measured" && (after.history ?? []).some((h) => /one blue rim light/.test(JSON.stringify(h.observed))) &&
    (docOf().requests ?? []).filter((q) => q.type === "analysis" && q.status === "pending").length === 1,
    "S02 reuses the stored analysis (analysed); Refresh re-measures, keeps Claude Code's earlier observations in the history and asks Claude Code again");

  // ---------------------------------------------------------------- A5 the build request carries the analysis
  await page.getByTestId("d-text").fill("The same card, now for every payment.");
  await page.getByTestId("choose-D").click();
  await waitFor(() => (docOf().requests ?? []).some((q) => q.type === "implement" && q.segmentId === "S02"), "the S02 build request");
  const breq = docOf().requests.find((q) => q.type === "implement" && q.segmentId === "S02");
  const bshow = py("edit_decisions.py", "show", SLUG, "--request", breq.id);
  check("A5", /analysis of ONS-024\s+\[measured\]/.test(bshow.out) && /palette:/.test(bshow.out),
    "Claude Code's build request prints the stored analysis of each reference (status, measured facts)");

  // ---------------------------------------------------------------- P1 preferences saved and reloaded
  await openD("S01");
  await page.getByTestId("prefs-toggle").locator("summary").click();
  await page.getByTestId("pref-new-kind").selectOption("avoid");
  await page.getByTestId("pref-new-text").fill("neon colours");
  await page.getByTestId("pref-new-scope").selectOption("project");
  await page.getByTestId("pref-add").click();
  await page.getByTestId("pref-new-kind").selectOption("like");
  await page.getByTestId("pref-new-text").fill("cards on the left third");
  await page.getByTestId("pref-new-scope").selectOption("future");
  await page.getByTestId("pref-add").click();
  await waitFor(() => (docOf().preferences ?? []).some((x) => x.text === "neon colours" && x.scope === "project") && existsSync(path.join(LIB, "preferences.json")), "the saved preferences");
  await page.reload();
  await openD("S01");
  await page.getByTestId("prefs-toggle").locator("summary").click();
  const prefTexts = () => page.locator('[data-testid^="pref-text-"]').evaluateAll((els) => els.map((e) => e.value).join(" | "));
  await waitFor(async () => /cards on the left third/.test(await prefTexts()), "the future-videos preference in the list");
  const listed = await prefTexts();
  const fut = JSON.parse(readFileSync(path.join(LIB, "preferences.json"), "utf8"));
  check("P1", /neon colours/.test(listed) && /cards on the left third/.test(listed) && fut.length === 1 && fut[0].scope === "future" && !(docOf().preferences ?? []).some((x) => x.scope === "future"),
    "a project preference is saved in edit.json and a future-videos one in the local library (library/preferences.json); both are listed again after a reload");

  // ---------------------------------------------------------------- P2 remember a change request for this scene
  await page.getByTestId("changes-text").fill("Make the card glow less");
  await page.getByTestId("changes-remember").selectOption("scene");
  await page.getByTestId("request-changes").click();
  await waitFor(() => (docOf().preferences ?? []).some((x) => x.text === "Make the card glow less" && x.scope === "scene" && x.segmentId === "S01" && x.version === 1), "the scene preference");
  const rev = docOf().requests.find((q) => q.type === "revision" && q.segmentId === "S01");
  const s1show = py("edit_decisions.py", "show", SLUG, "--request", rev.id).out;
  const s2req = docOf().requests.find((q) => q.type === "implement" && q.segmentId === "S02" && q.status === "pending");
  const s2show = py("edit_decisions.py", "show", SLUG, "--request", s2req.id).out;
  check("P2", /this scene only \(S01\).*Make the card glow less/.test(s1show) && !/Make the card glow less/.test(s2show) && /this whole video.*neon colours/.test(s2show) && /every video.*cards on the left third/.test(s2show),
    "\"Remember this\" saves the change request as a preference for S01 (version 1); Claude Code sees it on S01's revision only, while the project and future-videos ones apply to S02 too");

  // ---------------------------------------------------------------- P3 off / explicit widening
  const neon = docOf().preferences.find((x) => x.text === "neon colours");
  const glow = docOf().preferences.find((x) => x.text === "Make the card glow less");
  await page.reload();
  await openD("S01");
  await page.getByTestId("prefs-toggle").locator("summary").click();
  await page.getByTestId(`pref-active-${neon.id}`).uncheck();
  await page.getByTestId(`pref-scope-${glow.id}`).selectOption("project");
  await waitFor(() => docOf().preferences.find((x) => x.id === neon.id)?.active === false && docOf().preferences.find((x) => x.id === glow.id)?.scope === "project", "the preference changes");
  const s2after = py("edit_decisions.py", "show", SLUG, "--request", s2req.id).out;
  check("P3", !/neon colours/.test(s2after) && /this whole video.*Make the card glow less/.test(s2after),
    "a switched-off preference disappears from Claude Code's view; S01's preference reaches S02 only after the user widens it to the project");

  // ---------------------------------------------------------------- Q1 presets in the Studio
  const renderPreset = async (q) => {
    await page.getByTestId("tab-export").click();
    await page.getByTestId("preview-quality").selectOption(q);
    const note = await page.getByTestId("preview-quality-note").innerText();
    const n0 = existsSync(path.join(REPO, "work", SLUG, "previews")) ? readdirSync(path.join(REPO, "work", SLUG, "previews")).length : 0;
    await page.getByTestId("render-preview").click();
    await waitFor(() => existsSync(path.join(REPO, "work", SLUG, "render-times.json")) && JSON.parse(readFileSync(path.join(REPO, "work", SLUG, "render-times.json"), "utf8")).filter((t) => t.quality === q).length > 0 &&
      readdirSync(path.join(REPO, "work", SLUG, "previews")).length > n0, `the ${q} preview`, 300000);
    const files = readdirSync(path.join(REPO, "work", SLUG, "previews")).filter((f) => /^preview_v\d+\.mp4$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    const f = path.join(REPO, "work", SLUG, "previews", files[files.length - 1]);
    const [w, h] = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${f}"`).toString().trim().split(",").map(Number);
    return { f, w, h, note };
  };
  const dr = await renderPreset("draft");
  const rv = await renderPreset("review");
  await page.reload();
  await page.getByTestId("tab-export").click();
  const opts = await page.getByTestId("preview-quality").locator("option").allInnerTexts();
  const times = JSON.parse(readFileSync(path.join(REPO, "work", SLUG, "render-times.json"), "utf8"));
  check("Q1", dr.w === 640 && dr.h === 360 && rv.w === 960 && rv.h === 540 && /decorative effects off/.test(dr.note) && opts.some((o) => /Draft · last [\d.]+s for \d+ frames/.test(o)) && opts.some((o) => /Review · last/.test(o)),
    `draft ${dr.w}x${dr.h} and review ${rv.w}x${rv.h} previews from the Studio; measured times shown on the presets (${times.map((t) => `${t.quality} ${t.seconds}s/${t.frames}f`).join(", ")}); the draft says what it leaves out`);

  // ---------------------------------------------------------------- Q2 same layout, fewer effects
  const grab = (f, t, out) => execSync(`ffmpeg -v error -y -ss ${t} -i "${f}" -frames:v 1 -vf scale=640:360 "${out}"`);
  grab(dr.f, 2.3, path.join(tmp, "q-draft.png"));
  grab(rv.f, 2.3, path.join(tmp, "q-review.png"));
  const xd = centreX(path.join(tmp, "q-draft.png"));
  const xr = centreX(path.join(tmp, "q-review.png"));
  const dq = diff(path.join(tmp, "q-draft.png"), path.join(tmp, "q-review.png"));
  check("Q2", Math.abs(xd - xr) < 0.02 && dq > 0.05 && dq < 12,
    `at 2.3 s the card sits at the same place in draft and review (centre x ${xd.toFixed(3)} vs ${xr.toFixed(3)}); the frames differ only by the decorative layers (mean diff ${dq.toFixed(2)})`);

  // ---------------------------------------------------------------- Q3 CLI
  const cli = py("edit_render.py", "preview", SLUG, "--all", "--quality", "draft");
  const cliOut = (cli.out.match(/preview (\S+\.mp4)\s+(\d+)x(\d+)/) ?? []);
  const cliTimes = JSON.parse(readFileSync(path.join(REPO, "work", SLUG, "render-times.json"), "utf8")).filter((t) => t.via === "cli");
  check("Q3", cli.status === 0 && cliOut[2] === "640" && cliTimes.length === 1 && /quality draft: rendered \d+ frames in [\d.]+ s/.test(cli.out),
    `edit_render.py preview --quality draft: ${cliOut[2]}x${cliOut[3]}, ${cli.out.match(/rendered \d+ frames in [\d.]+ s/)?.[0]}, recorded in render-times.json`);

  // ---------------------------------------------------------------- G1 shape morph
  {
    const d = docOf();
    d.beats[0].props.statusIcon = { from: "ring", to: "check" };
    writeDoc(d);
  }
  const T_MID = 0.3 + 1.4 + 0.05; // the status change in progress (the ring is folding into the check)
  const gOff = { mid: still("g-off-mid", T_MID), hold: still("g-off-hold", T_HOLD) };
  await page.reload();
  await openProps("S01");
  const morphDefault = await page.getByTestId("motion-morph").isChecked();
  await page.getByTestId("motion-scope-project").click();
  await page.getByTestId("motion-morph").check();
  await waitFor(() => docOf().constants?.motion?.morph === true, "morph in edit.json");
  await page.reload();
  await openProps("S01");
  await page.getByTestId("motion-scope-project").click();
  const morphAfter = await page.getByTestId("motion-morph").isChecked();
  const gOn = { mid: still("g-on-mid", T_MID), hold: still("g-on-hold", T_HOLD) };
  const gMid = changed(gOff.mid, gOn.mid);
  const gHold = changed(gOff.hold, gOn.hold);
  check("G1", morphDefault === false && morphAfter === true && gMid > 40 && gHold === 0,
    `shape morph off by default, on after a reload (constants.motion.morph); mid-change the icon differs (${gMid} pixels changed), the settled frame is identical (${gHold} pixels)`);

  // ---------------------------------------------------------------- B1 motion blur
  const bOff = { enter: still("b-off-enter", T_ENTER), hold: still("b-off-hold", T_HOLD) };
  const blurDefault = await page.getByTestId("motion-blur-mode").inputValue();
  const noteBefore = await page.getByTestId("motion-blur-note").count();
  await page.getByTestId("motion-blur-mode").selectOption("light");
  await waitFor(() => docOf().constants?.motion?.motionBlur === "light", "motion blur in edit.json");
  await page.reload();
  await openProps("S01");
  await page.getByTestId("motion-scope-project").click();
  const blurAfter = await page.getByTestId("motion-blur-mode").inputValue();
  const note = await page.getByTestId("motion-blur-note").innerText();
  const bOn = { enter: still("b-on-enter", T_ENTER), hold: still("b-on-hold", T_HOLD) };
  const bEnter = diff(bOff.enter, bOn.enter);
  const bHold = diff(bOff.hold, bOn.hold);
  const rvBlur = py("edit_render.py", "preview", SLUG, "--all", "--quality", "review");
  const tBlur = rvBlur.out.match(/rendered (\d+) frames in ([\d.]+) s/);
  check("B1", blurDefault === "off" && noteBefore === 0 && blurAfter === "light" && /render cost/.test(note) && bEnter > 0.2 && bHold < 0.005 && rvBlur.status === 0,
    `motion blur off by default, light after a reload with its cost note; entrance frame differs (diff ${bEnter.toFixed(2)}), held frame identical (diff ${bHold.toFixed(4)}); review render with light blur: ${tBlur?.[1]} frames in ${tBlur?.[2]} s (without: ${times.find((t) => t.quality === "review")?.seconds} s)`);
  await shot("motion-blur-controls");

  // ---------------------------------------------------------------- Z1 editable platform zones
  const zBefore = still("z-before", T_HOLD);
  await page.getByTestId("guide-platform").selectOption("tiktok");
  await page.getByTestId("zones-edit").click();
  const zPreset = await page.getByTestId("zones-status").innerText();
  await page.getByTestId("zone-0-left").fill("70");
  await waitFor(() => docOf().constants?.platformZones?.tiktok?.[0]?.box?.[0] === 0.7, "the edited zone in edit.json");
  await page.reload();
  await page.getByTestId("ruler").waitFor();
  await page.getByTestId("zones-edit").click();
  const zMine = await page.getByTestId("zones-status").innerText();
  const zVal = await page.getByTestId("zone-0-left").inputValue();
  const zLabel = await page.getByTestId("guide-platform").locator("option:checked").innerText();
  const zBox = await page.locator('[data-zone="right actions"]').boundingBox();
  const plBox = await page.locator("[data-guides]").boundingBox();
  const zAfter = still("z-after", T_HOLD);
  const zExport = changed(zBefore, zAfter);
  await page.getByTestId("zones-reset").click();
  await waitFor(() => !docOf().constants?.platformZones?.tiktok, "the reset to the preset");
  const zReset = await page.getByTestId("zones-status").innerText();
  const relX = zBox && plBox ? (zBox.x - plBox.x) / plBox.width : -1;
  check("Z1", /unverified preset/.test(zPreset) && /your values/.test(zMine) && zVal === "70" && /yours/.test(zLabel) && relX > 0.66 && relX < 0.74 && zExport === 0 && /unverified/.test(zReset),
    `the TikTok preset is labelled "${zPreset.slice(0, 40)}…"; the edited zone (left 70 %) is saved in edit.json, drawn by the Player at ${(relX * 100).toFixed(1)} % and kept after a reload ("${zMine}"); the export is unchanged (${zExport} pixels); reset returns to the preset`);
  await shot("platform-zones");

  check("errors", pageErrors.length === 0, `no page errors (${pageErrors.slice(0, 2).join(" | ")})`);
} catch (e) {
  check("run", false, String(e.stack ?? e) + (pageErrors.length ? `\n      page errors: ${pageErrors.slice(0, 3).join(" | ")}` : ""));
  await shot("error").catch(() => {});
} finally {
  await browser.close();
  try {
    process.kill(-vite.pid, "SIGTERM");
  } catch {
    // already stopped
  }
  if (!keep) {
    py("edit_init.py", "--slug", SLUG, "--remove");
    rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}
const failed = results.filter((x) => !x.ok);
if (failed.length && viteLog) console.log("\n--- Studio server log (tail) ---\n" + viteLog.split("\n").slice(-30).join("\n"));
console.log(`\n${results.length - failed.length}/${results.length} checks passed${keep ? ` (kept: ${tmp}, project ${SLUG})` : ""}`);
process.exit(failed.length ? 1 : 0);
