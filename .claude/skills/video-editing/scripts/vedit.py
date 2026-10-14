"""Shared helpers for the Remotion talking-head workflow (edit_init / edit_render / edit_qc).

Stdlib + numpy only. Locates the Remotion app and the project work folder,
probes footage with ffprobe, hashes files, and runs Remotion commands.
"""
from __future__ import annotations

import glob
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

# Windows: files and pipes default to the ANSI code page, but edit.json, the logs and the library are
# UTF-8. Re-run the script once in Python's UTF-8 mode (nothing happens on macOS/Linux or when it is on).
if os.name == "nt" and not sys.flags.utf8_mode and sys.argv and sys.argv[0].endswith(".py"):
    sys.exit(subprocess.call([sys.executable, "-X", "utf8", *sys.argv]))

SKILL_ROOT = Path(__file__).resolve().parent.parent
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")


def find_app(explicit: str | None = None) -> Path:
    """The Remotion app: --app, $VE_REMOTION_APP, or the nearest remotion-app/ above the skill or cwd."""
    cands = [explicit, os.environ.get("VE_REMOTION_APP")]
    for start in (Path.cwd(), SKILL_ROOT):
        for d in [start, *start.parents]:
            cands.append(str(d / "remotion-app"))
    for c in cands:
        if c and (Path(c) / "package.json").exists() and (Path(c) / "src" / "kit" / "TalkingHeadEdit.tsx").exists():
            return Path(c).resolve()
    raise SystemExit("Remotion app not found (expected remotion-app/ with src/kit/). Pass --app or set VE_REMOTION_APP.")


def repo_root(app: Path) -> Path:
    return app.parent


def work_dir(app: Path, slug: str, explicit: str | None = None) -> Path:
    base = Path(explicit or os.environ.get("VE_WORK") or (repo_root(app) / "work"))
    return (base / slug).resolve()


def load_project(app: Path, slug: str, work: str | None = None) -> dict:
    wd = work_dir(app, slug, work)
    pj = wd / "project.json"
    if not pj.exists():
        raise SystemExit(f"{pj} not found - run edit_init.py first")
    return json.loads(pj.read_text())


# ------------------------------------------------------------------ the project document (edit.json)
# Several writers share edit.json: the Studio server, these scripts and Claude Code. Every write is
# atomic (temp file + rename) and checked against the revision it was read at, so a stale writer is
# refused instead of silently overwriting newer data.

def doc_path(app: Path, slug: str) -> Path:
    return app / "src" / "projects" / slug / "edit.json"


def normalize_doc(doc: dict) -> dict:
    """Defaults for older documents (mirrors normalizeDoc in src/kit/project.ts)."""
    doc.setdefault("requests", []); doc.setdefault("rev", 0)
    doc.setdefault("nextRequest", len(doc["requests"]) + 1)
    for k in ("segments", "approvals", "feedback", "keepVisible", "beats", "sfx", "focus"):
        doc.setdefault(k, [])
    for s in doc["segments"]:
        s.setdefault("history", []); s.setdefault("requests", []); s.setdefault("versions", [])
        cs = [c for c in (s.get("concepts") or {}).values() if c]
        if cs and all(c.get("author") == "draft" for c in cs):      # Quick Drafts stored as concepts by older versions
            s["drafts"], s["draftRound"], s["concepts"], s["round"] = s["concepts"], s.get("round", 1), {}, 0
            if s.get("decision") and not s["decision"].get("source"):
                s["decision"]["source"] = "draft"
        if s.get("decision") and not s["decision"].get("source"):
            s["decision"]["source"] = "own" if s["decision"].get("choice") == "D" else "claude"
    return doc


def load_doc(app: Path, slug: str) -> dict:
    p = doc_path(app, slug)
    if not p.exists():
        raise SystemExit(f"{p} missing - run edit_init.py first")
    doc = normalize_doc(json.loads(p.read_text()))
    doc["_base_rev"] = doc["rev"]
    return doc


