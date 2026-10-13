---
name: video-visual-editing
description: Premium editing system for short-form talking-head videos, covering visuals and professional sound design. It is built from a curated, growing library of visual references (182 unique references from 219 files in batch-001) and from Joseph's sound design system (Ultimate Editors). Use it whenever the user provides a talking-head video, script or transcript to edit; asks for captions or kinetic typography, on-screen overlays, or full-screen animated scenes or transitions; asks for sound design, SFX, whooshes, risers, music levels or a mix; wants a visual or sound plan or a cue sheet; or adds new visual references or sound effects to the libraries. It has four coordinated systems (A on-screen visuals, B text and text animation, C full-screen animations, D professional sound design), searchable reference and sound indexes, and render, mix and QC scripts built on HTML templates, Playwright, numpy and ffmpeg. Remotion is never used.
compatibility: Library scripts need Python 3 with Pillow and numpy. Rendering needs Node + Playwright/Chromium and ffmpeg. Sound needs ffmpeg + numpy. Optional - Blender, whisper, rembg. Remotion is not used.
---

# Video Visual Editing (+ Sound Design)

A reusable creative system that turns talking-head footage into premium short-form edits, in the visual language of the user's reference library and with Joseph's sound design aesthetic, using the user's own sound library.
The library is the source of truth. **Always look at the actual reference images (Read the file) before designing from them.** Never rely on memory or on the text descriptions alone.

## Non-negotiables

1. **Every visual needs a reason.** Keeping the speaker on screen with nothing added is often the strongest choice.
2. **The speaker's face is never covered** by on-screen graphics or captions.
3. **Honesty.** Never claim something was rendered, validated or created unless it actually was. Say which tools were used, what was approximated (fonts, 3D replaced by 2.5D, inferred motion) and what was not done. Reference motion is *inferred*: the library contains stills.
4. **Never reproduce third-party watermarks, logos or QR codes** that appear in some references (ONS-019, FUL-076). Use the user's own copy and brand.
5. **No invented data presented as fact.** Charts use the speaker's numbers or stay clearly illustrative.
6. Do not start editing a video when the user only asked to build or extend the library. If the user says more references are coming, wait for **"ALL REFERENCES UPLOADED"** before finalising.
7. **The voice is king.** Dialogue is never altered (0 dB, bit-identical), and no effect or music is louder than the voice while the speaker talks.
8. **No Remotion**, ever: no install, no compositions, no Remotion APIs. Use the cue-sheet, numpy and ffmpeg pipeline in this skill.
9. **Only authorised sound assets.** Index the user's own SFX folders in place. Never delete, overwrite or re-encode them, never ship synthetic test sounds, and never claim you *listened* to audio. You measure it; the user listens.
10. **Montserrat is the only sans-serif.** Every sans text (captions, UI, labels, kickers, numerals, body) uses Montserrat. The single expressive accent voice (italic serif, script) may differ.

## Folder map

