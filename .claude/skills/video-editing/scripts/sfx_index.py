#!/usr/bin/env python3
"""Index the user's sound-effects library (System D). Files are indexed IN PLACE:
nothing is copied, moved, renamed, re-encoded or deleted.

  python3 scripts/sfx_index.py scan /path/to/SFX [/another/folder ...]   # add roots + (re)scan
  python3 scripts/sfx_index.py rescan                                     # rescan known roots
  python3 scripts/sfx_index.py search riser metallic [--cat RIS] [-n 10]
  python3 scripts/sfx_index.py show RIS-003
  python3 scripts/sfx_index.py set RIS-003 --category RIS --role metallic-riser --tags "metal,build" --notes "..."
  python3 scripts/sfx_index.py build-doc                                  # regenerate references/sound-library-index.md

Only scan folders the user has provided/authorised. IDs are stable across rescans
(keyed by content hash), and manual edits (category/role/tags/notes/use) are kept.
"""
import argparse
import datetime
import os
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import audiolib as A

ROOT = Path(__file__).resolve().parent.parent
DATA = A.library_path()
DOC = Path(os.environ.get("VV_SOUND_DOC", ROOT / "references" / "sound-library-index.md"))

CATS = {  # prefix: (label, default use)
    "WSH": ("Whooshes", "Movement: slides, pans, zooms, camera moves, scene transitions. Peak on the fastest frame. Preset -12 dB (bigger moves up to -10 dB)."),
    "TEX": ("Textures", "Non-sliding events: reveals, write-outs, sparkles, foley details. Place on the event frame. Preset -6 to -7 dB."),
    "UI": ("UI sounds", "UI element appears/changes, notifications, toggles, button states. Event frame. Preset -6 to -7 dB."),
    "POP": ("Pops and clicks", "Text pops, single-element pops, clicks, taps, typing. Event frame. Preset -6 to -7 dB."),
    "SCI": ("Sci-fi sounds", "Reveals of new UI/objects (sci-fi impact), in-animation changes (sci-fi click), entry into a new animation, scene transitions (sci-fi hit). Preset -6 to -7 dB."),
    "MEC": ("Mechanical effects", "Gears, mechanisms, letter-by-letter write-outs, typewriter feel, camera clicks. One emphasis per element. Preset -6 to -7 dB."),
    "RIS": ("Risers", "Anticipation into the next segment; ends on the transition frame with a hit beneath. Preset -5 dB (suck-backs: very low or very loud, never middle)."),
    "HIT": ("Hits and impacts", "Release under a riser on the transition frame; the stack is the loudest moment. Pull the hit (never the voice) if it clips."),
    "ENV": ("Environmental sounds", "Beds/room tone/ambience when a scene needs a continuous bed (placed first). Diegetic sounds for on-screen sources."),
    "MUS": ("Music", "Under the talking head only, -19 dB; never under full-screen animations/graphics. User-supplied tracks only."),
    "UNC": ("Uncategorised", "Needs a manual category (sfx_index.py set ID --category ...)."),
}
ORDER = list(CATS)
# keyword -> category; folder names count double. Specific phrases first.
KEYS = [
    (r"music|song|score|soundtrack|\bbgm\b|\bbed\b", "MUS"),
    (r"riser|uplift|build.?up|\bbuild\b|suck.?back|reverse|tension|\brise\b", "RIS"),
    (r"sci.?fi|scifi|futur|laser|glitch|digital|energy|zap|hologram|cyber|\bscan\b|space", "SCI"),
    (r"impact|\bhit\b|hits\b|boom|slam|thud|punch|braam|sub.?drop|stinger", "HIT"),
    (r"whoosh|woosh|swoosh|swish|swoop|pass.?by|swipe|\bfly\b|water.?dropper|transition", "WSH"),
    (r"\bui\b|interface|notif|beep|blip|chime|menu|hover|select|confirm|toggle|success|error", "UI"),
    (r"\bpop|click|tick|\btap|keyboard|typing|\btype|\bkey|button|snap", "POP"),
    (r"gear|mechan|ratchet|servo|machine|motor|clockwork|lever|latch|shutter|camera|gizmo|typewriter", "MEC"),
    (r"texture|granular|shimmer|sparkle|foley|paper|cloth|rustle|grain|choir|reward", "TEX"),
    (r"ambien|room.?tone|atmos|\bwind\b|rain|city|nature|forest|crowd|traffic|birds|ocean|wave", "ENV"),
]
# Joseph's named roles (A2 tables) recognised from file/folder names.
ROLES = [
    (r"classy|airy", "classy-airy-whoosh"), (r"hollow", "hollow-whoosh"), (r"futur", "futuristic-whoosh"),
    (r"deep.?voice", "deep-voice-whoosh"), (r"generic.?long|long.?whoosh", "generic-long-whoosh"),
    (r"organic|wind", "organic-wind-whoosh"), (r"short", "short-whoosh"), (r"synthetic", "synthetic-whoosh"),
    (r"spacey|space", "transition-spacey-whoosh"), (r"water.?dropper", "water-dropper"),
    (r"sharp.?bass|bass.?riser", "sharp-bass-riser"), (r"metal", "metallic-riser"), (r"suspens", "suspenseful-build"),
    (r"suck", "suck-back-riser"), (r"activate|protection", "activate-energy"), (r"alarm|buzzer", "alarm-buzzer"),
    (r"choir|heavenly", "heavenly-choir"), (r"camera|shutter", "camera-click"), (r"gizmo|mechanism", "mechanism-gizmo"),
    (r"video.?scan|scan", "video-scan"), (r"success|reward", "success-reward"), (r"gearwheel|gear", "gears"),
    (r"keyboard|typing", "keyboard-writing"), (r"analog.?button|button", "analog-button"),
    (r"sci.?fi.?click", "sci-fi-click"), (r"sci.?fi.?(hit|impact)", "sci-fi-impact"), (r"ui.?click", "ui-click"),
    (r"\bpop", "pop"), (r"impact|hit", "impact-hit"),
]


