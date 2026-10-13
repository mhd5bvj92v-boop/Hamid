# Remotion: the composition engine

Remotion (React + TypeScript, `remotion-app/` in this repository) previews and renders the **picture**: the untouched footage plus every designed beat. The **sound** is mixed by System D (`sound_mix.py`) from the same timing data, and the final export joins the two. This file covers the project layout, the single project file `edit.json`, the edit kit, the timeline contract, the render settings and the Creative Director Studio (§8). For Remotion API details, use the `remotion-best-practices` skill; this skill's editorial rules take precedence.

```
original cut (never touched) ──► edit_init.py ──► src/projects/<slug>/edit.json  ◄──► Creative Director Studio (Player, timeline)
        │                                              │   (source.ts GENERATED; beats.ts / concepts.ts read edit.json)
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
| `.../edit.json` | **the one project file**: source, the user's script, segments with concept rounds and decisions, `beats`, `sfx`, `focus`, `hookEnd`, feedback, approvals (types: `src/kit/project.ts`) | yes: in the Studio, with `edit_decisions.py`, or by hand for beats/props. Never `source` or `approvals` by hand |
| `.../beats.ts` | `HOOK_END`, `BEATS`, `FOCUS`: a thin typed view of `edit.json` | no (generated once; reads `edit.json`) |
| `.../concepts.ts` | `CONCEPTS`: every segment's A/B/C(/D) concepts that use a kit kind, as renderable beats (view of `edit.json`) | no (generated once; reads `edit.json`) |
| `.../CREATIVE-LOG.md` | readable creative decision log | **generated** from `edit.json` by `edit_decisions.py` |
| `.../Edit.tsx` | the composition component (`TalkingHeadEdit` + project extras) | yes, for custom components |
| `.../timing.ts` (optional) | `PROJECT_TIMING`: pure timing + sound intents of project-specific kinds | yes |
| `.../sound-preview.ts` | Studio sound preview data | **generated** by `edit_render.py sound-preview` |
| `.../index.tsx` | `<Composition id="Edit-<slug>">` at the approved fps, `SOURCE.durationInFrames` frames, 1080x1920; props `layers` and `concept` (`{moment, option, round?}` renders one concept instead of the approved beats) | generated once |
| `remotion-app/src/kit/StudioEdit.tsx` | composition `StudioEdit`: renders any project straight from an `edit.json` passed as input props (`{doc, layers, concept, audio}`). Used by the Studio's Player, preview stills, motion previews and final export | kit |
| `remotion-app/src/projects/index.tsx` | registry of all projects | **generated** |
| `remotion-app/public/projects/<slug>/footage` | symlink to the original's folder (no copy) | generated, git-ignored |
| `remotion-app/public/projects/<slug>/proxy` | symlink to `work/<slug>/proxy/` (Player-only VP9 preview proxy, §8) | generated, git-ignored |
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
| `types.ts` | `SourceInfo` (incl. optional Player-only `previewSrc`), `Beat`, `BeatTiming`, `SfxIntent` (pure TS) |
| `project.ts` | `EditDoc` (the `edit.json` schema), gain presets, script import (`parsePasted`, `parseSubtitles`, `parseJsonTranscript`, `detectFormat`), `validateTranscript` (flags only), `splitSegment`, `combineSegments`, `linesInRange` |
| `studio.ts` | `beatFromConcept` (places a concept on its segment), `sfxForBeat` (SFX items from a beat's sound intents at the presets), `sfxEventTime`, `resolveAudio` (SFX → `<Audio>` placements), `beatsForRender`, `docErrors` |
| `StudioEdit.tsx` | `TalkingHeadEdit` from an `EditDoc` + one `<Audio>` per resolved SFX placement |
| `motion.ts` | the house easings from `templates/_runtime.js` (`outCubic`, `outQuart`, `outExpo`, `inCubic`, `inOutCubic`, `inOutSine`, `settle`), `prog`, `envelope`, `enterStyle` (fade + rise + blur-to-sharp), `fmtNumber`, and the measuring helpers `firstFrameWhere` / `fastestFrame` |
| `tokens.ts` | colours from `design-language.md` §2, the 9:16 zones (face 15-48%, caption 48-58%, UI 58-85%, bottom-safe 85-100%, 6% side margins) |
| `SourceFootage.tsx` | the untouched base layer (above); uses `previewSrc` only inside the Player (`getRemotionEnvironment().isPlayer`), never in a render |
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
| `UiCard` | A | ONS-001 chips (`variant: "rows"`), ONS-003 inbox cards (`"inbox"`) | `rows[{title, sub?}]`, `header`, `active`, `anchor`, `width`, `accent`, `inAt`, `stagger`, `outAt`, `outDur` |
| `StatementScene` | C | FUL-063 (`variant: "aurora"`), FUL-090 (`"editorial"`), FUL-006 (`"streak"`) | `lines[]`, `accentLine`, `kicker`, `tag`, `accent`, `inAt`, `lineStagger`, `camPush`, `outAt`, `outDur` |

The other templates (`progress-grid` for ONS-004, `ai-input-bar` for ONS-034/044) are ported on demand (§4).

## 4. Adding a beat kind (from a reference or a template)

1. Open the chosen references (Read) and, if one exists, the closest `templates/*.html`.
2. Write `<name>.timing.ts` (pure, no React): the props type, a `pose(t, props)` function that returns every animated value, and a `BeatTiming` with `system`, `fullscreen`, `duration` and `sfx` (intents measured with `firstFrameWhere` / `fastestFrame` on the same pose functions; see the kit kinds).
3. Write `<Name>.tsx`: read `useCurrentFrame()/fps` → `t`, call the pose function, render. Drive everything from `t` (no CSS animations or transitions). Use the house easings and the 1080-wide pixel scale (the templates' `1rem = 10px`).
4. Generic and reusable → add it to `src/kit/beats/`, `kitTiming`, `kitComponents` and the table above. Project-specific → keep it in `src/projects/<slug>/`, export `PROJECT_TIMING` from `timing.ts`, and pass `extraComponents`/`extraTiming` in `Edit.tsx`.
5. Check a still over the real footage and compare it with the reference (`compare.py`).

## 5. Render settings

| Output | How | Settings |
|---|---|---|
| Still preview | `edit_render.py still <slug> --t S [--graphics] [--concept S03:A]` | PNG at the composition size |
| Concept preview frames (Phase 2) | `edit_render.py concept-frames <slug> --moment S03 [--sequence]` | A, B, C side by side over the real footage (half resolution, one bundle reused) |
| Draft sound (Phase 4) | `edit_render.py draft-sound <slug>` | `sound_mix.py` on the current cue sheet with the original as picture; stems + session, no export; updates the Studio preview |
| Motion preview (Phase 4) | `edit_render.py preview <slug> --beat ID / --concept S03:B / --all` | half resolution (`--scale 0.5`), the beat ±0.6 s, H.264 with dialogue + draft sound |
| Picture (Phase 5) | `edit_render.py picture <slug>` | **refuses without the user's final approval in the creative log.** H.264, yuv420p, BT.709 limited range, CRF 18, AAC, JPEG frame capture, the approved fps |
| Graphics only | `edit_render.py picture <slug> --graphics` | beats over black (review, motion measurement) |
| Source-resolution master | `edit_render.py picture <slug> --scale 2`, then `edit_render.py downscale <slug>` | for sources above 1080x1920: renders at e.g. 2160x3840, then a lanczos downscale to the 1080x1920 picture |
| Final export | `sound_mix.py` | picture stream copied untouched + the System D mix (AAC 320k, 48 kHz) |
| Remotion Studio | `cd remotion-app && npm run dev` | composition `Edit-<slug>` (Remotion's own preview tool); `npm run lint` lints and type-checks |
| Creative Director Studio | `cd remotion-app && npm run studio` | the editor UI (§8); its renders use `StudioEdit` with the same settings as above |

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

Creative Director workflow (added the same day, same self-test): the analysis and three moments were recorded; a proposal whose A and B were the same idea was rejected; `concept-frames` rendered A | B | C for S03 over the footage (checked by eye: settled frames, labels, references); a second round archived the first; a final approval before the direction, and a direction approval with undecided moments, were both refused; grouped decisions incl. a D were recorded; draft sound + a 540x960 motion preview with audio were rendered; **`picture` refused to render before the final approval**; after the preview and final approvals it rendered, and `edit_qc.py` confirmed the approval. `CREATIVE-LOG.md` recorded every round, decision, feedback and approval.

Creative Director Studio (2026-10-13): `npm run studio:test` passed 27/27 checks (§8) in Playwright's Chromium, with the preview proxy (that Chromium has no H.264).

Not yet tested: real footage, VFR phone footage, non-9:16 sources with `--fit cover`, `--scale` masters, a real sound library, the Studio in Chrome/Safari with H.264 played directly, long videos (timeline performance with many beats), and touch input.

## 8. The Creative Director Studio (`remotion-app/studio/`)

The Studio is the user's editor for the Creative Director workflow. It is built on Remotion, not beside it:
- The preview is the **Remotion Player** playing the `StudioEdit` composition.
- Every still, motion preview and final picture is rendered by **`@remotion/renderer`** from the same composition.
- The input of all of them is the project's `edit.json`.

There is no second timeline model.

```bash
cd remotion-app && npm run studio          # http://127.0.0.1:3010 (bound to localhost only)
npm run studio:test                        # end-to-end test in Chromium (below)
```

**Layout:**
- **top bar:** project, frames and fps, footage-locked badge, proxy, save state
- **left, Script:** the user's timestamped script. Lines with editable times, flags, split, combine, and set start/end from the playhead.
- **centre:** Remotion Player
- **right, inspector tabs:**
  - A/B/C/D
  - Properties (every prop of the selected beat, plus start/end)
  - Sound
  - References (library browser; "use for D")
  - Export (gates, feedback, approvals, motion preview, final export)
- **bottom, multi-track timeline:**
  - Video 🔒
  - Script
  - Segments
  - Text (B), On-screen (A) and Full-screen (C) tracks
  - SFX
  - Dialogue 🔒

  It has a playhead, ruler seek and zoom. On the tracks you can:
  - drag a range on the Script track to select words
  - drag beats to move them, or use their handle to resize
  - drag SFX diamonds to offset them by frames

**Primary flow:** select spoken words → choose the type (Text Animation / On-Screen Visual / Full-Screen Animation / Sound Design) → review A/B/C/D with rendered previews → choose → the beat is built on the segment's exact times → fine-tune → approve direction → motion preview → approve preview and final → export.

**Data flow.** A UI edit updates the in-memory `EditDoc`. The Player re-renders immediately, and the document is saved to `edit.json` 450 ms later. A save cannot change `source` or `approvals`: approvals go through the approve action, which calls `edit_decisions.py approve`. Importing a script over an existing one needs `replace`, which the UI asks the user to confirm.

**Server** (`studio/server/`, a Vite plugin, local only):

| Route | Does |
|---|---|
| `GET/POST /api/projects` | list projects; import a video (runs `edit_init.py`) |
| `GET/PUT /api/project/:slug` | load / save `edit.json` (+ transcript issues, document errors) |
| `POST …/transcript` | import the user's script (pasted, SRT, VTT, JSON), as written |
| `POST …/drafts`, `…/request` | library drafts for a new segment; record "ask Claude for three new concepts" |
| `POST …/concept-preview` | `renderStill` of one concept at its landed frame → `work/<slug>/previews/` |
| `POST …/choose` | record the decision; replace the segment's beat and its SFX (`beatFromConcept`, `sfxForBeat`) |
| `POST …/approve`, `…/feedback` | through `edit_decisions.py` (the user's quoted words) |
| `POST …/proxy` | build the Player-only preview proxy |
| `POST …/render` | job: half-resolution motion preview with resolved audio, or the final export (gated) |
| `GET /api/references`, `/api/refimg/:id`, `/api/sounds`, `/api/sound/:id`, `/api/file/:slug/…` | library, sounds, and files inside `work/<slug>/` (Range requests) |

`render.ts` bundles `src/` once with `@remotion/bundler`, and rebundles when a file in `src/` changes. It uses the local headless shell when Remotion's own download is unavailable.

**Preview proxy.** Open-source Chromium builds (including Playwright's) cannot decode H.264. In such a browser the Studio offers "Create preview proxy" instead of a broken Player. The proxy:
- is VP9/Opus WebM, 540 px wide, with the same fps and every frame
- has its duration and frame count verified against the source
- is linked as `public/projects/<slug>/proxy`
- is used only inside the Player

Renders always read the original. Chrome, Edge and Safari play the original directly.

**Sound in the Studio:**
- SFX items live in `edit.json` `sfx`. Each is linked to a beat's sound intent (`{beatId, intent}`, so it moves with the beat) or to a fixed time.
- Each carries a family, a sound from the indexed library (or none), a gain starting at the preset, an offset in frames, and an on/off switch.
- The Player and the motion preview play them with `<Audio>` at the same anchor rule as `sound_mix.py`: whoosh and riser by their peak, texture and hit by their onset.
- The final mix is not made in Remotion. The export writes a cue sheet from the SFX track, with `gain_override_reason` for gains outside the presets, and `sound_mix.py` mixes it with the original dialogue.
- With an empty sound library, SFX stay unassigned and nothing is added.

**Final export** (only with the `final` approval and no document errors):
1. `renderMedia(StudioEdit)` → `work/<slug>/renders/picture.mp4` (H.264, CRF 18, yuv420p, BT.709)
2. `export-sfx.ts`
3. `cues_studio.json`
4. `sound_mix.py` → `sound/final_vN/final.mp4`
5. `sound_qc.py`
6. `edit_qc.py`

The job log shows each step and both QC summaries.

**Concept authorship.** The Studio's instant A/B/C for a new segment are *library drafts*: mechanical variants of the kit kinds (`studio/server/drafts.ts`, `author: "draft"`). Claude's own concepts come from `edit_decisions.py propose` (`author: "claude"`). The Studio cannot call Claude; "Ask Claude" records a request that Claude sees in `edit_decisions.py status`.

**End-to-end test** (`npm run studio:test`, about 3 minutes). It runs on synthetic footage (8 s, 1080x1920, 30 fps, TTS dialogue), a synthetic test sound library and a pasted 4-line script whose last line has no end time. It drives the real UI in Chromium and checks:
- **Script and selection:**
  - the script is imported as written, and the missing end time is flagged, not guessed
  - the user's correction is saved and the flag clears
  - clicking a line selects its exact times and jumps the Player to the right frame (2.70 s → frame 81)
  - a range dragged on the timeline highlights the matching line
- **Concepts and building:**
  - the segment panel shows the exact words, start and end
  - real `renderStill` previews come back for A, B and C
  - choosing A creates a `UiCard` beat on 2.70–4.36 s, and the Player shows it
  - choosing C changes the design and the picture
  - editing a prop in the inspector updates the Player and `edit.json`
  - changing the start moves the timeline item
  - D is recorded with the user's words and built from B
- **Sound:**
  - SFX items are on the track at the presets
  - a 2-frame offset moves the event by 66.7 ms
  - the motion preview's audio carries the SFX exactly at the events
  - the final mix places each SFX on the Studio's event time (0.00 ms difference)
- **Export and integrity:**
  - export is disabled before the final approval
  - the final export passes `sound_qc` and `edit_qc`
  - in the exported MP4, frames before and after each beat match the original (PSNR ≈ 47 dB) and mid-beat frames show the animation
  - the export has 240 frames, 8.000 s, 30 fps
  - the dialogue stem is identical to the source
  - the original's sha256 is unchanged
- **Reopen:** decisions, edited props, beats and approvals come back from `edit.json`.

The test removes its project afterwards unless you pass `--keep`.
