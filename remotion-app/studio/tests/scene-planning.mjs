// End-to-end test: Scene Planning and the Timeline Editor stay in sync (npm run studio:test:plan).
//
// SYNTHETIC cybersecurity cut (14 s, 1080x1920, 30 fps, TTS dialogue) with the user's
// timestamped script (JSON with word timings on one line). Both workspaces are driven
// in Chromium; the Claude Code steps run the real CLI (edit_decisions.py propose / built)
// with the files Claude wrote for these scenes (studio/tests/fixtures/cyber/). A
// SYNTHETIC test sound library (never shipped) proves sound sync through the real mix.
//
//  1 selecting a sentence highlights the correct timeline segment
//  2 editing scene timing updates both views (Scene Planning -> timeline, timeline -> Scene Planning)
//  3 changing scene type updates the project data
//  4 Claude concept selections stay attached to the correct scene
//  5 Remotion renders the approved result
//  6 original footage and dialogue remain unchanged
//  7 sound effects stay synchronized after timing adjustments
//  8 saving and reopening preserves all decisions
// plus every editing category through Remotion in the exported MP4: Captions Only, Captions + UI,
// Halfscreen, Fullscreen, text animation, transitions, sound effects, final export
// Usage: node studio/tests/scene-planning.mjs [--keep]
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
const FIX = path.join(APP, "studio", "tests", "fixtures", "cyber");
const SLUG = "plan-e2e";
const PORT = 3010;
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");
const tmp = mkdtempSync(path.join(os.tmpdir(), "scene_plan_"));
const env = { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") };
const results = [];
const check = (n, ok, msg) => {
  results.push({ n, ok, msg });
  console.log(`${ok ? "PASS" : "FAIL"}  [${n}] ${msg}`);
};
const claude = (label, ...args) => {
  const r = spawnSync("python3", [path.join(SCRIPTS, "edit_decisions.py"), ...args], { cwd: REPO, env, encoding: "utf8" });
  console.log(`      [Claude Code] ${label}: edit_decisions.py ${args.slice(0, 4).join(" ")} -> exit ${r.status}`);
  return { ...r, out: (r.stdout ?? "") + (r.stderr ?? "") };
};
const docOf = () => JSON.parse(readFileSync(path.join(APP, "src", "projects", SLUG, "edit.json"), "utf8"));
const segOf = (id) => docOf().segments.find((s) => s.id === id);
const reqFor = (seg, type) => [...docOf().requests].reverse().find((r) => r.segmentId === seg && r.type === type);
const words = (text, start, step) => text.split(" ").map((w, i) => ({ word: w, start: +(start + i * step).toFixed(2), end: +(start + i * step + step * 0.9).toFixed(2) }));
const SCRIPT = JSON.stringify([
  { start: 0.5, end: 3.6, text: "Most companies find out about a breach months too late" },
  { start: 4.1, end: 7.7, text: "Our system flags suspicious logins in under two seconds", words: words("Our system flags suspicious logins in under two seconds", 4.13, 0.39) },
  { start: 8.3, end: 11.2, text: "So attackers get locked out before they touch your data" },
  { start: 11.8, end: 13.0, text: "That is real protection" },
]);
const PLAN = {
  S01: "Caption under my chin. Small white words 'Most companies find out about a breach', then 'months too late' lands big in the red accent serif.",
  S04: "Lower half: a dark panel with 'real protection' as the headline, three check rows from my earlier lines; I stay visible on top.",
  S03: `Full screen: black background. The words LOCKED OUT type in one letter at a time in big red monospace letters, with a blinking cursor.
After the last letter a padlock icon snaps shut under the text.
Leave with a quick glitch (2-3 frames of horizontal slices jumping sideways), then cut straight back to me.
Sound: a soft keyboard tick per letter and one heavy lock "clunk".`,
};

// ---------------------------------------------------------------- fixtures
console.log(`temp: ${tmp}`);
let r = spawnSync("python3", ["-c", `
import sys; sys.path.insert(0, '.')
from pathlib import Path
import edit_selftest as E, sound_selftest as S
d = Path(${JSON.stringify(tmp)})
lines = [(0.3, "Most companies find out about a breach months too late"), (3.9, "Our system flags suspicious logins in under two seconds"),
         (8.0, "So attackers get locked out before they touch your data"), (11.6, "That is real protection")]
print(E.footage(d, lines, 14)); S.fixtures(d / 'SYNTHETIC_TEST_LIBRARY')
`], { cwd: SCRIPTS, encoding: "utf8" });
if (r.status) throw new Error(r.stderr);
r = spawnSync("python3", [path.join(SCRIPTS, "sfx_index.py"), "scan", path.join(tmp, "SYNTHETIC_TEST_LIBRARY")], { env, encoding: "utf8" });
if (r.status) throw new Error(r.stderr);
const footage = path.join(tmp, "my-cut.mp4");
const sha0 = execSync(`sha256sum ${footage}`).toString().split(" ")[0];

// ---------------------------------------------------------------- server
spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", SLUG, "--remove"]);
rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
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
const T = (id) => page.getByTestId(id);
const attr = async (id, a) => parseFloat(await T(id).getAttribute(a));
const waitFor = async (fn, what, timeout = 20000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await fn().catch(() => false)) return true;
    await page.waitForTimeout(250);
  }
  throw new Error(`timed out waiting for ${what}`);
};
const sfxTimes = async () => Object.fromEntries(await page.$$eval("[data-testid^=sfx-]", (els) => els.filter((e) => e.dataset.time).map((e) => [e.dataset.testid.slice(4), parseFloat(e.dataset.time)])));
const playerText = async () => (await T("player").innerText()).replace(/\s+/g, " ");
const seekTo = async (t) => {
  const box = await T("ruler").boundingBox();
  const d = docOf().source;
  await page.mouse.click(box.x + (box.width * t) / (d.durationInFrames / d.fps), box.y + 5);
  await page.waitForTimeout(500);
};

