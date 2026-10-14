# Quality Control

Run this after every render round. QC means **looking at the frames**, not assuming they look right. Record the results in `work/qc/report.md`.

## Procedure

0. **Prove the timeline first.** `python3 scripts/edit_qc.py <slug> --final work/<slug>/renders/final_vN.mp4 --sfx <placements>` (run by `edit_render.py final` and the Studio's Export on the Remotion render) and `python3 scripts/sound_qc.py <plan dir>` must both exit 0 (see the Timeline checklist).
1. **Extract evidence.** For each beat, pull 3 frames from the *final* video (entering, landed/mid, just before exit): `python3 scripts/compose.py frame work/<slug>/renders/final_vN.mp4 --t <t> --out work/<slug>/qc/<beat>-<t>.png`, or render a still straight from Remotion (`edit_render.py still <slug> --t <t>`). For full-screen scenes, add the first and last frame and the first frame after the scene.
2. **Compare.** `python3 scripts/compare.py --render <frames> --refs <IDs chosen in the plan> --out work/qc/cmp-<beat>.png`, then open it with Read.
3. **Check at phone size.** Look at a frame downscaled to 360px width (`compare.py --height 640` approximates this). If you have to squint, it fails.
4. **Score with the checklists below.** Every "must" item has to pass. For each "should" item that fails, write the reason or a fix.
5. **Check timing.** Extract frames at the stressed word's timestamp ±3 frames and confirm the key action resolves on the word.
6. **Fix and repeat.** Change one thing at a time, re-render the still first, then the sequence.
7. **Report honestly.** List the remaining differences from the references and any tool limitations.

## Creative Director checklist (every project)

- [ ] Every major moment had three genuinely different, library-grounded concepts (A, B, C) plus D, and the offer of three new concepts (`edit_decisions.py propose` accepted them).
- [ ] Keep-visible recommendations were shown to the user, not silently applied.
- [ ] Concept preview frames were shown for the major scenes (or the reason why not was stated).
- [ ] The direction approval, preview approval and final approval are in `edit.json` (readable in `CREATIVE-LOG.md`) with the user's own words, in that order. No beat predates the direction approval; the final picture postdates the final approval (`edit_qc.py` checks it).
- [ ] Every feedback round is recorded with what changed.

## Timeline checklist (non-destructive editing, every project)

`edit_qc.py` measures these against the original recorded at intake. All must pass:
- [ ] The original footage is byte-identical (sha256), and the output is a new file.
- [ ] MP4, H.264, yuv420p, BT.709 limited range, 1080x1920, the approved constant frame rate, AAC 48 kHz.
- [ ] Same duration as the source (±1 frame) and exactly `round(duration × fps)` frames: nothing removed or added.
- [ ] Graphics-free frames match the source frame at the same time better than their neighbours: no cut, re-order, speed change or drift.
- [ ] After every full-screen scene, the first clean frame is back in sync (the footage kept running underneath).
- [ ] The final audio is aligned with the original dialogue (lag 0 ±1 ms) and still carries it.

And by eye:
- [ ] No pause was shortened or filled with a speed change; no automatic zoom or reframe was applied to the footage.
- [ ] Every animation has an editorial reason (no retention-only motion).

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

## System D (sound) checklist

Run `python3 scripts/sound_qc.py <render folder> --events <video_events.json>`. It must exit 0. Then confirm:

- [ ] Sync: every whoosh's loudest point is on the fastest frame and every texture or hit transient is on its event frame (±1 frame). QC measures this from the rendered stems.
- [ ] Gains follow the presets: whoosh -12 (max -10), texture -6 to -7, riser -5, music -19. Every deviation carries a `gain_override_reason`.
- [ ] Risers resolve on transitions with a hit beneath. There is a riser after the hook. The 2 sharp bass + 2 metallic target is met, or the reason it isn't is stated.
- [ ] Music is silent in full-screen and graphic windows.
- [ ] No clipping (sample peak and true peak). The loudest stack is reported.
- [ ] The voice stem is bit-identical to the source, the voice is at unity in the mix, and nothing is louder than the voice during speech.
- [ ] The source audio and library files are unchanged, and the deliverable is the Remotion render (`renders/final_vN.mp4`): `edit_qc.py` found the voice at unity outside the effects, every planned effect present at its time, and no clipping.
- [ ] Every placed sound records the variations it was compared against (`auditioned`).
- [ ] Silence decisions are explicit (`status: silence/rejected` with a reason).
- [ ] Tell the user that Claude verified the mix by measurement and cannot listen, and ask them to listen.

## Common defects and fixes

| Symptom | Likely cause | Fix |
|---|---|---|
| Overlay looks "small" or "web-like" | desktop-scale reference used 1:1 | raise `uiScale` 1.4-1.6, cut copy |
| Text looks pasted on | no glow/shadow, or wrong colour temperature | add an accent glow and dark soft shadow; match the grade |
| Feels cheap | too many elements or colours; linear easing | remove elements; outCubic/outQuart; add blur-in |
| Glow looks muddy | glow colour mixed with grey, or low alpha everywhere | glow in the accent hue only, brighter core, darker surroundings |
| Banding in dark gradients | 8-bit encode of big smooth gradients | add 1-2% noise/grain, encode at higher quality (lower CRF) |
| Old-style numerals in serif | font default | `font-variant-numeric: lining-nums` (set in templates) |
| Wrong font rendered | web font not loaded / offline | Remotion: fonts are bundled in `src/fonts.ts` (add the weight there); HTML: install the font or change `fonts` in the config; recheck the still |
| `Timeline mismatch` error in Remotion | the composition's fps/length differ from `source.ts` | never hand-edit `index.tsx`/`source.ts`; re-run `edit_init.py` with the approved `--fps` |
| `edit_qc` frames ERROR | the picture drifted, was cut or re-timed | look for a trimmed or re-timed source (e.g. a second `<Video>`), or a beat that hides the footage longer than planned; never "fix" by editing the source |
| `edit_qc` audio lag ≠ 0 | the mix was built from a re-encode or shifted file | the cue sheet's `dialogue.file` must be the original (`edit_render.py sfx` sets it) |

## Build-time test log (2026-10-13)

These tests were run while building the skill. No real talking-head footage was provided, so overlays were checked on a **synthetic 1080x1920 test plate** (warm slat wall, simplified head and torso, mic). Results are recorded honestly:

| Template | Compared against | Result | Remaining gaps |
|---|---|---|---|
| caption-serif-accent | TXT-001, TXT-003 | size ratio, amber italic serif, interlocking stack and glow match after tuning (serif ≈45% frame width) | Playfair's numeral shapes are more decorative than the reference's serif; a condensed display italic would match better if available |
| live-ui-list | ONS-001, ONS-003 | after `uiScale` 1.5, the chip/card scale, dark-glass surface, avatars and dotted connector match | the reference connector is shorter and more horizontal; adjust `node` x/y per shot |
| progress-grid | ONS-004 | close match (card, counter, progress bar, blue cells) | none significant |
| stat-card | ONS-024, ONS-050 | card shape, rim glow and light pool, bell curve with glowing peak, count-up match in spirit | the reference's lower-edge glow is more intense and its curve stroke thinner; the reference is 4:5 while the test was 9:16 |
| ai-input-bar | ONS-034 | warm/cool orbiting edge glow, chips and send button | the reference's dotted glyph texture around the bar is not implemented |
| fullscreen-horizon-title | FUL-002 | planet rim, numerals sinking into the atmosphere, kicker/body layout match. **Revised after user review:** the planet is now pure black and opaque to its edge, so the limb really hides the numerals' base (before, a semi-transparent edge let them show through). The glow is stronger: a white-hot core line, a thicker blue band, and haze as its own gradient layer, because large shadow blurs were clipped into a hard band. Numerals are sized by `numSize` (63% of the width, as in the reference), and they now fade in (the fade was commented out by mistake) | none significant at still level |
| compose.py | n/a | ProRes 4444 (yuva444p12le) and VP9-alpha encodes; overlay + focus + full-screen composite with audio on a 10s clip verified by extracted frames | not yet tested on real footage, 16:9 or variable frame rate sources |

**Font change (2026-10-13, user rule):** all sans text now uses Montserrat (SKILL.md rule 10). It was verified in Chromium for all 6 templates (`document.fonts.check` true, Montserrat loaded from Google Fonts), and every template was re-rendered and inspected. Offline rendering needs Montserrat installed locally.

Next time real footage is available, re-run the System A and B comparisons on it and update this log.

### System D test log (2026-10-13)

The sound toolchain was tested with `scripts/sound_selftest.py`. **The user's library was empty, so the test used synthetic fixtures** (filtered noise, sweeps and sines in a temp folder) and a 12 s test clip with TTS dialogue (ffmpeg `flite`):

- **Indexing:** all 9 fixture files were categorised correctly by name (WSH, RIS×2, HIT, POP, UI, SCI, MEC, ENV), with Joseph's role tags recognised.
- **Audition sheet:** the three whoosh variations were ranked for a 0.5 s movement.
- **Footage analysis:** `video_events.py` found the full-screen cut at exactly 7.500 s and three speech regions.
- **Correct render:** QC passed with 0 errors. Every anchor was within 0.0 ms of its target frame, and every stem rebuilt independently from the sources matched the render (max diff ~1e-7). The voice stem was bit-identical, the picture stream bit-identical, music was silent (-240 dBFS) inside the full-screen window, true peak was -1.10 dBTP, and all source hashes were unchanged.
- **Negative render** (whoosh at -4 dB, pop over the voice, a cue 3 frames off its event): QC failed with `levels`, `sync` and `dialogue` errors, as intended.
- **Clip stress test** (hit H01 at +12 dB): the mixer pulled only hits (H01 by 13.2 dB in total, plus H02 by 1.95 dB where the riser/hit stack at 7.5 s also exceeded the ceiling). The voice was untouched, and QC then passed with warnings that report the pulls.
- **Two bugs found and fixed during the test:** the overlap-sensitive placement check was replaced with exact stem reconstruction, and the 100 ms dialogue windows were replaced with speech-gated 400 ms windows.
- **The test also caught a real mixing mistake:** a riser swelled over the speaker's last words. It was fixed by trimming the riser's head, which is documented as the standard fix.

**Not yet tested:** a real sound library, real talking-head footage, and listening (Claude cannot hear; the user must listen to the final mix).

### Remotion workflow test log (2026-10-13)

`scripts/edit_selftest.py` was run on **synthetic footage** (8 s, 1080x1920, 30 fps, moving test pattern, TTS dialogue) with one beat per system: CaptionAccent (TXT-001), StatCard (ONS-024) with a focus dim, and HorizonTitle (FUL-002), full-screen 5.2-7.6 s.
- **Picture:** Remotion rendered 240 frames at 30 fps. The frames were inspected: the amber serif caption, the stat card in the UI band, the horizon scene, and a burned-in source frame counter that matched the output frame numbers.
- **Sound:** intents measured from the kit's pose functions, `sfx_plan.py`, 12 cues with *synthetic* fixtures, `sound_mix.py`; `sound_qc.py` 0 errors (3 warnings: an auto-pulled hit, the sharp-bass style target, one window within 3 dB of the voice).
- **sound_qc caught real mistakes during development:** a riser at -5 dB swelling over the speaker's last words before the full-screen cut, twice. The fix was the documented one (trim the riser's head; keep the cut off the speech).
- **Timeline:** `edit_qc.py` 0 errors. 240/240 frames, 8.000 s, 12 graphics-free frames matched the source at the same time (PSNR ≥ 46 dB), back in sync after the full-screen scene, audio lag 0.00 ms.
- **Negative tests:** a 0.5 s trimmed head, a 4% speed-up, an 80 ms audio shift and a 0.5 s cut in the middle were all **rejected**.
- **Design fix found by looking:** the System A stat card's default size crossed the bottom-safe zone, and its small text was under 20 px. The default is now 40% wide in the 58-85% band, with a 20 px minimum text size.

**Not yet tested:** real talking-head footage, VFR phone footage, `--fit cover`, `--scale` masters, a real sound library, and listening (Claude cannot hear).
