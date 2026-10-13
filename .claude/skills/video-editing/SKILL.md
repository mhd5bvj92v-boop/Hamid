---
name: video-editing
description: Default workflow for finishing the user's ALREADY-CUT talking-head videos into premium vertical edits with Remotion. Claude never cuts, trims, re-times, re-orders or re-voices the footage. It adds designed text and text animation, on-screen overlays beside the visible speaker, full-screen animated scenes that cover the footage while the original timeline keeps running underneath, professional sound design (Joseph's system, Ultimate Editors), and the final non-destructive composite and 1080x1920 MP4 export. Designs come from the user's 182-reference library. Use it whenever the user provides a talking-head video, script or transcript to edit; asks for captions, kinetic type, overlays, full-screen scenes or transitions; asks for sound design, SFX, whooshes, risers, music levels or a mix; wants a visual or sound plan or cue sheet; or adds references or sound effects. Includes reference and sound indexes, a Remotion edit kit, and intake, render, mix and QC scripts that prove the timeline is preserved.
compatibility: Needs the repository's Remotion app (remotion-app/, Remotion 4, React + TypeScript, Node) and ffmpeg/ffprobe. Library and sound scripts need Python 3 with Pillow and numpy. Optional - whisper (word timestamps), rembg (mattes). Rendering is local; no cloud or paid render service.
---

# Video Editing: talking-head finishing (Remotion + Sound Design)

The user delivers an **already cut and edited** talking-head video. Its cuts, pauses, facial reactions, dialogue and pacing are intentional. Claude's job is to finish it, never to re-edit it.

