#!/usr/bin/env node
// Verifies the renders in out/ produced by `npm run test:render`:
//   - container/codec, dimensions, frame rate, frame count and duration (ffprobe)
//   - audio sync: measured sound onsets vs. the frames they were placed on
//   - footage sync: the footage's white-flash frame vs. its own beep
//   - transparency: the Overlay render keeps a real alpha channel, and is fully
//     clear on the first and last frame (clean entrance and exit)
// Exit code 1 if any check fails.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = (f) => path.join(root, "out", f);
const FPS = 60;
const FRAME = 1 / FPS;
const CARD_LANDS = 78 / FPS; // BEATS.cardIn[1] = 1.3 s -> frame 78
const FOOTAGE_FLASH_FRAME = 150; // from scripts/make-test-media.sh

const has = (bin) => spawnSync(bin, ["-version"], { stdio: "ignore" }).status === 0;
const FFPROBE = process.env.FFPROBE || (has("ffprobe") ? "ffprobe" : null);
const FFMPEG = process.env.FFMPEG || (has("ffmpeg") ? "ffmpeg" : null);
if (!FFPROBE || !FFMPEG) {
  console.error("ffmpeg/ffprobe not found on PATH (set FFMPEG / FFPROBE).");
  process.exit(2);
}

let failures = 0;
const check = (ok, label, detail) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

