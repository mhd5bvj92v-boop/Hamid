#!/usr/bin/env python3
"""Stored reference analysis: measured facts + Claude Code's observations, kept apart from inferred motion.

Each analysis is cached in <repo>/library/analysis/<key>.json (local, not in git), keyed by the asset's
content hash (sha256) and ANALYSIS_CONFIG, so the same picture is analysed once and reused in every project.
Links are keyed by URL and never treated as immutable: refresh fetches them again.

  measure  <ref>            measure an asset (cached; --refresh re-measures): size, palette, luminance,
                            contrast, saturation, detail; clips also duration, fps and a strip of 6 frames
  record   <ref> --file a.json   Claude Code's observations after LOOKING at the asset:
                            {"observed": {"color": "...", "typography": "...", "layout": "...", "materials": "...",
                                          "hierarchy": "...", "composition": "...", "notes": "..."},
                             "observedMotion": [{"t": 1.2, "what": "..."}],   # clips only (from the frame strip)
                             "inferredMotion": "...",                          # a guess, labelled as such
                             "takeaways": "what to take from it"}
  show     <ref> [--json]   print the analysis (or "not analysed")

<ref> is a built-in id (ONS-024), a My-library id (MY-003), a file path, or an http(s) link.
Built-in references already carry their analysis in data/references.json (observed + inferred, written
when the library was built); `show` prints it. A reference is only labelled "analysed" when its content was
actually accessible: an unreachable link is recorded as "inaccessible" with the reason and an upload fallback.
"""
from __future__ import annotations

import argparse
import os
import datetime
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vvlib  # noqa: E402

ANALYSIS_CONFIG = 1
SKILL = Path(__file__).resolve().parent.parent
REPO = SKILL.parents[1]
LIB = Path(os.environ.get("VV_LIBRARY") or REPO / "library")
STORE = LIB / "analysis"
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
VID_EXT = {".mp4", ".webm", ".mov", ".m4v"}
BUILTIN = re.compile(r"^(ONS|TXT|FUL)-\d{3}$")
now = lambda: datetime.datetime.now().isoformat(timespec="seconds")


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def resolve(ref: str):
    """-> (kind, path or None, url or None, label)"""
    if re.match(r"^https?://", ref):
        return "url", None, ref, ref
    if BUILTIN.match(ref):
        cat = vvlib.load_catalog()
        hit = next((x for x in cat["references"] if x["id"] == ref), None)
        if not hit:
            raise SystemExit(f"unknown reference {ref}")
        return "builtin", SKILL / hit["file"], None, ref
    if ref.startswith("MY-"):
        lib = json.loads((LIB / "references.json").read_text(encoding="utf-8")) if (LIB / "references.json").exists() else []
        hit = next((x for x in lib if x["id"] == ref), None)
        if not hit:
            raise SystemExit(f"{ref} is not in My library")
        return "mine", Path(hit["file"]), None, ref
    p = Path(ref)
    if not p.exists():
        raise SystemExit(f"no such file: {ref}")
    return "file", p, None, p.name


def key_of(kind, path, url):
    if kind == "url":
        return "url-" + hashlib.sha256(url.encode()).hexdigest()[:24]
    return sha256(path)


def store_path(key):
    return STORE / f"{key}.json"


def load(key):
    p = store_path(key)
    if not p.exists():
        return None
    a = json.loads(p.read_text(encoding="utf-8"))
    return a if a.get("config") == ANALYSIS_CONFIG else None


def save(a):
    STORE.mkdir(parents=True, exist_ok=True)
    store_path(a["key"]).write_text(json.dumps(a, indent=1, ensure_ascii=False), encoding="utf-8")


