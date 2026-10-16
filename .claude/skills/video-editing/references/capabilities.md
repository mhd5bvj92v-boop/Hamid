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

## Implemented with a known limitation

| Capability | Limitation |
| --- | --- |
| Platform safe zones | Approximate starting points, not checked against current app versions; adjustable only in code (`PLATFORM_ZONES`). |
| Reference links (URL attachments) | Stored and passed to Claude Code; not fetched or analysed automatically. Claude opens them only if reachable, and says so otherwise. |
| Reference analysis | Claude Code looks at the images during a build; there is no stored, cached per-asset analysis yet. |
| Motion controls in the Studio | Camera, intensity, background, text style and stage are editable. Per-scene easing, direction and softness controls exist in the recipes' props (Properties tab, raw values), without dedicated sliders. |
| Encoded-output review | Checked on stills and by playback of the MP4 file structure; no listening review is possible in this environment. |

## Not implemented (documented options only)

- Camera motion blur (`@remotion/motion-blur` is not installed).
- Path morphing (`@remotion/paths` is installed but not used by a recipe yet).
- React Three Fiber / real 3D: realistic objects come from the user as assets (SKILL rule 11).
- Draft / review / final render quality presets: preview renders are half resolution, finals full.
- Stored feedback preferences per scope (brief §35).
- A cached reference-analysis store (brief §15).

## Checkpoint (for the next session)

Done (pushed on `claude/vibrant-cerf-gmkijt`):
- D and scoped references (data, Studio, CLI, migration, tests);
- design tokens (`motionTokens.ts`);
- the two recipes, background families, focus backing, guides, scene brief;
- creative mode, platform and art-direction constants;
- the focused docs (art-direction, motion-recipes, references-and-d, this file).

Next, in this order:
1. Per-scene motion controls with plain labels (direction, softness, bounce, glow, blur) mapped to recipe props, with reset-to-project.
2. A stored reference analysis per asset (visible observations vs inferred motion), cached by content hash.
3. Scoped feedback preferences.
4. Draft / review / final quality presets with measured render times.
