#!/usr/bin/env python3
"""Side-by-side QC sheet: your rendered frame(s) next to the chosen references.

  python3 scripts/compare.py --render work/frame_045.png [more.png] --refs TXT-001 ONS-004 --out work/qc.png

Each panel is scaled to the same height and labelled. Open the result with the
Read tool and judge it against references/quality-control.md. This script does
NOT score design quality - it only puts the evidence next to each other.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import vvlib as V


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", nargs="+", required=True)
    ap.add_argument("--refs", nargs="*", default=[])
    ap.add_argument("--out", required=True)
    ap.add_argument("--height", type=int, default=900)
    a = ap.parse_args()
    cat = {r["id"]: r for r in V.load_catalog()["references"]}
    panels = [(Path(p).name, Image.open(p).convert("RGB")) for p in a.render]
    for rid in a.refs:
        r = cat.get(rid.upper())
        if not r:
            raise SystemExit(f"unknown reference {rid}")
        panels.append((f"REF {r['id']} {r['title'][:34]}", Image.open(V.SKILL_ROOT / r["file"]).convert("RGB")))
    H = a.height
    scaled = [(lab, im.resize((max(1, int(im.width * H / im.height)), H), Image.LANCZOS)) for lab, im in panels]
    Wt = sum(im.width for _, im in scaled) + 16 * (len(scaled) + 1)
    sheet = Image.new("RGB", (Wt, H + 56), (40, 40, 44))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    x = 16
    for lab, im in scaled:
        sheet.paste(im, (x, 40))
        d.text((x, 12), lab, fill=(255, 220, 0) if lab.startswith("REF") else (120, 220, 255), font=font)
        x += im.width + 16
    sheet.save(a.out)
    print("wrote", a.out)


if __name__ == "__main__":
    main()