def save_doc(app: Path, slug: str, doc: dict) -> dict:
    p = doc_path(app, slug)
    base = doc.pop("_base_rev", None)
    cur = json.loads(p.read_text()).get("rev", 0) if p.exists() else 0
    if base is not None and cur != base:
        raise SystemExit(f"edit.json changed while this command ran (rev {base} -> {cur}, e.g. the Studio saved); nothing was written. Run the command again.")
    doc["rev"] = cur + 1
    tmp = p.with_name(p.name + f".tmp{os.getpid()}")
    tmp.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
    os.replace(tmp, p)
    doc["_base_rev"] = doc["rev"]
    return doc


def clean_doc(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if not k.startswith("_")}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def rate(s: str | None) -> float | None:
    if not s or s in ("0/0", "0"):
        return None
    return float(Fraction(s))


def probe(path: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"ffprobe failed on {path}: {r.stderr.strip()}")
    d = json.loads(r.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    if not v:
        raise SystemExit(f"{path} has no video stream")
    a = [s for s in d["streams"] if s["codec_type"] == "audio"]
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    if "rotate" in (v.get("tags") or {}):
        rot = int(v["tags"]["rotate"])
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) % 180 == 90:
        w, h = h, w
    r_fps, avg_fps = rate(v.get("r_frame_rate")), rate(v.get("avg_frame_rate"))
    dur = float(v.get("duration") or d["format"].get("duration") or 0)
    vfr = bool(r_fps and avg_fps and abs(r_fps - avg_fps) / r_fps > 0.002)
    return {
        "width": w, "height": h, "rotation": rot, "codec": v.get("codec_name"), "pix_fmt": v.get("pix_fmt"),
        "r_frame_rate": v.get("r_frame_rate"), "avg_frame_rate": v.get("avg_frame_rate"),
        "fps": r_fps, "avg_fps": avg_fps, "vfr": vfr,
        "duration": dur, "format_duration": float(d["format"].get("duration") or 0),
        "nb_frames": int(v["nb_frames"]) if str(v.get("nb_frames", "")).isdigit() else None,
        "start_time": float(v.get("start_time") or 0),
        "color": {k: v.get(k) for k in ("color_range", "color_space", "color_transfer", "color_primaries")},
        "audio": [{"codec": s.get("codec_name"), "sample_rate": int(s.get("sample_rate") or 0), "channels": s.get("channels"),
                   "start_time": float(s.get("start_time") or 0), "duration": float(s.get("duration") or 0)} for s in a],
        "format": d["format"].get("format_name"), "size": int(d["format"].get("size") or 0),
    }


def browser_env(app: Path) -> dict:
    """Use Remotion's own Chrome Headless Shell when present; otherwise a local one (sandboxes that block its download)."""
    env = dict(os.environ)
    if env.get("REMOTION_BROWSER_EXECUTABLE"):
        return env
    own = app / "node_modules" / ".remotion"
    if own.exists() and any(f.is_file() and f.name in ("chrome-headless-shell", "headless_shell") for f in own.rglob("*")):
        return env
    local = sorted(glob.glob("/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell"))
    if local:
        env["REMOTION_BROWSER_EXECUTABLE"] = local[-1]
    return env


def run(cmd: list[str], cwd: Path | None = None, env: dict | None = None, log: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    if os.name == "nt" and cmd and cmd[0] in ("npx", "npm"):
        cmd = [shutil.which(cmd[0]) or cmd[0], *cmd[1:]]  # npx.cmd on Windows: needs its full path without a shell
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if log:
        log.parent.mkdir(parents=True, exist_ok=True)
        log.write_text(f"$ {' '.join(cmd)}\n\n{r.stdout}\n{r.stderr}")
    if check and r.returncode:
        tail = (r.stdout + r.stderr)[-3000:]
        raise SystemExit(f"command failed ({r.returncode}): {' '.join(cmd)}\n{tail}")
    return r


def comp_id(slug: str) -> str:
    return f"Edit-{slug}"
