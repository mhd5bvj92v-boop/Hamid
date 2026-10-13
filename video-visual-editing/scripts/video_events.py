#!/usr/bin/env python3
"""Find sound-design candidates in finished footage (System D, Step 1 analysis).

  python3 scripts/video_events.py work/edit_v1.mp4 --out work/sound/video_events.json --strip work/sound/events_strip.png

Detects, frame-accurately:
  cuts        hard cuts / flashes (transition frames)            -> camera click, sci-fi hit, whoosh, riser end
  movements   segments of strong image motion, with the fastest  -> whoosh peak candidates (zooms, pans, slides)
              frame and the dominant pan velocity (phase correlation)
  speech      speech-activity regions from the audio track       -> where music sits at -19 dB and where effects
                                                                     must stay under the voice
These are CANDIDATES. Talking-head footage moves (gestures, head turns) without needing sound:
open the strip image and confirm each candidate before it goes into the cue sheet. For edits built
with this skill, the exact event times come from render_html.js --motion/--cues plus layer offsets,
which are more precise than image analysis.
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

import audiolib as A


def frames_gray(path, width=96):
    info = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                           "stream=width,height,r_frame_rate", "-of", "json", str(path)], capture_output=True, text=True)
    st = json.loads(info.stdout)["streams"][0]
    num, den = map(int, st["r_frame_rate"].split("/"))
    fps = num / den
    h = int(round(st["height"] * width / st["width"] / 2) * 2)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={width}:{h},format=gray",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, h, width).astype(np.float32)
    return arr, fps, st["width"], st["height"]


def phase_shift(a, b):
    fa, fb = np.fft.fft2(a - a.mean()), np.fft.fft2(b - b.mean())
    r = fa * np.conj(fb)
    r /= np.abs(r) + 1e-9
    c = np.abs(np.fft.ifft2(r))
    y, x = np.unravel_index(np.argmax(c), c.shape)
    if y > a.shape[0] // 2: y -= a.shape[0]
    if x > a.shape[1] // 2: x -= a.shape[1]
    return float(x), float(y), float(c.max())


def speech_regions(path, dur):
    try:
        x = A.decode(path, sr=16000, channels=1)[:, 0]
    except Exception:
        return [], None
    if not len(x):
        return [], None
    hop = 320
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    dbv = 20 * np.log10(rms)
    floor = float(np.percentile(dbv, 10))
    thr = max(-45.0, floor + 12)
    on = dbv > thr
    regs, start = [], None
    for i, v in enumerate(on):
        t = i * hop / 16000
        if v and start is None: start = t
        if not v and start is not None: regs.append([start, t]); start = None
    if start is not None: regs.append([start, n * hop / 16000])
    merged = []
    for s, e in regs:
        if merged and s - merged[-1][1] < 0.3: merged[-1][1] = e
        else: merged.append([s, e])
    return [[round(s, 3), round(e, 3)] for s, e in merged if e - s >= 0.15], {"floor_dbfs": round(floor, 1), "threshold_dbfs": round(thr, 1)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video"); ap.add_argument("--out", required=True); ap.add_argument("--strip")
    ap.add_argument("--min-move", type=float, default=2.5, help="motion threshold in MADs above median")
    a = ap.parse_args()
    fr, fps, W, H = frames_gray(a.video)
    n = len(fr)
    diff = np.zeros(n)
    diff[1:] = np.mean(np.abs(fr[1:] - fr[:-1]), axis=(1, 2))
    cuts = []
    for i in range(1, n):
        lo, hi = max(1, i - 15), min(n, i + 16)
        local = np.median(diff[lo:hi])
        if diff[i] > 20 and diff[i] > 4 * max(local, 1.0):
            cuts.append(i)
    pans = np.zeros(n)
    scale = W / fr.shape[2]
    for i in range(1, n):
        if i in cuts: continue
        dx, dy, conf = phase_shift(fr[i], fr[i - 1])
        if conf > 0.15: pans[i] = np.hypot(dx, dy) * scale * fps     # px/s in source pixels
    energy = diff.copy(); energy[cuts] = 0
    sm = np.convolve(energy, np.ones(3) / 3, mode="same")
    med = float(np.median(sm)); mad = float(np.median(np.abs(sm - med))) + 1e-6
    hot = sm > med + a.min_move * 1.4826 * mad
    moves, i = [], 0
    while i < n:
        if hot[i]:
            j = i
            while j + 1 < n and hot[j + 1]: j += 1
            if j - i + 1 >= 3:
                k = i + int(np.argmax(sm[i:j + 1]))
                moves.append({"start": round(i / fps, 3), "end": round(j / fps, 3), "fastest_t": round(k / fps, 3), "fastest_frame": k,
                              "peak_energy": round(float(sm[k]), 2), "pan_px_s": round(float(pans[i:j + 1].max()), 1),
                              "type": "pan/slide" if pans[i:j + 1].max() > 0.15 * W else "motion (zoom/animation/subject)"})
            i = j + 1
        else:
            i += 1
    dur = n / fps
    speech, sinfo = speech_regions(a.video, dur)
    out = {"video": str(a.video), "fps": fps, "frames": n, "duration": round(dur, 3), "width": W, "height": H,
           "cuts": [{"t": round(c / fps, 3), "frame": c, "timecode": A.tc(c / fps, fps), "diff": round(float(diff[c]), 1)} for c in cuts],
           "movements": moves, "speech": speech, "speech_detector": sinfo,
           "note": "Candidates only - confirm visually (strip image) before adding cues. Gestures and head motion are not edit movements."}
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(out, indent=1))
    print(f"{n} frames @ {fps:.3f} fps: {len(cuts)} cuts, {len(moves)} motion segments, {len(speech)} speech regions -> {a.out}")
    if a.strip:
        from PIL import Image, ImageDraw
        pts = [("CUT", c["t"]) for c in out["cuts"]] + [("MOVE", m["fastest_t"]) for m in moves]
        pts.sort(key=lambda x: x[1])
        if pts:
            thumbs = []
            for lab, t in pts[:40]:
                p = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", a.video, "-frames:v", "1", "-vf", "scale=-2:240",
                                    "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
                from io import BytesIO
                im = Image.open(BytesIO(p)).convert("RGB")
                ImageDraw.Draw(im).rectangle([0, 0, im.width, 18], fill=(0, 0, 0))
                ImageDraw.Draw(im).text((4, 3), f"{lab} {A.tc(t, fps)}", fill=(255, 220, 0))
                thumbs.append(im)
            cols = min(8, len(thumbs)); rows = (len(thumbs) + cols - 1) // cols
            S = Image.new("RGB", (cols * thumbs[0].width, rows * thumbs[0].height), (30, 30, 30))
            for k, im in enumerate(thumbs):
                S.paste(im, ((k % cols) * thumbs[0].width, (k // cols) * thumbs[0].height))
            S.save(a.strip); print("strip:", a.strip)


if __name__ == "__main__":
    main()
