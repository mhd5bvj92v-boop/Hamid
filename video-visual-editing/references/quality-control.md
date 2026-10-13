# Quality Control

Run this after every render round. QC means **looking at the frames**, not assuming they look right. Record the results in `work/qc/report.md`.

## Procedure

1. **Extract evidence.** For each beat, pull 3 frames from the *composited* video (entering, landed/mid, just before exit): `python3 scripts/compose.py frame edit.mp4 --t <t> --out work/qc/<beat>-<t>.png`. For full-screen scenes, add the first and last frame to check the transitions.
2. **Compare.** `python3 scripts/compare.py --render <frames> --refs <IDs chosen in the plan> --out work/qc/cmp-<beat>.png`, then open it with Read.
3. **Check at phone size.** Look at a frame downscaled to 360px width (`compare.py --height 640` approximates this). If you have to squint, it fails.
4. **Score with the checklists below.** Every "must" item has to pass. For each "should" item that fails, write the reason or a fix.
5. **Check timing.** Extract frames at the stressed word's timestamp ±3 frames and confirm the key action resolves on the word.
6. **Fix and repeat.** Change one thing at a time, re-render the still first, then the sequence.
7. **Report honestly.** List the remaining differences from the references and any tool limitations.

## Universal checklist (all systems)

Must:
- [ ] The visual exists for a reason you can state in one line (story beat → treatment).
- [ ] One idea, one focal point, one accent colour (plus white) per beat.
- [ ] ≤2 type voices. All text readable at 360px width. No typos; numbers match the speech.
- [ ] Nothing covers the speaker's eyes or mouth (Systems A/B).
- [ ] No third-party logos, watermarks or QR codes copied from references (watch ONS-019 and FUL-076).
- [ ] Motion uses the house easings with no bounce, spin or shake (`motion.md`).
- [ ] The rendered output was actually inspected (list the frames you looked at).

Should:
- [ ] Side-by-side with the chosen reference: same family feel in surface, radius, glow, spacing and type contrast.
- [ ] Entrance resolves on the stressed syllable (±3 frames); exit completes before the next beat.
- [ ] Palette harmonises with the footage grade.
- [ ] Consecutive visuals vary in composition.

## System A (on-screen) checklist

- [ ] UI sits in the 55-85% height band (9:16) or on the empty side (16:9).
- [ ] The UI scale matches ONS-001..005: title ≈30px and body ≈24px at 1080w. Chips/panels span 40-70% of the width.
- [ ] Surface reads as dark glass (or light glass on bright footage), with hairline border and soft shadow.
- [ ] Separation from the plate is enough, without unnecessary global dimming.
- [ ] On screen for ≥1.2s and for the duration of the idea.

## System B (text) checklist

- [ ] It is a designed phrase, not a transcript dump (2-6 words).
- [ ] Size contrast 2-3x between connector and key word, with tight interlocking leading.
- [ ] Lining figures for numbers, and tabular figures for count-ups.
- [ ] Glow plus soft shadow for legibility (no hard strokes or boxes, except name tags).
- [ ] Positioned 50-62% height, centred, with 6% side margins; clears the platform UI.

## System C (full-screen) checklist

- [ ] Readable in under 1 second with the sound off.
- [ ] One hero object or one hero number. The headline is ≤8 words.
- [ ] Light quality: rim/bloom/atmosphere present where the family calls for it; deep blacks not crushed to banding.
- [ ] One camera move; a clear reveal, then message, then exit.
- [ ] Duration 1.5-4s; cut in and out on speech beats.

## Common defects and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Overlay looks "small" or "web-like" | desktop-scale reference used 1:1 | raise `uiScale` 1.4-1.6, cut copy |
| Text looks pasted on | no glow/shadow, or wrong colour temperature | add an accent glow and dark soft shadow; match the grade |
| Feels cheap | too many elements or colours; linear easing | remove elements; outCubic/outQuart; add blur-in |
| Glow looks muddy | glow colour mixed with grey, or low alpha everywhere | glow in the accent hue only, brighter core, darker surroundings |
| Banding in dark gradients | 8-bit encode of big smooth gradients | add 1-2% noise/grain, encode at higher quality (lower CRF) |
| Old-style numerals in serif | font default | `font-variant-numeric: lining-nums` (set in templates) |
| Wrong font rendered | web font not loaded / offline | install the font or change `fonts` in the config; recheck the still |

## Build-time test log (2026-10-13)

These tests were run while building the skill. No real talking-head footage was provided, so overlays were checked on a **synthetic 1080x1920 test plate** (warm slat wall, simplified head and torso, mic). Results are recorded honestly:

| Template | Compared against | Result | Remaining gaps |
|---|---|---|---|
| caption-serif-accent | TXT-001, TXT-003 | size ratio, amber italic serif, interlocking stack and glow match after tuning (serif ≈45% frame width) | Playfair's numeral shapes are more decorative than the reference's serif; a condensed display italic would match better if available |
| live-ui-list | ONS-001, ONS-003 | after `uiScale` 1.5, the chip/card scale, dark-glass surface, avatars and dotted connector match | the reference connector is shorter and more horizontal; adjust `node` x/y per shot |
| progress-grid | ONS-004 | close match (card, counter, progress bar, blue cells) | none significant |
| stat-card | ONS-024, ONS-050 | card shape, rim glow and light pool, bell curve with glowing peak, count-up match in spirit | the reference's lower-edge glow is more intense and its curve stroke thinner; the reference is 4:5 while the test was 9:16 |
| ai-input-bar | ONS-034 | warm/cool orbiting edge glow, chips and send button | the reference's dotted glyph texture around the bar is not implemented |
| fullscreen-horizon-title | FUL-002 | planet rim, numerals sinking into the atmosphere, kicker/body layout match | the reference's atmosphere band is slightly thicker and bluer |
| compose.py | n/a | ProRes 4444 (yuva444p12le) and VP9-alpha encodes; overlay + focus + full-screen composite with audio on a 10s clip verified by extracted frames | not yet tested on real footage, 16:9 or variable frame rate sources |

Next time real footage is available, re-run the System A and B comparisons on it and update this log.
