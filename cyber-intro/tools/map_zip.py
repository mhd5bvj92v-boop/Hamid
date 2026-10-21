"""Map every PNG in references.zip to its contact-sheet tile ID (000-168).

The contact sheet was laid out in sorted path order, so tile N is the N-th
file of the sorted listing. Each pair is checked by comparing a downscaled
copy of the original against the tile (RMSE, 0-255).
usage: python3 -I tools/map_zip.py <extracted-zip-dir>  -> docs/reference-zip-map.json"""
import glob, hashlib, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
zdir = sys.argv[1]
files = sorted(glob.glob(os.path.join(zdir, "**/*.png"), recursive=True))
tiles = sorted((ROOT / "docs/reference-tiles").glob("*.png"))
assert len(files) == len(tiles) == 169, (len(files), len(tiles))


def flat(im):
    im = im.convert("RGBA")
    return Image.alpha_composite(Image.new("RGBA", im.size, (221, 221, 221, 255)), im).convert("RGB")


out, worst = [], []
for f, t in zip(files, tiles):
    im = Image.open(f)
    tile = Image.open(t).convert("RGB")
    a = np.asarray(flat(im).resize(tile.size, Image.LANCZOS)).astype(float)
    b = np.asarray(tile).astype(float)
    rmse = float(np.sqrt(((a - b) ** 2).mean()))
    rel = os.path.relpath(f, zdir)
    out.append(dict(tile=t.stem, file=rel, size=list(im.size), sha1=hashlib.sha1(open(f, "rb").read()).hexdigest()[:12], rmse=round(rmse, 1)))
    worst.append((rmse, t.stem, rel))
(ROOT / "docs/reference-zip-map.json").write_text(json.dumps(out, indent=1))
worst.sort(reverse=True)
dups = {}
for o in out:
    dups.setdefault(o["sha1"], []).append(o["tile"])
print("mapped", len(out), "| median rmse", round(float(np.median([o["rmse"] for o in out])), 1), "| worst", [(round(r, 1), k) for r, k, _ in worst[:5]])
print("byte-identical groups:", [v for v in dups.values() if len(v) > 1])
