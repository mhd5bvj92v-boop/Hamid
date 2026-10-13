# Design Language

This file holds the creative principles extracted from the reference library: 182 unique references from batch-001.
Every rule names the references that show it, so you can open them and check.
Use the rules to make decisions, not as a template. A video should feel like it belongs to this library without copying any single reference.

**Evidence base.** These figures were measured with `scripts/` over the whole library, not estimated:
- **Backgrounds:** 123 of 182 references have a dark background (mean luminance under 30%). That breaks down as ONS 69/79, TXT 7/10 and FUL 47/93. The light references (59) are almost all print-style or editorial posters.
- **Accent hue:** the dominant saturated hue is **blue in 113** images, violet in 23, amber/orange in 17, green in 7, red in 6, lime in 5, teal in 4 and pink in 4.
- **Style families:** 13 families in total. NEON-RIM 29, 3D-METAPHOR 34, DATA-GLOW 21, GLASS-DARK 15, EDITORIAL-PRINT 15, MATERIAL-ABSTRACT 13, AURORA-GRADIENT 10, HORIZON-ARC 10, SERIF-ACCENT-CAPTION 10, FROST-LIGHT 9, LIGHT-STREAK 7, LIVE-UI 5, NEUMORPHIC-LIGHT 4.

---

## 1. Core principles

1. **One idea per visual.** Each reference communicates one thing: one number (ONS-024, FUL-002), one comparison (ONS-031, ONS-073), one metaphor (FUL-010, FUL-022), or one list (ONS-001). If a visual needs two ideas, make two beats.
2. **Darkness is the canvas and light is the information.** Most references are near-black with a single luminous accent. The light *is* the hierarchy: the glowing node, the lit tile and the rim-lit card are always what matters (ONS-010, ONS-014, ONS-024, FUL-002).
3. **One accent family per scene.** Blue dominates, with violet as the second voice. Warm amber/gold appears for emotion and wealth (TXT-001..TXT-004, ONS-053). Green signals positive metrics (ONS-050, ONS-007). Multi-hue appears only in deliberate "spectrum" pieces (ONS-023, ONS-042, ONS-044, FUL-066).
4. **Premium equals restraint plus material.** Elements are few, but each has a believable material: glass thickness, rim light, soft shadow, bloom, halftone grain or chrome reflections. Flat, vector-only, material-less shapes do not appear in this library.
5. **Negative space is part of the composition.** UI cards typically occupy 30-60% of the frame, with large calm areas around them (ONS-006, ONS-016, ONS-034).
6. **Speaker first (live frames).** In every talking-head reference the face stays completely clear. Graphics live in the chest-and-below band, and captions sit just under the chin (ONS-001..ONS-005, TXT-001..TXT-009).
7. **Typographic contrast is the signature.** A small, quiet sans paired with one large expressive word (italic serif, script, gradient or extended caps). Contrast of *size* and *voice*, never more than two families (TXT-001, TXT-009, ONS-001, ONS-005, FUL-063).
8. **Metaphor over literal illustration (full-screen).** Time is an hourglass or clock (FUL-010, FUL-023, FUL-055, FUL-057). Standing out is a glowing figure or a blue chess piece (FUL-015, FUL-036, FUL-017). Chaos to order is a scribble becoming a cube or a tangle becoming an arrow (FUL-022, FUL-061). Bridging gaps is a bridge, key or pencil line (FUL-031, FUL-064, FUL-067).
9. **Recognisable real-world UI.** Overlays look like plausible product UI (inbox, calendar, dashboard, prompt bar, widgets), so the viewer reads them instantly (ONS-003, ONS-004, ONS-034, ONS-020).
10. **Motion is implied by the stills.** Lines that want to be drawn, numbers that want to count, light that wants to sweep, cards that want to stack. Animate what the design already implies, and nothing extra.

## 2. Tokens

### Colour (measured palettes live in each entry; these are the recurring roles)

