"""Build docs/reference-database.md for JUST A TAP.

Inputs (in docs/): reference-observations.psv (by-eye notes per tile),
reference-fingerprints.json (palette, luminance), reference-zip-map.json
(original filename, size, sha1). Optional arg: extracted references dir,
used to measure detail density on the original files.
usage: python3 -I tools/build_reference_db.py [<extracted original_inspiration dir>]
"""
import json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
COLS = ["id", "composition", "ui_type", "palette", "typography", "lighting", "depth", "hierarchy", "motion"]

# visually confirmed duplicate / near-duplicate groups (first id = primary)
DUPES = [
    ["000", "133"], ["002", "134"], ["003", "135"], ["005", "136"], ["007", "137", "090"], ["012", "138"],
    ["013", "014"], ["016", "017"], ["020", "139"], ["023", "140"], ["025", "078", "154"], ["027", "028", "141"],
    ["035", "142"], ["036", "143"], ["042", "144"], ["048", "145"], ["055", "146"], ["058", "147"],
    ["060", "081", "148"], ["062", "149"], ["067", "150"], ["070", "151"], ["073", "152"], ["075", "076", "153"],
    ["083", "155"], ["095", "156"], ["102", "157"], ["104", "105"], ["109", "158"], ["110", "159"],
    ["119", "160"], ["123", "124", "161"], ["162", "163", "164", "165", "166"],
]
GROUP_NOTE = {
    "016": "byte-identical files", "090": "same template, different logo", "081": "crop variant",
    "148": "wide variant", "078": "re-crop", "154": "re-crop", "014": "tighter crop", "028": "re-crop",
    "162": "five frames from one presenter shoot, different overlays",
}

# brand marks visible in the stills: never reproduce
BRANDED = {"007", "090", "137", "109", "110", "158", "159", "127", "088", "018", "024", "016", "017", "030", "050", "065", "101"}

# 15 strongest references for this brief and why
TOP = [
    ("123", "Dark input bar with warm light living inside its rim: proves that a light accent on one edge beats a glow halo."),
    ("003", "Modal with clear anatomy (eyebrow, title, subtitle, progress, primary pill): the target detail level for the confirmation panel."),
    ("001", "Floating finance card on light grey: a big balance with dimmed decimals, stacked cards below. Direct model for the wallet panel's hierarchy."),
    ("005", "Two feature cards with light seeping from the bottom edge: a restrained way to add warmth inside UI."),
    ("026", "Stacked notification rows with tiny accents: the model for the Cash/Swipe/Contactless rows on tracks."),
    ("058", "Three dashboard tiles with a ring, a path and a toggle: shows how varied micro-content keeps a row from feeling templated."),
    ("102", "Two progress rings with precise numerals: ring anatomy for the status progress."),
    ("092", "Segmented ring: proposed basis for the NFC-arc rhythm (segments, not glow)."),
    ("125", "Nodes linked by warm and cool light trails: the 'connection trace between two UIs' idea."),
    ("112", "Toggle pills on white with soft shadow: tactile state change on a light canvas."),
    ("096", "Black pill with a red scrubber on light grey: dark UI object on a light canvas, the scene 1-3 contrast model."),
    ("040", "Glass stat card with a large figure and squiggle: the number-first hierarchy for €24.90."),
    ("080", "Card with a gold figure and a thin rising line: warm accent on dark UI without neon."),
    ("095", "Small caps headline over a thin horizon with one bright point: restraint for the end card."),
    ("167", "Single glowing pill button and cursor: one focal action per frame."),
]

ANCHORS = [
    ("IMG_3124.jpg", "Layered payment cards", "Dark squircle widget (r≈56/1179) on light grey; label 'Bank Balance' + green 'Active' pill; huge balance with dimmed decimals; two stacked cards (blue, lilac) with masked digits and network wordmark at the bottom.",
     "Big-number hierarchy with dimmed decimals; status pill; stacked cards peeking from below; soft coloured shadow under the widget.",
     "Copy the network wordmark or the purple palette. Ours: generic card, no network brand, orange/ink only."),
    ("IMG_3125.jpg", "Translucent profile panel", "Frosted portrait card on a blue wave background; avatar, name, quote, 3 stat tiles, 2 link tiles, white pill CTA.",
     "Clear block rhythm: header → stat grid → actions → primary pill; consistent inner radii; white pill as the primary action.",
     "Copy the avatar, the social logos or the blue backdrop. Ours: no people, no third-party logos."),
    ("IMG_3126.jpg", "Dark finance chart", "Near-black card with an edge highlight on one corner; asset name + ticker, price with small decimals, green delta, jagged white line, tooltip chip with date.",
     "Restraint: one white line, one tooltip, numbers in two weights; edge light only on one corner.",
     "Copy the crypto content or the line shape."),
    ("IMG_3127.jpg", "Colourful analytics widgets", "Four squircle widgets with blurred light fields inside (clock, metric, heart-rate bars, calendar); big numerals, tiny unit labels.",
     "Light lives INSIDE the widget as a soft field, not as an external glow; numerals large, units tiny and uppercase.",
     "Copy the multi-colour palette. Ours uses one orange light field."),
    ("IMG_3128.jpg", "Black calendar with hierarchy", "Dark squircle calendar: month title, chevron buttons in hairline circles, weekday header in grey caps, dimmed out-of-month days, one selected day with a coloured disc; a coloured light tab at the top edge.",
     "Hairline circular buttons; dimmed vs active states; a single coloured selection; a light 'tab' on the top edge as the accent.",
     "Copy the calendar layout or the violet."),
    ("IMG_3129.jpg", "Navigation widget with amber depth", "Black squircle with orange-amber light rising from the bottom (road lanes), '600 m' big, street name small, speed chips in circles, orange 3D arrow.",
     "Exactly our palette logic: black UI + amber internal light; big number + small label; chips as secondary data.",
     "Copy the navigation content, the arrow object or the road illustration."),
]


