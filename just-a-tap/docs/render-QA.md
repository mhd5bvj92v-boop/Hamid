# Render QA: JUST A TAP

**Deliverable:** `out/just-a-tap-1080p60.mp4`. Contact sheet of the final file: `docs/render-contact-sheet.png`.

## Verified on the final file (ffprobe / ffmpeg)
| Check | Result |
|---|---|
| Video | H.264 High, 1920x1080, yuv420p (tv range, BT.709 tagged), 60/1 fps, CRF 16 (slow), faststart |
| Frames / duration | **1200 / 20.000 s** |
| Audio | AAC-LC 256 kb/s, 48 kHz stereo, 20.000 s, **−13.9 LUFS** integrated, true peak ≤ −1.5 dBTP |
| Full decode | no errors |
| Frozen stretches > 0.5 s | none |
| Blank frames | none (minimum frame-to-frame change 0.003 occurs during the final hold; every frame has content) |
| Luminance jumps > 25% | only 17.75–17.82 s: the deliberate underline → dark-surface expansion. It is a monotonic transition over 4 frames, not strobing. |
| Saturated pixels outside the orange band | 0.05% |
| Fonts | Inter, loaded locally via `@remotion/fonts` before frame 0. No fallback seen in any still. |
| Out-of-bounds text | none in the 50+ stills reviewed (keyframes plus ±3-frame boundary triplets at 150/300/450/600/750/900/1050) |

## Process
1. 0–5 s proof rendered first (`out/proof-0-5s.mp4`). Audit: no frozen frames and no velocity spikes (stutter detector: per-frame difference vs 5-frame mean).
2. Remaining scenes were built and reviewed as stills. Fixes are listed in `changelog.md`. The main one replaced soft circular "blob" reveals with shape masks driven by hero elements, as `SKILL.md` requires.
3. Boundary triplets were checked at every scene change. All hero objects persist across the cuts (global tracks, no re-mounts).
4. Final render, then a range fix to yuv420p tv, then the synthesised audio was muxed in. Re-verified afterwards.

## Scorecard (self-assessment, 1-5)
| Criterion | Score | Note |
|---|---|---|
| UI craftsmanship | 4 | real anatomy everywhere: labels, plausible numbers, states, hairlines, no skeleton bars |
| Design consistency | 4 | one token set (radii 8/14/22/30, e1-e3, Inter scale) |
| Reference fidelity (principles) | 4 | big numerals with dim decimals, light inside UI, single selection colour; no layouts copied |
| Motion quality | 4 | springs with one overshoot, eased camera, counters, staggers |
| Transition logic | 4 | card → phone, glyph → arcs → traces → rail → panel → underline → rail → stroke → title underline |
| Typography | 4 | — |
| Pacing | 4 | — |
| Restraint | 4 | no 3D, no particles, no neon |
| Performance | 4 | about 6 min render at concurrency 4 |

## Limitations
- **Audio is synthesised** (`tools/make_audio.py`): original, generated from code, with no samples and no voice-over. It was measured (LUFS, spectrogram showing every cue at its frame) but could not be listened to in this environment.
- Motion was judged from stills, automated frame audits and the proof's frame-difference curve. Real-time playback wasn't viewed here.

## Suggested follow-ups
1. Record a real VO from `docs/vo-cues.srt` and retime scene durations to it.
2. Swap the synthesised bed for a licensed track if a more musical, produced sound is wanted. The cue timings in `sound-cue-sheet.md` stay valid.
