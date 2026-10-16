// End-to-end test of the motion controls, reference analysis, feedback preferences, quality presets,
// shape morphs and motion blur (npm run studio:test:upgrade). The Studio is driven in Chromium; renders go
// through the real CLI (edit_render.py still: the Edit-<slug> composition, i.e. the export path).
//
//  M1 motion controls set in the Studio are saved in edit.json and survive a reload
//  M2 the export render follows them: direction, glow and blur change the frame; defaults render exactly as before
//  M3 a scene override wins over the project; reset-to-project removes it
// Usage: node studio/tests/upgrade.mjs [--keep]
import { execSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const env = { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") };
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
  d.beats = [
    { id: "S01", kind: "DirectionalCard", at: 0.3, segmentId: "S01", props: { label: "Invoice #212", title: "Payment from Nova Studio", status: { from: "Pending", to: "Paid" }, icon: "check", fullscreen: true, background: "midnight-blue", travel: "offscreen", changeAt: 1.4, outAt: 2.9 } },
    { id: "S02", kind: "KineticText", at: 4.0, segmentId: "S02", props: { text: "Every payment shows up the same way", style: "word-rise", placement: "fullscreen", background: "near-black-light", accent: ["same way"], outAt: 3.2 } },
  ];
  // the constants the Studio fills in on its first save (DEFAULT_CONSTANTS), so the baseline matches it
  d.constants = { color60: "#0A0F1F", color30: "#1E2A44", accentColor: "#2F6BFF", camera: "push-in", cameraIntensity: "medium" };
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
