# Remotion: the composition engine

Remotion (React + TypeScript, `remotion-app/` in this repository) **is the editing engine (Remotion-first, `SKILL.md` rule 8)**. One composition holds the untouched footage with its dialogue, every caption and text animation, on-screen UI, half-screen and full-screen composition, transition, and every sound effect (and music) as `<Audio>` layers. The Player, every preview and **the final MP4** are renders of that composition. FFmpeg and the System D scripts only inspect, transcode, plan and check (`sound_mix.py` mixes the sound plan offline so `sound_qc.py` can check it; `edit_qc.py` checks the Remotion render). This file covers the project layout, the single project file `edit.json`, the edit kit, the timeline contract, the render settings and the Creative Director Studio (§8). For Remotion API details, use the `remotion-best-practices` skill; this skill's editorial rules take precedence.

```
original cut (never touched) ──► edit_init.py ──► src/projects/<slug>/edit.json ◄──► Creative Director Studio
                                                     │  (Scene Planning + Timeline Editor, one record per scene)
                                                     ▼
                     ONE Remotion composition (StudioEdit / Edit-<slug>):
                     SourceFootage (footage + dialogue at unity) + text + UI + half/full-screen + transitions
                     + <Audio> sound effects (Studio SFX track, or sound-preview placements from the cue sheet)
                                                     │
              Player / stills / motion previews ◄────┼────► final MP4 (edit_render.py final | Studio Export)
                                                     │                    └──► edit_qc.py on that render
   analysis only: edit_render.py sfx → sfx_plan.py → cues.json → sound_mix.py (offline check) → sound_qc.py
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
| `HalfPanel` | Halfscreen (track A) | no half-screen reference in the library yet (layout from the scene type) | `headline`, `accent`, `kicker`, `rows[]` (≤4, the speaker's words), `top` (0.5 = half), `accentColor`, `accentFont`, `background`, `inAt`, `rowsAt`, `stagger`, `outAt`, `outDur` |
| `AssetScene` | Full-screen (track C) | the user's own 3D asset (`Concept.assets`); FUL-002 / FUL-024 staging | `asset` (staticFile path `projects/<slug>/assets/...`: PNG/WebP with transparency, WebM with alpha, MP4), `look` (void / aurora / studio), `enter` (rise / zoom / drop), `size`, `y`, `headline[]`, `accentLine`, `kicker`, `accent`, `reflection`, `turn`, `inAt`, `outAt`, `outDur` |

**Premium building blocks** (`src/kit/premium.tsx`, see `premium-motion.md`): `glass()`, `RimGlow`, `FineGrid`, `Grain`, `LightSweep`, `tiltIn()`, `StatusDot`, `LineIcon`, `Bloom`, `Vignette`, `LightRays`, `Dust`, `CinematicFinish`. `UiCard` with `look: "glass"` is built from them; new kinds should be too. Before `built`, `edit_decisions.py preview` renders three key frames next to the style reference (`work/<slug>/previews/<scene>_try<n>_compare.png`); `built` accepts only that exact beat plus a `match` list, and the Studio shows both with the version.

Kinds Claude Code builds for approved concepts live in `src/kit/custom/` (`<name>.timing.ts` + `<Name>.tsx`, registered in `custom/timing.ts` and `custom/components.ts`), and join the same registry, e.g. `LoginAlertStack` (ONS-041 sign-in toasts, optional caption: Captions + UI) and `LockdownTitle` (typed monospace title, padlock, glitch-cut transition). Never change how an existing kind renders a version the user has seen: add a prop whose default keeps the old look, or add a new kind.

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
| Motion preview (Phase 4) | `edit_render.py preview <slug> --beat ID / --concept S03:B / --all [--quality draft\|review\|final]` | `review` by default (half size, all effects); `draft` = one third size with grain, dust, light rays, bloom, glass blur and motion blur off (layout and timing unchanged); the beat ±0.6 s, H.264 with dialogue + draft sound; each render time is recorded in `work/<slug>/render-times.json` |
| **Final (Phase 5)** | `edit_render.py final <slug> [--session session.json]` | **the deliverable, rendered by Remotion**: `Edit-<slug>` with every layer and the sound placements of `sound-preview.ts`; refuses without the final approval and while builds wait; H.264, yuv420p, BT.709 limited range, CRF 18, AAC 320k 48 kHz, the approved fps; then `edit_qc.py --sfx` on it |
| Picture (Phase 5) | `edit_render.py picture <slug>` | the same composition for analysis/masters (refuses without the final approval) |
| Graphics only | `edit_render.py picture <slug> --graphics` | beats over black (review, motion measurement) |
| Source-resolution master | `edit_render.py picture <slug> --scale 2`, then `edit_render.py downscale <slug>` | for sources above 1080x1920: renders at e.g. 2160x3840, then a lanczos downscale to the 1080x1920 picture |
| Sound plan check | `sound_mix.py` + `sound_qc.py` | offline mix of the cue sheet for analysis (anchors, presets, headroom, voice on top); **not** the deliverable |
| Remotion Studio | `cd remotion-app && npm run dev` | composition `Edit-<slug>` (Remotion's own preview tool); `npm run lint` lints and type-checks |
| Creative Director Studio | `cd remotion-app && npm run studio` | the editor UI (§8); its renders use `StudioEdit` with the same settings as above |

**Frame rate policy:** prefer the source frame rate for everything; it is the approved delivery rate unless the user approves another one at intake (`--fps`). Variable-frame-rate phone footage is sampled by time at the approved rate (the original stays untouched); `edit_qc.py` proves the frames line up. NTSC sources (29.97) are rendered at 29.97 fps.

**Resolution policy:** the composition is always 1080x1920. Extract analysis frames from the original at source resolution. For sources larger than 1080x1920, render a master with `--scale` when maximum footage sharpness matters, otherwise render directly.

**Browser:** Remotion downloads its own Chrome Headless Shell. Where that is blocked (the Claude Code cloud sandbox blocks `remotion.media`), `vedit.browser_env()` uses a local Chromium headless shell (`REMOTION_BROWSER_EXECUTABLE`), which `remotion.config.ts` reads. Output is identical; capture is slower.

**No cloud:** render locally only. Never set up Remotion Lambda/Cloud Run or a paid render service, and never commit rendered media (`out/`, `work/` and `public/projects/` are git-ignored).

### 5b. Quality presets and the optional effects

| Setting | Where it lives | What it changes | Render cost |
|---|---|---|---|
| Quality preset `draft` / `review` / `final` | Export tab (preview), `--quality` on the CLI; renderers set `constants.renderQuality` for that render only | size (1/3, 1/2, full), encoding (CRF 30/23/18), and in draft the decorative layers (`src/kit/quality.ts`) | measured per render, shown on the preset |
| Motion: direction, softness, bounce, glow, blur | Properties → Motion (this scene / whole project), `constants.motion` / `constants.sceneMotion` | entrance side, curve shape inside the authored timing (events and sound never move), glow and blur-in strength | none |
| Shape morph (`motion.morph`, off) | Properties → Motion | a `statusIcon` folds into its new shape (`src/kit/morph.tsx`, `@remotion/paths` `interpolatePath`); off, or for unmatched shapes, it crossfades | negligible |
| Motion blur (`motion.motionBlur`: off / light / strong) | Properties → Motion, with the cost note | `CameraMotionBlur` (`@remotion/motion-blur`) on the `DirectionalCard` card while it travels; never on holds, never on the background or video, skipped in draft (`src/kit/motionBlur.tsx`) | light = 5 samples, strong = 8, on travel frames only; measured: an 8 s review preview went from 11.7 s to 19.7 s with light |

Good composition, type and timing make the result; these effects only support them, so both stay off unless a scene asks for them.

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

Remotion-first + Scene Planning (2026-10-14): `studio:test` 27/27, `studio:test:claude` 20/20, `studio:test:plan` 26/26, `edit_selftest.py` passed with the final rendered by Remotion (`edit_render.py final`): `edit_qc` found all 12 planned effects in the render, the voice at unity (gain 0.998, residual 41 dB below it) and a −1.57 dBFS peak; a copy without the effects was rejected. The Remotion render's audio matched the offline check mix within 0.4 dB of peak. Remotion has no limiter: if effects stack past the ceiling, QC fails and names them.

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

**Two workspaces, one project.** The header switches between **Scene Planning** and the **Timeline Editor**. Both edit the same `edit.json` and preview the same `StudioEdit` composition; the Remotion Player and the multi-track timeline stay on screen in both.

**Scene Planning** (`studio/components/ScenePlanning.tsx`):
- **Constants for the Whole Edit:** caption style, position and case, accent font and colours, interface style, transitions, sound density, music, notes. Stored as `edit.json` `constants`; every request to Claude Code carries them.
- **Transcript & Scene Plan:** one row per sentence (or per scene spanning several): exact spoken words, start/end (editable for scenes), word timings when the script has them, the scene type (Captions Only / Captions + UI / Halfscreen / Fullscreen, with example images from the library and a layout diagram; Halfscreen honestly shows "no example yet"), "What happens on screen" (the user's words), plan / build status, "Ask Claude for Ideas", the optional A/B/C/D panel inline, and "Approve plan".
- "Approve the scene plans" approves every described scene at once (`edit_decisions.py plan-approve`), creating one build request per scene for Claude Code.

**Timeline Editor:** the previous layout:
- **left:** the user's script (editable times, flags, split, combine)
- **centre:** Remotion Player
- **right:** inspector tabs A/B/C/D, Properties (with the beat's scene plan and "Open in Scene Planning"), Sound, References, Export
- **bottom:** the multi-track timeline (Video 🔒, Script, Segments/scenes, Text, On-screen, Full-screen, SFX, Dialogue 🔒)

**3D assets** (per scene, under the build status): what the chosen Claude Concept needs from the user (`Concept.assets`: id, what, spec), each with an upload box, a thumbnail when provided and a warning while a required one is missing; plus "Add my own asset" (with a note) for D or extras. Uploads go through `edit_decisions.py asset` (the same command Claude Code uses with a file path): the file is copied to `public/projects/<slug>/assets/` (MOV is converted to WebM with alpha so the Player can play it) and recorded in the scene's `assets`. The server then re-bundles before the next render, so Remotion sees the new file. `built` refuses while a required asset is missing or unused in the beat props.

**A scene is one record** (`CreativeSegment`): `start`/`end`, `type` and `sceneType`, `text`, `onScreen`, `plan`, Claude Concepts, Quick Drafts, decision, built versions. `retimeScene` (`src/kit/studio.ts`) is the only way timing changes: whether the user edits a scene's times in Scene Planning, drags or resizes the scene or its animation on the timeline, or edits start/end in the inspector, the scene, its animation (start offset kept, end kept aligned) and its sounds (beat-linked ones follow automatically, fixed-time ones shift) move together. Clicking a sentence selects its range on the timeline and moves the Player; clicking an animation on the timeline selects its scene row (or shows its plan in the inspector).

**Saves.** Local edits update the Player at once and autosave (450 ms). All writes from the browser are queued in order and a pending autosave is sent before any other action. A save carries the last revision the Studio saw: if Claude Code or the CLI wrote `edit.json` in between, it is refused (409) and the Studio reloads instead of overwriting. Fields owned by server actions and Claude Code (concepts, drafts, decisions, versions, plan approvals, requests) are always kept from disk. The Studio polls the revision (1.5 s) and picks up Claude Code's writes without a reload.

**Claude Concepts and builds** (no API: requests in `edit.json`, processed by Claude Code with `edit_decisions.py pending / show / claim / propose / built`). "Generate with Claude" / "Ask Claude for Ideas" creates a concepts request; choosing a Claude Concept or writing D (kept verbatim, with extra references or uploaded images) or approving a scene plan creates a build request. `built` validates the item (`scripts/beat-check.ts`), renders a Remotion still and clip of the candidate composition, and only then adds a version on the timeline; it is never processed twice. Quick Drafts (instant kit templates) are labelled as such and also render a still before they count as built. Revisions ("Request changes", verbatim) and restorable versions work the same way.

**Server** (`studio/server/`, a Vite plugin, local only):

| Route | Does |
|---|---|
| `GET/POST /api/projects` | list; import a video or create a script-only project (`edit_init.py`) |
| `GET/PUT /api/project/:slug`, `GET …/rev` | load / save `edit.json` (revision-checked, merged per scene) / revision for polling |
| `POST …/transcript` | import the user's script, as written |
| `POST …/drafts`, `…/claude-request`, `…/cancel-request` | Quick Drafts; requests for Claude Code |
| `POST …/choose`, `…/plan-approve`, `…/review`, `…/restore` | decisions, plan approvals, approve / request changes, restore a version (via `edit_decisions.py`) |
| `POST …/concept-preview`, `…/render-version` | `renderStill` of a Quick Draft or of the active version |
| `POST …/upload`, `…/assign-sounds`, `…/proxy` | reference images for D; fill unassigned SFX from the library; Player proxy |
| `POST …/approve`, `…/feedback`, `…/render` | gates; feedback; jobs: motion preview, final export |
| `GET /api/references`, `/api/refimg/:id`, `/api/sounds`, `/api/sound/:id`, `/api/file/:slug/…` | library, sounds (re-read on every call: index new sounds without a restart), files in `work/<slug>/` |

The kit's timing registry is loaded through Vite on every use, so kinds Claude Code adds are known without restarting the Studio. `render.ts` bundles `src/` once and rebundles when a file in `src/` changes.

**Preview proxy.** Open-source Chromium builds cannot decode H.264; the Studio then offers a VP9/Opus proxy (same frames and duration, verified), used only inside the Player. Renders always read the original.

**Sound in the Studio:** SFX items in `edit.json` `sfx`, linked to an animation event (`{beatId, intent}`) or a time, with family, sound (or none: shown as a missing asset, nothing invented), preset gain, frame offset, on/off. The Player, the motion preview **and the final MP4** play them with `<Audio>` at the anchor rule (whoosh/riser by their peak, texture/hit by their onset).

**Final export** (only with the `final` approval, no document errors, nothing waiting for Claude Code, and not script-only):
1. `export-sfx.ts` (graphics windows for the QC)
2. Remotion `renderMedia(StudioEdit)` → `work/<slug>/renders/final_vN.mp4`: footage with its dialogue at unity, every layer, every assigned sound effect (H.264 CRF 18, AAC 320k)
3. `edit_qc.py --sfx final_vN_sfx.json`: timeline, frames, duration, dialogue untouched, every effect present, nothing louder than the voice, no clipping

Remotion has no limiter: if the effects stack past the ceiling, QC fails and names the window; lower those effects (never the voice).

**Tests** (each drives the real UI in Chromium on SYNTHETIC footage; the Claude Code steps run the real CLI with files Claude wrote):
- `npm run studio:test` (27 checks): script import and flags, selection ↔ timeline, Quick Drafts with `renderStill` previews, choose/switch designs, inspector edits in the Player, SFX offsets, motion preview audio, final export through Remotion, reopen.
- `npm run studio:test:claude` (20 checks): the 12 Claude-workflow checks on a cybersecurity segment (request → CLI → concepts with STYLE REFERENCE images → D verbatim → implementation requests → Remotion builds → revision → restore → render), empty sound library, script-only project.
- `npm run studio:test:plan` (26 checks): Scene Planning ↔ Timeline Editor sync (sentence → timeline range, retiming in either view moves the scene, its animation and its sounds, scene type → `edit.json` and Quick Drafts, concepts stay on their scene, an animation click opens its scene plan, reopen), and every editing category measured in the exported Remotion render: Captions Only, Captions + UI, Halfscreen (lower half replaced, speaker's half untouched), Fullscreen, text animation, a glitch transition with a hard cut back, sound effects (each present at its time, voice untouched, no clipping), final export.
- `npm run studio:test:assets` (8 checks): the user's 3D assets: a concept's asset request on its card, the build waiting for it (Studio, `pending`, `built` refused), the upload (an identical copy in `public/projects/<slug>/assets`, original untouched), a build that redraws the object refused, Remotion rendering the user's PNG (still + Player), the user's own MOV for D converted to WebM with alpha and rendered, reopen.

Each test removes its project afterwards unless you pass `--keep`.
