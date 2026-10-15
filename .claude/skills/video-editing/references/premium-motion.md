# Premium motion: making it look real, not flat

The user's references (the 182-entry library) are high-end motion design: glass, light, depth, texture. A build
that "has the same idea" but is drawn as flat boxes, plain circles and small text reads as childish. Every build
must hold up **next to its style reference**: `edit_decisions.py preview` puts your key frames beside it, and
`built` only accepts a previewed beat with a `match` list. This page is how to get there.

## 1. Build in layers (never one flat shape)

A real-looking frame has five to seven layers, back to front:

1. **Atmosphere:** never a flat fill. A deep gradient (two or three close hues), a soft off-centre light pool, a fine grid or noise.
2. **Light source:** where the light comes from: a glow behind the subject, a rim along an edge, `LightRays`, a horizon arc.
3. **Subject:** the one thing the viewer reads, big. A glass panel, a 3D asset (`AssetScene`, `<AssetMedia>`), a number, a word.
4. **Detail:** hairlines, small labels, ticks, a progress line, icons (thin line icons, never letter tiles or emoji).
5. **Particles / haze:** `Dust`, a soft fog band, a light sweep.
6. **Finish:** `CinematicFinish` (grain + vignette, optional colour wash), and `Bloom` on anything that emits light.

## 2. The kit's building blocks (`remotion-app/src/kit/premium.tsx`)

| Need | Use | Notes |
|---|---|---|
| UI panel, card, toast | `glass({ radius, tint })` + `RimGlow` + `FineGrid` + `Grain` | frosted body, top highlight, deep shadow, coloured rim light (ONS-024) |
| Arrival | `tiltIn(p)` + `LightSweep` | 3D tilt-back to flat, blur to sharp, one diagonal sweep |
| Glow that spills | `Bloom` | wrap the light-emitting layer only |
| Volumetric light | `LightRays` | behind a subject, slow drift |
| Floating particles | `Dust` | seeded, so every render is identical |
| Icons | `LineIcon` | door, pin, signal, lock, check, spark, chart, alert, user, globe, layers, bolt, eye, wave |
| Status | `StatusDot` | glowing, pulsing |
| Frame finish | `CinematicFinish` | every full-screen scene |
| Realistic objects | the user's 3D asset (`AssetScene`, `<AssetMedia>`) | never drawn with shapes (SKILL.md rule 11) |

The UI card's `look: "glass"` (`UiCard`) is the reference implementation of these blocks.

## 2b. Libraries: text animation, backgrounds, camera, formats

- **Text animation library:** kind `KineticText` (`src/kit/beats/kineticText.timing.ts`). Styles:
  - `typewriter`, `word-pop`, `word-rise`, `letter-cascade`
  - `blur-in`, `mask-reveal`, `highlight-sweep`, `glitch`
  - `scramble`, `scale-punch`, `slide-stack`, `karaoke`

  Placement is `caption`, `center` or `fullscreen` (on a library background). Accent words use the 10 % colour with a deep glow. Use it instead of writing a new text component when one of these styles fits.
- **Background library:** `Backdrop` / `BACKGROUNDS` (`src/kit/backgrounds.tsx`):
  - `aurora`, `grid-floor`, `light-rays`, `horizon`
  - `starfield`, `glass-blobs`, `spotlight`, `mesh`
  - `tunnel`, `beams`, `data-lines`, `minimal`
  - plus the user's own in `backgrounds/custom.tsx`

  All are animated, palette-driven and finished with grain and vignette. A user request "Ask Claude for a new background" arrives as a `background` request; add the preset to `backgrounds/custom.tsx` and finish with `edit_decisions.py done`.
- **Camera moves** (`CAMERA_MOVES` in `src/kit/style.tsx`):
  - push-in, slow-zoom-in, fast-zoom-in
  - slow-zoom-out, fast-zoom-out, peak-middle
  - drift, orbit, dynamic, static

  Every full-screen beat moves with the edit's camera automatically; a beat can set `camera: {move, intensity}`. `doc.zooms` moves the talking-head footage itself (look only, never timing).
- **Formats:** 1080x1920, 1920x1080, 2160x3840, 3840x2160 (`edit_init.py --size`). Components draw on a design canvas whose short side is 1080: use `useCanvas()` (not `useVideoConfig()`) for width/height, and check `landscape` to lay out side-by-side in 16:9.
- **The user's reference library:** `library/references.json` (Studio: References → My library). `show` lists it; open the ones that fit.

## 3. Scale, type and colour

- **Fill the frame.** A full-screen subject spans 55-80 % of the width; a UI card beside the speaker at least 70 % of the width. Tiny elements read as unfinished.
- **Type:** Montserrat only for sans (rule 10). Headlines 90-160 px (1080-wide frame), labels 20-26 px tracked +0.2-0.3 em in caps, body 24-38 px. Mix weights (300 with 700-800); one accent voice (italic serif) at most.
- **Colour:** one accent hue plus neutrals. Light comes from the accent (rim, glow, rays); surfaces are deep, desaturated versions of it, never grey boxes.
- **Contrast through light, not outlines.** Prefer a glow, a gradient edge or a rim to a 1 px coloured border.

## 3b. The edit's style: 60-30-10, camera, framing (from the Constants for the Whole Edit)

- **60-30-10 colour:** `usePalette()` (`src/kit/style.tsx`) gives `c60` (base: backgrounds, large surfaces, ~60 %), `c30` (support: panels, secondary shapes, ~30 %) and `c10` (accent: the one thing to look at, ~10 %). Use nothing else but neutrals (white type, black, greys). `preview` measures the shares on full-screen scenes and flags a weak base, an accent over 20 % or off-palette colour.
- **Camera:** wrap every scene's world in `<CameraMove dur={...}>`. It uses the edit's camera (push-in / drift / orbit / dynamic, subtle / medium / strong) unless the plan asks for another move. Nothing is static; `preview` flags frames that barely change.
- **Framing:** subjects and text sit inside the safe area: 8 % side margins, top 12 % and bottom 20 % free (platform UI), never cut by the frame edge unless on purpose. The subject is centred on a thirds line or dead centre, never drifting into a corner by accident.

## 4. Motion

- One clear camera move per scene: a slow push-in (3-6 %), a drift, or a tilt-in. Nothing static.
- Entrances: blur to sharp + rise/tilt + opacity, 0.4-0.7 s, `outQuart`/`outExpo`; stagger 80-160 ms.
- Something keeps living while the scene holds: a glow breathing, dust drifting, a value ticking, a sweep.
- Exits are quicker than entrances (0.2-0.4 s), or a hard cut on the beat.

## 5. The compare loop (required)

1. Write `build.json`, run `edit_decisions.py preview <slug> --request REQ-#### --file build.json`.
2. Open the sheet (Read). Name, concretely, what the reference has and your frames lack. Typical gaps:
   - light that does not glow
   - missing depth or layers
   - no texture (grain, glass)
   - the subject too small
   - type too light or too small
   - flat colour
   - empty corners
3. Fix those, preview again. Two or three rounds is normal.
4. In `build.json`, `match` lists at least four of the reference's visible qualities: `done: true` with how, or `done: false` with why (for example "needs a real render: asked for as a 3D asset").

If a quality needs a real object or real 3D rendering, do not fake it with shapes: ask for a 3D asset.
