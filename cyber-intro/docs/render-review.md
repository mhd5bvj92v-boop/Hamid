# Render review

**Deliverable:** `out/cyber-intro-1080p60.mp4`. Contact sheet of the final render: `docs/render-contact-sheet.png`.

## Verified (ffprobe / ffmpeg on the final file)
| Check | Result |
|---|---|
| Codec / profile | H.264 High |
| Dimensions | 1920x1080 |
| Frame rate | 60/1 |
| Frames / duration | 1500 / 25.000 s |
| Pixel format | yuv420p, tv range, BT.709 tagged, faststart |
| Full decode (`ffmpeg -f null`) | no errors |
| Frozen stretches >0.5 s (`tools/motion-audit.py`) | none |
| Luminance jumps >25% frame-to-frame | none |
| Saturated pixels outside the orange band | 0.05% |
| Audio | none (see Limitations) |

## Passes
1. **Stills per scene** (opening / mid / transition / end via `npm run stills`) → contact sheets reviewed.
2. **Fixes from pass 1:** the go-button detached from the bar during the morph, the dive page was still visible at high zoom, a duplicate cursor appeared across the 1→2 overlap, the scene 3/4 handoff path lingered, a scene 4→5 duplicate ring showed during the overlap, and the scene 6 point climb was too fast.
3. **Creative revision after feedback** ("too fake / childish, want Apple style, glassy like the references"):
   - removed every glow orb, the comet trail and the point-traces-outline ending
   - frosted-glass panels throughout (`Card`, `Browser`, cookie sheet, chips)
   - keynote-style drifting backdrop (`Background`)
   - scene 5 → 6 is now three cards merging into one glass window that becomes the thesis frame
   - sentence-case SemiBold thesis
   - see `reference-decisions.md` → Revision 2
4. **Bug found during the revision:** a temporary debug edit that skipped scene 5 had been left in `Intro.tsx`. It made frames ~1000-1260 render empty. It was found from the stills and removed. The final render has no empty stretch (audit above).
5. **Half-res draft** (`out/draft.mp4`): frames sampled at ±6-18 frames around every boundary. The anchors are continuous: bar → window, click → path → dive node → hub, node → toggle, toggle knob → ring, ring → header, cards → glass window → thesis frame.
6. **Final render, then range fix:** Remotion's JPEG frames produced `yuvj420p` (full range). This was re-encoded to `yuv420p` tv range at CRF 14 (preset slow).

## Limitations and unresolved items
- **No narration or SFX.** No voice recording or licensed SFX was supplied, and generating a synthetic voice was out of scope. The video is silent. `docs/narration-cues.srt` gives the timed VO lines for recording or for a placeholder track.
- The scene timings follow the brief's VO guide. They will need retiming once a real voice-over exists.
- The `launch-motion` SKILL.md was never supplied. `skills/cyber-ui-motion/SKILL.md` rebuilds its principles as quoted in the brief.
- All UI data is illustrative (`example.com`, `examp1e.test`). No real site is shown as tracking anyone.
- Motion was judged from sampled frames plus the automated audit. Real-time playback wasn't viewed in this environment.