def measure_image(p: Path) -> dict:
    from PIL import Image, ImageFilter, ImageStat
    with Image.open(p) as im0:
        im = im0.convert("RGB")
    w, h = im.size
    small = im.copy()
    small.thumbnail((320, 320))
    L = small.convert("L")
    st = ImageStat.Stat(L)
    hsv = ImageStat.Stat(small.convert("HSV"))
    edges = ImageStat.Stat(L.filter(ImageFilter.FIND_EDGES)).mean[0]
    lum = st.mean[0] / 255
    return {"width": w, "height": h, "aspect": round(w / h, 3), "palette": [{"hex": c, "share": s} for c, s in vvlib.palette(p, 6)],
            "luminance": round(lum, 3), "contrast": round(st.stddev[0] / 255, 3), "saturation": round(hsv.mean[1] / 255, 3),
            "detail": round(edges / 255, 3), "foundation": "light" if lum > 0.55 else "dark" if lum < 0.35 else "mid"}


def probe_video(p: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", str(p)],
                       capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr.strip() or "ffprobe failed")
    d = json.loads(r.stdout)
    s = d["streams"][0]
    num, den = (s.get("r_frame_rate") or "0/1").split("/")
    return {"width": s["width"], "height": s["height"], "fps": round(float(num) / float(den or 1), 3), "durationS": round(float(d["format"]["duration"]), 3)}


def frame_strip(p: Path, dur: float, key: str) -> tuple[str, dict, list]:
    """6 evenly spaced frames, one strip image (Claude Code looks at it to write observed motion)."""
    tmp = Path(tempfile.mkdtemp())
    times = [round(dur * (i + 0.5) / 6, 2) for i in range(6)]
    for i, t in enumerate(times):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(p), "-frames:v", "1", "-vf", "scale=360:-2", str(tmp / f"f{i}.png")], check=True)
    out = STORE / f"{key}_frames.png"
    STORE.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "f%d.png"), "-filter_complex", "tile=6x1:padding=4:color=white", str(out)], check=True)
    mid = measure_image(tmp / "f2.png")
    shutil.rmtree(tmp, ignore_errors=True)
    return str(out), mid, times


