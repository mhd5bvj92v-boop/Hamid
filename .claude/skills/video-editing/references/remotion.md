# Remotion: the composition engine

Remotion (React + TypeScript, `remotion-app/` in this repository) builds and renders the **picture**: the untouched footage plus every designed beat. The **sound** is mixed by System D (`sound_mix.py`) from the same timing data, and the final export joins the two. This file covers the project layout, the edit kit, the timeline contract and the render settings. For Remotion API details, use the `remotion-best-practices` skill; this skill's editorial rules take precedence.

```
original cut (never touched) ──► edit_init.py ──► src/projects/<slug>/  (source.ts GENERATED, beats.ts, Edit.tsx)
        │                                              │
        │ (dialogue, 0 dB)                             ▼
        │                         edit_render.py picture ──► renders/picture.mp4  (Remotion, H.264)
        │                         edit_render.py sfx     ──► sound/timeline.json, layers/*.json, plan.json
        ▼                                              ▼
   sound_mix.py  ◄── cues.json ◄── sfx_plan.py + passes 1-4
        │
        └──► sound/final_vN/final.mp4  = picture stream (copied) + System D mix  ──► sound_qc.py + edit_qc.py
```

## 1. Project layout

| Path | What | Edit? |
|---|---|---|
| `remotion-app/src/kit/` | the edit kit (below) | extend carefully; keep the timeline contract |
| `remotion-app/src/projects/<slug>/source.ts` | timeline facts of the original: src, source size/fps/duration, approved fps, `durationInFrames`, sha256 | **generated** by `edit_init.py`, never by hand |
| `.../beats.ts` | `HOOK_END`, `BEATS` (the graphics edit decision list), `FOCUS` | yes: this is the edit |
| `.../Edit.tsx` | the composition component (`TalkingHeadEdit` + project extras) | yes, for custom components |
| `.../timing.ts` (optional) | `PROJECT_TIMING`: pure timing + sound intents of project-specific kinds | yes |
| `.../sound-preview.ts` | Studio sound preview data | **generated** by `edit_render.py sound-preview` |
| `.../index.tsx` | `<Composition id="Edit-<slug>">` at the approved fps, `SOURCE.durationInFrames` frames, 1080x1920 | generated once |
| `remotion-app/src/projects/index.tsx` | registry of all projects | **generated** |
| `remotion-app/public/projects/<slug>/footage` | symlink to the original's folder (no copy) | generated, git-ignored |
| `work/<slug>/` | manifest (`project.json`), frames, plan, renders, sound, QC | git-ignored |

Remotion's file server refuses symlinked *files* but follows symlinked *folders*, so `edit_init.py` links the original's folder. Remotion only reads it. `--copy` exists as a last resort (it copies the file, which is slow for large footage).

## 2. The timeline contract

- `SourceFootage` plays the original from 0 to the end at speed 1 with its own audio at unity. It exposes **no** trim, playbackRate, loop or offset props, and must not be given any. Its only option is `focus` (a dim/blur of the *look* behind a busy overlay, ≤0.3 s ramps).
- `TalkingHeadEdit` throws if the composition's fps or length differ from `SOURCE` (the composition is `round(duration × fps)` frames).
- Beats are `<Sequence>`s **above** the footage. A full-screen beat is opaque and simply covers it; the footage keeps playing underneath, so the face returns in sync.
- Never add another `<Video>` of the source, a second copy of the dialogue, a voice generator, or time remapping. B-roll or screen recordings inside a full-screen scene are fine (they are graphics), but only if the user supplied them.
- No automatic zooms: never animate scale or position of `SourceFootage`. A punch-in is only allowed if the user asks for it, and then it is a deliberate, documented beat.

## 3. The kit (`remotion-app/src/kit/`)

| Module | Purpose |
|---|---|
| `types.ts` | `SourceInfo`, `Beat`, `BeatTiming`, `SfxIntent` (pure TS) |
| `motion.ts` | the house easings from `templates/_runtime.js` (`outCubic`, `outQuart`, `outExpo`, `inCubic`, `inOutCubic`, `inOutSine`, `settle`), `prog`, `envelope`, `enterStyle` (fade + rise + blur-to-sharp), `fmtNumber`, and the measuring helpers `firstFrameWhere` / `fastestFrame` |
| `tokens.ts` | colours from `design-language.md` §2, the 9:16 zones (face 15-48%, caption 48-58%, UI 58-85%, bottom-safe 85-100%, 6% side margins) |
| `SourceFootage.tsx` | the untouched base layer (above) |
| `TalkingHeadEdit.tsx` | footage + one `<Sequence>` per beat + optional sound preview; `layers: "graphics"` renders the beats over black |
| `SoundPreview.tsx` | Studio-only `<Audio>` placements generated from the mixer's `session.json` |
| `timing.ts` | the registry of kit kinds (pure) and `beatWindow()` |
| `beats/*.timing.ts` + `beats/*.tsx` | each beat kind: pure pose + timing + sound intents, and its React component |

Fonts are bundled from npm (`src/fonts.ts`): Montserrat 100-800 (house sans), Playfair Display italic 500-700 and Instrument Serif italic (accent voices). Renders need no Google Fonts access.

### Kit beat kinds (ported 1:1 from the reference-matched templates)

