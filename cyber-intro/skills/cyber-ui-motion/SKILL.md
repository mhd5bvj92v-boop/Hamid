---
name: cyber-ui-motion
description: Build a short, premium, frame-deterministic Remotion intro (1920x1080, 60fps) that tells a personal cybersecurity or privacy story with floating vector UI, orange light on near-black, and continuous scene-to-scene anchors. Use for YouTube intros and explainer cold-opens about browsing, privacy, permissions or security awareness. Do not use for product ads with CTAs, or for alarmist hacker imagery.
---

# Cyber UI Motion

This skill was adapted from the principles of the `launch-motion` skill that the brief references. The original file was **not available**, so this version rebuilds the principles the brief lists: frame-determinism, storyboard-first, stagger, parenting, overlaps, an eased camera, crisp vector UI, font readiness, keyframe renders and final QA. The 30 s SaaS sales arc is replaced by a 25 s personal arc with no CTA.

## Story arc (25 s / 1500 frames @ 60 fps)
| Beat | Time | Job |
|---|---|---|
| Hook | 0-3.5 s | A familiar, friendly object (a browser bar). Calm and inviting. |
| Ordinary browsing | 3.5-7 s | Autopilot habits, such as accepting cookies. Pleasant, not scary. |
| Hidden layers | 7-16.5 s | Reveal what sits behind the surface. Curious, not alarming. |
| Changed behaviour | 16.5-21 s | Deliberate choices. Calm confirmation. |
| Thesis | 21-25 s | One sentence, centred, held ≥1.5 s, soft decay. |

## Workflow
1. **Storyboard first.** Put scene boundaries, overlaps and every on-screen string in `src/data/storyboard.ts`. Scenes read from it and never hard-code times.
2. **Reference audit.** Separate *observed* still features from *inferred* motion in writing before borrowing anything. Never claim to have watched a still.
3. **Build one scene at a time.** After each scene, render stills at its opening, midpoint, transition and end (`npm run stills`), then look at them.
4. **Contact sheet → draft → final.** Render a half-res draft, sample frames with ffmpeg around every transition, fix, then render the final with H.264 yuv420p CRF ≤16.
5. **Verify with ffprobe:** duration 25.000 s, 1500 frames, 1920x1080, 60/1 fps, h264, yuv420p. Write up the review.

## Rules
- **Determinism:** use only `useCurrentFrame`, `interpolate`, `spring` and `Easing`. Do not use CSS keyframes, `setTimeout`, `Date`, unseeded `Math.random`, or state that changes per frame. Use `seeded(i)` for variation.
- **Parenting:** child elements inherit the transform of their card (`<Card>` wraps rows and the cursor). The camera is a single `<CameraRig>` per scene, and later scenes hand off camera values at the boundary.
- **Stagger:** cards use 3 frames, rows use 6 frames, and word reveals use 4 frames.
- **Overlap:** the outgoing anchor lives 8-15 frames into the next scene. Never use a full-screen crossfade. Hand off through a shared shape (line → bar → ring → path → node → toggle → ring → point → line).
- **Ambient motion has a purpose.** During holds, only the camera drift and one breathing glow move. Never make everything bob at once.
- **Easing variety:** use an eased camera, overshooting springs for entries and presses, accelerating exits, and decelerating path draws. Damping 14-20 is the starting point; tune by render.
- **Look:** frosted glass panels (translucent dark fill, `backdrop-filter: blur(30px) saturate(160%)`, a 1px top highlight, warm light seeping through the lower edge) over a keynote-style backdrop (deep black, a soft overhead light, large slow light fields). Never use glow orbs, comet trails or lens flares: they read as cheap.
- **Crispness:** draw UI as SVG or DOM vectors. Use radial-gradient glows instead of stacked SVG blur filters, and at most one full-frame blur at a time.
- **Fonts:** load Inter from local files with `@remotion/fonts` or `delayRender`. Never ship a frame rendered with a fallback font.
- **Centre-safe:** keep key copy inside the central 80% horizontally and 70% vertically.
- **Palette:** 60% near-black `#090A0B`, 30% orange `#FF711C` / `#FF9C43` as light, and 10% off-white `#F5F1E9`. Neutrals are `#242426` and `#85827E`. Do not use blue, green or purple, Matrix rain, or a terminal spam aesthetic.
- **Honesty:** all data is illustrative. Name concepts ("cookies", "redirects"), not real sites. Never present a scene as a real scan or breach.

## QA checklist
- [ ] No frozen stretch longer than 0.5 s (check the per-frame diff in `tools/motion-audit.py`)
- [ ] No strobing: luminance never swings >25% between adjacent frames, except intentionally at the click flash
- [ ] Every string is readable for ≥0.6 s + 0.25 s per word
- [ ] Every transition shares an anchor and overlaps 8-15 frames
- [ ] No text clipping or UI overlap in the contact sheet
- [ ] Palette audit: no hue outside the 15-45° (orange) band above 20% saturation
- [ ] ffprobe matches the spec. Narration and SFX are only claimed if real files exist.
