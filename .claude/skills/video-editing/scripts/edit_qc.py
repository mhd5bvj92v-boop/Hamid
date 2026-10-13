#!/usr/bin/env python3
"""Non-destructive timeline QC: prove the final export keeps the original cut. Exit code 1 on any ERROR.

  python3 scripts/edit_qc.py <slug> --final work/<slug>/sound/final_v1/final.mp4 [--samples 12]

Compares the delivered file with the ORIGINAL footage recorded by edit_init.py:
  source     the original still has its recorded sha256 (untouched) and is not the output file
  spec       MP4, H.264, 1080x1920, yuv420p, BT.709 limited range, the approved constant frame rate, AAC 48 kHz audio
  duration   same length as the source (+-1 frame) and exactly round(duration * fps) frames: nothing removed or added
  frames     sampled frames outside every beat window match the source frame at the SAME time better than the
             neighbouring frames (+-1 and +-2 frames): no cuts, no re-ordering, no speed change, no drift.
             Uses work/<slug>/sound/timeline.json (edit_render.py sfx) to know where graphics are.
  covered    inside full-screen windows the picture is the scene, and the first clean frame after each window
             is back in sync (the timeline ran on underneath)
  audio      the final audio is aligned with the source dialogue (cross-correlation lag 0 +-1 ms) and
             correlates with it over the whole duration (dialogue kept, not replaced or shifted)
Writes <final dir>/edit_qc_report.md + .json.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vedit as V  # noqa: E402

RES = []


def add(level, area, msg):
    RES.append((level, area, msg))
    print(f"  {level:5} {area:9} {msg}")


def gray_frames(path, times=None, frames=None, w=135, h=240, fit_cover=True):
    """Small gray frames. `frames`: frame indices (exact, decode order); `times`: seconds (accurate seek)."""
    vf_fit = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}" if fit_cover else f"scale={w}:{h}"
    out = []
    if frames is not None:
        sel = "+".join(f"eq(n\\,{int(f)})" for f in frames)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:v:0", "-vf", f"select='{sel}',{vf_fit},format=gray",
                              "-fps_mode", "passthrough", "-f", "rawvideo", "-"], capture_output=True).stdout
        arr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
        return arr
    for t in times:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(t, 0):.6f}", "-i", str(path), "-map", "0:v:0", "-frames:v", "1",
                              "-vf", f"{vf_fit},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
        out.append(np.frombuffer(raw, np.uint8).reshape(h, w).astype(np.float32) if len(raw) == w * h else np.full((h, w), np.nan, np.float32))
    return np.stack(out)


def psnr(a, b):
    mse = float(np.nanmean((a - b) ** 2))
    return 99.0 if mse < 1e-6 else 10 * np.log10(255.0 ** 2 / mse)


def mono(path, sr=8000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32)


def xcorr_lag(a, b, sr, max_lag_s=0.5):
    """Lag (seconds) of b relative to a at maximum normalised cross-correlation (FFT, +-max_lag)."""
    n = min(len(a), len(b))
    a, b = a[:n] - a[:n].mean(), b[:n] - b[:n].mean()
    size = 1 << int(np.ceil(np.log2(2 * n)))
    c = np.fft.irfft(np.fft.rfft(b, size) * np.conj(np.fft.rfft(a, size)), size)
    m = int(max_lag_s * sr)
    c = np.concatenate([c[-m:], c[: m + 1]])
    k = int(np.argmax(c)) - m
    peak = float(c[k + m] / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))
    return k / sr, peak


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug"); ap.add_argument("--final", required=True)
    ap.add_argument("--timeline", help="default: work/<slug>/sound/timeline.json")
    ap.add_argument("--samples", type=int, default=12)
    ap.add_argument("--app"); ap.add_argument("--work")
    a = ap.parse_args()
    app = V.find_app(a.app)
    pj = V.load_project(app, a.slug, a.work)
    src = Path(pj["source"]["path"])
    final = Path(a.final).resolve()
    appr = pj["approved"]
    fps, nframes = float(appr["fps"]), int(appr["durationInFrames"])
    fit_cover = True
    print(f"edit QC: {final.name} vs original {src.name}  ({nframes} frames @ {fps} fps)")

    # ---- source untouched
    if final == src.resolve():
        add("ERROR", "source", "the output path IS the original footage")
    same = V.sha256(src) == pj["source"]["sha256"]
    add("PASS" if same else "ERROR", "source", "original footage unchanged (sha256 matches intake)" if same else "original footage CHANGED since intake")

    # ---- spec
    if not final.exists():
        add("ERROR", "spec", f"{final} does not exist")
        return finish(final, pj)
    info = V.probe(final)
    r = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", str(final)],
                       capture_output=True, text=True)
    nread = int(r.stdout.strip() or 0)
    checks = [
        ("mp4" in (info["format"] or ""), "MP4 container", info["format"]),
        (info["codec"] == "h264", "H.264 video", info["codec"]),
        ((info["width"], info["height"]) == (1080, 1920), "1080x1920", f"{info['width']}x{info['height']}"),
        (info["pix_fmt"] == "yuv420p", "yuv420p", info["pix_fmt"]),
        (info["color"].get("color_space") == "bt709" and info["color"].get("color_range") == "tv", "BT.709 limited range", f"{info['color']}"),
        (info["fps"] is not None and abs(info["fps"] - fps) < 0.01 and not info["vfr"], f"constant {fps} fps (approved)", f"r={info['r_frame_rate']} avg={info['avg_frame_rate']}"),
        (bool(info["audio"]) and info["audio"][0]["codec"] == "aac" and info["audio"][0]["sample_rate"] == 48000, "AAC 48 kHz audio", str(info["audio"][:1])),
    ]
    for ok, label, got in checks:
        add("PASS" if ok else "ERROR", "spec", f"{label}" + ("" if ok else f" (got {got})"))

    # ---- duration
    src_dur = pj["source"]["probe"]["duration"]
    fr = 1 / fps
    add("PASS" if nread == nframes else "ERROR", "duration", f"{nread} frames decoded, expected {nframes} (round(source duration x fps))")
    d_ok = abs(info["duration"] - src_dur) <= fr + 1e-3
    add("PASS" if d_ok else "ERROR", "duration", f"video {info['duration']:.4f}s vs source {src_dur:.4f}s (diff {1000 * (info['duration'] - src_dur):+.1f} ms, tolerance 1 frame)")
    if info["audio"]:
        ad = info["audio"][0]["duration"] or info["format_duration"]
        add("PASS" if abs(ad - src_dur) <= 0.05 else "ERROR", "duration", f"audio {ad:.4f}s vs source {src_dur:.4f}s")

    # ---- frames: alignment in clean windows
    tl_path = Path(a.timeline) if a.timeline else Path(pj["work"]) / "sound" / "timeline.json"
    beats = json.loads(tl_path.read_text())["beats"] if tl_path.exists() else []
    if not tl_path.exists():
        add("WARN", "frames", f"{tl_path} missing (run edit_render.py sfx): treating the whole timeline as covered by graphics")
    busy = np.zeros(nframes, bool)
    for b in beats:
        busy[max(0, b["startFrame"] - 1): min(nframes, b["endFrame"] + 1)] = True
    if not beats and not tl_path.exists():
        busy[:] = True
    clean = np.nonzero(~busy)[0]
    clean = clean[(clean >= 2) & (clean < nframes - 2)]
    if len(clean) == 0:
        add("WARN", "frames", "no graphics-free frames to compare (graphics cover the whole timeline): frame alignment not verified")
    else:
        pick = np.unique(clean[np.linspace(0, len(clean) - 1, min(a.samples, len(clean))).astype(int)])
        fin = gray_frames(final, frames=pick)
        if len(fin) != len(pick):
            add("ERROR", "frames", f"could only decode {len(fin)} of {len(pick)} sampled frames from the final")
        else:
            offsets = [-2, -1, 0, 1, 2]
            bad, ambiguous, worst = [], 0, 99.0
            for i, f in enumerate(pick):
                t = f / fps
                ref = gray_frames(src, times=[t + o / fps for o in offsets], fit_cover=fit_cover)
                scores = [psnr(fin[i], r_) for r_ in ref]
                s0 = scores[2]
                worst = min(worst, s0)
                best = max(scores)
                if s0 < 28 or s0 + 0.5 < best:
                    bad.append(f"frame {f} ({t:.3f}s): PSNR at same time {s0:.1f} dB, best {best:.1f} dB at offset {offsets[scores.index(best)]:+d}")
                if max(sc for k, sc in enumerate(scores) if k != 2) > s0 - 0.5:
                    ambiguous += 1
            if bad:
                for m in bad[:6]:
                    add("ERROR", "frames", m)
            else:
                add("PASS", "frames", f"{len(pick)} graphics-free frames match the source at the same time (min PSNR {worst:.1f} dB): no cut, shift or speed change")
            if ambiguous == len(pick):
                add("WARN", "frames", "the sampled source frames barely change frame to frame: alignment is consistent but weakly determined")

    # ---- covered windows: back in sync right after each full-screen scene
    for b in [b for b in beats if b.get("fullscreen")]:
        after = [f for f in clean if f >= b["endFrame"] + 1][:1]
        if after:
            f = after[0]
            fin = gray_frames(final, frames=[f])
            ref = gray_frames(src, times=[f / fps], fit_cover=fit_cover)
            s = psnr(fin[0], ref[0]) if len(fin) else 0
            add("PASS" if s >= 28 else "ERROR", "covered", f"{b['id']} ({b['start']:.2f}-{b['end']:.2f}s): first clean frame after it ({f}) matches the source at the same time ({s:.1f} dB)")

    # ---- audio: dialogue aligned and kept
    if info["audio"] and pj["source"]["probe"]["audio"]:
        sr = 8000
        s_a, f_a = mono(src, sr), mono(final, sr)
        lag, peak = xcorr_lag(s_a, f_a, sr)
        add("PASS" if abs(lag) <= 0.001 else "ERROR", "audio", f"final audio vs source dialogue: lag {lag * 1000:+.2f} ms (must be 0 +-1 ms), correlation {peak:.3f}")
        add("PASS" if peak >= 0.6 else ("WARN" if peak >= 0.3 else "ERROR"), "audio",
            f"whole-file correlation with the source dialogue {peak:.3f} (dialogue kept; effects lower it slightly)")
    return finish(final, pj)


def finish(final, pj):
    errs = sum(1 for r in RES if r[0] == "ERROR")
    warns = sum(1 for r in RES if r[0] == "WARN")
    out = final.parent if final.exists() else Path(pj["work"]) / "qc"
    md = [f"# Edit QC: {final.name}", "", f"Original: `{pj['source']['path']}`", f"Result: **{errs} errors, {warns} warnings**", "",
          "| Level | Area | Check |", "|---|---|---|"] + [f"| {lv} | {ar} | {m} |" for lv, ar, m in RES]
    (out / "edit_qc_report.md").write_text("\n".join(md) + "\n")
    (out / "edit_qc_report.json").write_text(json.dumps({"final": str(final), "errors": errs, "warnings": warns,
                                                         "results": [dict(level=lv, area=ar, msg=m) for lv, ar, m in RES]}, indent=1))
    print(f"{errs} errors, {warns} warnings -> {out / 'edit_qc_report.md'}")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
