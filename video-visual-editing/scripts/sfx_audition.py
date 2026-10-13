#!/usr/bin/env python3
"""Audition sound variations by measurement and visual comparison (System D).

Claude cannot hear audio. "Auditioning" here means: decode each candidate, measure it
(duration, loudest point, transient, attack/decay, loudness, brightness, low-end weight)
and draw its waveform + envelope with the anchor points marked, side by side, so the
variation whose length/pace/weight fits the visual event can be chosen and justified.

  python3 scripts/sfx_audition.py --group "Whooshes/Hollow" --out work/sound/audition_hollow.png
  python3 scripts/sfx_audition.py --ids WSH-001 WSH-002 WSH-003 --fit-duration 0.8 --out work/sound/aud.png
  python3 scripts/sfx_audition.py --files a.wav b.wav --out work/sound/aud.png        # unindexed files

--fit-duration D  ranks candidates by how well their attack (onset->peak) and total length fit a
                  movement that takes D seconds (useful for whooshes: rise into, tail out of the motion).
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import audiolib as A

ROOT = Path(__file__).resolve().parent.parent


def font(sz):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
    except OSError:
        return ImageFont.load_default()


def panel(label, data, m, w=900, h=170):
    im = Image.new("RGB", (w, h), (18, 20, 26))
    d = ImageDraw.Draw(im)
    mono = data.mean(axis=1)
    n = len(mono)
    top, bot = 34, h - 22
    mid = (top + bot) / 2
    amp = (bot - top) / 2
    if n:
        cols = np.array_split(np.abs(mono), w - 20) if n > w else [np.abs(mono[i:i + 1]) for i in range(n)]
        for x, c in enumerate(cols):
            v = float(c.max()) if len(c) else 0
            d.line([(10 + x, mid - v * amp), (10 + x, mid + v * amp)], fill=(70, 110, 170))
        t, env = A.envelope(mono, win=0.05, hop=0.005)
        envn = env / (env.max() + 1e-9)
        pts = [(10 + (tt / m["duration"]) * (w - 20), bot - e * (bot - top)) for tt, e in zip(t, envn)]
        if len(pts) > 1:
            d.line(pts, fill=(255, 200, 60), width=2)
        for key, col in (("onset_time", (90, 230, 120)), ("peak_time", (255, 80, 80))):
            x = 10 + m[key] / m["duration"] * (w - 20)
            d.line([(x, top), (x, bot)], fill=col, width=2)
    f = font(14)
    d.text((10, 6), label, fill=(255, 255, 255), font=f)
    info = (f"{m['duration']:.2f}s  peak {m['peak_dbfs']:.1f} dBFS  rms {m['rms_dbfs']:.1f}  "
            f"LUFS {m.get('lufs_i', '-')}  onset {m['onset_time']:.2f}s  loudest {m['peak_time']:.2f}s  "
            f"attack {m['attack']:.2f}s  decay {m['decay_20db']:.2f}s  centroid {m['centroid_hz']} Hz  low {m['low_energy_ratio']:.2f}  {m['shape']}")
    d.text((10, h - 19), info, fill=(190, 190, 200), font=font(12))
    return im


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ids", nargs="*")
    ap.add_argument("--group")
    ap.add_argument("--files", nargs="*")
    ap.add_argument("--fit-duration", type=float)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    lib = A.load_library()
    cands = []
    for s in lib["sounds"]:
        if (a.ids and s["id"] in [i.upper() for i in a.ids]) or (a.group and s["variation_group"] == a.group):
            cands.append((s["id"], s["path"]))
    for f in a.files or []:
        cands.append((Path(f).name, f))
    if not cands:
        raise SystemExit("No candidates found. Check IDs/group (sfx_index.py search) or that the library is indexed.")
    rows = []
    for label, path in cands:
        data = A.decode(path)
        m = A.analyze(data)
        if m["duration"] >= 0.4:
            m.update(A.lufs(path))
        score = None
        if a.fit_duration:
            # whoosh fit: attack ~ half the movement, total length ~ 1-2x movement
            score = abs(m["attack"] - a.fit_duration / 2) + 0.5 * abs(m["duration"] - 1.5 * a.fit_duration)
        rows.append((label, path, data, m, score))
    if a.fit_duration:
        rows.sort(key=lambda r: r[4])
    panels = [panel(f"{lab}  ({Path(p).name})" + (f"   fit {sc:.2f} (lower is better)" if sc is not None else ""), d, m)
              for lab, p, d, m, sc in rows]
    W, H = panels[0].width, sum(p.height + 6 for p in panels)
    sheet = Image.new("RGB", (W, H), (8, 8, 10))
    y = 0
    for p in panels:
        sheet.paste(p, (0, y)); y += p.height + 6
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out)
    for lab, p, d, m, sc in rows:
        print(f"{lab:10s} dur {m['duration']:.2f}s loudest@{m['peak_time']:.2f}s onset@{m['onset_time']:.2f}s "
              f"attack {m['attack']:.2f}s peak {m['peak_dbfs']:.1f}dBFS {m['shape']}" + (f" fit {sc:.2f}" if sc is not None else ""))
    print("wrote", a.out, "- open it with Read; green = transient, red = loudest point (whoosh anchor)")


if __name__ == "__main__":
    main()
