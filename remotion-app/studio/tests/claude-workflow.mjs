// End-to-end test of the Claude Concepts workflow (npm run studio:test:claude).
//
// One cybersecurity talking-head cut (SYNTHETIC footage: 14 s, 1080x1920, 30 fps,
// TTS dialogue) with the user's own timestamped script. The Studio UI is driven
// in Chromium; the Claude Code steps run the real CLI (edit_decisions.py
// pending / show / claim / propose / built) with the concepts and build files
// Claude wrote when it processed these requests in a Claude Code session
// (studio/tests/fixtures/cyber/), and the Remotion components it built
// (src/kit/custom/LoginAlertStack, LockdownTitle). Nothing here calls an AI
// service: in real use those CLI steps are Claude Code working in a session.
//
//  1 a transcript segment can be selected          7 choosing A/B/C/D creates a valid implementation request
//  2 a Claude concept request can be created       8 Claude Code can implement a selected concept with Remotion
//  3 Claude Code can read the pending request      9 the Studio displays the real rendered result
//  4 three concepts can be written back           10 revisions can be requested and processed
//  5 each concept displays a valid reference image 11 existing timeline items remain unchanged
//  6 option D saves the full custom instruction   12 the resulting video renders successfully
// Usage: node studio/tests/claude-workflow.mjs [--keep]
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
const SLUG = "cyber-e2e";
const SO_SLUG = "cyber-script-only";
const PORT = 3010;
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");
const tmp = mkdtempSync(path.join(os.tmpdir(), "claude_wf_"));
const env = { ...process.env, VV_SOUNDS_JSON: path.join(tmp, "sounds.json"), VV_SOUND_DOC: path.join(tmp, "sounds.md") }; // the user's library is empty
const results = [];
const check = (n, ok, msg) => {
  results.push({ n, ok, msg });
  console.log(`${ok ? "PASS" : "FAIL"}  [${n}] ${msg}`);
};
const ed = (...args) => spawnSync("python3", [path.join(SCRIPTS, "edit_decisions.py"), ...args], { cwd: REPO, env, encoding: "utf8" });
const claude = (label, ...args) => {
  const r = ed(...args);
  console.log(`      [Claude Code] ${label}: edit_decisions.py ${args.slice(0, 4).join(" ")} -> exit ${r.status}`);
  return { ...r, out: (r.stdout ?? "") + (r.stderr ?? "") };
};
const docOf = (slug) => JSON.parse(readFileSync(path.join(APP, "src", "projects", slug, "edit.json"), "utf8"));
const reqFor = (slug, seg, type) => [...docOf(slug).requests].reverse().find((r) => r.segmentId === seg && r.type === type);
const SCRIPT = [
  "[00:00.50 - 00:03.60] Most companies find out about a breach months too late",
  "[00:04.10 - 00:07.70] Our system flags suspicious logins in under two seconds",
  "[00:08.30 - 00:11.20] So attackers get locked out before they touch your data",
  "[00:11.80 - 00:13.00] That is real protection",
].join("\n");
const D_TEXT = `Full screen: black background. The words LOCKED OUT type in one letter at a time in big red monospace letters, with a blinking cursor.
After the last letter a padlock icon snaps shut under the text.
Leave with a quick glitch (2-3 frames of horizontal slices jumping sideways), then cut straight back to me.
Sound: a soft keyboard tick per letter and one heavy lock "clunk".`;

// ---------------------------------------------------------------- fixtures: synthetic cut with the cybersecurity script
console.log(`temp: ${tmp}`);
let r = spawnSync("python3", ["-c", `
import sys; sys.path.insert(0, '.')
from pathlib import Path
import edit_selftest as E
lines = [(0.3, "Most companies find out about a breach months too late"), (3.9, "Our system flags suspicious logins in under two seconds"),
         (8.0, "So attackers get locked out before they touch your data"), (11.6, "That is real protection")]
print(E.footage(Path(${JSON.stringify(tmp)}), lines, 14))
`], { cwd: SCRIPTS, encoding: "utf8" });
if (r.status) throw new Error(r.stderr);
const footage = path.join(tmp, "my-cut.mp4");
const sha0 = execSync(`sha256sum ${footage}`).toString().split(" ")[0];
spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x220000:s=320x320", "-frames:v", "1", path.join(tmp, "my-reference.png")]);