def sha(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 16), b""):
            h.update(b)
    return h.hexdigest()


def load():
    if DATA.exists():
        return json.loads(DATA.read_text(encoding="utf-8"))
    return {"schema_version": 1, "roots": [], "updated": None, "sounds": []}


def save(d):
    d["updated"] = datetime.date.today().isoformat()
    d["sounds"].sort(key=lambda s: (ORDER.index(s["category"]), s["id"]))
    DATA.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def norm(s: str) -> str:
    return re.sub(r"[_\-.]+", " ", s.lower())


def classify(rel: str, metrics: dict):
    parts = rel.split("/")
    folder, name = norm(" ".join(parts[:-1])), norm(Path(parts[-1]).stem)
    score = Counter()
    for rx, cat in KEYS:
        if re.search(rx, folder):
            score[cat] += 2
        if re.search(rx, name):
            score[cat] += 1
    text = folder + " " + name
    if score.get("SCI") and score.get("HIT") and not re.search(r"riser|under", text):
        score["SCI"] += 1          # Joseph files 'sci-fi hit/impact' under textures (reveals/transitions)
    if score.get("WSH") and score.get("ENV"):
        score["WSH"] += 1          # 'organic wind whoosh' is a whoosh, not ambience
    role = next((r for rx, r in ROLES if re.search(rx, text)), None)
    if score:
        best = max(score.items(), key=lambda kv: (kv[1], -ORDER.index(kv[0])))
        conf = "high" if best[1] >= 2 else "medium"
        return best[0], "keyword", conf, role
    sh = metrics.get("shape")
    guess = {"rise": "RIS", "impact": "HIT" if metrics.get("low_energy_ratio", 0) > 0.2 else "SCI",
             "transient": "POP", "swell": "WSH",
             "sustain": "ENV" if metrics.get("duration", 0) > 4 else "TEX"}.get(sh, "UNC")
    return guess, "signal", "low", role


