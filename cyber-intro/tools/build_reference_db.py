"""Build docs/reference-database.md and docs/reference-contact-sheet.png.

Observations come from docs/reference-observations.psv (written by eye from
4x-enlarged thumbnails). Fingerprints come from extract_references.py.
Hash grouping alone was unreliable on these ~99x70 JPEG thumbnails (dark
tiles collide, re-crops miss), so duplicate groups below were confirmed
visually; the hashes are kept in the fingerprint file for traceability.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

# visually confirmed duplicate / near-duplicate groups (first id = primary)
DUPES = [
    ["000", "133"], ["002", "134"], ["003", "135"], ["005", "136"],
    ["007", "137", "090"], ["012", "138"], ["013", "014"], ["016", "017"],
    ["020", "139"], ["023", "140"], ["025", "078", "154"],
    ["027", "028", "141"], ["035", "142"], ["036", "143"], ["042", "144"],
    ["048", "145"], ["055", "146"], ["058", "147"], ["060", "081", "148"],
    ["062", "149"], ["067", "150"], ["070", "151"], ["073", "152"],
    ["075", "076", "153"], ["083", "155"], ["095", "156"], ["102", "157"],
    ["104", "105"], ["109", "158"], ["110", "159"], ["119", "160"],
    ["123", "124", "161"], ["162", "163", "164", "165", "166"],
]
# groups that are the same template with different content, not pixel copies
VARIANT_NOTE = {"090": "template variant (different logo)", "081": "crop variant",
                "148": "wide variant", "078": "re-crop", "154": "re-crop",
                "014": "tighter crop", "028": "re-crop",
                "163": "same shoot, different overlay", "164": "same shoot, different overlay",
                "165": "same shoot, different overlay", "166": "same shoot, no overlay"}

COLS = ["id", "composition", "ui_type", "palette", "typography", "lighting", "depth", "hierarchy", "motion"]


def main():
    fp = {r["id"]: r for r in json.loads((DOCS / "reference-fingerprints.json").read_text())}
    obs = {}
    for line in (DOCS / "reference-observations.psv").read_text().splitlines():
        parts = line.split("|")
        obs[parts[0]] = dict(zip(COLS, parts))
    group_of = {}
    for g in DUPES:
        for m in g:
            group_of[m] = g
    gids = {}
    n = 0
    for i in sorted(fp):
        g = tuple(group_of.get(i, [i]))
        if g not in gids:
            gids[g] = f"D{n:03d}"
            n += 1
    unique = len(gids)

    def resolve(i, field):
        v = obs[i][field]
        if v == "same":
            return resolve(group_of[i][0], field)
        return v

    zmap = {}
    zp = DOCS / "reference-zip-map.json"
    if zp.exists():
        zmap = {o["tile"]: o for o in json.loads(zp.read_text())}
    out = [
        "# Reference database",
        "",
        "**Sources.** First pass: a 826x2000 contact sheet of 169 thumbnails labelled 000-168 "
        "(`docs/reference-source-contact-sheet.jpg`). Second pass: `references.zip` was supplied later "
        "(169 PNGs, 121-625 px wide: 135 in `inspiration/` and 34 in `inspiration/on screen inspo/`). "
        "The sheet was laid out in sorted path order, so tile N is the N-th file of the sorted ZIP listing. "
        "This was checked visually on 24 samples spread across the range (`tools/map_zip.py` → `docs/reference-zip-map.json`). "
        "The `launch-motion` SKILL.md named in the brief was never supplied.",
        "",
        "**These are still images. No animation was observed.** The *Inferred motion* column is a proposal for how a "
        "similar design could move. It is not a description of any source video. Two files are named `videoframe_*` (167, 168); "
        "they are still frames, and no video was supplied.",
        "",
        f"- Files: 169 · Unique after duplicate grouping: **{unique}** · Duplicate/variant groups with >1 member: "
        f"**{sum(1 for g in gids if len(g) > 1)}** ({169 - unique} redundant files). Only 016/017 are byte-identical; the other groups are re-exports, re-crops or template variants.",
        "- Method: tiles are cut from the sheet (`tools/extract_references.py`), trimmed, and fingerprinted with SHA-1, dHash and aHash, with the measured palette in `docs/reference-fingerprints.json`. "
        "Hash grouping proposed candidates but produced false positives on dark tiles, so the final groups were **confirmed by eye** (`tools/build_reference_db.py`).",
        "- Unreadable files: none. Unavailable: any video and the launch-motion skill.",
        "- The presenter frames (162-166, in `on screen inspo/`) show a real person. They are catalogued for composition only and are not reproduced.",
        "- Second-pass finding from the full-size files: the look that matters is **frosted glass**. That means translucent dark panels, a fine top-edge highlight, and coloured light bleeding through the lower edge of the glass "
        "(clearest in the 005/042/075/123 files), set on a deep black backdrop with soft overhead light. The production adopted this look (see `reference-decisions.md`).",
        "",
        "## Duplicate groups",
        "",
        "| Group | Members | Note |",
        "|---|---|---|",
    ]
    for g, gid in gids.items():
        if len(g) > 1:
            notes = ", ".join(f"{m}: {VARIANT_NOTE[m]}" for m in g if m in VARIANT_NOTE) or "near-identical copies"
            out.append(f"| {gid} | {', '.join(g)} | {notes} |")
    out += [
        "",
        "## Catalogue",
        "",
        "Legend: *Observed* columns describe the still frame. **Inferred motion** is our own suggestion and is ⚠ not observed.",
        "",
        "| ID | Original file (references.zip) | Dup group | Composition (observed) | UI type | Palette (observed; measured top colours) | Typography | Lighting | Depth | Spatial hierarchy | ⚠ Inferred motion (not observed) |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for i in sorted(fp):
        g = tuple(group_of.get(i, [i]))
        gid = gids[g]
        primary = "" if g[0] == i else f" (dup of {g[0]})"
        meas = " ".join(f"`{c}`" for c in fp[i]["palette"][:3])
        row = [
            i, f"`{zmap[i]['file']}` ({zmap[i]['size'][0]}x{zmap[i]['size'][1]})" if i in zmap else "-", gid + primary, obs[i]["composition"], resolve(i, "ui_type"),
            f"{resolve(i, 'palette')}; {meas}", resolve(i, "typography"), resolve(i, "lighting"),
            resolve(i, "depth"), resolve(i, "hierarchy"), "Inference: " + resolve(i, "motion"),
        ]
        out.append("| " + " | ".join(c.replace("|", "/") for c in row) + " |")
    (DOCS / "reference-database.md").write_text("\n".join(out) + "\n")

    # contact sheet: unique primaries, labelled with dup group + member count
    f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 15)
    S, cols = 2, 10
    cw, ch = 99 * S + 12, 71 * S + 30
    prim = [g for g in gids]
    rows = (len(prim) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cw + 12, rows * ch + 60), (24, 24, 26))
    d = ImageDraw.Draw(sheet)
    d.text((12, 14), f"Reference contact sheet: {unique} unique of 169 thumbnails (dup groups annotated). "
           "Stills only; no motion observed.", fill=(245, 241, 233), font=f)
    for k, g in enumerate(prim):
        im = Image.open(DOCS / "reference-tiles" / f"{g[0]}.png")
        im = im.resize((im.width * S, im.height * S), Image.LANCZOS)
        x, y = 12 + (k % cols) * cw, 50 + (k // cols) * ch
        sheet.paste(im, (x, y + 20))
        label = f"{g[0]}  {gids[g]}" + (f"  x{len(g)}" if len(g) > 1 else "")
        d.text((x, y), label, fill=(255, 113, 28) if len(g) > 1 else (200, 196, 190), font=f)
    sheet.save(DOCS / "reference-contact-sheet.png")
    print("unique", unique)


if __name__ == "__main__":
    main()
