#!/usr/bin/env python3
"""ffmpeg helpers: encode overlay sequences, composite them onto footage, pull QC frames.

  probe   python3 scripts/compose.py probe talking.mp4
  encode  python3 scripts/compose.py encode --frames work/cap --fps 30 --out work/cap.mov   # .mov = ProRes 4444 + alpha (NLE handoff)
                                                                                              # .webm = VP9 + alpha
  overlay python3 scripts/compose.py overlay --base talking.mp4 --out work/edit.mp4 \
             --layer work/cap@2.40 --layer work/grid@5.10 \
             --focus 5.0:8.6:0.62:6          # start:end:brightness(0-1):blur_sigma, fades 0.3s
             [--fullscreen work/fs@12.0]     # opaque layer that replaces the picture (System C)
  frame   python3 scripts/compose.py frame work/edit.mp4 --t 6.2 --out work/qc_6.2.png
  frames  python3 scripts/compose.py frames work/edit.mp4 --every 0.5 --out work/qc_frames  # contact strip for review

A --layer is a PNG-sequence folder (00000.png...) or a video with alpha, placed at
start time `@seconds`. Layers are scaled to the base resolution. Audio is copied.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path


def run(cmd):
    print("+", " ".join(str(c) for c in cmd)[:600], file=sys.stderr)
    subprocess.run(cmd, check=True)


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height,r_frame_rate,codec_type:format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    num, den = map(int, v["r_frame_rate"].split("/"))
    return {"width": v["width"], "height": v["height"], "fps": num / den,
            "duration": float(j["format"]["duration"]), "has_audio": any(s["codec_type"] == "audio" for s in j["streams"])}


def layer_input(spec, fps):
    path, _, start = spec.partition("@")
    p = Path(path)
    start = float(start or 0)
    if p.is_dir():
        return ["-framerate", str(fps), "-start_number", "0", "-i", str(p / "%05d.png")], start
    return ["-i", str(p)], start


def cmd_encode(a):
    out = Path(a.out)
    src = ["-framerate", str(a.fps), "-start_number", "0", "-i", str(Path(a.frames) / "%05d.png")]
    if out.suffix == ".mov":
        codec = ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"]
    elif out.suffix == ".webm":
        codec = ["-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "18", "-auto-alt-ref", "0"]
    else:
        codec = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16"]   # no alpha
    run(["ffmpeg", "-y", "-loglevel", "error", *src, *codec, str(out)])
    print("wrote", out)


def cmd_overlay(a):
    info = probe(a.base)
    W, H, fps = info["width"], info["height"], info["fps"]
    inputs, chains = ["-i", a.base], []
    cur = "[0:v]"
    for k, f in enumerate(a.focus or []):
        s, e, bright, blur = (list(map(float, f.split(":"))) + [0.62, 6])[:4]
        d = min(0.3, (e - s) / 3)
        chains.append(f"{cur}split[fa{k}][fb{k}];[fb{k}]gblur=sigma={blur},colorchannelmixer=rr={bright}:gg={bright}:bb={bright},"
                      f"format=yuva420p,fade=t=in:st={s}:d={d}:alpha=1,fade=t=out:st={e - d}:d={d}:alpha=1[fx{k}];"
                      f"[fa{k}][fx{k}]overlay=enable='between(t,{s},{e})'[f{k}]")
        cur = f"[f{k}]"
    idx = 1
    for kind, specs in (("layer", a.layer or []), ("fs", a.fullscreen or [])):
        for spec in specs:
            args, start = layer_input(spec, fps)
            inputs += args
            chains.append(f"[{idx}:v]scale={W}:{H},format=rgba,setpts=PTS-STARTPTS+{start}/TB[l{idx}];"
                          f"{cur}[l{idx}]overlay=eof_action=pass:format=auto[o{idx}]")
            cur = f"[o{idx}]"
            idx += 1
    fc = ";".join(chains) if chains else f"{cur}null[out]"
    if chains:
        fc += f";{cur}format=yuv420p[out]"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "[out]"]
    if info["has_audio"]:
        cmd += ["-map", "0:a", "-c:a", "copy"]
    cmd += ["-c:v", "libx264", "-crf", str(a.crf), "-preset", "medium", "-r", str(fps), "-t", str(info["duration"]), a.out]
    run(cmd)
    print("wrote", a.out)


def cmd_frame(a):
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(a.t), "-i", a.video, "-frames:v", "1", a.out])
    print("wrote", a.out)


def cmd_frames(a):
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.video, "-vf", f"fps=1/{a.every},scale=-2:480", str(out / "t_%04d.png")])
    print("wrote frames to", out, "(frame k is at t = (k-1) *", a.every, "s)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("probe"); p.add_argument("video"); p.set_defaults(fn=lambda a: print(json.dumps(probe(a.video), indent=2)))
    p = sub.add_parser("encode"); p.add_argument("--frames", required=True); p.add_argument("--fps", type=float, default=30); p.add_argument("--out", required=True); p.set_defaults(fn=cmd_encode)
    p = sub.add_parser("overlay"); p.add_argument("--base", required=True); p.add_argument("--out", required=True)
    p.add_argument("--layer", action="append"); p.add_argument("--fullscreen", action="append"); p.add_argument("--focus", action="append")
    p.add_argument("--crf", type=int, default=17); p.set_defaults(fn=cmd_overlay)
    p = sub.add_parser("frame"); p.add_argument("video"); p.add_argument("--t", type=float, required=True); p.add_argument("--out", required=True); p.set_defaults(fn=cmd_frame)
    p = sub.add_parser("frames"); p.add_argument("video"); p.add_argument("--every", type=float, default=0.5); p.add_argument("--out", required=True); p.set_defaults(fn=cmd_frames)
    a = ap.parse_args(); a.fn(a)


if __name__ == "__main__":
    main()
