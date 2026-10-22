---
name: premium-ui-motion-director
description: Create premium, detailed, playful Apple-inspired UI motion videos with Claude Code and Remotion, including reference analysis, art direction, connected transitions, and render QA.
---
# Premium UI Motion Director — Persistent Style

## Style identity
**UI-first. Rich minimalism. Fast, fluid, readable, detailed, intentional.** An elevated product-interface motion style inspired by the user's references: dark calendar, navigation widget, glowing metrics tiles, translucent profile UI, stacked banking UI and restrained finance graph. Use their *quality and design principles*, never clone the layouts. Apple-inspired polish is an adjective, not permission to copy Apple UI or logos.

## The exact sweet spot
Avoid BOTH extremes:
- TOO SIMPLE: generic white rectangles, three skeleton lines, empty dashboard cards, random gradient blobs, default icon packs, disconnected entrance presets, basic circle/checkmark on empty background.
- TOO EXTRA: 3D glass sculptures, physically rendered payment cards, spinning cinematic devices, huge lens flares, exaggerated neon, photoreal product commercials, excessive abstract effects.
- TARGET: believable finely designed UI, rich micro-details, responsive states, clear hierarchy, carefully art-directed shadows/gradients, modest 2.5D layering, exceptional motion choreography.

## UI craft rules
Every hero component must have purposeful content and design anatomy: clear labels, plausible numbers, hierarchy, internal spacing, coherent corner radii, 1px dividers/strokes, small contextual icons, states, focus hierarchy, meaningful interaction feedback. Do not use placeholder skeleton bars as the final UI. Build coherent design tokens: spacing 8px grid with 4px refinements, typography hierarchy, consistent radii, opacity and elevation system. One primary focal element at a time; supporting details stay legible.

## Palette
Warm canvas #F5F2EC, ink #101114, orange #FF762B, deep-orange #D9571A, soft-orange #FFC39E, cream #FFFCF7, neutral #B9B3AC, surface #FFFFFF, dark-card #191A1E. Orange = meaningful actions, state changes and shared-element transitions. Use predominantly warm off-white for opening and information, near-black for NFC moment and closing; don't use a literal 30% orange pixel quota. Derive tints and alpha from these tokens, avoid additional accent colors.

## Backgrounds
Backgrounds support UI; they must NOT be the design. Off-white with broad slowly drifting warm orange reflected light, fine low-contrast curves or micro-grid; near-black with controlled soft amber illumination and slight edge falloff. Optional gentle parallax. Avoid obvious circular gradient blobs, thick ribbons, contour line wallpaper and gratuitous glow.

## Motion direction
Frame-deterministic, continuous but not restless. The viewer should feel movement across the whole timeline, while the currently readable element may hold stable. Create movement through shared-element morph, camera drift, light shift, cursor/gesture, counters, progress, micro-interactions and stagger. Fast actions 0.18–0.55s; hero transformations 0.45–0.85s; important text readable ~1.0–1.5s. Multiple UI components can persist longer with meaningful independent motion. Do not make every object wobble.

## Easing
Different physical behaviors get different curves: camera slow ease-in-out, tactile UI spring with one controlled overshoot, fast ease-in exit, bezier arc for travel, ease-out counters, path interpolation for lines. Avoid linear hero moves, indiscriminate bounce, repeated elastic wobble, frame jumps, generic fade between unrelated scenes. Stagger repeated elements by 2–4 frames at 60fps, overlap successive actions in the last 15–25%.

## Transitions
Track a *persistent shared visual element* across each boundary: card edge becomes phone frame; phone's wave icon becomes NFC arcs; outer NFC arc straightens into UI connection path; path reveals approval panel; confirmation underline becomes a selection rail; selection rail becomes final typographic underline. Use real geometry when compatible, or masks/shared coordinates for incompatible geometry. Crossfades only as invisible supporting layers, never as the main transition.

## Camera and depth
2D/2.5D UI with small perspective tilt, shadows, layer separation and micro-parallax. No forced photoreal 3D. Camera motion must preserve legibility and visual balance. Use restrained 1–4% pushes, subtle 2–5 degree tilt where meaningful. Parent related UI under a shared camera rig. Avoid full-screen camera whips and motion blur that obscures text.

## Reference workflow
Enumerate all files, detect duplicates, classify by visual type, then describe observed colors, hierarchy, typography, spacing, shadows, lighting, components and detail density. For stills, label all motion suggestions as *proposed*, not observed. Create `docs/reference-database.md` and `docs/style-decisions.md`. Compare design direction against original six references and extracted archive. Do not claim to have watched video where only stills exist.

## Source skill rules retained
Keep deterministic frame math, scene/storyboard-first approach, center-relative layout, font-loading verification, stagger, overlap, click compression, curved cursor motion, camera rig, render stills, final MP4 verification, boundary checks and smallest-change revision policy from ORIGINAL_LAUNCH_MOTION_SKILL.md. Adapt the original launch-ad CTA framework: this is a creator's motion test, not a SaaS sales pitch.

## Remotion engineering
React + TypeScript + Remotion. Use useCurrentFrame, useVideoConfig, interpolate, spring, Easing, SVG and CSS transforms. No CSS animation/transition, unseeded randomness, timers, live requests, or frame-dependent DOM measurements. Shared palette/copy/timings/easings in config. Fonts loaded before rendering. Performance: limit full-frame blur and filters, prefer bounded gradients, transforms, opacity and reusable SVG components. Keep all important elements within safe margins.

## QA gate (mandatory)
First approve designed static frames: is the UI rich, coherent, believable and beautiful WITHOUT animation? Then animate. Render 0–5s proof, inspect at least 10 frames + boundary frames and play the proof. Reject if it looks like a template, if hero UI is placeholder-like, if transitions are disconnected, if any scene freezes, if there is too much 3D, if labels are unreadable or if movement stutters. Render full sequence and inspect transitions +/- 3 frames and final frame. Do not report success without checking file existence and video duration.

## Scorecard
Rate 1–5: UI craftsmanship, design consistency, reference fidelity (principles not copying), motion quality, transition logic, typography, pacing, restraint, performance. Anything under 4 requires revision.