```
SKILL.md                          you are here (overview + routing)
references/workflow.md            10-step process: story → beats → refs → plan → build → sound (7b) → QC → improve
references/design-language.md     extracted principles, tokens, 13 style-family recipes (evidence-linked)
references/system-a-on-screen.md  System A: overlays while the speaker stays visible
references/system-b-text.md       System B: designed captions, key words, name supers, kinetic type
references/system-c-full-screen.md System C: full-screen scenes, metaphors, data scenes, transitions
references/motion.md              animation philosophy, timing/easing table, transitions, sync to speech
references/implementation.md      toolchain, template contract, render/composite commands
references/sound-design.md        System D: Joseph's sound philosophy, families, selection tables, levels, passes, A/B/C integration, Remotion replacements
references/sound-design-workflow.md System D procedure: analyse → cue sheet → passes 1-4 → mix → QC → handoff; cue-sheet schema
references/sound-library-index.md GENERATED: the user's indexed sound effects (category, role, duration, anchors, loudness)
references/sources/               unmodified source documents (Joseph's sound design training; checksums in data/sources.json)
references/quality-control.md     QC procedure, checklists (incl. System D), defects→fixes, build-time test logs
references/extending-library.md   adding new references (dedupe, analyse, commit, evolve rules)
references/library/INDEX.md       GENERATED: one line per reference (ID, title, family, tags, file)
references/library/{ONS,TXT,FUL}.md GENERATED: full entries (observed vs inferred, measured palette)
references/library/FAMILIES.md    GENERATED: references grouped by style family
references/library/SOURCES.md     GENERATED: every original file → reference ID (primary/alternate)
assets/references/{ONS,TXT,FUL}/  original images, named <ID>__<original-name>
assets/references/_alternates/    preserved duplicate/resized copies, linked to their ID
assets/contact-sheets/            labelled thumbnail sheets per category (fast visual browsing)
data/references.json              single source of truth for the visual library
data/sounds.json                  single source of truth for the sound library index (paths, metrics, categories)
scripts/                          visual: search, build_library, ingest, validate, render_html.js (+--motion/--cues), compose, compare
                                  sound: sfx_index, sfx_audition, video_events, sfx_plan, sound_mix, sound_qc, sound_selftest (audiolib)
templates/                        deterministic HTML animation templates (+ _runtime.js, _ui.css); each declares its sound intents (window.sfxCues)
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
| Sound design, SFX, risers, music, mix | `sound-design.md` (rules), then `sound-design-workflow.md` (procedure) |
| Finding or adding sound effects | `sound-library-index.md` (or `scripts/sfx_index.py search`) |
| Checking output | `quality-control.md` (+ `sound_qc.py` for sound) |
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
7. Sound design (System D): measure motion and events, draft the cue sheet, run passes 1-3 (whooshes → textures → risers/hits), render stems and the mix with `sound_mix.py`, and validate with `sound_qc.py`. Music (pass 4) comes after approval.
8. Deliver the files plus an honest summary of what was rendered, checked and approximated.

## The four systems in one paragraph each

**A. On-screen visuals:** compact, recognisable product UI (lists, inbox, calendar, stat cards, prompt bars, app tiles), dark glass with one blue accent, in the 55-85% height band below the face. They enter with a fade, rise and blur-to-sharp, then perform one action (count, fill, draw) on the stressed word. → `system-a-on-screen.md`

**B. Text:** designed phrases, not transcripts. A quiet sans plus one expressive word (italic serif, script, gradient or extended caps) at 2-3x size, interlocked, amber/cream/white to match the grade, with soft glow and no boxes. The key word lands on its stressed syllable. → `system-b-text.md`

**C. Full-screen:** short (1.5-4s) cutaways for abstract ideas, big numbers and section breaks. One hero object or number, dark luminous scenes (horizon arcs, rim-lit objects, glowing data) or light editorial posters, one camera move. → `system-c-full-screen.md`

**D. Sound design (Joseph's system):** whooshes for movement (loudest point on the fastest frame, -12 dB, max -10), textures for events (transient on the event frame, -6 to -7 dB), and risers resolving on transitions with hits beneath (-5 dB; ≥2 sharp-bass and ≥2 metallic per video). Music at -19 dB under the talking head only, never under full-screen or graphics. The voice is untouched. Passes run in a fixed order (whooshes → textures → risers/hits → music), silence is chosen deliberately, and timing is measured from the real motion. → `sound-design.md`, `sound-design-workflow.md`

## Maintenance

```bash
python3 scripts/validate.py          # integrity: files, checksums, fields, docs in sync, links, families
python3 scripts/build_library.py     # regenerate INDEX/category docs/contact sheets from data/references.json
python3 scripts/ingest.py scan <folder> --batch-name batch-00N   # then fill the draft, then: ingest.py commit
python3 scripts/sfx_index.py scan /path/to/authorised/SFX          # index sound effects in place (rescan: sfx_index.py rescan)
python3 scripts/sound_selftest.py                                  # prove the sound toolchain works in this environment
```

## Packaging

The skill is self-contained in this folder. To produce an installable archive, zip the folder, for example with skill-creator's `package_skill.py` (`python3 -m scripts.package_skill <path-to-this-folder> <out-dir>`, run from the skill-creator directory), or with `zip -r video-visual-editing.skill video-visual-editing -x '*/__pycache__/*' '*/data/inbox/*'`. To install in Claude Code, copy the folder to `~/.claude/skills/video-visual-editing/` (personal) or `.claude/skills/video-visual-editing/` (project).
