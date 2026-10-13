// End-to-end functional test of the Creative Director Studio (npm run studio:test).
// Drives the real UI in Chromium against a fresh project built from SYNTHETIC
// footage (8 s, 1080x1920, 30 fps, TTS dialogue at known times) and a synthetic
// test sound library, with a user-provided timestamped script. Verifies:
//  1 transcript selection -> correct timeline range      5 SFX synchronised with animation frames
//  2 adding an animation creates a Remotion timeline item 6 exported MP4 has the animation at the right times
//  3 choosing a concept changes the active design         7 original duration + dialogue unchanged
//  4 editing properties updates the Remotion Player       8 decisions saved and reopened
// Usage: node studio/tests/e2e.mjs [--keep]
import { execSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright"));
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = path.resolve(APP, "..", ".claude", "skills", "video-editing", "scripts");
const SLUG = "studio-e2e";
const PORT = 3010;
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");
const tmp = mkdtempSync(path.join(os.tmpdir(), "studio_e2e_"));
const results = [];
const check = (n, ok, msg) => {
  results.push({ n, ok, msg });
  console.log(`${ok ? "PASS" : "FAIL"}  [${n}] ${msg}`);
};
const py = (code) => spawnSync("python3", ["-c", code], { cwd: SCRIPTS, encoding: "utf8", env: { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") } });

// ---------------------------------------------------------------- fixtures
console.log(`temp: ${tmp}`);
let r = py(`
import sys; sys.path.insert(0, '.')
from pathlib import Path
import edit_selftest as E, sound_selftest as S
d = Path(${JSON.stringify(tmp)})
print(E.footage(d)); S.fixtures(d / 'SYNTHETIC_TEST_LIBRARY')
`);
if (r.status) throw new Error(r.stderr);
const footage = path.join(tmp, "my-cut.mp4");
r = spawnSync("python3", [path.join(SCRIPTS, "sfx_index.py"), "scan", path.join(tmp, "SYNTHETIC_TEST_LIBRARY")], { env: { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") }, encoding: "utf8" });
if (r.status) throw new Error(r.stderr);
const sha0 = execSync(`sha256sum ${footage}`).toString().split(" ")[0];
// the user's own timestamped script (the 4th line has no end time: it must be flagged, not guessed)
const SCRIPT = ["[00:00.40 - 00:02.30] What is the big picture here", "[00:02.70 - 00:04.36] We posted every day", "[00:05.70 - 00:07.84] And that changed everything for us", "[00:07.88] Thanks"].join("\n");

// ---------------------------------------------------------------- server
spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", SLUG, "--remove"]);
rmSync(path.join(APP, "..", "work", SLUG), { recursive: true, force: true });
try {
  await fetch(`${BASE}/api/projects`);
  throw new Error(`port ${PORT} is already in use: stop the running Studio (npm run studio) first`);
} catch (e) {
  if (String(e.message).startsWith("port")) throw e;
}
const vite = spawn(path.join(APP, "node_modules", ".bin", "vite"), ["--config", "vite.config.ts"], {
  detached: true, // own process group, so the whole server tree is stopped at the end
  cwd: APP,
  env: { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") },
  stdio: ["ignore", "pipe", "pipe"],
});
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
const docOnDisk = () => JSON.parse(readFileSync(path.join(APP, "src", "projects", SLUG, "edit.json"), "utf8"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const shot = (name) => page.screenshot({ path: path.join(tmp, `${name}.png`) });
const timecodeFrame = async () => parseInt((await page.getByTestId("timecode").textContent()).match(/frame (\d+)/)[1], 10);
const playerText = async () => (await page.getByTestId("player").innerText()).replace(/\s+/g, " ");
const playerPng = () => page.getByTestId("player").screenshot();
const seekTo = async (t) => {
  await page.evaluate(() => 0);
  const lane = page.getByTestId("ruler");
  const box = await lane.boundingBox();
  const total = docOnDisk().source.durationInFrames / docOnDisk().source.fps;
  await page.mouse.click(box.x + (box.width * t) / total, box.y + 5);
  await page.waitForTimeout(400);
};

try {
  // ---------------------------------------------------------------- import video + script
  await page.goto(BASE);
  await page.getByPlaceholder("/path/to/my-cut.mp4").fill(footage);
  await page.getByPlaceholder("project-name").fill(SLUG);
  await page.getByRole("button", { name: "Import video" }).click();
  await page.getByTestId("import-panel").waitFor({ timeout: 60000 });
  const h264 = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.640028"') !== "");
  if (!h264) check("proxy", await page.getByTestId("needs-proxy").isVisible(), "browser without H.264: the Player asks for a preview proxy instead of failing");
  await page.getByTestId("make-proxy").click();
  await page.getByText("preview proxy on").waitFor({ timeout: 120000 });
  await page.getByTestId("script-input").fill(SCRIPT);
  await page.getByTestId("import-script").click();
  await page.getByTestId("line-T001").waitFor();
  let doc = docOnDisk();
  const t = doc.transcript.segments;
  check("script", t.length === 4 && t[1].start === 2.7 && t[1].end === 4.36 && t[1].text === "We posted every day" && t[3].end === null,
    `script imported as written: ${t.length} lines, T002 = ${t[1].start}-${t[1].end} "${t[1].text}", T004 end = ${t[3].end} (missing, not guessed)`);
  const flagged = await page.getByTestId("line-T004").innerText();
  check("script", /missing end time/.test(flagged), `missing timestamp flagged in the UI: "${flagged.replace(/\s+/g, " ").slice(0, 80)}"`);
  await page.getByTestId("end-T004").fill("00:07.99");
  await page.getByTestId("end-T004").press("Enter");
  await page.waitForTimeout(900);
  check("script", docOnDisk().transcript.segments[3].end === 7.99 && !/missing end/.test(await page.getByTestId("line-T004").innerText()), "the user's correction (00:07.99) saved to edit.json and the flag cleared");

  // ---------------------------------------------------------------- 1 transcript selection -> timeline range
  await page.reload();
  await page.getByTestId("text-T002").click();
  await page.waitForTimeout(500);
  const selStart = await page.getByTestId("sel-start").textContent();
  const selEnd = await page.getByTestId("sel-end").textContent();
  const f = await timecodeFrame();
  const rangeBox = await page.getByTestId("range").boundingBox();
  const laneBox = await page.getByTestId("script-lane").boundingBox();
  const rangeStart = ((rangeBox.x - laneBox.x) / laneBox.width) * 8;
  check(1, selStart === "00:02.70" && selEnd === "00:04.36" && f === 81 && Math.abs(rangeStart - 2.7) < 0.05,
    `clicking "We posted every day" selects ${selStart}-${selEnd}, player jumps to frame ${f} (2.70 s x 30 fps = 81), timeline range starts at ${rangeStart.toFixed(2)} s`);
  // timeline range -> transcript highlight
  await page.getByTestId("tab-creative").click();
  const box = laneBox;
  await page.mouse.move(box.x + (box.width * 5.9) / 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + (box.width * 6.6) / 8, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const t3sel = (await page.getByTestId("line-T003").getAttribute("class")).includes("selected");
  const selText = await page.getByTestId("sel-text").textContent();
  check(1, t3sel && /And that changed everything for us/.test(selText), `dragging 5.9-6.6 s on the timeline highlights T003 and shows its exact words: ${selText}`);

  // ---------------------------------------------------------------- 2 + 3 segment, A/B/C, previews, choose
  await page.getByTestId("text-T002").click();
  await page.getByTestId("create-onscreen").click();
  await page.getByTestId("option-A").waitFor({ timeout: 30000 });
  check("abcd", (await page.getByTestId("seg-text").textContent()).includes("We posted every day") && (await page.getByTestId("seg-start").textContent()) === "00:02.70" && (await page.getByTestId("seg-end").textContent()) === "00:04.36",
    "segment panel shows the exact spoken text, 00:02.70 and 00:04.36");
  for (const k of ["A", "B", "C"]) {
    await page.getByTestId(`render-preview-${k}`).click();
    await page.getByTestId(`preview-${k}`).waitFor({ timeout: 120000 });
  }
  const sizes = await Promise.all(["A", "B", "C"].map((k) => page.getByTestId(`preview-${k}`).evaluate((img) => img.naturalWidth)));
  check("abcd", sizes.every((w) => w === 540), `real Remotion previews rendered for A, B, C (renderStill, ${sizes.join("/")} px wide)`);
  await shot("01-options");
  await seekTo(3.8);
  const before = await playerPng();
  await page.getByTestId("choose-A").click();
  await page.getByTestId("beat-S01").waitFor({ timeout: 30000 });
  doc = docOnDisk();
  const beatA = doc.beats.find((b) => b.id === "S01");
  const bs = parseFloat(await page.getByTestId("beat-S01").getAttribute("data-start"));
  const be = parseFloat(await page.getByTestId("beat-S01").getAttribute("data-end"));
  check(2, beatA && beatA.kind === "UiCard" && beatA.at === 2.7 && Math.abs(bs - 2.7) < 0.034 && Math.abs(be - 4.36) < 0.034,
    `choosing A created a Remotion timeline item: ${beatA?.kind} at ${beatA?.at} s, window ${bs.toFixed(3)}-${be.toFixed(3)} s (segment 2.70-4.36)`);
  await seekTo(3.8);
  const withA = await playerPng();
  const textA = await playerText();
  check(2, !before.equals(withA) && /We posted every day/.test(textA), `the Remotion Player now shows the animation at 3.8 s (player DOM: "${textA.slice(0, 60)}")`);
  await page.getByTestId("tab-creative").click();
  await page.getByTestId("choose-C").click();
  await page.waitForTimeout(1200);
  doc = docOnDisk();
  const beatC = doc.beats.find((b) => b.id === "S01");
  await seekTo(3.8);
  const withC = await playerPng();
  check(3, doc.segments[0].decision.choice === "C" && beatC.props.active === 0 && JSON.stringify(beatC.props) !== JSON.stringify(beatA.props) && !withA.equals(withC),
    `choosing C replaced the design (props ${JSON.stringify(beatC.props).slice(0, 70)}...) and the Player picture changed`);

  // ---------------------------------------------------------------- 4 edit properties -> Player
  await page.getByTestId("beat-S01").click();
  await page.getByTestId("props-panel").waitFor();
  await page.getByTestId("prop-rows.0.title").fill("Every single day");
  await page.waitForTimeout(700);
  await seekTo(3.8);
  const edited = await playerText();
  await page.waitForTimeout(800);
  check(4, /Every single day/.test(edited) && docOnDisk().beats[0].props.rows[0].title === "Every single day",
    `editing the title in the inspector updates the Remotion Player ("${edited.slice(0, 50)}") and edit.json`);
  await page.getByTestId("beat-at").fill("2.8");
  await page.waitForTimeout(800);
  const moved = parseFloat(await page.getByTestId("beat-S01").getAttribute("data-start"));
  check(4, Math.abs(moved - 2.8) < 0.034, `changing the start time moves the timeline item to ${moved.toFixed(3)} s`);
  await page.getByTestId("beat-at").fill("2.7");
  await page.waitForTimeout(800);

  // ---------------------------------------------------------------- more segments: full-screen + text
  await page.getByTestId("tab-creative").click();
  await page.getByTestId("text-T003").click();
  await page.getByTestId("create-fullscreen").click();
  await page.getByTestId("option-A").waitFor();
  await page.waitForTimeout(800);
  await page.getByTestId("choose-A").click();
  await page.getByTestId("beat-S02").waitFor({ timeout: 30000 });
  await page.getByTestId("text-T001").click();
  await page.getByTestId("create-text").click();
  await page.waitForTimeout(1500);
  await page.getByTestId("d-text").fill("Use B's script accent, but in amber and a bit later");
  await page.getByTestId("d-based").selectOption("B");
  await page.getByTestId("choose-D").click();
  await page.waitForTimeout(1500);
  doc = docOnDisk();
  const sText = doc.segments.find((s) => s.text.startsWith("What is"));
  check("abcd", sText?.decision?.choice === "D" && /amber/.test(sText.decision.custom) && doc.beats.some((b) => b.segmentId === sText.id),
    `option D recorded with the user's words ("${sText?.decision?.custom}") and built from B on the timeline`);

  // ---------------------------------------------------------------- 5 SFX on the audio track, linked to animation events
  doc = docOnDisk();
  const sfx = doc.sfx.filter((s) => s.sound);
  const s0 = doc.sfx.find((s) => s.id.startsWith("S01"));
  await page.getByTestId(`sfx-${s0.id}`).click(); // clicking a diamond opens its segment's sounds
  const t0 = parseFloat(await page.getByTestId(`sfx-${s0.id}`).getAttribute("data-time"));
  await page.getByTestId(`sfx-offset-${s0.id}`).fill("2");
  await page.waitForTimeout(800);
  const t1 = parseFloat(await page.getByTestId(`sfx-${s0.id}`).getAttribute("data-time"));
  check(5, sfx.length >= 3 && Math.abs(t1 - t0 - 2 / 30) < 1e-6, `${doc.sfx.length} SFX on the SFX track (${sfx.length} with test sounds), presets ${[...new Set(doc.sfx.map((s) => s.family + " " + s.gainDb))].join(", ")} dB; +2 frames offset moved ${s0.id} from ${t0.toFixed(3)} to ${t1.toFixed(3)} s`);
  await page.getByTestId(`sfx-offset-${s0.id}`).fill("0");
  await page.waitForTimeout(900);

  // ---------------------------------------------------------------- approvals, preview, export
  await page.getByTestId("tab-creative").click();
  await page.getByTestId("seg-S01").click();
  await page.getByTestId("direction-quote").fill("Approved, build it (e2e test)");
  await page.getByTestId("approve-direction").click();
  await page.getByTestId("direction-approved").waitFor();
  await page.getByTestId("tab-export").click();
  check("gate", await page.getByTestId("export-final").isDisabled(), "Export final is disabled before the final approval");
  await page.getByTestId("render-preview").click();
  await page.getByTestId("preview-video").waitFor({ timeout: 300000 });
  const prevFile = readdirSafe(path.join(APP, "..", "work", SLUG, "previews")).filter((x) => x.endsWith(".mp4"));
  check("preview", prevFile.length > 0, `half-resolution motion preview rendered with Remotion: ${prevFile.join(", ")}`);
  await page.getByTestId("approve-quote").fill("Previews look right (e2e test)");
  await page.getByTestId("approve-preview").click();
  await page.waitForTimeout(800);
  await page.getByTestId("approve-quote").fill("Approved, render the final (e2e test)");
  await page.getByTestId("approve-final").click();
  await page.waitForTimeout(800);
  await page.getByTestId("export-final").click();
  await page.getByTestId("final-path").waitFor({ timeout: 900000 }).catch(() => {});
  const status = await page.getByTestId("job-status").textContent();
  const log = await page.locator("[data-testid=job] pre").textContent();
  await shot("02-exported");
  const finalPath = (await page.getByTestId("final-path").textContent().catch(() => "")).replace("Final: ", "").trim();
  check(7, status === "done" && /0 errors/.test(log), `final export job: ${status}; ${(log.match(/\d+ errors, \d+ warnings[^\n]*/g) ?? []).join(" | ")}`);

  // ---------------------------------------------------------------- 6 + 7 + 5 measured on the exported file
  const fin = docOnDisk();
  const measure = spawnSync("python3", ["-c", `
import json, subprocess, numpy as np, sys
sys.path.insert(0, ${JSON.stringify(SCRIPTS)})
import audiolib as A
fin, src = ${JSON.stringify(finalPath)}, ${JSON.stringify(footage)}
doc = json.load(open(${JSON.stringify(path.join(APP, "src", "projects", SLUG, "edit.json"))}))
fps = doc["source"]["fps"]
def frame(p, n):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-vf",f"select=eq(n\\\\,{n}),scale=135:240,format=gray","-frames:v","1","-f","rawvideo","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).astype(float)
def psnr(a,b):
    m=np.mean((a-b)**2); return 99 if m<1e-6 else 10*np.log10(255**2/m)
out = {"beats": []}
tl = json.load(open(${JSON.stringify(path.join(APP, "..", "work", SLUG, "sound", "timeline.json"))}))
for b in tl["beats"]:
    s, e = b["startFrame"], b["endFrame"]
    before = psnr(frame(fin, max(0, s-2)), frame(src, max(0, s-2)))
    inside = psnr(frame(fin, (s+e)//2), frame(src, (s+e)//2))
    after = psnr(frame(fin, min(239, e+2)), frame(src, min(239, e+2))) if e+2 < 240 else None
    out["beats"].append(dict(id=b["id"], start=s/fps, end=e/fps, before=round(before,1), inside=round(inside,1), after=None if after is None else round(after,1)))
info = json.loads(subprocess.run(["ffprobe","-v","error","-count_frames","-show_entries","stream=codec_type,nb_read_frames,width,height,r_frame_rate:format=duration","-of","json",fin],capture_output=True,text=True).stdout)
out["probe"] = info
# SFX onsets in the rendered effect stems vs the Studio's event times
import glob, os
stems = sorted(glob.glob(os.path.join(os.path.dirname(fin), "stems", "*.wav")))
ses = json.load(open(os.path.join(os.path.dirname(fin), "session.json")))
out["placements"] = [dict(id=p["id"], target=p["target_t"], anchor=p["anchor"]) for p in ses["placements"]]
# the Remotion motion preview carries the SFX: preview audio minus source audio is loud only around each event
def pcm(p):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-ac","1","-ar","48000","-f","f32le","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.float32)
prev = pcm(${JSON.stringify(path.join(APP, "..", "work", SLUG, "previews", "preview_v1.mp4"))})
srca = pcm(src)
n = min(len(prev), len(srca)); diff = prev[:n] - srca[:n]
rms = lambda a, b: float(np.sqrt(np.mean(diff[int(a*48000):int(b*48000)]**2)) + 1e-9)
events = [p["target_t"] for p in ses["placements"]]
quiet = [rms(t, t+0.15) for t in np.arange(0, 7.85, 0.05) if all(abs(t - e) > 0.6 for e in events)]
out["preview_sfx"] = dict(events=[round(20*np.log10(max(rms(e-0.1+k*0.05, e-0.05+k*0.05) for k in range(6))),1) for e in events], quiet=round(20*np.log10(max(quiet)),1) if quiet else None)
print(json.dumps(out))
`], { encoding: "utf8" });
  if (measure.status) throw new Error(measure.stderr);
  const m = JSON.parse(measure.stdout);
  for (const b of m.beats) {
    const fullscreen = fin.beats.find((x) => x.id === b.id)?.kind === "StatementScene";
    check(6, b.before > 35 && b.inside < (fullscreen ? 20 : 45) && (b.after === null || b.after > 35),
      `${b.id} ${b.start.toFixed(2)}-${b.end.toFixed(2)} s: frames before/after match the original (PSNR ${b.before}/${b.after ?? "-"} dB), mid-beat frame shows the animation (PSNR ${b.inside} dB vs original)`);
  }
  const v = m.probe.streams.find((s) => s.codec_type === "video");
  check(7, v.width === 1080 && v.height === 1920 && v.nb_read_frames === "240" && Math.abs(parseFloat(m.probe.format.duration) - 8) < 0.034 && v.r_frame_rate === "30/1",
    `exported MP4: ${v.width}x${v.height}, ${v.nb_read_frames} frames, ${m.probe.format.duration} s, ${v.r_frame_rate} fps (source: 240 frames, 8.000 s, 30 fps)`);
  // expected event time of each SFX from the Studio vs. where the mixer anchored it
  const studioTimes = Object.fromEntries((await page.$$eval("[data-testid^=sfx-]", (els) => els.filter((e) => e.dataset.time).map((e) => [e.dataset.testid.replace("sfx-", ""), parseFloat(e.dataset.time)]))));
  const offs = m.placements.map((p) => Math.abs(p.target - (studioTimes[p.id] ?? NaN)));
  check(5, m.placements.length >= 3 && offs.every((d) => d < 1e-3),
    `${m.placements.length} SFX mixed exactly on the Studio's animation event times (max diff ${(Math.max(...offs) * 1000).toFixed(2)} ms); sound_qc measured each anchor on its frame`);
  const ps = m.preview_sfx;
  check(5, ps.events.length >= 3 && ps.quiet !== null && ps.events.every((e) => e > ps.quiet + 10),
    `the Remotion motion preview plays the SFX: preview-minus-original level at each event ${ps.events.join("/")} dBFS vs ${ps.quiet} dBFS away from events`);
  const sha1 = execSync(`sha256sum ${footage}`).toString().split(" ")[0];
  check(7, sha1 === sha0, "the original footage is byte-identical (sha256)");

  // ---------------------------------------------------------------- 8 save + reopen
  await page.goto(BASE);
  await page.getByTestId(`open-${SLUG}`).click();
  await page.getByTestId("beat-S01").waitFor();
  await page.getByTestId("seg-S01").click();
  const reopened = await page.getByTestId("decision").textContent();
  await seekTo(3.8);
  const reText = await playerText();
  await page.getByTestId("tab-export").click();
  const gate = await page.getByTestId("gate-final").textContent();
  check(8, /Decision: C/.test(reopened) && /Every single day/.test(reText) && /approved/.test(gate) && (await page.locator("[data-testid^=beat-]").count()) === 3,
    `reopened from edit.json: decision C, edited text in the Player, 3 timeline items, final approval kept`);
  await shot("03-reopened");
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
    rmSync(path.join(APP, "..", "work", SLUG), { recursive: true, force: true });
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${keep ? ` (kept: ${tmp}, project ${SLUG})` : ""}`);
  if (failed) console.log(viteLog.split("\n").slice(-20).join("\n"));
  process.exit(failed ? 1 : 0);
}

function readdirSafe(d) {
  try {
    return require("node:fs").readdirSync(d);
  } catch {
    return [];
  }
}
