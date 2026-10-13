---
name: video-visual-editing
description: Premium visual editing system for short-form talking-head videos, built from a curated, growing library of visual references (182 unique references from 219 files in batch-001). Use it whenever the user provides a talking-head video, script or transcript to edit; asks for captions or kinetic typography, on-screen overlays (UI cards, stats, charts, lists), or full-screen animated scenes or transitions; wants a visual plan or beat sheet for a video; or adds new visual references or inspiration images to the library. It covers three systems (A on-screen visuals, B text and text animation, C full-screen animations), a 10-step workflow, a searchable reference index, render and composite scripts (HTML templates, Playwright and ffmpeg; Remotion is not required), QC procedures, and an ingest pipeline for new references.
compatibility: Library scripts need Python 3 + Pillow. Rendering needs Node + Playwright/Chromium and ffmpeg. Optional - Blender, whisper, rembg.
---

# Video Visual Editing

A reusable creative system that turns talking-head footage into premium short-form edits, in the visual language of the user's reference library.
The library is the source of truth. **Always look at the actual reference images (Read the file) before designing from them.** Never rely on memory or on the text descriptions alone.

## Non-negotiables

1. **Every visual needs a reason.** Keeping the speaker on screen with nothing added is often the strongest choice.
2. **The speaker's face is never covered** by on-screen graphics or captions.
3. **Honesty.** Never claim something was rendered, validated or created unless it actually was. Say which tools were used, what was approximated (fonts, 3D replaced by 2.5D, inferred motion) and what was not done. Reference motion is *inferred*: the library contains stills.
4. **Never reproduce third-party watermarks, logos or QR codes** that appear in some references (ONS-019, FUL-076). Use the user's own copy and brand.
5. **No invented data presented as fact.** Charts use the speaker's numbers or stay clearly illustrative.
6. Do not start editing a video when the user only asked to build or extend the library. If the user says more references are coming, wait for **"ALL REFERENCES UPLOADED"** before finalising.

## Folder map

```
SKILL.md                          you are here (overview + routing)
references/workflow.md            10-step process: story → beats → refs → plan → build → QC → improve
references/design-language.md     extracted principles, tokens, 13 style-family recipes (evidence-linked)
references/system-a-on-screen.md  System A: overlays while the speaker stays visible
references/system-b-text.md       System B: designed captions, key words, name supers, kinetic type
references/system-c-full-screen.md System C: full-screen scenes, metaphors, data scenes, transitions
references/motion.md              animation philosophy, timing/easing table, transitions, sync to speech
references/implementation.md      toolchain, template contract, render/composite commands
references/quality-control.md     QC procedure, checklists, defects→fixes, build-time test log
references/extending-library.md   adding new references (dedupe, analyse, commit, evolve rules)
references/library/INDEX.md       GENERATED: one line per reference (ID, title, family, tags, file)
references/library/{ONS,TXT,FUL}.md GENERATED: full entries (observed vs inferred, measured palette)
references/library/FAMILIES.md    GENERATED: references grouped by style family
references/library/SOURCES.md     GENERATED: every original file → reference ID (primary/alternate)
assets/references/{ONS,TXT,FUL}/  original images, named <ID>__<original-name>
assets/references/_alternates/    preserved duplicate/resized copies, linked to their ID
assets/contact-sheets/            labelled thumbnail sheets per category (fast visual browsing)
data/references.json              single source of truth for the library
scripts/                          search, build_library, ingest, validate, render_html.js, compose, compare
templates/                        deterministic HTML animation templates (+ _runtime.js, _ui.css)
```

## Progressive disclosure: what to load when

| Task | Read |
|---|---|
| Edit a video or script (full job) | `workflow.md` first, then the system docs for the beats you plan |
| Any design decision | `design-language.md` (§1 principles, §4 the family you use) |
| Overlays / UI on footage | `system-a-on-screen.md` |
| Captions / typography | `system-b-text.md` |
| Full-screen scenes / transitions | `system-c-full-screen.md` + `motion.md` |
| Building / rendering | `implementation.md` |
| Checking output | `quality-control.md` |
| New reference images arrive | `extending-library.md` |

Do not load `references/library/*.md` wholesale; they are large. Search instead, then open only the entries and images you need.

## Using the reference library

- **Reference IDs:** `ONS-###` on-screen (79), `TXT-###` text (10), `FUL-###` full-screen (93). IDs are permanent.
- **Search:**
  ```bash
  python3 scripts/search.py stat percentage --cat ONS        # ranked matches with image paths
  python3 scripts/search.py --tag live-composite              # filter by tag
  python3 scripts/search.py --show ONS-004                    # full entry (observed / inferred / palette / alternates)
  python3 scripts/search.py --list-families
  ```
- **Browse visually:** open `assets/contact-sheets/ONS-01.png` (and the others) with Read.
- **Then open the chosen reference images themselves** with Read before designing.
- **Ground truth for footage placement:** ONS-001..ONS-005 (UI + captions on a real talking head) and TXT-001..TXT-009 (captions on real footage). The other references are standalone designs to adapt.

## Quick start: editing a talking-head video

1. Probe the footage and check tools (`implementation.md` §0). Extract frames and look at them.
2. Understand the story and mark candidate beats (`workflow.md` steps 1-3). For each beat, choose **nothing / text / on-screen / full-screen**.
3. Find 1-3 references per beat (`search.py`) and open them.
4. Write `work/edit-plan.md` (the beat sheet: time, words, system, concept, refs, family, template). Share it before heavy rendering when the user can review.
5. Build each beat from a template config, preview stills over real frames (`render_html.js --still --bg`), then render sequences.
6. Composite with `compose.py overlay`, extract QC frames, compare with references (`compare.py`), and fix (`quality-control.md`).
7. Deliver the files plus an honest summary of what was rendered, checked and approximated.

## The three systems in one paragraph each

**A. On-screen visuals:** compact, recognisable product UI (lists, inbox, calendar, stat cards, prompt bars, app tiles), dark glass with one blue accent, in the 55-85% height band below the face. They enter with a fade, rise and blur-to-sharp, then perform one action (count, fill, draw) on the stressed word. → `system-a-on-screen.md`

**B. Text:** designed phrases, not transcripts. A quiet sans plus one expressive word (italic serif, script, gradient or extended caps) at 2-3x size, interlocked, amber/cream/white to match the grade, with soft glow and no boxes. The key word lands on its stressed syllable. → `system-b-text.md`

**C. Full-screen:** short (1.5-4s) cutaways for abstract ideas, big numbers and section breaks. One hero object or number, dark luminous scenes (horizon arcs, rim-lit objects, glowing data) or light editorial posters, one camera move. → `system-c-full-screen.md`

## Maintenance

```bash
python3 scripts/validate.py          # integrity: files, checksums, fields, docs in sync, links, families
python3 scripts/build_library.py     # regenerate INDEX/category docs/contact sheets from data/references.json
python3 scripts/ingest.py scan <folder> --batch-name batch-00N   # then fill the draft, then: ingest.py commit
```

## Packaging

The skill is self-contained in this folder. To produce an installable archive, zip the folder, for example with skill-creator's `package_skill.py` (`python3 -m scripts.package_skill <path-to-this-folder> <out-dir>`, run from the skill-creator directory), or with `zip -r video-visual-editing.skill video-visual-editing -x '*/__pycache__/*' '*/data/inbox/*'`. To install in Claude Code, copy the folder to `~/.claude/skills/video-visual-editing/` (personal) or `.claude/skills/video-visual-editing/` (project).