def fetch(url: str):
    """Try to open a link. -> (path or None, reason or None). Only direct images/clips can be measured."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Creative Director Studio reference check)"})
        with urllib.request.urlopen(req, timeout=12) as r:
            ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if not (ctype.startswith("image/") or ctype.startswith("video/")):
                return None, f"the link opens a {ctype or 'page'}, not an image or a clip: upload a screenshot or the clip instead"
            ext = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov"}.get(ctype, "")
            if not ext:
                return None, f"unsupported type {ctype}: upload the file instead"
            dl = STORE / "downloads"
            dl.mkdir(parents=True, exist_ok=True)
            out = dl / (hashlib.sha256(url.encode()).hexdigest()[:24] + ext)
            out.write_bytes(r.read(60 * 1024 * 1024))
            return out, None
    except Exception as e:  # noqa: BLE001 - any failure means "not accessible from here"
        return None, f"could not open the link from here ({type(e).__name__}: {str(e)[:120]}); upload a screenshot or the clip instead"


def measure(ref: str, refresh=False) -> dict:
    kind, path, url, label = resolve(ref)
    key = key_of(kind, path, url)
    old = load(key)
    if old and not refresh:
        return old
    a = {"key": key, "config": ANALYSIS_CONFIG, "ref": ref, "label": label, "kind": kind, "measuredAt": now(), "status": "measured",
         "observed": None, "observedMotion": [], "inferredMotion": None, "takeaways": None, "analysedAt": None, "analysedBy": None,
         "history": (old or {}).get("history", [])}
    if old and (old.get("observed") or old.get("inferredMotion")):
        # a refresh keeps the earlier observations in the history, not as the current analysis
        a["history"] = [*a["history"], {k: old.get(k) for k in ("observed", "observedMotion", "inferredMotion", "takeaways", "analysedAt", "analysedBy")}][-5:]
    if kind == "url":
        a["source"] = url
        path, why = fetch(url)
        if not path:
            a.update(status="inaccessible", error=why)
            save(a)
            return a
        a["downloaded"] = str(path)
    a["source"] = a.get("source") or str(path)
    a["sha256"] = sha256(path)
    try:
        if path.suffix.lower() in VID_EXT:
            v = probe_video(path)
            strip, mid, times = frame_strip(path, v["durationS"], key)
            a.update(media="video", measured={**v, **{k: mid[k] for k in ("palette", "luminance", "contrast", "saturation", "detail", "foundation")}},
                     frames=strip, frameTimes=times)
        elif path.suffix.lower() in IMG_EXT:
            a.update(media="image", measured=measure_image(path))
        else:
            a.update(status="inaccessible", error=f"unsupported file type {path.suffix}")
    except Exception as e:  # noqa: BLE001
        a.update(status="inaccessible", error=f"could not read the file ({type(e).__name__}: {str(e)[:120]})")
    if kind == "builtin":
        hit = next(x for x in vvlib.load_catalog()["references"] if x["id"] == ref)
        a["catalog"] = {"observed": hit.get("observed"), "inferred": hit.get("inferred")}
    save(a)
    return a


def record(ref: str, file: str) -> dict:
    a = measure(ref)
    if a["status"] == "inaccessible":
        raise SystemExit(f"{ref} was not accessible ({a.get('error')}); it cannot be recorded as analysed. Ask the user to upload it.")
    data = json.loads(Path(file).read_text(encoding="utf-8"))
    obs = data.get("observed") or {}
    if not obs or not any(str(v).strip() for v in obs.values()):
        raise SystemExit("'observed' needs at least one concrete observation (what you actually see)")
    if data.get("observedMotion") and a.get("media") != "video":
        raise SystemExit("a still image does not show motion: put motion under 'inferredMotion' (labelled as inferred), not 'observedMotion'")
    a.update(status="analysed", observed=obs, observedMotion=data.get("observedMotion") or [], inferredMotion=data.get("inferredMotion"),
             takeaways=data.get("takeaways"), analysedAt=now(), analysedBy="Claude Code")
    save(a)
    return a


def describe(a: dict) -> str:
    if not a:
        return "not analysed"
    lines = [f"{a['label']}  [{a['status']}]  measured {a.get('measuredAt')}" + (f", analysed by {a['analysedBy']} {a['analysedAt']}" if a.get("analysedAt") else "")]
    if a["status"] == "inaccessible":
        lines.append(f"  NOT ACCESSIBLE: {a.get('error')}")
        return "\n".join(lines)
    m = a.get("measured") or {}
    lines.append(f"  measured ({a.get('media')}): {m.get('width')}x{m.get('height')}" + (f", {m.get('durationS')} s @ {m.get('fps')} fps" if m.get("durationS") else "")
                 + f", {m.get('foundation')} foundation (luminance {m.get('luminance')}), contrast {m.get('contrast')}, saturation {m.get('saturation')}, detail {m.get('detail')}")
    lines.append("  palette: " + ", ".join(f"{c['hex']} {c['share']}%" for c in m.get("palette", [])))
    if a.get("frames"):
        lines.append(f"  frame strip (6 frames at {a.get('frameTimes')} s): {a['frames']}")
    if a.get("observed"):
        lines.append("  OBSERVED (seen by Claude Code): " + "; ".join(f"{k}: {v}" for k, v in a["observed"].items() if v))
    for om in a.get("observedMotion") or []:
        lines.append(f"  observed motion @ {om.get('t')} s: {om.get('what')}")
    if a.get("inferredMotion"):
        lines.append(f"  INFERRED motion (a guess, not seen): {a['inferredMotion']}")
    if a.get("takeaways"):
        lines.append(f"  take from it: {a['takeaways']}")
    if a.get("catalog"):
        lines.append("  built-in catalog analysis: observed and inferred fields in data/references.json")
    if not a.get("observed"):
        lines.append("  (not analysed yet: measured facts only)")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["measure", "record", "show"])
    ap.add_argument("ref")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--file")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.cmd == "measure":
        r = measure(a.ref, a.refresh)
    elif a.cmd == "record":
        if not a.file:
            raise SystemExit("--file required")
        r = record(a.ref, a.file)
    else:
        kind, path, url, _ = resolve(a.ref)
        r = load(key_of(kind, path, url)) if (kind == "url" or path.exists()) else None
    print(json.dumps(r, ensure_ascii=False) if a.json else describe(r))


if __name__ == "__main__":
    main()
