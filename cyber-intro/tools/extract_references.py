"""Split the supplied reference contact sheet into per-reference tiles,
fingerprint them and group duplicates.

The brief names `references.zip` (169 PNGs) but only a contact sheet of
those 169 images (labelled 000-168) was supplied, so this works from the
thumbnails. Outputs:
  docs/reference-tiles/NNN.png      cropped thumbnail per label
  docs/reference-fingerprints.json  hashes, size, palette, dup group
"""
import hashlib, json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/reference-source-contact-sheet.jpg"
OUT = ROOT / "docs/reference-tiles"
COLS = [(2, 101), (105, 204), (209, 308), (312, 411), (415, 514), (518, 617), (622, 721), (725, 824)]
ROW_STARTS = [0, 91, 181, 272, 363, 454, 545, 636, 727, 818, 909, 1000, 1091, 1181, 1272, 1363, 1454, 1545, 1636, 1727, 1818, 1909]
CELL_H = 71
BG = 221


def trim(a):
    m = (np.abs(a.astype(int) - BG) > 14).any(2)
    ys, xs = np.where(m)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def dhash(img, n=8):
    g = np.asarray(img.convert("L").resize((n + 1, n), Image.LANCZOS)).astype(int)
    return int("".join("1" if b else "0" for b in (g[:, 1:] > g[:, :-1]).flatten()), 2)


def ahash(img, n=8):
    g = np.asarray(img.convert("L").resize((n, n), Image.LANCZOS)).astype(float)
    return int("".join("1" if b else "0" for b in (g > g.mean()).flatten()), 2)


def palette(a, k=5):
    px = a.reshape(-1, 3)
    q = (px // 32) * 32 + 16
    keys, counts = np.unique(q, axis=0, return_counts=True)
    order = np.argsort(-counts)[:k]
    return ["#%02x%02x%02x" % tuple(keys[i]) for i in order], [round(counts[i] / len(px), 3) for i in order]


def main():
    sheet = np.asarray(Image.open(SRC).convert("RGB"))
    OUT.mkdir(parents=True, exist_ok=True)
    recs = []
    idx = 0
    for y0 in ROW_STARTS:
        for x0, x1 in COLS:
            if idx > 168:
                break
            cell = sheet[y0:y0 + CELL_H, x0:x1]
            if (np.abs(cell.astype(int) - BG) > 14).mean() < 0.05:
                continue
            tile = trim(cell)
            name = f"{idx:03d}"
            im = Image.fromarray(tile)
            im.save(OUT / f"{name}.png")
            lum = np.asarray(im.convert("L")).astype(float)
            pal, share = palette(tile)
            r, g, b = tile.reshape(-1, 3).astype(float).mean(0)
            recs.append(dict(
                id=name, file=f"{name}.png", w=tile.shape[1], h=tile.shape[0],
                aspect=round(tile.shape[1] / tile.shape[0], 2),
                sha1=hashlib.sha1(tile.tobytes()).hexdigest()[:12],
                dhash=f"{dhash(im):016x}", ahash=f"{ahash(im):016x}",
                mean_lum=round(lum.mean(), 1), dark_share=round((lum < 40).mean(), 2),
                mean_rgb=[round(r), round(g), round(b)], palette=pal, palette_share=share,
            ))
            idx += 1
    # duplicate groups: union-find on hamming distance of both hashes
    parent = list(range(len(recs)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    ham = lambda a, b: bin(int(a, 16) ^ int(b, 16)).count("1")
    for i in range(len(recs)):
        for j in range(i + 1, len(recs)):
            a, b = recs[i], recs[j]
            if abs(a["aspect"] - b["aspect"]) > 0.12:
                continue
            if ham(a["dhash"], b["dhash"]) <= 10 and ham(a["ahash"], b["ahash"]) <= 10:
                parent[find(j)] = find(i)
    groups = {}
    for i, r in enumerate(recs):
        groups.setdefault(find(i), []).append(r["id"])
    gid = 0
    for root in sorted(groups, key=lambda k: groups[k][0]):
        members = groups[root]
        label = f"G{gid:03d}"
        gid += 1
        for m in members:
            rec = next(r for r in recs if r["id"] == m)
            rec["dup_group"] = label
            rec["dup_members"] = members
            rec["dup_primary"] = members[0]
    (ROOT / "docs/reference-fingerprints.json").write_text(json.dumps(recs, indent=1))
    multi = {r["dup_group"]: r["dup_members"] for r in recs if len(r["dup_members"]) > 1}
    print(len(recs), "tiles;", gid, "unique groups;", len(multi), "multi-member groups")
    for g, m in multi.items():
        print(g, m)


if __name__ == "__main__":
    sys.exit(main())