// ---------------------------------------------------------------- server
for (const s of [SLUG, SO_SLUG]) {
  spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", s, "--remove"]);
  rmSync(path.join(REPO, "work", s), { recursive: true, force: true });
}
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
const playerText = async () => (await page.getByTestId("player").innerText()).replace(/\s+/g, " ");
const seekTo = async (slug, t) => {
  const box = await page.getByTestId("ruler").boundingBox();
  const d = docOf(slug).source;
  await page.mouse.click(box.x + (box.width * t) / (d.durationInFrames / d.fps), box.y + 5);
  await page.waitForTimeout(500);
};
const statusText = (id) => page.getByTestId(id).textContent();
const waitText = async (id, re, timeout = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const t = await page.getByTestId(id).textContent().catch(() => "");
    if (re.test(t ?? "")) return t;
    await page.waitForTimeout(300);
  }
  throw new Error(`${id} never matched ${re}: "${await page.getByTestId(id).textContent().catch(() => "")}"`);
};
const imgOk = (loc) => loc.evaluate((img) => (img.complete && img.naturalWidth > 0 ? img.naturalWidth : 0));

try {
  // ---------------------------------------------------------------- import the cut + the user's script
  await page.goto(BASE);
  await page.getByPlaceholder("/path/to/my-cut.mp4").fill(footage);
  await page.getByPlaceholder("project-name").first().fill(SLUG);
  await page.getByRole("button", { name: "Import video" }).click();
  await page.getByTestId("import-panel").waitFor({ timeout: 60000 });
  if (await page.getByTestId("make-proxy").isVisible()) {
    await page.getByTestId("make-proxy").click();
    await page.getByText("preview proxy on").waitFor({ timeout: 120000 });
  }
  await page.getByTestId("script-input").fill(SCRIPT);
  await page.getByTestId("import-script").click();
  await page.getByTestId("line-T001").waitFor();

  // an existing timeline item (Quick Draft on the first line) that must stay untouched
  await page.getByTestId("text-T001").click();
  await page.getByTestId("create-text").click();
  await page.getByTestId("set-draft").click();
  await page.getByTestId("draft-choose-A").click();
  await page.getByTestId("beat-S01").waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  const base = docOf(SLUG);
  const keepBeat = JSON.stringify(base.beats.find((b) => b.segmentId === "S01"));
  const keepSfx = JSON.stringify(base.sfx.filter((s) => s.segmentId === "S01"));
  const keepDecision = JSON.stringify(base.segments.find((s) => s.id === "S01").decision);

  // ---------------------------------------------------------------- 1 select the cybersecurity segment
  await page.getByTestId("text-T002").click();
  await page.waitForTimeout(400);
  const ss = await statusText("sel-start");
  const se = await statusText("sel-end");
  const sel = await statusText("sel-text");
  check(1, ss === "00:04.10" && se === "00:07.70" && /Our system flags suspicious logins in under two seconds/.test(sel), `selected ${ss}-${se} ${sel}`);
  await page.getByTestId("create-onscreen").click();
  await page.getByTestId("generate-claude").waitFor({ timeout: 30000 });
  const segText = await statusText("seg-text");
  check(1, /Our system flags suspicious logins/.test(segText) && (await statusText("seg-start")) === "00:04.10" && (await statusText("seg-end")) === "00:07.70",
    `segment S02 created as On-Screen Visual on the exact words and times (${segText})`);

  // ---------------------------------------------------------------- 2 Generate with Claude -> pending request
  await page.getByTestId("generate-claude").click();
  const pend = await waitText("concept-request-status", /waiting for Claude Code/);
  const rq = reqFor(SLUG, "S02", "concepts");
  const b = rq?.brief ?? {};
  check(2, rq && rq.status === "pending" && b.text === "Our system flags suspicious logins in under two seconds" && b.start === 4.1 && b.end === 7.7 && b.category === "onscreen" &&
    b.project === SLUG && b.context.before[0]?.id === "T001" && b.context.after[0]?.id === "T003" && b.decisions.some((x) => x.segmentId === "S01" && x.choice === "A") &&
    b.timeline.some((x) => x.segmentId === "S01") && b.references.suggested.length > 0,
    `UI: "${pend}"; edit.json ${rq?.id}: text, ${b.start}-${b.end} s, ${b.categoryLabel}, context ${b.context?.before?.length}+${b.context?.after?.length} lines, ${b.decisions?.length} decision(s), ${b.timeline?.length} timeline item(s), ${b.references?.suggested?.length} suggested references`);
  check(2, /active Claude Code session/.test(await page.getByTestId("concept-request").innerText()), "the Studio says processing needs an active Claude Code session");

  // ---------------------------------------------------------------- 3 Claude Code reads it
  r = claude("list pending requests", "pending");
  const listed = r.status === 0 && r.out.includes(rq.id) && r.out.includes(SLUG) && r.out.includes("S02");
  r = claude("read the brief", "show", SLUG, "--request", rq.id);
  check(3, listed && r.out.includes('"Our system flags suspicious logins in under two seconds"') && r.out.includes("On-Screen Visual") && r.out.includes("propose") && /ONS-\d{3}/.test(r.out),
    `pending lists ${rq.id}; show prints the exact words, category, suggested references and the command to finish`);
  r = claude("claim", "claim", SLUG, "--request", rq.id);
  const again = claude("claim again", "claim", SLUG, "--request", rq.id);
  const shown = await waitText("concept-request-status", /working on it/);
  check(3, r.status === 0 && again.status !== 0 && /already in progress/.test(again.out), `claimed once (a second claim is refused); the Studio updated by itself: "${shown}"`);

  // ---------------------------------------------------------------- 4 three concepts written back
  const bad = JSON.parse(readFileSync(path.join(FIX, "S01-concepts.json"), "utf8"));
  bad.options.B.refs = ["ONS-999"];
  bad.options.B.styleRef = "ONS-999";
  writeFileSync(path.join(tmp, "bad-concepts.json"), JSON.stringify(bad));
  r = claude("write invalid concepts", "propose", SLUG, "--request", rq.id, "--file", path.join(tmp, "bad-concepts.json"));
  const rejected = r.status !== 0 && /unknown reference IDs \['ONS-999'\]/.test(r.out) && reqFor(SLUG, "S02", "concepts").status === "in_progress" && !Object.keys(docOf(SLUG).segments.find((s) => s.id === "S02").concepts).length;
  r = claude("write the concepts", "propose", SLUG, "--request", rq.id, "--file", path.join(FIX, "S01-concepts.json"));
  const twice = claude("write them again", "propose", SLUG, "--request", rq.id, "--file", path.join(FIX, "S01-concepts.json"));
  const done = await waitText("concept-request-status", /completed/);
  const titles = await Promise.all(["A", "B", "C"].map((k) => statusText(`title-${k}`)));
  const want = ["A", "B", "C"].map((k) => JSON.parse(readFileSync(path.join(FIX, "S01-concepts.json"), "utf8")).options[k].title);
  check(4, rejected && r.status === 0 && twice.status !== 0 && /not processed twice/.test(twice.out) && JSON.stringify(titles) === JSON.stringify(want),
    `invalid concepts rejected before writing; three concepts written (${titles.join(" | ")}); processing ${rq.id} twice refused; Studio: "${done}"`);
  const card = await page.getByTestId("option-A").innerText();
  check(4, /Claude Concept 1/.test(card) && /Enters/.test(card) && /Moves/.test(card) && /Exits/.test(card) && /00:04\.10–00:07\.70/.test(card) && /On-Screen Visual/.test(card) && /suspicious logins/.test(card),
    "each card shows title, description, exact words, time range, category, how elements enter / move / exit");

  // ---------------------------------------------------------------- 5 reference images
  const refs = [];
  for (const k of ["A", "B", "C"]) {
    const w = await imgOk(page.getByTestId(`style-img-${k}`));
    const id = await statusText(`ref-id-${k}`);
    const src = await page.getByTestId(`style-img-${k}`).getAttribute("src");
    const label = await page.getByTestId(`style-ref-${k}`).innerText();
    refs.push({ k, w, id, ok: w > 0 && src === `/api/refimg/${id}` && /STYLE REFERENCE/.test(label) && /not a frame/.test(label) });
  }
  check(5, refs.every((x) => x.ok), `STYLE REFERENCE images from the library: ${refs.map((x) => `${x.k} ${x.id} (${x.w}px)`).join(", ")}`);
  await shot("01-claude-concepts");

  // ---------------------------------------------------------------- 6 option D keeps the full instruction (third line, full-screen)
  await page.getByTestId("text-T003").click();
  await page.getByTestId("create-fullscreen").click();
  await waitText("seg-text", /So attackers get locked out/, 30000);
  await page.waitForTimeout(300);
  await page.getByTestId("d-text").fill(D_TEXT);
  await page.getByTestId("d-upload").setInputFiles(path.join(tmp, "my-reference.png"));
  await page.locator(".upload-thumb").first().waitFor();
  await page.getByTestId("choose-D").click();
  await page.getByTestId("d-saved").waitFor({ timeout: 30000 });
  const dReq = reqFor(SLUG, "S03", "implement");
  const dDec = docOf(SLUG).segments.find((s) => s.id === "S03").decision;
  const dShown = await statusText("d-saved");
  check(6, dDec.custom === D_TEXT && dReq.brief.custom === D_TEXT && dShown === D_TEXT && dReq.brief.uploads?.length === 1,
    `D stored exactly (${D_TEXT.length} chars, 4 lines, quotes) in the decision, the request ${dReq.id} and the Studio; uploaded reference kept: ${path.basename(dReq.brief.uploads?.[0] ?? "")}`);

  // ---------------------------------------------------------------- 7 choosing creates implementation requests
  await page.getByTestId("seg-S02").click();
  await page.getByTestId("choose-A").click();
  await page.getByTestId("build-request").waitFor({ timeout: 30000 });
  const aReq = reqFor(SLUG, "S02", "implement");
  const st7 = await statusText("build-state");
  check(7, aReq.status === "pending" && aReq.brief.choice === "A" && aReq.brief.concept.title === want[0] && aReq.brief.start === 4.1 && aReq.brief.end === 7.7 &&
    dReq.status === "pending" && dReq.brief.choice === "D" && /waiting for Claude Code/.test(st7) && !docOf(SLUG).beats.some((x) => x.segmentId === "S02"),
    `A -> ${aReq.id} (concept "${aReq.brief.concept.title}", 4.1-7.7 s), D -> ${dReq.id}; Studio: "${st7}", nothing new on the timeline yet (no fake build)`);

  // ---------------------------------------------------------------- 8 Claude Code implements with Remotion
  writeFileSync(path.join(tmp, "bad-build.json"), JSON.stringify({ beat: { kind: "GenericTemplate", props: {} }, coverage: [{ item: "x", done: true }] }));
  r = claude("try an unregistered kind", "built", SLUG, "--request", aReq.id, "--file", path.join(tmp, "bad-build.json"));
  const refused = r.status !== 0 && /not registered/.test(r.out) && reqFor(SLUG, "S02", "implement").status === "pending";
  r = claude("build concept A", "built", SLUG, "--request", aReq.id, "--file", path.join(FIX, "S01-build-v1.json"));
  const rD = claude("build D", "built", SLUG, "--request", dReq.id, "--file", path.join(FIX, "S02-build-D.json"));
  let doc = docOf(SLUG);
  const beatA = doc.beats.find((x) => x.segmentId === "S02");
  const beatD = doc.beats.find((x) => x.segmentId === "S03");
  check(8, refused && r.status === 0 && rD.status === 0 && beatA?.kind === "LoginAlertStack" && beatA.at === 4.1 && beatD?.kind === "LockdownTitle" && beatD.at === 8.3 &&
    reqFor(SLUG, "S02", "implement").status === "completed" && reqFor(SLUG, "S03", "implement").status === "completed",
    `unregistered kind refused; ${aReq.id} -> LoginAlertStack @ 4.1 s, ${dReq.id} -> LockdownTitle @ 8.3 s (custom Remotion components in src/kit/custom)`);

  // ---------------------------------------------------------------- 9 the Studio shows the real rendered result
  await waitText("build-state", /built v1/, 20000);
  // D was written last: wait until the Studio has picked it up (it polls edit.json every 1.5 s)
  await page.getByTestId("beat-S03").waitFor({ timeout: 15000 });
  const stillW = await imgOk(page.getByTestId("version-still"));
  const clipHref = await page.getByTestId("version-clip").getAttribute("href");
  const clipFile = path.join(REPO, "work", SLUG, "previews", path.basename(clipHref));
  const clip = JSON.parse(execSync(`ffprobe -v error -show_entries format=duration:stream=width,height -of json ${clipFile}`).toString());
  const startA = parseFloat(await page.getByTestId("beat-S02").getAttribute("data-start"));
  const endA = parseFloat(await page.getByTestId("beat-S02").getAttribute("data-end"));
  await seekTo(SLUG, 6.0);
  const pA = await playerText();
  await seekTo(SLUG, 9.6);
  const pD = await playerText();
  check(9, stillW === 540 && clip.streams[0].width === 540 && Math.abs(parseFloat(clip.format.duration) - 4.6) < 0.1 && Math.abs(startA - 4.1) < 0.02 && Math.abs(endA - 7.7) < 0.02 &&
    /Suspicious sign-in/.test(pA) && /FLAGGED/.test(pA) && /LOCKED OUT/.test(pD),
    `Remotion still (${stillW}px) + clip (${clip.streams[0].width}x${clip.streams[0].height}, ${(+clip.format.duration).toFixed(2)} s) in the Studio; timeline item ${startA}-${endA.toFixed(2)} s; Player at 6.0 s: "${pA.slice(0, 50)}..."; at 9.6 s: "${pD.slice(0, 30)}"`);
  await shot("02-built");

  // ---------------------------------------------------------------- 10 revision
  await page.getByTestId("seg-S02").click();
  const FEEDBACK = "Make the red alert bigger, and let the two green toasts leave first so the red one is alone on screen for a moment before it goes.";
  await page.getByTestId("changes-text").fill(FEEDBACK);
  await page.getByTestId("request-changes").click();
  await waitText("build-state", /waiting for Claude Code/);
  const rev = reqFor(SLUG, "S02", "revision");
  r = claude("apply the revision", "built", SLUG, "--request", rev.id, "--file", path.join(FIX, "S01-build-v2.json"));
  await waitText("build-state", /built v2/, 20000);
  doc = docOf(SLUG);
  const segA = doc.segments.find((s) => s.id === "S02");
  const v1 = segA.versions.find((v) => v.v === 1);
  const v2 = segA.versions.find((v) => v.v === 2);
  check(10, rev.brief.feedback === FEEDBACK && r.status === 0 && v2.beat.props.alertScale === 1.3 && v2.beat.props.calmOutAt === 2.55 && segA.activeVersion === 2 && !!v2.still,
    `${rev.id} carried the feedback verbatim; v2 built (alertScale 1.3, calmOutAt 2.55) and rendered`);
  await page.getByTestId("restore-v1").click();
  await waitText("build-state", /built v1/);
  const restored = docOf(SLUG).beats.find((x) => x.segmentId === "S02");
  // the component changed for v2: v1 must still render exactly as it did
  const rv = await (await fetch(`${BASE}/api/project/${SLUG}/render-version`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ segmentId: "S02" }) })).json();
  const newStill = rv.doc.segments.find((s) => s.id === "S02").versions.find((v) => v.v === 1).still;
  const psnr = spawnSync("python3", ["-c", `
import numpy as np
from PIL import Image
a = np.asarray(Image.open(${JSON.stringify(path.join(REPO, "work", SLUG, "previews", path.basename(v1.still)))}).convert("L"), float)
b = np.asarray(Image.open(${JSON.stringify(path.join(REPO, "work", SLUG, "previews", path.basename(newStill)))}).convert("L"), float)
m = np.mean((a - b) ** 2); print(99 if m < 1e-6 else 10 * np.log10(255 ** 2 / m))`], { encoding: "utf8" });
  const p = parseFloat(psnr.stdout);
  await page.waitForTimeout(1800);
  await page.getByTestId("restore-v2").click();
  await waitText("build-state", /built v2/);
  await page.getByTestId("review-approve").click();
  await page.getByTestId("review-approved").waitFor();
  check(10, JSON.stringify(restored.props) === JSON.stringify(v1.beat.props) && p > 40 && docOf(SLUG).segments.find((s) => s.id === "S02").review.status === "approved",
    `restore v1 put v1 back (and v1 still renders as before: PSNR ${p.toFixed(1)} dB vs its original still); v2 restored and approved`);

  // ---------------------------------------------------------------- 11 existing items untouched
  doc = docOf(SLUG);
  check(11, JSON.stringify(doc.beats.find((b2) => b2.segmentId === "S01")) === keepBeat && JSON.stringify(doc.sfx.filter((s) => s.segmentId === "S01")) === keepSfx &&
    JSON.stringify(doc.segments.find((s) => s.id === "S01").decision) === keepDecision && JSON.stringify(doc.beats.find((b2) => b2.segmentId === "S03")) === JSON.stringify(beatD),
    "the Quick Draft on line 1 (beat, sounds, decision) and the D scene are byte-identical after the build, revision and restores");

  // ---------------------------------------------------------------- sound: empty library, nothing invented
  await page.getByTestId("tab-sound").click();
  const missing = await statusText("sfx-missing");
  check("sound", (await page.getByTestId("no-sounds").isVisible()) && doc.sfx.length > 0 && doc.sfx.every((s) => s.sound === null) && /have no sound asset/.test(missing),
    `empty library shown clearly; ${doc.sfx.length} SFX items linked to animation events, none with an invented sound (${missing})`);

  // ---------------------------------------------------------------- 12 render the video
  await page.getByTestId("tab-creative").click();
  await page.getByTestId("direction-quote").fill("Approved, build it (claude workflow test)");
  await page.getByTestId("approve-direction").click();
  await page.getByTestId("direction-approved").waitFor();
  await page.getByTestId("tab-export").click();
  await page.getByTestId("render-preview").click();
  await page.getByTestId("preview-video").waitFor({ timeout: 300000 });
  await page.getByTestId("approve-quote").fill("Previews look right (claude workflow test)");
  await page.getByTestId("approve-preview").click();
  await page.waitForTimeout(800);
  await page.getByTestId("approve-quote").fill("Approved, render the final (claude workflow test)");
  await page.getByTestId("approve-final").click();
  await page.waitForTimeout(800);
  await page.getByTestId("export-final").click();
  await page.getByTestId("final-path").waitFor({ timeout: 900000 }).catch(() => {});
  const status = await statusText("job-status");
  const log = await page.locator("[data-testid=job] pre").textContent();
  const finalPath = ((await page.getByTestId("final-path").textContent().catch(() => "")) ?? "").replace("Final: ", "").trim();
  await shot("03-exported");
  const m = JSON.parse(spawnSync("python3", ["-c", `
import json, subprocess, numpy as np
fin, src = ${JSON.stringify(finalPath)}, ${JSON.stringify(footage)}
def frame(p, n):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-vf",f"select=eq(n\\\\,{n}),scale=135:240,format=gray","-frames:v","1","-f","rawvideo","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).astype(float)
def psnr(a,b):
    m=np.mean((a-b)**2); return 99 if m<1e-6 else round(10*np.log10(255**2/m),1)
out = {}
for name, s, e in [("alerts", 123, 231), ("lockdown", 249, 336)]:
    out[name] = dict(before=psnr(frame(fin, s-3), frame(src, s-3)), inside=psnr(frame(fin, (s+e)//2), frame(src, (s+e)//2)), after=psnr(frame(fin, e+3), frame(src, e+3)))
info = json.loads(subprocess.run(["ffprobe","-v","error","-count_frames","-show_entries","stream=codec_type,nb_read_frames,width,height,r_frame_rate:format=duration","-of","json",fin],capture_output=True,text=True).stdout)
out["video"] = [s for s in info["streams"] if s["codec_type"]=="video"][0]; out["duration"] = info["format"]["duration"]
print(json.dumps(out))`], { encoding: "utf8" }).stdout || "{}");
  const sha1 = execSync(`sha256sum ${footage}`).toString().split(" ")[0];
  check(12, status === "done" && /edit_qc: 0 errors|0 errors, \d+ warnings -> .*edit_qc/.test(log) && m.video?.nb_read_frames === "420" && m.video.width === 1080 && Math.abs(parseFloat(m.duration) - 14) < 0.04 &&
    m.alerts.before > 35 && m.alerts.after > 35 && m.alerts.inside < 45 && m.lockdown.before > 35 && m.lockdown.after > 35 && m.lockdown.inside < 20 && sha1 === sha0,
    `final export ${status}: ${m.video?.width}x${m.video?.height}, ${m.video?.nb_read_frames} frames, ${m.duration} s; alerts PSNR before/inside/after ${m.alerts?.before}/${m.alerts?.inside}/${m.alerts?.after} dB, lockdown ${m.lockdown?.before}/${m.lockdown?.inside}/${m.lockdown?.after} dB vs the original; original sha256 unchanged; ${(log.match(/\d+ errors, \d+ warnings[^\n]*/g) ?? []).join(" | ")}`);

  // ---------------------------------------------------------------- script-only project + "No matching reference"
  await page.goto(BASE);
  await page.getByTestId("so-slug").fill(SO_SLUG);
  await page.getByTestId("so-duration").fill("14");
  await page.getByTestId("so-create").click();
  await page.getByTestId("import-panel").waitFor({ timeout: 60000 });
  await page.getByTestId("script-input").fill(SCRIPT);
  await page.getByTestId("import-script").click();
  await page.getByTestId("text-T004").click();
  await page.getByTestId("create-text").click();
  await page.getByTestId("generate-claude").click();
  await waitText("concept-request-status", /waiting for Claude Code/);
  const soReq = reqFor(SO_SLUG, "S01", "concepts");
  r = claude("concepts for the script-only project", "propose", SO_SLUG, "--request", soReq.id, "--file", path.join(FIX, "T004-concepts.json"));
  await waitText("concept-request-status", /completed/);
  const noRef = await page.getByTestId("no-ref-C").innerText();
  const soPlayer = await playerText();
  const aImg = await imgOk(page.getByTestId("style-img-A"));
  await page.getByTestId("tab-export").click();
  check("script-only", r.status === 0 && /No matching reference/.test(noRef) && aImg > 0 && /SCRIPT-ONLY/.test(soPlayer) && (await page.getByTestId("export-final").isDisabled()) && (await page.getByTestId("export-blocked").isVisible()),
    `script-only project: placeholder in the Player, concepts work, "No matching reference" shown for C (no unrelated image), final export blocked until the cut is attached`);
  await shot("04-script-only");
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
    for (const s of [SLUG, SO_SLUG]) {
      spawnSync("python3", [path.join(SCRIPTS, "edit_init.py"), "--slug", s, "--remove"]);
      rmSync(path.join(REPO, "work", s), { recursive: true, force: true });
    }
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${keep ? ` (kept: ${tmp}, projects ${SLUG}, ${SO_SLUG})` : ""}`);
  if (failed) console.log(viteLog.split("\n").slice(-20).join("\n"));
  process.exit(failed ? 1 : 0);
}
