#!/usr/bin/env python3
"""Add new reference images WITHOUT rebuilding the library.

Two steps, because only Claude (looking at the image) can write the analysis:

1) scan - hash every new image, detect duplicates, and write a draft:
     python3 scripts/ingest.py scan <folder-or-files...> [--batch-name NAME]
   -> data/inbox/draft.json        one stub per NEW image, with a suggested category
                                   (from folder names like "on screen", "text", "full")
   -> data/inbox/inbox-sheet.png   labelled contact sheet of the new images
   Exact duplicates (same bytes) are reported and skipped.
   Near duplicates (same design at another size/crop) are proposed as alternates
   of the existing reference ("action": "alternate").
   Similar images are flagged ("similar_to") so you can decide.

2) Claude opens each image (Read tool), fills every empty field in draft.json
   (category, subcategory, family, title, tags, observed.*, inferred.*), then:
     python3 scripts/ingest.py commit
   -> assigns the next free IDs, copies originals into assets/references/<CAT>/,
      appends entries to data/references.json, records the batch, and rebuilds
      the generated docs + contact sheets. Existing entries are never modified,
      except that "alternate" items are attached to their matched reference.

Other:  python3 scripts/ingest.py status   (show what is waiting in the inbox)
"""
import argparse
import datetime
import json
import shutil
import subprocess
import sys
from pathlib import Path

import vvlib as V

INBOX = V.SKILL_ROOT / "data" / "inbox"
DRAFT = INBOX / "draft.json"
IMG_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"}
REQUIRED = ["category", "subcategory", "family", "title", "tags"]


def guess_category(path: Path):
    s = str(path).lower()
    if "on screen" in s or "on-screen" in s or "onscreen" in s or "overlay" in s:
        return "ONS"
    if "text" in s or "typo" in s or "caption" in s:
        return "TXT"
    if "full" in s:
        return "FUL"
    return ""


def collect(paths):
    out = []
    for p in map(Path, paths):
        if p.is_dir():
            out += sorted(q for q in p.rglob("*") if q.suffix.lower() in IMG_EXT
                          and "__MACOSX" not in q.parts and not q.name.startswith("._"))
        elif p.suffix.lower() in IMG_EXT:
            out.append(p)
    return out


def scan(args):
    cat = V.load_catalog()
    INBOX.mkdir(parents=True, exist_ok=True)
    files = collect(args.paths)
    if not files:
        sys.exit("No images found.")
    items, seen = [], {}
    for f in files:
        f = f.resolve()
        exact, near, similar = V.find_matches(cat, f)
        sh, ph = V.sha256(f), V.phash(f)
        # duplicates inside this new batch
        dup_in_batch = next((k for k, (s2, p2) in seen.items() if s2 == sh or V.hamming(ph, p2) <= V.DUP_THRESHOLD), None)
        seen[str(f)] = (sh, ph)
        item = {"source_path": str(f), "original_filename": f.name, "size": V.image_size(f)}
        if exact:
            item.update(action="skip", reason=f"identical to {exact[0][0]} ({exact[0][1]})")
        elif near:
            item.update(action="alternate", alternate_of=near[0][0],
                        reason=f"same design as {near[0][0]} (distance {near[0][2]}); kept as alternate copy")
        elif dup_in_batch:
            item.update(action="alternate-in-batch", alternate_of_source=dup_in_batch,
                        reason="near-duplicate of another image in this batch; attached to it as an alternate")
        else:
            item.update(action="new", similar_to=[f"{r} (d={d})" for r, _, d in similar[:3]],
                        category=guess_category(f), subcategory="", family="", title="", tags=[], also_useful_for=[],
                        observed={k: "" for k in V.OBSERVED_FIELDS if k != "palette"},
                        inferred={k: "" for k in V.INFERRED_FIELDS}, notes="")
        items.append(item)
    draft = {"batch_name": args.batch_name or f"batch-{datetime.date.today().isoformat()}",
             "created": datetime.datetime.now().isoformat(timespec="seconds"), "items": items}
    DRAFT.write_text(json.dumps(draft, indent=2, ensure_ascii=False), encoding="utf-8")
    sheet(items)
    counts = {a: sum(i["action"] == a for i in items) for a in ("new", "alternate", "alternate-in-batch", "skip")}
    print(f"Scanned {len(items)} images: {counts}")
    for i in items:
        if i["action"] != "new":
            print(f"  {i['action']:18s} {i['original_filename']}: {i['reason']}")
        elif i["similar_to"]:
            print(f"  new (similar to {', '.join(i['similar_to'])}): {i['original_filename']}")
    print(f"Draft: {DRAFT.relative_to(V.SKILL_ROOT)}  Sheet: data/inbox/inbox-sheet.png")
    print("Next: view each NEW image, fill its fields in the draft, then run: python3 scripts/ingest.py commit")


