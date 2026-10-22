"""Tile rendered stills into a labelled contact sheet.
usage: python3 tools/contact.py out.png out/stills/f0010.png ... [--cols 4 --w 640]"""
import sys
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
cols, w = 4, 640
if "--cols" in args:
    i = args.index("--cols"); cols = int(args[i + 1]); del args[i:i + 2]
if "--w" in args:
    i = args.index("--w"); w = int(args[i + 1]); del args[i:i + 2]
dst, files = args[0], args[1:]
h = w * 9 // 16
font = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 18)
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + 8) + 8, rows * (h + 34) + 8), (40, 40, 42))
d = ImageDraw.Draw(sheet)
for k, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((w, h), Image.LANCZOS)
    x, y = 8 + (k % cols) * (w + 8), 8 + (k // cols) * (h + 34)
    sheet.paste(im, (x, y + 26))
    fr = int(f.split("/")[-1][1:5]) if f.split("/")[-1].startswith("f") else 0
    d.text((x, y + 2), f"{f.split('/')[-1]}  ·  {fr/60:.2f}s", fill=(255, 156, 67), font=font)
sheet.save(dst)