def scan(roots, d):
    known = {s["sha256"]: s for s in d["sounds"]}
    by_path = {s["path"]: s for s in d["sounds"]}
    found, new, changed = [], 0, 0
    for root in roots:
        root = Path(root).resolve()
        if not root.is_dir():
            print(f"skip (not a folder): {root}")
            continue
        if str(root) not in d["roots"]:
            d["roots"].append(str(root))
        for p in sorted(root.rglob("*")):
            if not p.is_file() or p.suffix.lower() not in A.AUDIO_EXT or p.name.startswith("._") or "__MACOSX" in p.parts:
                continue
            h = sha(p)
            rel = str(p.relative_to(root))
            prev = known.get(h) or by_path.get(str(p))
            try:
                info = A.probe(p)
                if not info["has_audio"]:
                    continue
                m = A.analyze(A.decode(p))
                if m["duration"] >= 0.4:
                    m.update(A.lufs(p))
            except Exception as e:  # unreadable file: record, don't crash
                print(f"  ! cannot analyse {p}: {e}")
                continue
            cat, src, conf, role = classify(rel, m)
            rec = prev or {}
            if prev is None:
                new += 1
            elif prev.get("sha256") != h:
                changed += 1
            manual = rec.get("manual", {})
            rec.update({
                "sha256": h, "path": str(p), "root": str(root), "rel": rel, "filename": p.name,
                "variation_group": str(Path(rel).parent) if str(Path(rel).parent) != "." else "(root)",
                "format": {"codec": info["codec"], "sample_rate": info["sample_rate"], "channels": info["channels"]},
                "metrics": m,
                "category": manual.get("category", cat), "category_source": "manual" if "category" in manual else src,
                "confidence": "manual" if "category" in manual else conf,
                "role": manual.get("role", role),
                "tags": manual.get("tags", rec.get("tags", [])),
                "use": manual.get("use", CATS[manual.get("category", cat)][1]),
                "notes": manual.get("notes", ""),
                "manual": manual,
                "auditioned": {"method": "signal analysis (envelope, transient, peak, loudness, spectrum)",
                               "date": datetime.date.today().isoformat()},
            })
            found.append(rec)
    # keep entries from roots not rescanned this time
    scanned = {str(Path(r).resolve()) for r in roots}
    kept = [s for s in d["sounds"] if s["root"] not in scanned]
    allrec = kept + found
    used = {s["id"] for s in allrec if s.get("id")}
    for s in allrec:
        if not s.get("id") or not s["id"].startswith(s["category"] + "-"):
            n = 1
            while f"{s['category']}-{n:03d}" in used:
                n += 1
            s["id"] = f"{s['category']}-{n:03d}"
            used.add(s["id"])
    d["sounds"] = allrec
    print(f"indexed {len(found)} files under {len(roots)} root(s): {new} new, {changed} changed")
    return d


def build_doc(d):
    S = d["sounds"]
    cnt = Counter(s["category"] for s in S)
    L = ["<!-- GENERATED by scripts/sfx_index.py from data/sounds.json. Do not edit by hand. -->\n\n",
         "# Sound Library Index (System D)\n\n",
         f"Updated {d.get('updated') or 'never'}. **{len(S)} sound files indexed** "
         f"from {len(d['roots'])} authorised root folder(s). Files are indexed in place; nothing is copied, moved or modified.\n\n"]
    if d["roots"]:
        L.append("Roots:\n" + "".join(f"- `{r}`\n" for r in d["roots"]) + "\n")
    if not S:
        L.append("> **The library is empty.** No authorised sound-effects folder has been indexed yet. "
                 "System D cannot place sounds until the user provides one. Run `python3 scripts/sfx_index.py scan /path/to/SFX` "
                 "on a folder the user names, then review uncategorised and low-confidence entries. "
                 "Do not substitute downloaded or generated sounds without the user's explicit approval.\n\n")
    L.append("Search: `python3 scripts/sfx_index.py search <words> [--cat WSH]` · details: `sfx_index.py show ID` · compare variations: "
             "`python3 scripts/sfx_audition.py --group <folder>` (waveform/envelope sheet + metrics).\n\n")
    L.append("Columns: duration (s); peak dBFS; integrated LUFS (files ≥0.4 s); shape (signal class); anchor times = loudest point (`pk`) and transient (`on`) in seconds from file start; "
             "`src` = how the category was assigned (keyword / signal / manual), with confidence.\n\n")
    L.append("| Category | Prefix | Count |\n|---|---|---|\n" + "".join(f"| {CATS[c][0]} | {c} | {cnt.get(c, 0)} |\n" for c in ORDER) + "\n")
    for c in ORDER:
        items = [s for s in S if s["category"] == c]
        L.append(f"## {c}: {CATS[c][0]} ({len(items)})\n\n_Use: {CATS[c][1]}_\n\n")
        if not items:
            L.append("_No files in this category yet._\n\n")
            continue
        L.append("| ID | File | Path (relative to root) | Dur | Peak | LUFS | Shape | pk / on | Role | Variation group | src |\n|---|---|---|---|---|---|---|---|---|---|---|\n")
        for s in items:
            m = s["metrics"]
            L.append(f"| {s['id']} | `{s['filename']}` | `{s['rel']}` | {m['duration']:.2f} | {m['peak_dbfs']:.1f} | "
                     f"{m.get('lufs_i') if m.get('lufs_i') is not None else '-'} | {m['shape']} | {m['peak_time']:.2f} / {m['onset_time']:.2f} | "
                     f"{s.get('role') or '-'} | `{s['variation_group']}` | {s['category_source']} ({s['confidence']}) |\n")
        L.append("\n")
    groups = defaultdict(list)
    for s in S:
        groups[s["variation_group"]].append(s["id"])
    multi = {g: v for g, v in groups.items() if len(v) > 1}
    if multi:
        L.append("## Variation groups (audition all members before choosing)\n\n" +
                 "".join(f"- `{g}`: {', '.join(v)}\n" for g, v in sorted(multi.items())) + "\n")
    DOC.write_text("".join(L), encoding="utf-8")


