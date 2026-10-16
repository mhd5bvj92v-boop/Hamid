# Capability record and checkpoint

What the Studio and the kit actually do, and how it was checked. Update this after a library or renderer change, re-run the fixture, and never present an unverified capability as ready.

**Environment of the checks:** Remotion 4.0.535 (all `@remotion/*` 4.0.535), Chromium headless shell from Playwright, Linux, 4 CPUs (cloud sandbox). The user renders on Windows; render times there will differ.

## Implemented and verified

| Capability | Where | Evidence |
| --- | --- | --- |
| D straight from a fresh scene, no references or A/B/C needed; text kept verbatim | D editor, `decide` | `npm run studio:test:d` [1] |
| D draft kept through tab / scene switches, reloads, undo | `seg.dDraft` | `studio:test:d` [2] [10] |
| References attached in D; one entity shown in D and in the References tab; removing never deletes the asset | `refs.ts`, `dDraft.ts` | `studio:test:d` [3] |
| Scoped references (idea / scene / project), role, influence, note; project inheritance with a per-scene opt-out; decision snapshot | `resolveRefs`, `decide --attachments-file` | `studio:test:d` [4] [9] |
| Idempotent Apply; a newer decision supersedes open and failed requests; stale requests refused | `decide`, `check_current` | `studio:test:d` [5]–[8] |
| Legacy D decisions migrate (schema 2) without losing fields | `normalizeDoc` | `studio:test:d` [11] |
| Preview compares My-library files and uploads as images, built-in ids as references | `style_refs` | manual run of `preview` on a D request (2026-10-16) |
| Stage: one background + chained camera + scene flow over consecutive full-screen scenes | `stage.tsx` | numeric continuity check (scale before = after at every boundary) + rendered strip (2026-10-15) |
| Recipe `DirectionalCard` (enter beyond the edge, settle, one state change, exit left, cleared by the last frame) | `beats/DirectionalCard.tsx` | `Demo-Card`: 240 frames at 60 fps, 1080×1920, 37 s render on 4 CPUs; frames 0–239 inspected; frame 239 = background only (mean diff vs frame 0: 3.6/255, drift only) |
| Recipe `Popover` (anchored popover, notification) | `beats/Popover.tsx` | `Demo-Popover` stills inspected (light base: light glass + ink) |
| Background families: six four-colour fields, palette gradient, dot field, near-black + light | `backgrounds/gradients.tsx` | `Demo-Gradients` stills inspected |
| Deterministic rendering (same frame, same pixels, any order) | all kit layers | frames 50 / 170 / 233 rendered twice in different orders: identical SHA-256 |
| Preview-only guides (thirds, centre, safe area, approximate platform zones) | `Guides.tsx` via StudioEdit `guides` (Player only) | Studio screenshot; renders never pass `guides` |
| Light surfaces on light bases (`surface()`, `useInk()`) | `premium.tsx`, `style.tsx` | `Demo-Popover`, paper-grid renders |
| Motion controls per scene or project: direction, softness, bounce, glow, blur; reset to project; timing and sound sync unchanged | Properties → Motion (`MotionControls.tsx`), `constants.motion` / `sceneMotion`, `useMotion()` | `npm run studio:test:upgrade` M1–M3 (saved, survive a reload, change the export render; defaults render identically) |
| Stored reference analysis: measured facts (palette, size, duration, frame strip) cached by content hash; Claude Code's observations kept apart from inferred motion; stills cannot get observed motion; unreachable links labelled "not accessible" with an upload fallback; reuse across scenes; refresh keeps history | `ref_analysis.py`, `library/analysis/`, `RefAnalysis.tsx`, analysis requests | `studio:test:upgrade` A1–A5 |
| Saved feedback preferences per scope (scene / project / future videos), on/off, explicit widening; "Remember this" on change requests; Claude Code reads the active ones in `show` | `doc.preferences`, `library/preferences.json`, `PreferencesPanel.tsx` | `studio:test:upgrade` P1–P3 |
| Draft / review / final quality presets; measured render time recorded per preset and shown in the Export tab; draft keeps layout and timing and drops only decorative layers | `src/kit/quality.ts`, `--quality`, `render-times.json` | `studio:test:upgrade` Q1–Q3; times below |
| Shape morph (optional, off): `statusIcon` ring→check, dot→arrow via `@remotion/paths`; crossfade when off or unmatched | `src/kit/morph.tsx`, `DirectionalCard` | `studio:test:upgrade` G1; in-between frames inspected |
| Camera motion blur (optional, off; light 5 / strong 8 samples) on travelling cards only; never on holds or video; skipped in draft | `src/kit/motionBlur.tsx` (`@remotion/motion-blur` 4.0.535) | `studio:test:upgrade` B1 (held frame identical, entrance changed, cost measured) |
| Editable platform zones: presets labelled "unverified"; the user's values saved per project and drawn by the Player guides only | `PlatformZonesEditor.tsx`, `constants.platformZones` | `studio:test:upgrade` Z1 (export unchanged) |