| Role | Value(s) | Seen in |
|---|---|---|
| Deep background | `#000000`-`#0B0D14`, navy `#05070D`-`#0A1430`, violet-black `#0D0820` | most ONS/FUL |
| Card surface (dark glass) | `rgba(22,23,28,.86)`, border `rgba(255,255,255,.08-.16)` | ONS-001..005, ONS-007 |
| Primary accent: electric blue | `#2F6BFF`, `#3B82F6`, `#1E5BFF`, highlight `#5B8CFF` | ONS-004, ONS-008, ONS-024, FUL-002 |
| Secondary: violet | `#7C3AED`, `#8B5CF6`, `#A78BFA` | ONS-015, ONS-017, ONS-033, FUL-021 |
| Warm emotional: amber/gold | `#F2A14A`, `#E7A93B`, gold gradient `#FFE08A→#E39B2B` | TXT-001..004, TXT-009, ONS-053 |
| Positive metric: green | `#22E37A`, `#2BD47D`, lime `#B6F23A`/`#D4F542` | ONS-007, ONS-050, ONS-062, ONS-036 |
| Script/cream accent on footage | `#F3E6C4` | ONS-001, ONS-005 |
| Light editorial paper | `#F4F4F2`, `#EDEFF3`; ink navy `#0E1A4F`; royal `#1D4ED8` | FUL-078..092, ONS-025 |
| Text | white `#FFFFFF`; secondary 60-65% white; tertiary 35-40% white | everywhere |

Rules:
- Use one accent hue per scene, plus white. A second hue is allowed only as a warm/cool *temperature pair* (ONS-034 orange→blue, ONS-043 amber rays + blue UI).
- Keep glow colours as the accent at 35-60% alpha, never pure white bloom on everything.
- On real footage, match the grade. Warm footage takes amber/cream accents (TXT-001), and cool or neutral footage takes blue or white (ONS-001..005, TXT-007).

### Typography

| Voice | Recommended (free) | Fallback | Use |
|---|---|---|---|
| UI / connector sans | **Montserrat, always** (house rule; weights 100-900) | system-ui | captions, labels, UI, kickers, body, numerals |
| Expressive italic serif | Playfair Display Italic 600 (lining figures), Instrument Serif Italic, Bodoni Moda Italic | Georgia italic | key words, numbers on warm footage |
| Script accent | Playfair Display Italic 500, or a calligraphic serif such as "Pinyon Script" used sparingly | - | one emotional word ("clients", "don't give up") |
| Display condensed | Anton, Bebas Neue, Oswald 700, Druk (paid) | Montserrat 800-900 with scaleX(.8) | FUL headline stacks (FUL-010, FUL-087) |
| Extended caps | Unbounded, Syne, Monument Extended (paid) | Montserrat 800 + tracking .06em + scaleX(1.15) | single keyword (TXT-007) |
| Thin numerals | Montserrat 100-200 outline (`-webkit-text-stroke`) | - | big stats on horizon scenes (FUL-002) |

Scale for a 1080x1920 frame (multiply by width/1080 for other sizes):
- Caption connector sans: 44-56px, weight 500-600.
- Key serif/script word: 110-170px (2.2-3x the connector).
- Micro caps: 22-26px, tracked 0.2-0.6em.
- UI title: 28-32px. UI body: 22-26px. Meta: 20-22px.
- Big stat: 140-200px (cards) or 400-480px (full-screen outline numerals).

Rules: use at most two families per frame. Never set a whole sentence in the expressive voice; it belongs to one or two words. Use tabular figures for counters.

### Shape, depth, effects

- Card radius 12-16px for UI rows and 26-42px for hero cards. App tiles are squircles at 22-28% of their size.
- Shadow: `0 12px 36px rgba(0,0,0,.5)` plus a 1px inner top highlight `rgba(255,255,255,.06)`.
- Rim light: a bright 1-3px edge on the side facing the light (usually the bottom), with bloom of the same hue (ONS-024, ONS-008, ONS-014).
- Aurora: 2-3 blurred colour blobs (blur 30-60px) clipped inside the card's lower third (ONS-009, ONS-017, ONS-023).
- Bloom: an accent-coloured blur copy of the bright element at 40-70% opacity.
- Footage treatment under overlays: darken to 55-70% brightness and/or blur (sigma 4-8) only when the overlay needs the space. Otherwise rely on the natural dark lower frame or a bottom vignette (ONS-001..005).

