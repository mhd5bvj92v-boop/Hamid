# System C: Full-Screen Animations (replace the talking head)

Scenes that cut away from the speaker for a moment: big ideas, metaphors, data stories, section openers and transitions.

**References:** FUL-001..FUL-093, plus the ONS references flagged `also_useful_for: FUL` (for example ONS-013, ONS-015, ONS-021, ONS-025, ONS-028).
The library is mostly **stills (posters, hero sections, key visuals)**. Every motion design below is *inferred* from them. Build the motion to fit what the still implies, and tell the user it is an interpretation.

## When to use

Cut to full-screen only when it earns the cut:
- **The idea is abstract** and a metaphor explains it faster than a face: time pressure (hourglass), standing out (glowing figure, blue king), chaos to system (scribble to cube), bridging a gap (bridge, key, pencil).
- **A single big number** deserves a moment (FUL-002 horizon numerals, ONS-024 stat card full-screen).
- **A structure** needs the whole frame: a journey chart (FUL-003), a forecast (FUL-020), a 3D data rise (FUL-026).
- **Section breaks**: a new chapter, a question to the audience (FUL-029, FUL-069, FUL-071), or the intro/outro (ONS-013, FUL-028).

Limits:
- Full-screen scenes run **1.5-4s each**. Longer only if the speaker's voice-over narrates a sequence.
- They take up at most ~20-25% of total runtime in a talking-head video. Return to the face quickly; the face carries trust.
- Never cut away during an emotional or personal moment.

## Scene archetypes and how to animate them

| Archetype | Refs | Inferred animation recipe |
|---|---|---|
| Horizon stat / title | FUL-002, FUL-013, FUL-052, FUL-070 | planet rim rises like a sunrise (1.2-1.8s outQuart), thin numerals count up, slow 3-5% push-in |
| Single hero metaphor (dark) | FUL-009, FUL-010, FUL-015, FUL-022, FUL-036, FUL-071 | object reveals by light (rim ignites, emissive swell), headline block types or fades in the negative space, crowd/background dims |
| Single hero metaphor (light) | FUL-017, FUL-023, FUL-031, FUL-057, FUL-061, FUL-064 | soft studio scene; one physical action (sand pours, pencil draws, key lowers, tangle straightens), rack focus to the accent object |
| Archetype series card | FUL-001, FUL-009, FUL-015, FUL-074 | consistent layout (quote glyph, heading, body, hero object); swap the object per item, keep the layout fixed |
| 3D numeral / glyph | FUL-024, FUL-051, FUL-069, FUL-004, FUL-042 | extruded glossy numeral rises; crown or accent object drops and settles; ghost text slides behind |
| Data scene | FUL-003, FUL-019, FUL-020, FUL-026, FUL-062, FUL-065 | the line draws to a glowing node, the camera moves along it, and labels appear at milestones |
| Editorial poster | FUL-078..FUL-092 | paper texture is static, the halftone cut-out drops in, the accent shape scales in behind, the headline sets line by line; minimal motion |
| Abstract material / transition | FUL-014, FUL-027, FUL-039, FUL-060, FUL-066, FUL-075, FUL-077, FUL-093 | a continuous loop (twist, coil, flow) used for 0.5-1.5s as a bridge between sections, or behind a single line |
| Light streak / portal | FUL-006, FUL-012, FUL-025, FUL-029, FUL-032, FUL-093 | streaks accelerate toward the camera, or a portal rises; the cut happens at peak brightness |
| Web-hero style statement | FUL-005, FUL-008, FUL-011, FUL-018, FUL-040, FUL-045, FUL-056 | the headline is centred, product objects float with parallax, and UI rises from below |

## How to design one

1. **Write the beat in one sentence:** "When he says *'most businesses run on chaos'*, show chaos becoming a system."
2. **Pick the archetype and 1-3 references** (`python3 scripts/search.py chaos system --cat FUL`). Open them with Read.
3. **Choose the light:** dark (most of the library) or light editorial. A light scene works as deliberate contrast, for example a psychology section inside a dark tech video.
4. **Compose for 9:16:** headline block in the top 20-40% (left-aligned editorial or centred), hero object in the lower 50-60%, often bleeding off an edge. Keep 6% margins and clear the platform UI zones.
5. **Keep the copy short:** a headline of ≤8 words, an optional ≤14-word body, an accent on 1-2 words (colour, italic serif or a highlight box as in FUL-050 and FUL-090).
6. **Design the motion as three acts:** reveal (0-0.8s), action/message (0.8-2.5s) and hold/exit (last 0.5s). One camera move per scene: a push-in, a slow lateral drift, or a single orbit.
7. **Plan the transitions in and out** (see `motion.md`). The default is a cut on the beat, or a 6-10 frame blur/brightness dip. Light-streak, portal or whip transitions are reserved for section changes.

## Production paths (choose by what the environment actually has)

1. **HTML/CSS/SVG/Canvas → Playwright frames** (always available here). Good for typography, UI, charts, glows, planet arcs and particles. Template: `templates/fullscreen-horizon-title.html`; `templates/stat-card.html` with `"fullscreen": true`.
2. **Generated or licensed still plus 2.5D animation:** the hero object (hourglass, chess pieces, brain) as an image, animated with parallax layers, light sweeps, a particle overlay (sand, dust, sparks) and a camera push in HTML or ffmpeg. State that the base image was generated or sourced, and check licensing.
3. **True 3D (Blender, if installed):** extruded numerals, glass tiles, neon rims, slat waves and coils. Use emission plus bloom (Eevee) or Cycles with glass/rim lights. Render a PNG sequence and composite it with `compose.py`.
4. **Third-party tools the user has** (After Effects, DaVinci Resolve/Fusion, Premiere): hand off ProRes 4444 layers plus a timing sheet if the user will finish there.

Never claim a 3D render or a generated image exists until it does. If a path is unavailable, say which one you used instead.

## Common mistakes

- Using full-screen for something an overlay could say (it breaks the connection with the speaker).
- Busy backgrounds behind text: streaks, particles and grids must sit behind and dim around the text area.
- Too many objects: the references show **one** hero object per scene.
- Stock-template motion: everything spinning, zoom blasts or random bounce.
- Mixing light editorial and dark neon in one scene.
- Copying brand names, logos or watermarks from the references (FUL-076 carries a third-party watermark). Replace all copy with the user's message.

## Quality bar

- [ ] The idea reads in under 1 second with the sound off.
- [ ] One hero object, one accent colour, ≤2 type voices.
- [ ] Side-by-side with the chosen reference, the lighting quality, material and spacing are in the same league. List the gaps honestly.
- [ ] Motion has a clear start, action and end; nothing loops distractingly under text.
- [ ] Transitions in and out land on speech beats.