def detail_density(path):
    im = Image.open(path).convert("L")
    im.thumbnail((400, 400))
    e = np.asarray(im.filter(ImageFilter.FIND_EDGES)).astype(float)
    return float((e > 40).mean())


def main():
    zdir = sys.argv[1] if len(sys.argv) > 1 else None
    fp = {r["id"]: r for r in json.loads((DOCS / "reference-fingerprints.json").read_text())}
    zmap = {o["tile"]: o for o in json.loads((DOCS / "reference-zip-map.json").read_text())}
    obs = {}
    for line in (DOCS / "reference-observations.psv").read_text().splitlines():
        p = line.split("|")
        obs[p[0]] = dict(zip(COLS, p))
    group_of = {m: g for g in DUPES for m in g}

    def res(i, k):
        v = obs[i][k]
        return res(group_of[i][0], k) if v == "same" else v

    dens = {}
    if zdir:
        for i, o in zmap.items():
            f = os.path.join(zdir, o["file"])
            if os.path.exists(f):
                dens[i] = detail_density(f)

    def dlabel(i):
        if i not in dens:
            return "n/a"
        d = dens[i]
        return f"{'high' if d > 0.09 else 'medium' if d > 0.04 else 'low'} ({d:.2f})"

    def bg(i):
        l = fp[i]["mean_lum"]
        return "dark" if l < 60 else "light" if l > 170 else "mid / saturated"

    gid, gids = 0, {}
    for i in sorted(fp):
        g = tuple(group_of.get(i, [i]))
        if g not in gids:
            gids[g] = f"D{gid:03d}"
            gid += 1
    unique = len(gids)

    L = [
        "# Reference database: JUST A TAP",
        "",
        "Inputs: `references/original_inspiration.zip` (169 PNGs; byte-identical to the `references.zip` reviewed for the previous project, sha1 `8d2853fa0af6…`) and the six `IMG_*.jpeg` anchor examples (copies in `docs/anchors/`).",
        "**Everything here is a still image. No motion was observed.** Every motion entry is a *proposal*.",
        "",
        f"- Archive files: 169 · unique after grouping: **{unique}** · duplicate/variant groups: **{sum(1 for g in gids if len(g) > 1)}**. "
        "Groups were proposed by SHA-1/dHash/aHash and confirmed by eye. Only 016/017 are byte-identical; the rest are re-exports, re-crops or template variants.",
        "- Detail density = share of edge pixels on a 400 px copy of the original (a proxy for how much UI micro-detail is present).",
        "- Background classification is measured from mean luminance.",
        "- Presenter frames (162-166) show a real person. They are recorded for composition only and are never reproduced.",
        "- Brand marks are visible in several stills (marked ⚑). They are never reproduced.",
        "",
        "## 1. The six anchor examples (the user's UI references)",
        "",
        "| File | Type | Observed anatomy | Principle we take | Must NOT copy |",
        "|---|---|---|---|---|",
    ]
    for a in ANCHORS:
        L.append("| " + " | ".join(a) + " |")
    L += ["", "## 2. Top 15 archive references for this brief", "", "| ID | Original file | Why it matters |", "|---|---|---|"]
    for i, why in TOP:
        L.append(f"| {i} | `{zmap[i]['file']}` | {why} |")
    L += ["", "## 3. Duplicate groups", "", "| Group | Members | Explanation |", "|---|---|---|"]
    for g, k in gids.items():
        if len(g) > 1:
            L.append(f"| {k} | {', '.join(g)} | {GROUP_NOTE.get(g[0]) or next((GROUP_NOTE[m] for m in g if m in GROUP_NOTE), 'near-identical re-export')} |")
    L += [
        "",
        "## 4. Full inventory (169 files)",
        "",
        "Observed columns describe the still. *Proposed motion* is our own inference and was ⚠ not observed.",
        "",
        "| ID | File · size · sha1 | Dup | Category | Observed palette (+ measured) | Background | UI anatomy / composition | Typography | Radius & shadow / lighting | Detail density | Focal hierarchy | ⚠ Proposed motion | Must NOT copy |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for i in sorted(fp):
        g = tuple(group_of.get(i, [i]))
        z = zmap[i]
        cat = res(i, "ui_type")
        meas = " ".join(f"`{c}`" for c in fp[i]["palette"][:3])
        dup = gids[g] + ("" if g[0] == i else f" (of {g[0]})")
        nocopy = f"{'⚑ brand marks; ' if i in BRANDED else ''}its exact {cat.lower()} layout and copy"
        row = [i, f"`{z['file']}` · {z['size'][0]}x{z['size'][1]} · `{z['sha1']}`", dup, cat, f"{res(i, 'palette')}; {meas}", bg(i),
               obs[i]["composition"], res(i, "typography"), f"{res(i, 'lighting')}; {res(i, 'depth')}", dlabel(i),
               res(i, "hierarchy"), "Proposed: " + res(i, "motion"), nocopy]
        L.append("| " + " | ".join(str(c).replace("|", "/") for c in row) + " |")
    (DOCS / "reference-database.md").write_text("\n".join(L) + "\n")
    print("rows", len(fp), "unique", unique, "density measured", len(dens))


if __name__ == "__main__":
    main()