try {
  // ---------------------------------------------------------------- import, then plan in Scene Planning
  await page.goto(BASE);
  await page.getByPlaceholder("/path/to/my-cut.mp4").fill(footage);
  await page.getByPlaceholder("project-name").first().fill(SLUG);
  await page.getByRole("button", { name: "Import video" }).click();
  await T("import-panel").waitFor({ timeout: 60000 });
  if (await T("make-proxy").isVisible()) {
    await T("make-proxy").click();
    await page.getByText("preview proxy on").waitFor({ timeout: 120000 });
  }
  await T("script-input").fill(SCRIPT);
  await T("import-script").click();
  await T("line-T001").waitFor();
  await T("view-plan").click();
  await T("scene-planning").waitFor();
  await waitFor(async () => (await page.$$eval("[data-testid^=example-]", (els) => els.length === 6 && els.every((e) => e.complete && e.naturalWidth > 0))), "library example images");
  const wordsShown = await T("plan-row-T002").getByTestId("word-timings").innerText();
  const legendImgs = await page.$$eval("[data-testid^=example-]", (els) => els.map((e) => e.complete && e.naturalWidth > 0));
  check("plan", /system/.test(wordsShown) && /4\.13/.test(wordsShown) && legendImgs.length === 6 && legendImgs.every(Boolean) && /No half-screen example/.test(await T("legend-halfscreen").innerText()),
    `Scene Planning shows constants, every line with its times and word timings (line 2), 6 library examples for the scene types and an honest "no half-screen example" note`);
  // constants for the whole edit
  await T("const-accentColor").fill("#ff4d57");
  await T("const-notes").fill("Security brand: calm, precise, no stock hacker clichés.");
  await page.waitForTimeout(900);
  const c0 = docOf().constants;
  check("plan", c0.accentColor === "#ff4d57" && /no stock hacker/.test(c0.notes), `constants saved to edit.json (accent ${c0.accentColor})`);
  // a scene per line
  await T("plan-type-T001").selectOption("captions");
  await T("plan-row-S01").waitFor({ timeout: 30000 });
  await T("plan-type-T002").selectOption("captions-ui");
  await T("plan-row-S02").waitFor({ timeout: 30000 });
  await T("plan-type-T003").selectOption("fullscreen");
  await T("plan-row-S03").waitFor({ timeout: 30000 });
  await T("plan-type-T004").selectOption("halfscreen");
  await T("plan-row-S04").waitFor({ timeout: 30000 });
  await T("plan-onscreen-S04").fill(PLAN.S04);
  await T("plan-onscreen-S01").fill(PLAN.S01);
  await T("plan-onscreen-S03").fill(PLAN.S03);
  await page.waitForTimeout(900);
  let d = docOf();
  const s1 = d.segments.find((s) => s.id === "S01");
  check("plan", s1.start === 0.5 && s1.end === 3.6 && s1.sceneType === "captions" && s1.type === "text" && s1.onScreen === PLAN.S01 && segOf("S03").onScreen === PLAN.S03 &&
    (await T("seg-S01").count()) === 1 && (await T("seg-S03").count()) === 1,
    "choosing a scene type on a line created the scene on its exact times; the plans are in edit.json and the scenes are on the timeline");

  // ---------------------------------------------------------------- 1 sentence -> timeline segment
  await T("plan-spoken-S02").click();
  await page.waitForTimeout(500);
  const lane = await T("script-lane").boundingBox();
  const range = await T("range").boundingBox();
  const total = d.source.durationInFrames / d.source.fps;
  const rs = ((range.x - lane.x) / lane.width) * total;
  const re = ((range.x + range.width - lane.x) / lane.width) * total;
  const segSel = (await T("seg-S02").getAttribute("class")).includes("sel");
  const tc = await T("timecode").textContent();
  check(1, Math.abs(rs - 4.1) < 0.05 && Math.abs(re - 7.7) < 0.05 && segSel && /frame 123/.test(tc) && (await T("plan-row-S02").getAttribute("class")).includes("selected"),
    `clicking the sentence selects ${rs.toFixed(2)}-${re.toFixed(2)} s on the timeline, highlights segment S02 and moves the Player to ${tc}`);

  // ---------------------------------------------------------------- 3 scene type -> project data
  await T("plan-type-S03").selectOption("halfscreen");
  await waitFor(async () => segOf("S03").sceneType === "halfscreen" && segOf("S03").drafts?.A?.kind === "HalfPanel" && (await T("seg-S03").getAttribute("class")).includes("seg-onscreen"), "halfscreen saved");
  const dr = segOf("S03").drafts?.A?.system;
  await T("plan-type-S03").selectOption("fullscreen");
  await waitFor(async () => segOf("S03").sceneType === "fullscreen" && segOf("S03").type === "fullscreen" && segOf("S03").drafts?.A?.system === "C" && (await T("seg-S03").getAttribute("class")).includes("seg-fullscreen"), "fullscreen saved");
  check(3, dr === "A" && segOf("S03").drafts?.A?.system === "C",
    "Halfscreen -> edit.json sceneType halfscreen / type onscreen, the timeline segment moved to the on-screen colour and Quick Drafts were redone for it (HalfPanel templates); back to Fullscreen -> fullscreen everywhere");

  // ---------------------------------------------------------------- 4 Claude concepts stay on their scene
  await T("plan-ask-S02").click();
  await waitFor(async () => reqFor("S02", "concepts")?.status === "pending", "concept request");
  const cr = reqFor("S02", "concepts");
  r = claude("write concepts for S02", "propose", SLUG, "--request", cr.id, "--file", path.join(FIX, "S01-concepts.json"));
  await waitFor(async () => (await T("plan-row-S02").innerText()).includes("Flagged login toast"), "concepts in the S02 row");
  await T("plan-row-S02").getByTestId("choose-A").click();
  await waitFor(async () => reqFor("S02", "implement")?.status === "pending", "implementation request for S02");
  d = docOf();
  const ir = reqFor("S02", "implement");
  check(4, r.status === 0 && cr.brief.plan.sceneType === "captions-ui" && cr.brief.constants.accentColor === "#ff4d57" && Object.keys(d.segments.find((s) => s.id === "S02").concepts).length === 3 &&
    ["S01", "S03"].every((id) => !Object.keys(d.segments.find((s) => s.id === id).concepts).length) && ir.brief.concept.title === "Flagged login toast" && segOf("S02").plan.status === "approved" && segOf("S02").plan.via === "choice",
    `"Ask Claude for Ideas" on S02 -> ${cr.id} (scene type + constants in the brief); the concepts landed on S02 only; choosing A in the S02 row -> ${ir.id} and approved S02's plan`);

  // ---------------------------------------------------------------- approve the plans, Claude Code builds
  await T("plans-quote").fill("These plans are approved (scene planning test)");
  await T("approve-all-plans").click();
  await waitFor(async () => reqFor("S01", "implement") && reqFor("S03", "implement") && reqFor("S04", "implement"), "build requests");
  const b1 = reqFor("S01", "implement").brief;
  const b3 = reqFor("S03", "implement").brief;
  const plansInBriefs = b1.plan.onScreen === PLAN.S01 && b3.plan.onScreen === PLAN.S03 && b1.constants.accentColor === "#ff4d57" && b3.plan.sceneLabel === "Fullscreen";
  const rb = [
    claude("build S01 from its plan", "built", SLUG, "--request", reqFor("S01", "implement").id, "--file", path.join(FIX, "T001-build-plan.json")),
    claude("build S02 (concept A, Captions + UI)", "built", SLUG, "--request", ir.id, "--file", path.join(FIX, "S02-build-captions-ui.json")),
    claude("build S03 from its plan", "built", SLUG, "--request", reqFor("S03", "implement").id, "--file", path.join(FIX, "S02-build-D.json")),
    claude("build S04 (Halfscreen) from its plan", "built", SLUG, "--request", reqFor("S04", "implement").id, "--file", path.join(FIX, "T004-build-half.json")),
  ];
  await waitFor(async () => (await T("beat-S03").count()) === 1 && (await T("beat-S01").count()) === 1 && (await T("beat-S02").count()) === 1 && (await T("beat-S04").count()) === 1, "builds on the timeline", 30000);
  const stillsOk = ["S01", "S02", "S03", "S04"].every((id) => !!segOf(id).versions?.find((v) => v.v === segOf(id).activeVersion)?.still);
  check(5, plansInBriefs && rb.every((x) => x.status === 0) && stillsOk && /built v1/.test(await T("plan-build-S04").innerText()),
    "approving the plans gave Claude Code one request per scene carrying the plan text and constants; all four scenes built, each only after Remotion rendered it (still + clip), and the planning rows show it");

  // ---------------------------------------------------------------- 2 + 7 timing: Scene Planning -> timeline (and sounds)
  const sfx0 = await sfxTimes();
  const s2sfx = Object.keys(sfx0).filter((k) => k.startsWith("S02"));
  const b0 = await attr("beat-S02", "data-start");
  await T("plan-start-S02").fill("00:04.30");
  await T("plan-start-S02").press("Enter");
  await page.waitForTimeout(900);
  const segStart = await attr("seg-S02", "data-start");
  const b1s = await attr("beat-S02", "data-start");
  const sfx1 = await sfxTimes();
  const moved = s2sfx.every((k) => Math.abs(sfx1[k] - sfx0[k] - 0.2) < 1e-3);
  const others = Object.keys(sfx0).filter((k) => !k.startsWith("S02")).every((k) => Math.abs(sfx1[k] - sfx0[k]) < 1e-9);
  check(2, Math.abs(segStart - 4.3) < 1e-6 && Math.abs(b1s - b0 - 0.2) < 0.034 && segOf("S02").start === 4.3,
    `Scene Planning start 4.10 -> 4.30: timeline segment ${segStart}, its animation ${b0.toFixed(2)} -> ${b1s.toFixed(2)} s, edit.json updated`);
  check(7, s2sfx.length >= 2 && moved && others,
    `${s2sfx.length} sounds of S02 moved with it by exactly 0.200 s (${s2sfx.map((k) => `${k} ${sfx0[k].toFixed(3)}->${sfx1[k].toFixed(3)}`).join(", ")}); other scenes' sounds unchanged`);
  // timeline -> Scene Planning: drag the S02 segment back on the timeline
  await T("view-timeline").click();
  await T("seg-S02").waitFor();
  const bx = await T("seg-S02").boundingBox();
  const pps = lane.width / total;
  await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await page.mouse.down();
  await page.mouse.move(bx.x + bx.width / 2 - 0.2 * pps, bx.y + bx.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const dragged = segOf("S02");
  await T("view-plan").click();
  const shownStart = await T("plan-start-S02").inputValue();
  const sfx2 = await sfxTimes();
  const dt = dragged.start - 4.3;
  check(2, Math.abs(dt + 0.2) < 0.05 && shownStart === `00:${dragged.start.toFixed(2).padStart(5, "0")}` && Math.abs((await attr("beat-S02", "data-start")) - (b1s + dt)) < 0.034,
    `dragging the scene on the timeline (${dt.toFixed(3)} s) -> Scene Planning shows ${shownStart}; its animation moved with it`);
  check(7, s2sfx.every((k) => Math.abs(sfx2[k] - sfx1[k] - dt) < 1e-3), `after the timeline drag the S02 sounds moved by the same ${dt.toFixed(3)} s`);

  // ---------------------------------------------------------------- clicking an animation opens its scene plan
  await T("beat-S03").click();
  await page.waitForTimeout(600);
  const inPlan = (await T("plan-row-S03").getAttribute("class")).includes("selected");
  await T("view-timeline").click();
  await T("beat-S01").click();
  await T("scene-card").waitFor();
  const card = await T("scene-card").innerText();
  await T("open-plan").click();
  await T("scene-planning").waitFor();
  await page.waitForTimeout(500);
  check("link", inPlan && /Scene plan S01/.test(card) && /months too late/.test(card) && (await T("plan-row-S01").getAttribute("class")).includes("selected"),
    "clicking an animation on the timeline selects its scene row (Scene Planning) / shows its scene plan in the inspector with a link back (Timeline Editor)");

  // ---------------------------------------------------------------- 5 + 6 + 7 render the approved result
  await T("view-timeline").click();
  await T("tab-creative").click();
  await T("direction-quote").fill("Direction approved (scene planning test)");
  await T("approve-direction").click();
  await T("direction-approved").waitFor();
  await T("tab-export").click();
  await T("render-preview").click();
  await T("preview-video").waitFor({ timeout: 300000 });
  await T("approve-quote").fill("Previews look right (scene planning test)");
  await T("approve-preview").click();
  await page.waitForTimeout(800);
  await T("approve-quote").fill("Approved, render the final (scene planning test)");
  await T("approve-final").click();
  await page.waitForTimeout(800);
  await T("export-final").click();
  await T("final-path").waitFor({ timeout: 900000 }).catch(() => {});
  const status = await T("job-status").textContent();
  const log = await page.locator("[data-testid=job] pre").textContent();
  const finalPath = ((await T("final-path").textContent().catch(() => "")) ?? "").replace("Final: ", "").trim();
  d = docOf();
  const studioT = await sfxTimes();
  const m = JSON.parse(spawnSync("python3", ["-c", `
import json, subprocess, numpy as np, os
fin, src = ${JSON.stringify(finalPath)}, ${JSON.stringify(footage)}
def frame(p, n):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-vf",f"select=eq(n\\\\,{n}),scale=135:240,format=gray","-frames:v","1","-f","rawvideo","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).astype(float)
def psnr(a,b):
    m=np.mean((a-b)**2); return 99 if m<1e-6 else round(10*np.log10(255**2/m),1)
tl = json.load(open(${JSON.stringify(path.join(REPO, "work", SLUG, "sound", "timeline.json"))}))
out = {"beats": []}
for b in tl["beats"]:
    s, e = b["startFrame"], b["endFrame"]
    out["beats"].append(dict(id=b["id"], start=s, end=e, before=psnr(frame(fin, max(0, s-3)), frame(src, max(0, s-3))), inside=psnr(frame(fin, (s+e)//2), frame(src, (s+e)//2)),
                             after=psnr(frame(fin, min(419, e+3)), frame(src, min(419, e+3)))))
def band(a, y0, y1):
    return a.reshape(240, 135)[int(240*y0):int(240*y1)]
cat = {}
f, o = lambda n: frame(fin, n), lambda n: frame(src, n)
cat["captions_band"] = psnr(band(f(75), .52, .70), band(o(75), .52, .70)); cat["captions_face"] = psnr(band(f(75), .15, .45), band(o(75), .15, .45))
cat["text_anim"] = psnr(band(f(30), .52, .70), band(f(90), .52, .70))       # 1.0 s vs 3.0 s into the caption: the lines build up
cat["ui_band"] = psnr(band(f(170), .45, .85), band(o(170), .45, .85)); cat["ui_face"] = psnr(band(f(170), .15, .40), band(o(170), .15, .40))
cat["half_lower"] = psnr(band(f(372), .55, 1.0), band(o(372), .55, 1.0)); cat["half_upper"] = psnr(band(f(372), .05, .45), band(o(372), .05, .45))
cat["full"] = psnr(f(300), o(300))
cat["glitch_vs_before"] = psnr(f(334), f(330)); cat["after_cut"] = psnr(f(337), o(337))
out["cat"] = cat
info = json.loads(subprocess.run(["ffprobe","-v","error","-count_frames","-show_entries","stream=codec_type,nb_read_frames,width,height:format=duration","-of","json",fin],capture_output=True,text=True).stdout)
out["video"] = [s for s in info["streams"] if s["codec_type"]=="video"][0]; out["duration"] = info["format"]["duration"]
ses = json.load(open(fin[:-4] + "_sfx.json"))
out["placements"] = [dict(id=p["id"], target=p["eventTime"]) for p in ses]
print(json.dumps(out))`], { encoding: "utf8" }).stdout || "{}");
  const b2 = m.beats?.find((x) => x.id === "S02");
  check(5, status === "done" && /0 errors, \d+ warnings -> .*edit_qc/.test(log) && m.beats?.length === 4 && m.beats.every((x) => x.before > 35 && x.inside < 45) && Math.abs(b2.start / 30 - dragged.start) < 0.034,
    `final export ${status}: every approved scene is in the picture where its plan says (S02 at ${(b2?.start / 30).toFixed(2)} s after both retimes; frames before each scene match the original, mid-scene frames show the animation)`);
  const sha1 = execSync(`sha256sum ${footage}`).toString().split(" ")[0];
  check(6, sha1 === sha0 && /voice stem identical to source|0 errors/.test(log) && m.video?.nb_read_frames === "420" && Math.abs(parseFloat(m.duration) - 14) < 0.04,
    `original footage byte-identical; export ${m.video?.width}x${m.video?.height}, ${m.video?.nb_read_frames} frames, ${m.duration} s; dialogue checked by sound_qc/edit_qc (${(log.match(/\d+ errors, \d+ warnings[^\n]*/g) ?? []).join(" | ")})`);
  const offs = (m.placements ?? []).map((p) => Math.abs(p.target - (studioT[p.id] ?? NaN)));
  check(7, m.placements?.length >= 3 && offs.every((x) => x < 1e-3),
    `Remotion placed ${m.placements?.length} synthetic test sounds in the final render exactly on the Studio's retimed event times (max ${(Math.max(...offs) * 1000).toFixed(2)} ms)`);
  // every editing category, measured in the exported MP4 (Remotion render) against the original footage
  const c = m.cat ?? {};
  const qcRep = JSON.parse(readFileSync(path.join(path.dirname(finalPath), "edit_qc_report.json"), "utf8"));
  const mix = qcRep.results.filter((x) => x.area === "mix");
  const present = mix.filter((x) => /present at/.test(x.msg));
  check("cat:captions", c.captions_band < 30 && c.captions_face > 35, `Captions Only (S01, CaptionAccent): caption band changed (PSNR ${c.captions_band} dB vs original), face zone untouched (${c.captions_face} dB)`);
  check("cat:captions+ui", c.ui_band < 30 && c.ui_face > 35 && segOf("S02").versions.at(-1).beat.props.caption, `Captions + UI (S02, LoginAlertStack with caption): caption + UI band changed (${c.ui_band} dB), face untouched (${c.ui_face} dB)`);
  check("cat:halfscreen", c.half_lower < 20 && c.half_upper > 35, `Halfscreen (S04, HalfPanel): lower half replaced (${c.half_lower} dB), upper half with the speaker untouched (${c.half_upper} dB)`);
  check("cat:fullscreen", c.full < 20, `Fullscreen (S03, LockdownTitle): whole frame covered mid-scene (${c.full} dB vs original)`);
  check("cat:text-animation", c.text_anim < 35, `text animation: the caption builds up over time (1.0 s vs 3.0 s into it differ: ${c.text_anim} dB)`);
  check("cat:transition", c.glitch_vs_before < 30 && c.after_cut > 35, `transition: the glitch frames differ from the frame before (${c.glitch_vs_before} dB) and the hard cut lands back on the original footage (${c.after_cut} dB)`);
  check("cat:sound", present.length === (m.placements ?? []).length && present.length >= 4 && mix.every((x) => x.level === "PASS"),
    `sound effects: ${present.length} effects placed by Remotion all present in the render at their times; voice untouched, nothing louder than the voice, no clipping (edit_qc mix checks)`);
  check("cat:export", status === "done" && qcRep.errors === 0, `final export: one Remotion render (${path.basename(finalPath)}) holding all of it; edit_qc 0 errors`);
  await shot("01-exported");

  // ---------------------------------------------------------------- 8 save + reopen
  const before = docOf();
  await page.goto(`${BASE}/?project=${SLUG}&view=plan`);
  await T("scene-planning").waitFor();
  await page.waitForTimeout(800);
  const accent = await T("const-accentColor").inputValue();
  const types = await Promise.all(["S01", "S02", "S03", "S04"].map((id) => T(`plan-type-${id}`).inputValue()));
  const onS1 = await T("plan-onscreen-S01").inputValue();
  const st = await Promise.all(["S01", "S02", "S03", "S04"].map((id) => T(`plan-status-${id}`).innerText()));
  await T("plan-abcd-S02").click();
  const reCard = await T("plan-row-S02").innerText();
  const after = docOf();
  check(8, accent === "#ff4d57" && types.join() === "captions,captions-ui,fullscreen,halfscreen" && onS1 === PLAN.S01 && st.every((x) => /plan approved/.test(x)) && /Flagged login toast/.test(reCard) &&
    JSON.stringify(after.segments) === JSON.stringify(before.segments) && JSON.stringify(after.beats) === JSON.stringify(before.beats),
    `reopened: constants, scene types (${types.join(", ")}), plans, approvals, S02's concepts and choice, timings and animations all came back from edit.json unchanged`);
  await shot("02-reopened");
  await seekTo(5.5);
  check("player", /Suspicious sign-in/.test(await playerText()), "the Remotion Player in Scene Planning shows the built S02 animation");
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
  writeFileSync(path.join(tmp, "results.json"), JSON.stringify(results, null, 1));
  if (!keep) {
    spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", SLUG, "--remove"]);
    rmSync(path.join(REPO, "work", SLUG), { recursive: true, force: true });
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${keep ? ` (kept: ${tmp}, project ${SLUG})` : ""}`);
  if (failed) console.log(viteLog.split("\n").slice(-20).join("\n"));
  process.exit(failed ? 1 : 0);
}