## Implemented with a known limitation

| Capability | Limitation |
| --- | --- |
| Platform safe zones | The presets are approximate and NOT verified against current app versions (labelled so in the Studio). The user can replace them per project with measured values; they are preview guides and do not move content automatically. |
| Reference links (URL attachments) | Fetched only when the host is reachable from this machine; a page link is measured as the page, not the video it embeds. Blocked links are labelled "not accessible" and the user uploads a screenshot or clip instead. |
| Reference analysis | "Measured" facts are computed by code; "observed" is only what Claude Code recorded after looking at the files; motion from a still is always inferred (a guess). Video references are inspected as a 6-frame strip, not watched in real time. |
| Shape morph | Four built-in shapes, single path each; other pairs crossfade. Used by `DirectionalCard` only. |
| Motion blur | `DirectionalCard` only. Stage scenes (`FlowMotion`) travel only 4–6 % of the frame, where blur barely reads, and can contain video, which each sample would decode again. |
| Encoded-output review | Checked on stills and by playback of the MP4 file structure; no listening review is possible in this environment. |

## Not implemented (documented options only)

- React Three Fiber / real 3D: deferred until a scene needs it; realistic objects come from the user as assets (SKILL rule 11).

## Measured render times (2026-10-16, this sandbox: 4 CPUs, local Chromium headless shell)

Demo `controls-demo`: 12.6 s at 30 fps (378 frames), 1080×1920, three full-screen `DirectionalCard` scenes over a footage file (defaults; shape morph; strong motion blur on scene 3), with audio. `edit_render.py preview --all --quality …`, wall time including bundling (about 5 s of fixed overhead, measured with a single still).

| Preset | Output | With strong motion blur on one card | Without motion blur |
| --- | --- | --- | --- |
| draft | 360×640, CRF 30, decorative layers off | 50.6 s (blur skipped in draft) | — |
| review | 540×960, CRF 23 | 63.2 s | 50.5 s |
| final | 1080×1920, CRF 18 | 156.7 s | 86.0 s |

Findings: on this machine `draft` is barely faster than `review` (per-frame page and footage cost dominate, not pixel count); its value is the smaller file and a quick layout/timing check. `final` costs about 1.7× `review`. Strong motion blur on one card (about 33 travelling frames of 378) adds about 25 % to review and 80 % to final, which is why it is off by default and per scene. In `studio:test:upgrade` (8 s, 1920×1080, no footage): draft 12.6 s, review 11.2–11.7 s, review with light blur 18.4–19.7 s. Times on the user's Windows machine will differ; the Studio shows the last measured time per preset.

## Checkpoint (for the next session)

Done (pushed on `claude/vibrant-cerf-gmkijt`): D and scoped references; design tokens; the two recipes, background families, guides, scene brief; creative mode, platform and art direction; and the six follow-ups: per-scene motion controls, stored reference analysis, saved feedback preferences, quality presets with measured times, optional shape morph, optional camera motion blur, plus editable platform zones.

Still needs the user: playback and listening review of the demo and of real edits on their own machine (motion feel, blur strength, morph speed, Windows render times); measured platform zones from their own app screenshots if they want them exact.

Deferred by choice: real 3D (React Three Fiber) until a scene requires it.
