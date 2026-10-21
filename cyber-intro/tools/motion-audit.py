"""Frame-level QA on a rendered MP4: frozen stretches, luminance jumps, hue drift.
usage: python3 tools/motion-audit.py out/video.mp4"""
import subprocess, sys
import numpy as np

src = sys.argv[1]
W, H = 192, 108
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip()
num, den = map(int, probe.strip(",").split(",")[0].split("/"))
fps = num / den
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32)
n = len(fr)
lum = fr.mean(axis=(1, 2, 3))
diff = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2, 3))

# frozen: consecutive frames with ~no change
frozen, run, start = [], 0, 0
for i, d in enumerate(diff):
    if d < 0.02:
        if run == 0:
            start = i
        run += 1
    else:
        if run / fps > 0.5:
            frozen.append((start / fps, (start + run) / fps))
        run = 0
if run / fps > 0.5:
    frozen.append((start / fps, (start + run) / fps))

jumps = [(i / fps, float(abs(lum[i + 1] - lum[i]) / max(lum[i], 1))) for i in range(n - 1) if abs(lum[i + 1] - lum[i]) / max(lum[i], 8) > 0.25]

# hue audit: saturated pixels outside the orange band (hue 10-50 deg)
rgb = fr / 255.0
mx, mn = rgb.max(-1), rgb.min(-1)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
d = np.maximum(mx - mn, 1e-6)
h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
mask = (sat > 0.35) & (mx > 0.25)
off = mask & ((h < 8) | (h > 55))
off_share = off.sum() / max(mask.sum(), 1)

print(f"frames={n} fps={fps:.2f} duration={n / fps:.3f}s")
print(f"mean frame diff={diff.mean():.3f}  min={diff.min():.4f}")
print("frozen stretches >0.5s:", frozen or "none")
print("luminance jumps >25%:", [(round(t, 2), round(v, 2)) for t, v in jumps] or "none")
print(f"saturated pixels outside orange band: {off_share * 100:.2f}%")
