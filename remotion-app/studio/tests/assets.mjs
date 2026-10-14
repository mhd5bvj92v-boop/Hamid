// End-to-end test of the user's 3D assets (npm run studio:test:assets).
//
// Realistic / 3D objects are never drawn with code shapes: a Claude Concept asks the
// user for them (Concept.assets), the Studio shows the request and takes the upload,
// the build is refused until every required asset is there, and Remotion renders
// the scene with the user's own file. The Studio UI is driven in Chromium; the
// Claude Code steps run the real CLI (edit_decisions.py propose / built) with
// files written here. Synthetic assets only: a shaded sphere PNG with a transparent
// background, and the same sphere as a ProRes 4444 MOV (converted to WebM with alpha).
//
//  1 a concept's asset request is shown on its card
//  2 choosing it: the build waits for the asset (Studio, pending, and built refuses)
//  3 the user uploads the asset in the Studio: copied into the app, original untouched
//  4 a build that does not use the asset is refused
//  5 Remotion renders the scene with the user's image (still + Player)
//  6 the user's own video asset for their idea D: MOV -> WebM with alpha, used and rendered
//  7 everything is still there after reopening
//  8 quality gate: a build must be previewed next to its style reference, unchanged since, with a match list
// Usage: node studio/tests/assets.mjs [--keep]
import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO = path.resolve(APP, "..");
const SCRIPTS = path.join(REPO, ".claude", "skills", "video-editing", "scripts");
const SLUG = "assets-e2e";
const PORT = 3010;
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");
const tmp = mkdtempSync(path.join(os.tmpdir(), "assets_e2e_"));
const env = { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") };
const results = [];
const check = (n, ok, msg) => {
  results.push({ n, ok, msg });
  console.log(`${ok ? "PASS" : "FAIL"}  [${n}] ${msg}`);
};
const ed = (label, ...args) => {
  const r = spawnSync("python3", [path.join(SCRIPTS, "edit_decisions.py"), ...args], { cwd: REPO, env, encoding: "utf8" });
  console.log(`      [Claude Code] ${label}: edit_decisions.py ${args.slice(0, 4).join(" ")} -> exit ${r.status}`);
  return { ...r, out: (r.stdout ?? "") + (r.stderr ?? "") };
};
const docOf = () => JSON.parse(readFileSync(path.join(APP, "src", "projects", SLUG, "edit.json"), "utf8"));
const segOf = (id) => docOf().segments.find((s) => s.id === id);
const reqFor = (seg, type) => [...docOf().requests].reverse().find((r) => r.segmentId === seg && r.type === type);
const sha = (f) => execSync(`sha256sum "${f}"`).toString().split(" ")[0];
// share of strongly magenta pixels (the sphere's colour) in an image
const magenta = (png) =>
  Number(
    spawnSync("python3", ["-c", `
from PIL import Image
im = Image.open(${JSON.stringify(png)}).convert("RGB"); w, h = im.size
px = [im.getpixel((x, y)) for x in range(0, w, 4) for y in range(0, h, 4)]
print(sum(1 for r, g, b in px if r > 140 and b > 110 and g < 110) / len(px))
`], { encoding: "utf8" }).stdout.trim(),
  );

// ---------------------------------------------------------------- synthetic 3D assets
console.log(`temp: ${tmp}`);
let r = spawnSync("python3", ["-c", `
import numpy as np
from PIL import Image
N = 900; y, x = np.mgrid[0:N, 0:N]; r = N * 0.42
dx, dy = (x - N / 2) / r, (y - N / 2) / r; d2 = dx * dx + dy * dy
z = np.sqrt(np.clip(1 - d2, 0, 1)); L = np.array([-0.45, -0.6, 0.66]); L /= np.linalg.norm(L)
lit = np.clip(dx * L[0] + dy * L[1] + z * L[2], 0, 1)
rgb = np.stack([np.clip(c * (0.25 + 0.75 * lit) + lit ** 40, 0, 1) for c in (0.95, 0.2, 0.85)], -1)
a = np.clip((1 - np.sqrt(d2)) * N * 0.5, 0, 1)
Image.fromarray((np.dstack([rgb, a]) * 255).astype("uint8"), "RGBA").save(${JSON.stringify(path.join(tmp, "glass-sphere.png"))})
`], { encoding: "utf8" });
if (r.status) throw new Error(r.stderr);
const spherePng = path.join(tmp, "glass-sphere.png");
const sphereMov = path.join(tmp, "product-turn.mov");
r = spawnSync("ffmpeg", ["-v", "error", "-y", "-loop", "1", "-i", spherePng, "-t", "2", "-r", "30", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", sphereMov]);
if (r.status) throw new Error(String(r.stderr));
const pngSha = sha(spherePng);
const movSha = sha(sphereMov);

// ---------------------------------------------------------------- project (script only: the assets do not need footage)
spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", SLUG, "--remove"]);
rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
r = spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--script-only", "--slug", SLUG, "--duration", "9"], { env, encoding: "utf8" });
if (r.status) throw new Error(r.stdout + r.stderr);
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
    await page.waitForTimeout(300);
  }
  throw new Error(`timed out waiting for ${what}`);
};
const seekTo = async (t) => {
  const box = await page.getByTestId("ruler").boundingBox();
  const d = docOf().source;
  await page.mouse.click(box.x + (box.width * t) / (d.durationInFrames / d.fps), box.y + 5);
  await page.waitForTimeout(800);
};

try {
  await page.goto(`${BASE}/?project=${SLUG}`);
  await page.getByTestId("script-input").fill(["[00:00.50 - 00:04.00] It started with a single light in the darkness", "[00:04.50 - 00:08.50] And then we built the product"].join("\n"));
  await page.getByTestId("import-script").click();
  await page.getByTestId("line-T001").waitFor();

  // ---------------------------------------------------------------- 1 the concept asks for the user's asset
  await page.getByTestId("text-T001").click();
  await page.getByTestId("create-fullscreen").click();
  await page.getByTestId("generate-claude").waitFor({ timeout: 30000 });
  await page.getByTestId("generate-claude").click();
  await waitFor(async () => !!reqFor("S01", "concepts"), "the concepts request");
  const opts = (asset) => ({
    title: "", system: "C", enter: "rises out of black, blur to sharp", move: "floats, slow camera push, the glow breathes", exit: "push-through fade", sound: "riser into a soft hit", ...asset,
  });
  writeFileSync(path.join(tmp, "concepts.json"), JSON.stringify({
    recommend: "C",
    options: {
      A: opts({ title: "Light-streak statement", description: "two blue light streaks cross behind the line", refs: ["FUL-006"], styleRef: "FUL-006", family: "LIGHT-STREAK" }),
      B: opts({ title: "Aurora headline", description: "the line stacked on a blue aurora", refs: ["FUL-063"], styleRef: "FUL-063", family: "AURORA-GRADIENT" }),
      C: opts({ title: "The single light", description: "a glowing glass sphere rises out of darkness and floats centre frame", refs: ["FUL-002"], styleRef: "FUL-002", family: "HORIZON-ARC",
        assets: [{ id: "A1", what: "a glowing glass sphere", spec: "PNG, transparent background, front view, soft top light, at least 900 px tall" }] }),
    },
  }));
  r = ed("write the concepts", "propose", SLUG, "--request", reqFor("S01", "concepts").id, "--file", path.join(tmp, "concepts.json"));
  await page.getByTestId("needs-C").waitFor({ timeout: 15000 });
  const needsC = (await page.getByTestId("needs-C").innerText()).replace(/\s+/g, " ");
  check(1, r.status === 0 && /A1/.test(needsC) && /glowing glass sphere/.test(needsC) && /transparent background/.test(needsC) && (await page.getByTestId("needs-A").count()) === 0,
    `concept C asks for the user's asset on its card: "${needsC}" (A and B need none)`);

  // ---------------------------------------------------------------- 2 choosing it: the build waits for the asset
  await page.getByTestId("choose-C").click();
  await page.getByTestId("assets-missing").waitFor({ timeout: 20000 });
  const missingText = await page.getByTestId("assets-missing").innerText();
  const implReq = reqFor("S01", "implement");
  const pending = ed("pending", "pending", SLUG);
  writeFileSync(path.join(tmp, "build-early.json"), JSON.stringify({ beat: { kind: "AssetScene", props: { asset: "projects/x.png", outAt: 3 } }, coverage: [{ item: "x", done: true }] }));
  const early = ed("build before the asset exists", "built", SLUG, "--request", implReq.id, "--file", path.join(tmp, "build-early.json"));
  check(2, /can't build this scene until you add: A1/.test(missingText) && /WAITING FOR THE USER'S ASSETS: A1/.test(pending.out) && early.status !== 0 && /needs the user's 3D assets \['A1'\]/.test(early.out) && reqFor("S01", "implement").status === "pending",
    `Studio: "${missingText.trim()}"; pending says WAITING FOR THE USER'S ASSETS: A1; built refused, ${implReq.id} still pending`);

  // ---------------------------------------------------------------- 3 the user uploads it in the Studio
  await page.getByTestId("asset-upload-A1").setInputFiles(spherePng);
  await waitFor(async () => !!segOf("S01").assets?.A1, "the A1 upload in edit.json");
  await page.getByTestId("assets-missing").waitFor({ state: "detached", timeout: 15000 });
  const a1 = segOf("S01").assets.A1;
  const a1Disk = path.join(APP, "public", a1.file);
  const thumbOk = await page.getByTestId("asset-need-A1").locator("img").evaluate((img) => img.complete && img.naturalWidth > 0);
  check(3, a1.file === `projects/${SLUG}/assets/S01_A1_glass-sphere.png` && a1.kind === "image" && a1.what === "a glowing glass sphere" && existsSync(a1Disk) && sha(a1Disk) === pngSha && sha(spherePng) === pngSha && thumbOk,
    `uploaded -> ${a1.file} (identical copy; the original is untouched), thumbnail shown, "missing" warning gone`);

  // ---------------------------------------------------------------- 4 a build that ignores the asset is refused
  writeFileSync(path.join(tmp, "build-drawn.json"), JSON.stringify({ beat: { kind: "StatementScene", props: { lines: ["a single light"], outAt: 2.8 } }, coverage: [{ item: "sphere", done: true, how: "drew it with a gradient" }] }));
  const drawn = ed("build without the asset", "built", SLUG, "--request", implReq.id, "--file", path.join(tmp, "build-drawn.json"));
  check(4, drawn.status !== 0 && /not in the beat props/.test(drawn.out) && reqFor("S01", "implement").status === "pending",
    "a build that redraws the object instead of using the user's asset is refused");

  // ---------------------------------------------------------------- 5 Remotion renders it with the user's image
  const MATCH = [
    { quality: "one light source in a black frame (FUL-002)", done: true, how: "void stage, top spotlight, accent glow behind the sphere" },
    { quality: "the subject fills the frame", done: true, how: "asset at 42 % of the frame height" },
    { quality: "depth: contact shadow and haze", done: true, how: "contact shadow + vignette" },
    { quality: "horizon arc light", done: false, why: "this concept centres the user's sphere instead of a horizon" },
  ];
  const buildS01 = (outAt, match) => ({
    beat: { kind: "AssetScene", props: { asset: a1.file, enter: "rise", headline: ["a single light", "in the darkness"], accentLine: 0, outAt } },
    notes: "the user's sphere staged full-screen",
    coverage: [{ item: "sphere rises out of black", done: true, how: "AssetScene enter rise with blur to sharp" }, { item: "glow breathes, slow push", done: true, how: "accent glow + camera push" }],
    ...(match ? { match } : {}),
  });
  // 8 the quality gate: preview first, build exactly what was previewed, account for the reference
  writeFileSync(path.join(tmp, "build-S01.json"), JSON.stringify(buildS01(3.0, MATCH)));
  const unpreviewed = ed("build without a preview", "built", SLUG, "--request", implReq.id, "--file", path.join(tmp, "build-S01.json"));
  const pv1 = ed("preview + compare", "preview", SLUG, "--request", implReq.id, "--file", path.join(tmp, "build-S01.json"));
  const sheet = path.join(REPO, "work", SLUG, "previews", "S01_try1_compare.png");
  writeFileSync(path.join(tmp, "build-S01-changed.json"), JSON.stringify(buildS01(2.9, MATCH)));
  const changed = ed("build a beat that was not previewed", "built", SLUG, "--request", implReq.id, "--file", path.join(tmp, "build-S01-changed.json"));
  writeFileSync(path.join(tmp, "build-S01-nomatch.json"), JSON.stringify(buildS01(3.0, null)));
  const nomatch = ed("build without a match list", "built", SLUG, "--request", implReq.id, "--file", path.join(tmp, "build-S01-nomatch.json"));
  const built = ed("build with the asset", "built", SLUG, "--request", implReq.id, "--file", path.join(tmp, "build-S01.json"));
  const ver1 = segOf("S01").versions?.at(-1) ?? {};
  check(8, unpreviewed.status !== 0 && /preview it first/.test(unpreviewed.out) && pv1.status === 0 && existsSync(sheet) && /S01_try1_compare\.png/.test(pv1.out) &&
    changed.status !== 0 && /differs from preview 1/.test(changed.out) && nomatch.status !== 0 && /match missing/.test(nomatch.out) &&
    built.status === 0 && ver1.match?.length === 4 && /S01_try1_compare\.png$/.test(ver1.compare ?? ""),
    "unpreviewed build refused; preview rendered key frames next to FUL-002 (S01_try1_compare.png); a changed beat and a missing match list refused; the build keeps the sheet and the match");
  const still1 = path.join(REPO, "work", SLUG, "previews", "S01_v1.png");
  await page.getByTestId("version-still").waitFor({ timeout: 20000 });
  const m1 = existsSync(still1) ? magenta(still1) : 0;
  await seekTo(2.6);
  const inPlayer = await page.locator(`[data-testid=player] img[src*="S01_A1_glass-sphere.png"]`).count();
  await page.getByTestId("match").waitFor({ timeout: 15000 });
  const sheetLink = await page.getByTestId("compare-sheet").getAttribute("href");
  check(5, built.status === 0 && reqFor("S01", "implement").status === "completed" && m1 > 0.05 && inPlayer > 0 && /S01_try1_compare\.png/.test(sheetLink ?? ""),
    `Remotion rendered S01 v1 with the user's sphere (${(m1 * 100).toFixed(1)}% of the still is the sphere), the Player shows the same file, and the Studio shows the reference match + comparison sheet`);
  await shot("01-asset-scene");

  // ---------------------------------------------------------------- 6 the user's own video asset for their idea D
  await page.getByTestId("text-T002").click();
  await page.getByTestId("create-fullscreen").click();
  // the panel must show the new scene before typing (otherwise D would go to S01)
  await waitFor(async () => /And then we built the product/.test((await page.getByTestId("seg-text").textContent().catch(() => "")) ?? ""), "the S02 panel", 30000);
  await page.getByTestId("d-text").fill("Show my product turning slowly in the middle of a dark stage, then zoom through it.");
  await page.getByTestId("choose-D").click();
  await page.getByTestId("assets-panel").waitFor({ timeout: 20000 });
  await page.getByTestId("asset-own-note").fill("my product, turning");
  await page.getByTestId("asset-upload-own").setInputFiles(sphereMov);
  await waitFor(async () => !!segOf("S02").assets?.U1, "the U1 upload in edit.json", 60000);
  const u1 = segOf("S02").assets.U1;
  const u1Disk = path.join(APP, "public", u1.file);
  const probe = JSON.parse(execSync(`ffprobe -v error -show_entries stream=codec_name:stream_tags=alpha_mode -of json "${u1Disk}"`).toString()).streams[0];
  const dReq = reqFor("S02", "implement");
  const show = ed("show D", "show", SLUG, "--request", dReq.id);
  const ignored = ed("build D without the user's asset", "built", SLUG, "--request", dReq.id, "--file", path.join(tmp, "build-drawn.json"));
  writeFileSync(path.join(tmp, "build-S02.json"), JSON.stringify({
    beat: { kind: "AssetScene", props: { asset: u1.file, enter: "zoom", look: "studio", outAt: 3.2 } },
    coverage: [{ item: "my product turning in the middle of a dark stage", done: true, how: "AssetScene studio look with the user's WebM" }, { item: "zoom through it", done: true, how: "push-through exit" }],
    match: [
      { quality: "the user's product is the hero", done: true, how: "their WebM centred at 42 % of the frame height" },
      { quality: "dark stage with a floor", done: true, how: "studio look" },
      { quality: "light from above", done: true, how: "spotlight + accent glow" },
      { quality: "a library style reference", done: false, why: "the user's own idea came without one" },
    ],
  }));
  ed("preview + compare D", "preview", SLUG, "--request", dReq.id, "--file", path.join(tmp, "build-S02.json"));
  const builtD = ed("build D with the user's asset", "built", SLUG, "--request", dReq.id, "--file", path.join(tmp, "build-S02.json"));
  const still2 = path.join(REPO, "work", SLUG, "previews", "S02_v1.png");
  const m2 = existsSync(still2) ? magenta(still2) : 0;
  await seekTo(6.5);
  const vidInPlayer = await page.locator(`[data-testid=player] video[src*="S02_U1_product-turn.webm"]`).count();
  check(6, u1.kind === "video" && u1.note === "my product, turning" && u1.file.endsWith("S02_U1_product-turn.webm") && probe.codec_name === "vp9" && probe.tags?.alpha_mode === "1" &&
    sha(sphereMov) === movSha && /the user's own asset \(use it\)/.test(show.out) && ignored.status !== 0 && /\['U1'\]/.test(ignored.out) &&
    builtD.status === 0 && m2 > 0.03 && vidInPlayer > 0,
    `MOV -> ${path.basename(u1.file)} (VP9 with alpha); D must use it (a build without it is refused); Remotion rendered it (${(m2 * 100).toFixed(1)}% sphere) and the Player plays it`);
  await shot("02-own-video");

  // ---------------------------------------------------------------- 7 reopen
  await page.goto(`${BASE}/?project=${SLUG}`);
  await page.getByTestId("seg-S01").click();
  await page.getByTestId("asset-need-A1").waitFor({ timeout: 15000 });
  const reopened = await page.getByTestId("asset-need-A1").innerText();
  check(7, /✓ glass-sphere\.png/.test(reopened) && segOf("S02").assets.U1.file === u1.file && docOf().beats.length === 2,
    "after reopening: A1 provided (✓ glass-sphere.png), the own video on S02, both scenes on the timeline");
  check("errors", pageErrors.length === 0, `no page errors (${pageErrors.slice(0, 2).join(" | ")})`);
} catch (e) {
  check("run", false, String(e.stack ?? e));
  await shot("error").catch(() => {});
} finally {
  await browser.close();
  try {
    process.kill(-vite.pid, "SIGTERM");
  } catch {
    // already stopped
  }
  if (!keep) {
    spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", SLUG, "--remove"]);
    rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}
const failed = results.filter((x) => !x.ok);
if (failed.length && viteLog) console.log("\n--- Studio server log (tail) ---\n" + viteLog.split("\n").slice(-30).join("\n"));
console.log(`\n${results.length - failed.length}/${results.length} checks passed${keep ? ` (kept: ${tmp}, project ${SLUG})` : ""}`);
process.exit(failed.length ? 1 : 0);