## 3. Composition patterns

| Pattern | Description | Refs |
|---|---|---|
| Chest band | caption at ~50-58% height, UI in the 58-85% band, face clear | ONS-001..005, TXT-001..009 |
| Name super | small 2-line super, bottom-left at x≈6%, y≈85-90% (or top-right serif) | TXT-002, TXT-006, TXT-008, TXT-009 |
| Depth title | big name behind the subject, needs a matte | TXT-005, FUL-087 |
| Centred hero card | one card centred with big negative space | ONS-008, ONS-017, ONS-024 |
| Triad | three equal cards/tiles; the centre can be lifted or lowered | ONS-012, ONS-014, ONS-016, ONS-020 |
| Focus carousel | centre item at 100%, sides at ~70% scale and dimmed | ONS-011, ONS-054 |
| Funnel / flow | many inputs converge to one output, left to right | ONS-022, ONS-071, FUL-066, FUL-075 |
| Horizon | planet arc at 45-60% height with a title above | FUL-002, FUL-013, FUL-021, FUL-052, FUL-070 |
| Editorial split | headline block top-left plus a hero object bleeding off the bottom or right | FUL-001, FUL-009, FUL-023, FUL-078..092 |
| Split reveal | the frame is divided to contrast two truths | ONS-028 (iceberg tip/base) |

## 4. Style family recipes

Each reference belongs to one family. Recipes are starting points; adapt them to the footage and the message.

### LIVE-UI
Dark compact product UI composited over a real talking head (ONS-001..ONS-005).
- **Surface:** `rgba(22,23,28,.86)`, 1px hairline border, radius 12-14, soft drop shadow. Letter avatars sit in rounded squares.
- **Accent:** one blue (`#2F6BFF`) for active states, badges and progress.
- **Placement:** inside the chest band, beside or over the mic. Cover at most ~45% of the frame. The face must stay clear.
- **Motion:** staggered rise (60-120ms apart), connectors draw on, counters tick, and fills run sequentially.
- **Templates:** `templates/live-ui-list.html`, `templates/progress-grid.html`, `templates/stat-card.html`.

### SERIF-ACCENT-CAPTION
Spoken-word typography (TXT-001..TXT-009, FUL-063).
- **Pairing:** a quiet sans connector plus one expressive word (italic serif, script, gradient bold or extended caps). The two lines interlock with tight leading.
- **Colour:** amber/gold on warm footage, cream or white on cool footage, lime or mint as a fresh accent.
- **Effects:** soft accent glow plus a dark text-shadow for separation, never a hard outline or box.
- **Motion:** connector words fade/rise per word. The key phrase lands as a unit with blur-to-sharp and scale 0.92→1.
- **Template:** `templates/caption-serif-accent.html`.

### GLASS-DARK
Dark translucent cards with hairline borders and inner highlights (ONS-007, ONS-019, ONS-031, ONS-053).
- **Recipe:** card `#0E0F14` at 80-90%, 1px border at 8-14% white, a radial sheen in one corner, backdrop blur, and a big soft shadow.
- **Content:** one title, one number or chart, one meta line.

### NEON-RIM
Objects defined by saturated edge light and bloom (ONS-008, ONS-010, ONS-014, ONS-024, ONS-034).
- **Recipe:** dark body, a 1-3px accent rim brightest on the light side, an outer bloom of the same hue, and an optional hot white core on the brightest edge.
- **Motion:** light ignites (opacity and bloom up), sweeps around the border, or pulses once on emphasis.

