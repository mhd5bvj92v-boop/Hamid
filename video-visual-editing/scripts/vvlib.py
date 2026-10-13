"""Shared helpers for the video-visual-editing reference library.

Stdlib + Pillow only. Every script in this folder imports from here so
hashing, palette extraction and catalog I/O behave identically.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = SKILL_ROOT / "data" / "references.json"
ASSET_ROOT = SKILL_ROOT / "assets" / "references"
LIBRARY_DOCS = SKILL_ROOT / "references" / "library"
SHEETS_DIR = SKILL_ROOT / "assets" / "contact-sheets"

CATEGORIES = {
    "ONS": "On-Screen Visuals (speaker stays visible)",
    "TXT": "Text Inspiration & Text Animations",
    "FUL": "Full-Screen Animations (replace the talking head)",
}
OBSERVED_FIELDS = ["description", "typography", "palette", "composition",
                   "lighting_effects", "depth_layering"]
INFERRED_FIELDS = ["animation", "use_cases", "recreation"]

# Perceptual-distance thresholds (dHash 16x16 + aHash 16x16 = 512 bits).
# <=30 has always been the same image at another size/crop in this library;
# 31-60 means a very close variant; above that, treat as distinct.
DUP_THRESHOLD = 30
SIMILAR_THRESHOLD = 60


def sanitize(name: str) -> str:
    stem = Path(name).stem
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("_")
    return stem + Path(name).suffix.lower()


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def phash(path: Path) -> str:
    """dHash(16) + aHash(16) as one hex string (512 bits)."""
    from PIL import Image
    im = Image.open(path).convert("L")
    d = im.resize((17, 16), Image.LANCZOS)
    px = list(d.tobytes())
    bits = []
    for y in range(16):
        row = px[y * 17:(y + 1) * 17]
        bits += [1 if row[x + 1] > row[x] else 0 for x in range(16)]
    a = list(im.resize((16, 16), Image.LANCZOS).tobytes())
    mean = sum(a) / len(a)
    bits += [1 if v > mean else 0 for v in a]
    return "%0128x" % int("".join(map(str, bits)), 2)


def hamming(h1: str, h2: str) -> int:
    return bin(int(h1, 16) ^ int(h2, 16)).count("1")


def aspect(size) -> float:
    return size[0] / size[1]


def palette(path: Path, n: int = 6):
    """Measured dominant colours: [(hex, share%)], most common first."""
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im.thumbnail((160, 160))
    q = im.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    out = []
    for c, idx in counts:
        r, g, b = pal[idx * 3: idx * 3 + 3]
        out.append(("#%02X%02X%02X" % (r, g, b), round(100 * c / total, 1)))
    return out


def image_size(path: Path):
    from PIL import Image
    with Image.open(path) as im:
        return list(im.size)


def load_catalog() -> dict:
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_catalog(cat: dict) -> None:
    cat["references"].sort(key=lambda r: (list(CATEGORIES).index(r["category"]), r["id"]))
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(cat, f, indent=2, ensure_ascii=False)
        f.write("\n")


def next_id(cat: dict, category: str) -> str:
    nums = [int(r["id"].split("-")[1]) for r in cat["references"] if r["category"] == category]
    return "%s-%03d" % (category, (max(nums) if nums else 0) + 1)


def all_known_hashes(cat: dict):
    """Yield (ref_id, file, sha256, phash, aspect) for primaries and alternates."""
    for r in cat["references"]:
        yield r["id"], r["file"], r["sha256"], r["phash"], aspect(r["size"])
        for a in r.get("alternates", []):
            yield r["id"], a["file"], a["sha256"], a["phash"], aspect(a["size"])


def find_matches(cat: dict, path: Path):
    """Return (exact, near, similar) lists of (ref_id, file, distance) for an image."""
    s, p, ar = sha256(path), phash(path), aspect(image_size(path))
    exact, near, similar = [], [], []
    for rid, f, sh, ph, a2 in all_known_hashes(cat):
        if sh == s:
            exact.append((rid, f, 0))
            continue
        d = hamming(p, ph)
        if abs(ar - a2) / max(ar, a2) > 0.15:
            continue
        if d <= DUP_THRESHOLD:
            near.append((rid, f, d))
        elif d <= SIMILAR_THRESHOLD:
            similar.append((rid, f, d))
    key = lambda t: t[2]
    return exact, sorted(near, key=key), sorted(similar, key=key)