| Kind | System | Recreates | Key props (times in seconds from the beat start) |
|---|---|---|---|
| `CaptionAccent` | B | TXT-001..TXT-009 caption stacks + name supers | `lines[{text, style: sans/sans-sm/serif/script/bold/tracked/micro, at, words?}]`, `outAt`, `anchor`, `colors`, `serifFont`, `nameSuper` |
| `StatCard` | A (C with `fullscreen: true`) | ONS-024, ONS-050 | `label`, `value` (the speaker's number), `prefix/suffix/decimals`, `header`, `pill`, `footnote`, `inAt`, `drawAt/drawDur`, `countAt/countDur`, `outAt`, `center`, `cardWidth` (A default 0.40 so it fits the 58-85% band), `accent` |
| `HorizonTitle` | C | FUL-002 (HORIZON-ARC) | `kicker`, `value`, `body`, `riseDur`, `numAt/numDur`, `bodyAt`, `camPush`, `outAt` |

The other templates (`live-ui-list` for ONS-001/003, `progress-grid` for ONS-004, `ai-input-bar` for ONS-034/044) are ported on demand (§4).

## 4. Adding a beat kind (from a reference or a template)

1. Open the chosen references (Read) and, if one exists, the closest `templates/*.html`.
2. Write `<name>.timing.ts` (pure, no React): the props type, a `pose(t, props)` function that returns every animated value, and a `BeatTiming` with `system`, `fullscreen`, `duration` and `sfx` (intents measured with `firstFrameWhere` / `fastestFrame` on the same pose functions; see the kit kinds).
3. Write `<Name>.tsx`: read `useCurrentFrame()/fps` → `t`, call the pose function, render. Drive everything from `t` (no CSS animations or transitions). Use the house easings and the 1080-wide pixel scale (the templates' `1rem = 10px`).
4. Generic and reusable → add it to `src/kit/beats/`, `kitTiming`, `kitComponents` and the table above. Project-specific → keep it in `src/projects/<slug>/`, export `PROJECT_TIMING` from `timing.ts`, and pass `extraComponents`/`extraTiming` in `Edit.tsx`.
5. Check a still over the real footage and compare it with the reference (`compare.py`).

## 5. Render settings

| Output | How | Settings |
|---|---|---|
| Still preview | `edit_render.py still <slug> --t S [--graphics]` | PNG at the composition size |
| Picture | `edit_render.py picture <slug>` | H.264, yuv420p, BT.709 limited range, CRF 18, AAC, JPEG frame capture, the approved fps |
| Graphics only | `edit_render.py picture <slug> --graphics` | beats over black (review, motion measurement) |
| Source-resolution master | `edit_render.py picture <slug> --scale 2`, then `edit_render.py downscale <slug>` | for sources above 1080x1920: renders at e.g. 2160x3840, then a lanczos downscale to the 1080x1920 picture |
| Final export | `sound_mix.py` | picture stream copied untouched + the System D mix (AAC 320k, 48 kHz) |
| Studio | `cd remotion-app && npm run dev` | composition `Edit-<slug>`; `npm run lint` type-checks |

**Frame rate policy:** prefer the source frame rate for everything; it is the approved delivery rate unless the user approves another one at intake (`--fps`). Variable-frame-rate phone footage is sampled by time at the approved rate (the original stays untouched); `edit_qc.py` proves the frames line up. NTSC sources (29.97) are rendered at 29.97 fps.

**Resolution policy:** the composition is always 1080x1920. Extract analysis frames from the original at source resolution. For sources larger than 1080x1920, render a master with `--scale` when maximum footage sharpness matters, otherwise render directly.

**Browser:** Remotion downloads its own Chrome Headless Shell. Where that is blocked (the Claude Code cloud sandbox blocks `remotion.media`), `vedit.browser_env()` uses a local Chromium headless shell (`REMOTION_BROWSER_EXECUTABLE`), which `remotion.config.ts` reads. Output is identical; capture is slower.

**No cloud:** render locally only. Never set up Remotion Lambda/Cloud Run or a paid render service, and never commit rendered media (`out/`, `work/` and `public/projects/` are git-ignored).

## 6. Performance

- Stills for design iteration; full renders only once the beats are approved. `--frames 0-89` renders a range for a quick look.
- Measured in this sandbox (2x concurrency, local Chromium, screenshot capture): a 300-frame 1080x1920 render took about 25 s, and the whole 8 s self-test (render, mix, both QCs, four negative tests) takes about 2 minutes. Big blurs, `backdrop-filter` and long effect-heavy edits are slower; render stills while designing.
- `edit_qc.py` decodes the final and samples the original; it takes seconds, plus the sha256 of the original (about 1-2 s per GB).

## 7. Verified in this environment (2026-10-13)

`edit_selftest.py` passed end to end on synthetic footage (8 s, 1080x1920, 30 fps, TTS dialogue), with one beat per system (CaptionAccent TXT-001, StatCard ONS-024, HorizonTitle FUL-002):
- intake linked the footage folder (no copy) and created the project; the Remotion render took 240 frames at 30 fps;
- the sound intents came from the kit's pose functions, then `sfx_plan.py`, 12 cues with synthetic fixtures, `sound_mix.py` and `sound_qc.py`: 0 errors;
- `edit_qc.py`: 0 errors. 240/240 frames, 8.000 s, 12 graphics-free frames matched the source at the same time (PSNR ≥ 46 dB), the face came back in sync after the full-screen scene, and the audio lag was 0.00 ms;
- a trimmed head, a 4% speed-up, an 80 ms audio shift and a 0.5 s cut in the middle were **all rejected** by `edit_qc.py`;
- the original's sha256 was unchanged at the end.

Not yet tested: real footage, VFR phone footage, non-9:16 sources with `--fit cover`, `--scale` masters, and a real sound library.