### AURORA-GRADIENT
Cards whose lower area glows with blurred multi-stop colour (ONS-009, ONS-017, ONS-023, ONS-026).
- **Recipe:** 2-3 blurred blobs (blue `#3B5BFF`, violet `#8B5CF6`, magenta `#EC4899`, or per-card palettes) inside `overflow:hidden`.
- **Motion:** blobs drift slowly (6-10s loop) and swell when the card is mentioned.

### FROST-LIGHT
Light, airy glass on bright blue or white (ONS-018, FUL-005, FUL-011, FUL-046).
- **Recipe:** `rgba(255,255,255,.18)`, backdrop blur 20px, 1px white border at 45%, and a soft blue shadow.
- **Use:** bright footage or optimistic topics.

### DATA-GLOW
Minimal luminous charts (ONS-006, ONS-021, ONS-030, ONS-037, FUL-003).
- **Recipe:** thin 2-4px line, gradient area fill fading to transparent, glowing node(s) with a halo, sparse labels, dotted gridlines.
- **Motion:** the line draws left to right with an inOutCubic ease, nodes pop as the line reaches them, then the values count up.
- **Honesty:** never chart invented data as if it were real. Use the speaker's numbers, or keep the chart abstract and unlabelled.

### HORIZON-ARC
Planet rim or atmospheric arcs (FUL-002, FUL-007, FUL-013, FUL-021, FUL-028, FUL-052).
- **Recipe:** a huge dark circle with a bright 1-2px rim plus a wide accent haze, plus sparse stars. The title sits above the arc and the body below it.
- **Motion:** the arc rises like a sunrise (1-2s outQuart), the camera pushes in 3-5% over the shot, and numerals count up.
- **Template:** `templates/fullscreen-horizon-title.html`.

### LIGHT-STREAK
Speed lines, anamorphic beams, light walls (FUL-006, FUL-012, FUL-025, FUL-029, FUL-032, FUL-093).
- **Use:** transitions and backgrounds for a single statement. Keep the streaks behind the text.
- **Motion:** streaks accelerate toward the camera or sweep once. Never loop them busily under text.

### 3D-METAPHOR
One photoreal or stylised hero object that embodies the idea (34 references, for example FUL-010, FUL-016, FUL-022, FUL-017, FUL-057, FUL-064).
- **Recipe:** a single object, studio-lit, with shallow depth of field. A headline block sits in the negative space, and the accent colour is applied to the object or one key part of it (the violet link in FUL-037, the blue king in FUL-017).
- **Production:** 3D (Blender) if available. Otherwise use a generated or licensed still animated with 2.5D parallax, light sweeps and particle overlays. State which you used.

### EDITORIAL-PRINT
Light print-poster aesthetic (FUL-078..FUL-092).
- **Recipe:** paper white or grey, a B&W halftone cut-out, one solid accent shape (circle, wedge or box) in royal blue, green or violet, serif or ultra-condensed type, thin hairline curves and HUD annotations.
- **Use:** psychology, health or education topics; a calm contrast to dark sections.

### MATERIAL-ABSTRACT
Abstract 3D materials such as glass slats, rings, keys, capsules and neon tubes (FUL-014, FUL-027, FUL-039, FUL-068, FUL-075, ONS-058).
- **Use:** b-roll, transitions and section openers. Pair with one short line of text at most.

### NEUMORPHIC-LIGHT
Dark pills or cards on light grey with huge soft shadows (ONS-025, ONS-035, ONS-061, ONS-065).
- **Use:** overlays on bright footage, KPIs and controls.

## 5. Flexibility rules (how not to become a template)

- Choose **one dominant family per video section** (for example LIVE-UI and SERIF-ACCENT-CAPTION for talking parts, plus HORIZON-ARC for a big stat). Do not mix more than three families in one video.
- Vary the composition between consecutive visuals: centre, then left-weighted, then triad.
- Let the footage choose the palette: warm, cool or bright footage decides accent and family (dark families on bright footage only with a deliberate full-screen cut).
- New references may extend these rules. When a new pattern appears 3 or more times, add it here (see `references/extending-library.md`).