def search(d, terms, cat, n):
    res = []
    for s in d["sounds"]:
        if cat and s["category"] != cat:
            continue
        hay = " ".join([s["rel"], s.get("role") or "", " ".join(s.get("tags", [])), s.get("notes", ""), s["category"], CATS[s["category"]][0]]).lower()
        sc = sum(hay.count(t.lower()) for t in terms) if terms else 1
        if sc:
            res.append((sc, s))
    for sc, s in sorted(res, key=lambda x: -x[0])[:n]:
        m = s["metrics"]
        print(f"{s['id']:8s} {CATS[s['category']][0]:<20s} {m['duration']:5.2f}s pk@{m['peak_time']:.2f}s {m['shape']:<9s} {s.get('role') or '':<22s} {s['path']}")
    if not res:
        print("No matches." + ("" if d["sounds"] else " The sound library is empty: ask the user for an authorised SFX folder."))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("scan"); p.add_argument("roots", nargs="+")
    sub.add_parser("rescan")
    p = sub.add_parser("search"); p.add_argument("terms", nargs="*"); p.add_argument("--cat"); p.add_argument("-n", type=int, default=15)
    p = sub.add_parser("show"); p.add_argument("id")
    p = sub.add_parser("set"); p.add_argument("id"); p.add_argument("--category", choices=ORDER); p.add_argument("--role")
    p.add_argument("--tags"); p.add_argument("--notes"); p.add_argument("--use")
    sub.add_parser("build-doc")
    a = ap.parse_args()
    d = load()
    if a.cmd in ("scan", "rescan"):
        roots = a.roots if a.cmd == "scan" else d["roots"]
        if not roots:
            sys.exit("No roots known. Use: sfx_index.py scan /path/to/authorised/SFX")
        d = scan(roots, d); save(d); build_doc(d)
        unc = [s["id"] for s in d["sounds"] if s["confidence"] in ("low",) or s["category"] == "UNC"]
        if unc:
            print(f"review needed (signal-guessed category): {', '.join(unc[:30])}{' ...' if len(unc) > 30 else ''}")
    elif a.cmd == "search":
        search(d, a.terms, a.cat, a.n)
    elif a.cmd == "show":
        s = next((s for s in d["sounds"] if s["id"] == a.id.upper()), None)
        print(json.dumps(s, indent=2) if s else f"No sound {a.id}")
    elif a.cmd == "set":
        s = next((s for s in d["sounds"] if s["id"] == a.id.upper()), None)
        if not s:
            sys.exit(f"No sound {a.id}")
        man = s.setdefault("manual", {})
        if a.category: man["category"] = a.category
        if a.role: man["role"] = a.role
        if a.tags is not None: man["tags"] = [t.strip() for t in a.tags.split(",") if t.strip()]
        if a.notes is not None: man["notes"] = a.notes
        if a.use is not None: man["use"] = a.use
        for k in ("role", "tags", "notes", "use"):
            if k in man: s[k] = man[k]
        if "category" in man and man["category"] != s["category"]:
            s["category"] = man["category"]; s["id"] = None
            used = {x["id"] for x in d["sounds"] if x.get("id")}
            n = 1
            while f"{s['category']}-{n:03d}" in used: n += 1
            s["id"] = f"{s['category']}-{n:03d}"
        s["category_source"], s["confidence"] = ("manual", "manual") if "category" in man else (s["category_source"], s["confidence"])
        save(d); build_doc(d); print("updated", s["id"])
    elif a.cmd == "build-doc":
        save(d); build_doc(d); print("wrote", DOC.relative_to(ROOT))


if __name__ == "__main__":
    main()
