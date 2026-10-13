#!/usr/bin/env python3
"""Search the reference library.

  python3 scripts/search.py stat percentage --cat ONS
  python3 scripts/search.py hourglass time --family 3D-METAPHOR -n 5
  python3 scripts/search.py --tag live-composite
  python3 scripts/search.py --show ONS-004            # full entry
  python3 scripts/search.py --list-families

Scoring: title x4, tags x3, subcategory/family x2, use cases x2, other text x1.
Results print the image path - open it with the Read tool before using it.
"""
import argparse
import json
import re
from collections import Counter

import vvlib as V


def score(r, terms):
    fields = [(r["title"], 4), (" ".join(r["tags"]), 3), (r["subcategory"] + " " + r["family"], 2),
              (r["inferred"]["use_cases"], 2),
              (" ".join(str(v) for k, v in r["observed"].items() if k != "palette") + " " + r["inferred"]["animation"], 1)]
    s = 0
    for t in terms:
        pat = re.compile(re.escape(t), re.I)
        for text, w in fields:
            s += w * len(pat.findall(text))
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="*")
    ap.add_argument("--cat", choices=list(V.CATEGORIES))
    ap.add_argument("--family")
    ap.add_argument("--tag")
    ap.add_argument("--also", help="include refs whose also_useful_for has this category")
    ap.add_argument("-n", type=int, default=12)
    ap.add_argument("--show", help="print the full JSON entry for an ID")
    ap.add_argument("--list-families", action="store_true")
    ap.add_argument("--include-deprecated", action="store_true")
    a = ap.parse_args()
    cat = V.load_catalog()
    refs = cat["references"]
    if a.show:
        r = next((r for r in refs if r["id"] == a.show.upper()), None)
        print(json.dumps(r, indent=2, ensure_ascii=False) if r else f"No reference {a.show}")
        return
    if a.list_families:
        for f, n in sorted(Counter(r["family"] for r in refs).items()):
            print(f"{f:22s} {n}")
        return
    pool = [r for r in refs
            if (a.include_deprecated or not r.get("deprecated")) and (not a.cat or r["category"] == a.cat or (a.also and a.also in r.get("also_useful_for", [])))
            and (not a.family or r["family"].lower() == a.family.lower())
            and (not a.tag or a.tag.lower() in [t.lower() for t in r["tags"]])]
    terms = [t for t in a.terms if t]
    ranked = sorted(((score(r, terms) if terms else 1, r) for r in pool), key=lambda x: -x[0])
    ranked = [x for x in ranked if x[0] > 0][: a.n]
    if not ranked:
        print("No matches. Try fewer/broader words, or grep references/library/INDEX.md.")
    for s, r in ranked:
        print(f"{r['id']}  [{r['category']}/{r['subcategory']} | {r['family']}]  {r['title']}  (score {s})")
        print(f"    file: {r['file']}")
        print(f"    use:  {r['inferred']['use_cases'][:140]}")


if __name__ == "__main__":
    main()