def sheet(items):
    from PIL import Image, ImageDraw
    new = [i for i in items if i["action"] == "new"]
    if not new:
        return
    tile, cols = 320, 4
    rows = (len(new) + cols - 1) // cols
    S = Image.new("RGB", (cols * tile, rows * (tile + 20)), (90, 90, 90))
    d = ImageDraw.Draw(S)
    for k, i in enumerate(new):
        im = Image.open(i["source_path"]).convert("RGB")
        im.thumbnail((tile, tile))
        x, y = (k % cols) * tile, (k // cols) * (tile + 20)
        S.paste(im, (x + (tile - im.width) // 2, y + 20 + (tile - im.height) // 2))
        d.rectangle([x, y, x + tile - 1, y + 19], fill=(0, 0, 0))
        d.text((x + 4, y + 4), f"#{k} {i['original_filename'][:40]}", fill=(255, 230, 0))
    S.save(INBOX / "inbox-sheet.png")


def commit(args):
    if not DRAFT.exists():
        sys.exit("No draft. Run scan first.")
    draft = json.loads(DRAFT.read_text(encoding="utf-8"))
    cat = V.load_catalog()
    problems = []
    for i in draft["items"]:
        if i["action"] != "new":
            continue
        for k in REQUIRED:
            if not i.get(k):
                problems.append(f"{i['original_filename']}: missing {k}")
        if i.get("category") not in V.CATEGORIES:
            problems.append(f"{i['original_filename']}: category must be one of {list(V.CATEGORIES)}")
        for grp, keys in (("observed", [k for k in V.OBSERVED_FIELDS if k != "palette"]), ("inferred", V.INFERRED_FIELDS)):
            for k in keys:
                if not i.get(grp, {}).get(k, "").strip():
                    problems.append(f"{i['original_filename']}: missing {grp}.{k}")
    if problems:
        print("Draft incomplete - fix these, then re-run commit:")
        print("\n".join("  - " + p for p in problems))
        sys.exit(1)
    today = datetime.date.today().isoformat()
    batch_label = f"{draft['batch_name']} ({today})"
    by_source, added, alts = {}, [], 0
    for i in draft["items"]:
        if i["action"] != "new":
            continue
        c = i["category"]
        rid = V.next_id(cat, c)
        src = Path(i["source_path"])
        dest = V.ASSET_ROOT / c / f"{rid}__{V.sanitize(src.name)}"
        shutil.copy2(src, dest)
        r = {"id": rid, "title": i["title"], "category": c, "subcategory": i["subcategory"], "family": i["family"],
             "also_useful_for": i.get("also_useful_for", []), "tags": i["tags"],
             "original_filename": src.name, "original_path": str(src), "source_folder": src.parent.name,
             "batch": batch_label, "file": str(dest.relative_to(V.SKILL_ROOT)), "size": V.image_size(dest),
             "sha256": V.sha256(dest), "phash": V.phash(dest),
             "observed": dict(i["observed"], palette=[{"hex": h, "share_pct": p} for h, p in V.palette(dest)]),
             "inferred": i["inferred"], "notes": i.get("notes", ""), "alternates": []}
        cat["references"].append(r)
        by_source[str(src)] = r
        added.append(rid)
    for i in draft["items"]:
        target = None
        if i["action"] == "alternate":
            target = next(r for r in cat["references"] if r["id"] == i["alternate_of"])
        elif i["action"] == "alternate-in-batch":
            target = by_source.get(i["alternate_of_source"]) or next(
                (r for r in cat["references"] for a in r["alternates"] if a.get("original_path") == i["alternate_of_source"]), None)
        if target is None:
            continue
        src = Path(i["source_path"])
        n = len(target["alternates"]) + 1
        dest = V.ASSET_ROOT / "_alternates" / f"{target['id']}__alt{n}__{V.sanitize(src.name)}"
        shutil.copy2(src, dest)
        target["alternates"].append({"original_filename": src.name, "original_path": str(src),
                                     "file": str(dest.relative_to(V.SKILL_ROOT)), "size": V.image_size(dest),
                                     "sha256": V.sha256(dest), "phash": V.phash(dest),
                                     "relation": "same design, different resolution/crop",
                                     "distance": V.hamming(V.phash(dest), target["phash"])})
        alts += 1
    cat["batches"].append({"id": draft["batch_name"], "date": today, "files_received": len(draft["items"]),
                           "unique_references": len(added), "alternates": alts,
                           "skipped_identical": sum(i["action"] == "skip" for i in draft["items"])})
    cat["updated"] = today
    V.save_catalog(cat)
    archive = INBOX / f"committed-{draft['batch_name']}.json"
    DRAFT.rename(archive)
    (INBOX / "inbox-sheet.png").unlink(missing_ok=True)
    print(f"Added {len(added)} references ({', '.join(added) or 'none'}) and {alts} alternates.")
    subprocess.run([sys.executable, str(Path(__file__).with_name("build_library.py"))], check=True)
    subprocess.run([sys.executable, str(Path(__file__).with_name("validate.py"))])
    print("Now update design rules if the batch introduced a new pattern (see references/extending-library.md).")


def status(_):
    if not DRAFT.exists():
        print("Inbox empty.")
        return
    d = json.loads(DRAFT.read_text(encoding="utf-8"))
    for k, i in enumerate(d["items"]):
        filled = i["action"] != "new" or all(i.get(f) for f in REQUIRED)
        print(f"#{k} {i['action']:18s} {'ready' if filled else 'NEEDS ANALYSIS'}  {i['original_filename']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("scan"); s.add_argument("paths", nargs="+"); s.add_argument("--batch-name")
    s.set_defaults(fn=scan)
    sub.add_parser("commit").set_defaults(fn=commit)
    sub.add_parser("status").set_defaults(fn=status)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
