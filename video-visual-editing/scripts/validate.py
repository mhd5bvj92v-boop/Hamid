#!/usr/bin/env python3
"""Integrity checks for the skill. Exit code 1 if any ERROR.

Checks: catalog schema + required fields, ID format/uniqueness, every referenced
image exists with matching SHA-256, no orphan images, every family has a recipe
in design-language.md, generated docs are in sync, local markdown links and
templates resolve, ID cross-references resolve, batch accounting adds up, and
no undetected near-duplicates among primary references.

  python3 scripts/validate.py [--quiet]
"""
import json
import re
import sys
from itertools import combinations
from pathlib import Path

import vvlib as V

errors, warnings = [], []
err = errors.append
warn = warnings.append


def main():
    cat = V.load_catalog()
    refs = cat["references"]
    ids = [r["id"] for r in refs]
    root = V.SKILL_ROOT

    # IDs
    for rid in ids:
        if not re.fullmatch(r"(ONS|TXT|FUL)-\d{3}", rid):
            err(f"bad id {rid}")
    for rid in {i for i in ids if ids.count(i) > 1}:
        err(f"duplicate id {rid}")

    referenced = set()
    design = (root / "references" / "design-language.md").read_text(encoding="utf-8") if (root / "references" / "design-language.md").exists() else ""
    for r in refs:
        rid = r["id"]
        if r["category"] not in V.CATEGORIES or not rid.startswith(r["category"]):
            err(f"{rid}: category {r['category']} does not match id")
        for k in ("title", "subcategory", "family", "tags", "original_filename", "original_path", "file"):
            if not r.get(k):
                err(f"{rid}: missing {k}")
        for k in V.OBSERVED_FIELDS:
            if not r["observed"].get(k):
                err(f"{rid}: missing observed.{k}")
        for k in V.INFERRED_FIELDS:
            if not r["inferred"].get(k):
                err(f"{rid}: missing inferred.{k}")
        if design and f"### {r['family']}" not in design:
            err(f"{rid}: family {r['family']} has no '### {r['family']}' recipe in design-language.md")
        for f, sh in [(r["file"], r["sha256"])] + [(a["file"], a["sha256"]) for a in r.get("alternates", [])]:
            p = root / f
            referenced.add(p.resolve())
            if not p.exists():
                err(f"{rid}: file missing {f}")
            elif V.sha256(p) != sh:
                err(f"{rid}: checksum mismatch {f}")
        for m in re.findall(r"\b(?:ONS|TXT|FUL)-\d{3}\b", " ".join(map(str, list(r["observed"].values()) + list(r["inferred"].values()) + [r.get("notes", "")]))):
            if m not in ids:
                err(f"{rid}: cross-reference to unknown {m}")
        for t in re.findall(r"templates/[\w-]+\.\w+", str(r["inferred"])):
            if not (root / t).exists():
                err(f"{rid}: references missing {t}")

    for p in V.ASSET_ROOT.rglob("*"):
        if p.is_file() and p.resolve() not in referenced:
            err(f"orphan asset not in catalog: {p.relative_to(root)}")

    # batch accounting
    total_files = sum(1 for p in V.ASSET_ROOT.rglob("*") if p.is_file())
    received = sum(b.get("files_received", 0) - b.get("skipped_identical", 0) for b in cat.get("batches", []))
    if received != total_files:
        warn(f"batches report {received} stored files but asset library holds {total_files}")

    # generated docs in sync
    idx = root / "references" / "library" / "INDEX.md"
    if not idx.exists():
        err("INDEX.md missing - run build_library.py")
    else:
        text = idx.read_text(encoding="utf-8")
        missing = [i for i in ids if f"| {i} |" not in text]
        if missing:
            err(f"INDEX.md out of date (missing {missing[:5]}...) - run build_library.py")
    for c in V.CATEGORIES:
        f = root / "references" / "library" / f"{c}.md"
        n = sum(r["category"] == c for r in refs)
        if not f.exists() or f.read_text(encoding="utf-8").count("\n### ") + f.read_text(encoding="utf-8").startswith("### ") != n:
            err(f"{c}.md out of date - run build_library.py")

    # local links in docs
    for md in [root / "SKILL.md"] + sorted((root / "references").glob("*.md")):
        if not md.exists():
            err(f"missing doc {md.relative_to(root)}")
            continue
        for link in re.findall(r"\]\(([^)#\s]+)\)", md.read_text(encoding="utf-8")):
            if link.startswith(("http://", "https://", "mailto:")):
                continue
            if not (md.parent / link.replace("%20", " ")).exists():
                err(f"{md.relative_to(root)}: broken link {link}")
        for t in re.findall(r"(?:templates|scripts)/[\w./-]+\.(?:html|py|js|sh|md)", md.read_text(encoding="utf-8")):
            if not (root / t).exists():
                err(f"{md.relative_to(root)}: mentions missing {t}")
        for m in set(re.findall(r"\b(?:ONS|TXT|FUL)-\d{3}\b", md.read_text(encoding="utf-8"))):
            if m not in ids:
                err(f"{md.relative_to(root)}: unknown reference {m}")

    # ---------------- System D (sound design)
    for doc in ("sound-design.md", "sound-design-workflow.md", "sound-library-index.md"):
        if not (root / "references" / doc).exists():
            err(f"missing System D doc references/{doc}")
    if "sound-design.md" not in (root / "SKILL.md").read_text(encoding="utf-8"):
        err("SKILL.md does not route to references/sound-design.md")
    src = root / "data" / "sources.json"
    if src.exists():
        for d in json.loads(src.read_text(encoding="utf-8"))["sources"]:
            f = root / d["file"]
            if not f.exists():
                err(f"source document missing: {d['file']}")
            elif V.sha256(f) != d["sha256"]:
                err(f"source document modified (must stay unmodified): {d['file']}")
    else:
        err("data/sources.json missing")
    snd = root / "data" / "sounds.json"
    if snd.exists():
        lib = json.loads(snd.read_text(encoding="utf-8"))
        ids_s = [x["id"] for x in lib["sounds"]]
        for i in {i for i in ids_s if ids_s.count(i) > 1}:
            err(f"duplicate sound id {i}")
        idx_doc = (root / "references" / "sound-library-index.md").read_text(encoding="utf-8")
        if f"**{len(ids_s)} sound files indexed**" not in idx_doc or any(f"| {i} |" not in idx_doc for i in ids_s):
            err("sound-library-index.md out of date - run: python3 scripts/sfx_index.py build-doc")
        for x in lib["sounds"]:
            for k in ("id", "path", "sha256", "category", "metrics"):
                if not x.get(k):
                    err(f"sound {x.get('id')}: missing {k}")
            if not x["id"].startswith(x["category"] + "-"):
                err(f"sound {x['id']}: id does not match category {x['category']}")
            pth = Path(x["path"])
            if not pth.exists():
                warn(f"sound {x['id']}: file not reachable now ({x['path']}) - external drive unmounted?")
            elif V.sha256(pth) != x["sha256"]:
                warn(f"sound {x['id']}: file content changed since indexing - run sfx_index.py rescan")
    else:
        err("data/sounds.json missing (run: python3 scripts/sfx_index.py build-doc)")
    # no Remotion dependency anywhere in executable code
    rx = re.compile(r"""(require\(\s*['"]@?remotion|from\s+['"]@?remotion|import\s+.*['"]@?remotion|@remotion/)""")
    for f in list((root / "scripts").rglob("*")) + list((root / "templates").rglob("*")):
        if f.is_file() and f.name != "validate.py" and f.suffix in (".js", ".mjs", ".ts", ".tsx", ".py", ".html", ".json") and rx.search(f.read_text(encoding="utf-8", errors="ignore")):
            err(f"Remotion dependency found in {f.relative_to(root)} (not allowed)")
    for pj in root.rglob("package.json"):
        if "remotion" in pj.read_text(encoding="utf-8", errors="ignore").lower():
            err(f"Remotion listed in {pj.relative_to(root)} (not allowed)")
    # every template declares its sound intents
    for t in (root / "templates").glob("*.html"):
        if "window.sfxCues" not in t.read_text(encoding="utf-8"):
            err(f"template {t.name} has no window.sfxCues sound intents")

    # undetected near-duplicates among primaries
    for a, b in combinations(refs, 2):
        if abs(V.aspect(a["size"]) - V.aspect(b["size"])) / max(V.aspect(a["size"]), V.aspect(b["size"])) > 0.15:
            continue
        d = V.hamming(a["phash"], b["phash"])
        if d <= V.DUP_THRESHOLD:
            warn(f"possible duplicate primaries {a['id']} / {b['id']} (distance {d})")

    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    n_alt = sum(len(r.get("alternates", [])) for r in refs)
    per_cat = ", ".join("%s %d" % (c, sum(1 for r in refs if r["category"] == c)) for c in V.CATEGORIES)
    nsnd = len(json.loads((root / "data" / "sounds.json").read_text())["sounds"]) if (root / "data" / "sounds.json").exists() else 0
    print("%d references (%s), %d alternates, %d image files; System D: %d indexed sounds, source doc checksum verified, no Remotion. %d errors, %d warnings."
          % (len(refs), per_cat, n_alt, total_files, nsnd, len(errors), len(warnings)))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