**Claude is responsible for exactly five things:**
1. **Text design and text animation** (System B)
2. **On-screen visuals and overlays** while the speaker stays visible (System A)
3. **Full-screen animations** that temporarily cover the footage (System C)
4. **Sound design** (System D, Joseph's system)
5. **Final compositing and export** (Remotion picture + System D mix, 1080x1920 MP4)

The reference library is the design source of truth. **Always open the actual reference images (Read the file) before designing from them.** Never rely on memory or on the text descriptions alone. Do not use a generic animation preset when the library offers a more suitable design.

## Non-negotiables

**The timeline belongs to the user.** Never:
- remove footage, add new cuts, or rearrange or re-order clips;
- change playback speed, or shorten or lengthen pauses;
- replace the dialogue or generate a different voice;
- apply unnecessary automatic zooms (no auto punch-ins or "dynamic" reframing);
- add animations solely for retention.

Preserve the full original timeline, duration and synchronised dialogue. A full-screen animation may **cover** the video for a moment, but the original timeline keeps running underneath without interruption, and the face comes back exactly where the cut would have it. The original file is never modified, re-encoded in place, moved or deleted. Every render is checked against it (`scripts/edit_qc.py`).

**Design and honesty:**
1. **Every visual needs a reason.** Keeping the speaker on screen with nothing added is often the strongest choice.
2. **The speaker's face is never covered** by on-screen graphics or captions.
3. **Honesty.** Never claim something was rendered, validated or created unless it actually was. Say which tools were used, what was approximated (fonts, inferred motion) and what was not done. Reference motion is *inferred*: the library contains stills.
4. **Never reproduce third-party watermarks, logos or QR codes** from the references (ONS-019, FUL-076). Use the user's own copy and brand.
5. **No invented data presented as fact.** Charts and numbers use the speaker's numbers or stay clearly illustrative.
6. Do not start editing a video when the user only asked to build or extend the library. If the user says more references are coming, wait for **"ALL REFERENCES UPLOADED"** before finalising.
7. **The voice is king.** Dialogue is never altered (0 dB, bit-identical dialogue stem), and no effect or music is louder than the voice while the speaker talks.
8. **Remotion is the composition engine.** The footage enters every edit through the kit's `SourceFootage` layer: full length, original speed, no trim. Graphics, full-screen scenes and the Studio sound preview are layered on top. Rendering is local; never deploy to AWS/Lambda or add a paid render service.
9. **Only authorised, accessible sound assets.** Index the user's own SFX folders in place. Never delete, overwrite or re-encode them. Never invent a sound asset, never claim a sound was added when it isn't available, never ship synthetic test sounds, and never claim you *listened* to audio. You measure it; the user listens.
10. **Montserrat is the only sans-serif.** Every sans text (captions, UI, labels, kickers, numerals, body) uses Montserrat. The single expressive accent voice (italic serif, script) may differ.

## The default workflow (every talking-head project)

Full procedure: `references/workflow.md`. Remotion details: `references/remotion.md`.

```bash
# 0. intake: probe, hash, link the original (never copied or touched), create the Remotion project
python3 scripts/edit_init.py /path/to/my-cut.mp4 --slug my-video          # add --fps N only if the user approves another rate
# 1-5. story -> beats -> references (search.py + open images) -> work/my-video/plan/edit-plan.md -> user approval
# 6. build: edit remotion-app/src/projects/my-video/beats.ts (kit kinds or new components); preview
python3 scripts/edit_render.py still my-video --t 3.2                       # check a frame over the real footage
cd remotion-app && npm run dev                                              # Remotion Studio: composition Edit-my-video
# 7. picture
python3 scripts/edit_render.py picture my-video                             # work/my-video/renders/picture.mp4
# 8. sound (System D): measured intents -> cue sheet -> passes -> mix -> QC
python3 scripts/edit_render.py sfx my-video
python3 scripts/sfx_plan.py work/my-video/sound/plan.json --out work/my-video/sound/cues.json
python3 scripts/sound_mix.py work/my-video/sound/cues.json --out work/my-video/sound/final_v1 --passes 1,2,3 --no-music
python3 scripts/sound_qc.py work/my-video/sound/final_v1
# 9. prove the timeline is preserved, then deliver final_v1/final.mp4
python3 scripts/edit_qc.py my-video --final work/my-video/sound/final_v1/final.mp4
```

The final export is `sound_mix.py`'s `final.mp4`: the Remotion picture stream copied untouched plus the System D mix, which is built from the **original** dialogue. Both `sound_qc.py` and `edit_qc.py` must exit 0 before delivery.

## Folder map

```
SKILL.md                          you are here (scope, non-negotiables, routing)
references/workflow.md            the default process: intake -> story -> beats -> refs -> plan -> build -> picture -> sound -> QC -> deliver
references/remotion.md            Remotion engine: project layout, edit kit, timeline contract, render settings, frame rate and resolution policy
references/design-language.md     extracted principles, tokens, 13 style-family recipes (evidence-linked)
references/system-a-on-screen.md  System A: overlays while the speaker stays visible
references/system-b-text.md       System B: designed captions, key words, name supers, kinetic type, hook text
references/system-c-full-screen.md System C: full-screen scenes that cover the footage (timeline keeps running)
references/motion.md              animation philosophy, timing/easing table, transitions, sync to speech
references/sound-design.md        System D: Joseph's sound philosophy, families, selection tables, gain presets, passes, A/B/C integration
references/sound-design-workflow.md System D procedure: analyse -> cue sheet -> passes 1-4 -> mix -> QC -> handoff; cue-sheet schema
references/sound-library-index.md GENERATED: the user's indexed sound effects (category, role, duration, anchors, loudness)
references/sources/               unmodified source documents (Joseph's sound design training; checksums in data/sources.json)
references/quality-control.md     QC procedure and checklists (timeline, A, B, C, D), defects->fixes, test logs
references/implementation.md      the HTML template toolchain (Playwright + ffmpeg): design sandbox, NLE layer handoff, fallback
references/extending-library.md   adding new references (dedupe, analyse, commit, evolve rules)
references/library/INDEX.md       GENERATED: one line per reference (ID, title, family, tags, file)
references/library/{ONS,TXT,FUL}.md GENERATED: full entries (observed vs inferred, measured palette)
references/library/FAMILIES.md    GENERATED: references grouped by style family
references/library/SOURCES.md     GENERATED: every original file -> reference ID (primary/alternate)
assets/references/{ONS,TXT,FUL}/  original images, named <ID>__<original-name>
assets/references/_alternates/    preserved duplicate/resized copies, linked to their ID
assets/contact-sheets/            labelled thumbnail sheets per category (fast visual browsing)
data/references.json              single source of truth for the visual library
data/sounds.json                  single source of truth for the sound library index
scripts/                          edit workflow: edit_init, edit_render, edit_qc, edit_selftest (vedit helpers)
                                  library: search, build_library, ingest, validate, compare
                                  sound: sfx_index, sfx_audition, video_events, sfx_plan, sound_mix, sound_qc, sound_selftest (audiolib)
                                  HTML toolchain: render_html.js, compose.py
templates/                        reference-matched HTML templates (design sandbox; ported to the Remotion kit)
```

The Remotion side lives in the repository's `remotion-app/`: the edit kit in `src/kit/` (SourceFootage, TalkingHeadEdit, CaptionAccent, StatCard, HorizonTitle, SoundPreview, house motion) and one folder per project in `src/projects/<slug>/`.

## Progressive disclosure: what to load when

| Task | Read |
|---|---|
| Edit a video (full job) | `workflow.md` first, then `remotion.md`, then the system docs for the beats you plan |
| Any design decision | `design-language.md` (§1 principles, §4 the family you use) |
| Overlays / UI beside the speaker | `system-a-on-screen.md` |
| Captions / typography / hook text | `system-b-text.md` |
| Full-screen scenes / transitions | `system-c-full-screen.md` + `motion.md` |
| Building, rendering, frame rate, resolution | `remotion.md` |
| Sound design, SFX, risers, music, mix | `sound-design.md` (rules), then `sound-design-workflow.md` (procedure) |
| Finding or adding sound effects | `sound-library-index.md` (or `scripts/sfx_index.py search`) |
| Checking output | `quality-control.md` (+ `edit_qc.py`, `sound_qc.py`) |
| New reference images arrive | `extending-library.md` |
| Remotion API details | the `remotion-best-practices` skill (API knowledge only; this skill's rules govern the edit) |

Do not load `references/library/*.md` wholesale; they are large. Search instead, then open only the entries and images you need.

## Using the reference library

- **Reference IDs:** `ONS-###` on-screen (79), `TXT-###` text (10), `FUL-###` full-screen (93). IDs are permanent. Every beat records the IDs it is designed from (`refs` in `beats.ts`); `edit_render.py sfx` rejects unknown IDs.
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

## The four systems in one paragraph each

**A. On-screen visuals:** compact, recognisable product UI (lists, inbox, calendar, stat cards, prompt bars, app tiles, labels, diagrams), dark glass with one blue accent, in the 58-85% height band below the face. They enter with a fade, rise and blur-to-sharp, then perform one action (count, fill, draw) on the stressed word. → `system-a-on-screen.md`

**B. Text:** designed phrases and strong hook text, not transcripts. A quiet sans plus one expressive word (italic serif, script, gradient or extended caps) at 2-3x size, interlocked, amber/cream/white to match the grade, with soft glow and no boxes. Selective captions only; the key word lands on its stressed syllable. → `system-b-text.md`

**C. Full-screen:** short (1.5-4s) scenes that cover the footage for abstract ideas, big numbers and section breaks, while the footage and dialogue keep running underneath. One hero object or number, dark luminous scenes (horizon arcs, rim-lit objects, glowing data) or light editorial posters, one camera move. → `system-c-full-screen.md`

**D. Sound design (Joseph's system):** whooshes for movement (loudest point on the fastest frame, -12 dB, up to -10), textures for events (transient on the event frame, -6 to -7 dB), risers resolving on transitions with hits beneath (-5 dB). Music at -19 dB under the talking head only, never under full-screen or graphics. These are starting clip-gain presets, not loudness targets. The voice is untouched. Passes run in a fixed order (whooshes → textures → risers/hits → music), timing comes from the measured motion of the Remotion beats, and silence is chosen deliberately. → `sound-design.md`, `sound-design-workflow.md`

## Maintenance

```bash
python3 scripts/validate.py          # integrity: library, docs, sound docs + gain presets, Remotion kit + timeline contract
python3 scripts/edit_selftest.py     # end-to-end on synthetic footage: intake -> Remotion -> mix -> QC (+ negative tests), ~2 min
python3 scripts/sound_selftest.py    # the sound toolchain on synthetic fixtures
python3 scripts/build_library.py     # regenerate INDEX/category docs/contact sheets from data/references.json
python3 scripts/ingest.py scan <folder> --batch-name batch-00N   # then fill the draft, then: ingest.py commit
python3 scripts/sfx_index.py scan /path/to/authorised/SFX          # index sound effects in place
```

## Packaging

The skill lives at `.claude/skills/video-editing/` in this repository, next to the Remotion app it drives (`remotion-app/`), so Claude Code discovers it for every session started here. The scripts find the app automatically (or via `--app` / `VE_REMOTION_APP`). To reuse it in another repository, copy both `.claude/skills/video-editing/` and `remotion-app/` (without `node_modules/`, `out/` and `public/projects/`), then run `npm i` in `remotion-app/`. The HTML-template part still works on its own; zip the skill folder (`zip -r video-editing.skill video-editing -x '*/__pycache__/*' '*/data/inbox/*' '*/work/*'`) to upload it to the Claude apps, where the Remotion workflow is not available.
