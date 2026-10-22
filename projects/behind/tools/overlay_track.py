"""Place rendered overlay sequences on one timeline.

  overlay_track.py --fps 60 --dur 35 --out full.mov  seqdir@start ...   -> ProRes 4444 with alpha (NLE track)
  overlay_track.py --fps 60 --dur 35 --plate plate.png --audio mix.wav --out preview.mp4 seqdir@start ...
"""
import argparse, glob, os, subprocess

ap = argparse.ArgumentParser()
ap.add_argument("layers", nargs="+")
ap.add_argument("--fps", type=float, default=60)
ap.add_argument("--dur", type=float, required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--plate")
ap.add_argument("--audio")
ap.add_argument("--size", default="1080x1920")
a = ap.parse_args()

cmd = ["ffmpeg", "-v", "error", "-y"]
if a.plate:
    cmd += ["-loop", "1", "-framerate", str(a.fps), "-t", str(a.dur), "-i", a.plate]
else:
    cmd += ["-f", "lavfi", "-i", f"color=c=black@0.0:s={a.size}:r={a.fps}:d={a.dur},format=rgba"]
filt, last = [], "[0:v]"
if a.plate:
    filt.append(f"[0:v]scale={a.size.replace('x', ':')},format=rgba[b0]")
    last = "[b0]"
for i, spec in enumerate(a.layers, start=1):
    d, at = spec.rsplit("@", 1)
    first = sorted(glob.glob(os.path.join(d, "*.png")))[0]
    pattern = os.path.join(d, "%0{}d.png".format(len(os.path.basename(first)) - 4))
    cmd += ["-framerate", str(a.fps), "-i", pattern]
    filt.append(f"[{i}:v]format=rgba,setpts=PTS-STARTPTS+{float(at)}/TB[l{i}]")
    filt.append(f"{last}[l{i}]overlay=0:0:eof_action=pass:format=auto[o{i}]")
    last = f"[o{i}]"
n_in = len(a.layers) + 1
if a.audio:
    cmd += ["-i", a.audio]
cmd += ["-filter_complex", ";".join(filt), "-map", last]
if a.out.endswith(".mov"):
    cmd += ["-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"]
else:
    cmd += ["-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
if a.audio:
    cmd += ["-map", f"{n_in}:a", "-c:a", "aac", "-b:a", "256k"]
cmd += ["-r", str(a.fps), "-t", str(a.dur), a.out]
subprocess.run(cmd, check=True)
print("wrote", a.out)