const probe = (file) => {
  const r = spawnSync(FFPROBE, ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", file], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
};

const raw = (args) => {
  const r = spawnSync(FFMPEG, ["-v", "error", ...args, "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return r.stdout;
};

// Sound onsets: start of each burst that follows >= 80 ms of near-silence.
const audioOnsets = (file) => {
  const buf = raw(["-i", file, "-map", "0:a:0", "-ac", "1", "-ar", "48000", "-f", "f32le"]);
  const s = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const onsets = [];
  let quiet = 48000; // treat the start as silence
  for (let i = 0; i < s.length; i++) {
    if (Math.abs(s[i]) > 0.02) {
      if (quiet >= 0.08 * 48000) onsets.push(i / 48000);
      quiet = 0;
    } else quiet++;
  }
  return onsets;
};

// Mean luma per frame on a tiny downscale.
const frameLuma = (file) => {
  const buf = raw(["-i", file, "-map", "0:v:0", "-vf", "scale=16:16,format=gray", "-f", "rawvideo"]);
  const lumas = [];
  for (let o = 0; o + 256 <= buf.length; o += 256) {
    let sum = 0;
    for (let k = 0; k < 256; k++) sum += buf[o + k];
    lumas.push(sum / 256);
  }
  return lumas;
};

const alphaStats = (file, frame) => {
  const buf = raw([
    "-i", file, "-map", "0:v:0",
    "-vf", `select=eq(n\\,${frame}),alphaextract,scale=108:192,format=gray`,
    "-frames:v", "1", "-f", "rawvideo",
  ]);
  let transparent = 0;
  let opaque = 0;
  for (const v of buf) {
    if (v === 0) transparent++;
    if (v >= 250) opaque++;
  }
  const n = buf.length;
  return { transparent: transparent / n, visible: 1 - transparent / n, opaque: opaque / n };
};

const checkVideo = (p, { codec, pixFmt, frames, bt709 }) => {
  const v = p.streams.find((s) => s.codec_type === "video");
  check(v.codec_name === codec, `codec ${codec}`, v.codec_name);
  check(v.width === 1080 && v.height === 1920, "1080x1920", `${v.width}x${v.height}`);
  check(v.r_frame_rate === "60/1" && v.avg_frame_rate === "60/1", "60 fps (constant)", `r=${v.r_frame_rate} avg=${v.avg_frame_rate}`);
  check(Number(v.nb_read_frames) === frames, `${frames} frames`, v.nb_read_frames);
  const dur = Number(v.duration ?? p.format.duration);
  check(Math.abs(dur - frames / FPS) < FRAME / 2, `video duration ${(frames / FPS).toFixed(3)} s`, `${dur.toFixed(4)} s`);
  check(pixFmt.test(v.pix_fmt), `pixel format ${pixFmt.source}`, v.pix_fmt);
  if (bt709) {
    check(
      v.color_range === "tv" && v.color_space === "bt709" && v.color_primaries === "bt709" && v.color_transfer === "bt709",
      "BT.709, limited (tv) range",
      `${v.color_range}/${v.color_space}/${v.color_primaries}/${v.color_transfer}`,
    );
  }
  return v;
};

const near = (t, target) => Math.abs(t - target) <= FRAME;

// 1. Test composition
const test = out("test-composition.mp4");
console.log(`\n${path.relative(root, test)}`);
if (!existsSync(test)) check(false, "file exists");
else {
  const p = probe(test);
  check(p.format.format_name.includes("mp4"), "MP4 container", p.format.format_name);
  checkVideo(p, { codec: "h264", pixFmt: /^yuv420p$/, frames: 300, bt709: true });
  const a = p.streams.find((s) => s.codec_type === "audio");
  check(Boolean(a) && a.codec_name === "aac", "AAC audio track", a?.codec_name);
  const on = audioOnsets(test);
  check(on.length === 1 && near(on[0], CARD_LANDS), `SFX onset at card landing ${CARD_LANDS.toFixed(3)} s (±1 frame)`, on.map((t) => t.toFixed(4)).join(", "));
}

// 2. Footage composite
const foot = out("footage-composite.mp4");
console.log(`\n${path.relative(root, foot)}`);
if (!existsSync(foot)) check(false, "file exists");
else {
  const p = probe(foot);
  checkVideo(p, { codec: "h264", pixFmt: /^yuv420p$/, frames: 300, bt709: true });
  const luma = frameLuma(foot);
  const mid = (Math.min(...luma) + Math.max(...luma)) / 2;
  const flash = luma.findIndex((l) => l > mid); // first frame of the flash
  check(flash === FOOTAGE_FLASH_FRAME, `footage flash on frame ${FOOTAGE_FLASH_FRAME}`, `frame ${flash}`);
  const on = audioOnsets(foot);
  const beep = on.find((t) => t > 2);
  const pop = on.find((t) => t < 2);
  check(pop !== undefined && near(pop, CARD_LANDS), `SFX onset ${CARD_LANDS.toFixed(3)} s`, pop?.toFixed(4));
  check(beep !== undefined && Math.abs(beep - flash / FPS) <= FRAME, "footage beep in sync with its flash (±1 frame)", `beep ${beep?.toFixed(4)} s vs flash ${(flash / FPS).toFixed(4)} s`);
}

// 3. Transparent overlay
const ov = out("overlay-alpha.mov");
console.log(`\n${path.relative(root, ov)}`);
if (!existsSync(ov)) check(false, "file exists");
else {
  const p = probe(ov);
  // Encoded as yuva444p10le; ffmpeg's ProRes decoder reports 4444 as 12-bit.
  checkVideo(p, { codec: "prores", pixFmt: /^yuva444p1[02]le$/, frames: 300 });
  const mid = alphaStats(ov, 150);
  check(
    mid.transparent > 0.5 && mid.visible > 0.05 && mid.opaque > 0.005,
    "frame 150 has real alpha: clear background, translucent card, opaque text",
    `${(mid.transparent * 100).toFixed(1)}% clear, ${(mid.visible * 100).toFixed(1)}% visible, ${(mid.opaque * 100).toFixed(1)}% opaque`,
  );
  const first = alphaStats(ov, 0);
  const last = alphaStats(ov, 299);
  check(first.transparent === 1, "frame 0 fully transparent (entrance starts clean)", `${(first.transparent * 100).toFixed(1)}%`);
  check(last.transparent === 1, "frame 299 fully transparent (exit ends clean)", `${(last.transparent * 100).toFixed(1)}%`);
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
