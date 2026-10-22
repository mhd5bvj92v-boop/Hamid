# MASTER BRIEF — premium contactless UI motion

## Objective
Build a visually original 20-second fast, fun, premium UI motion design video for the topic **contactless payment**, with Claude Code + Opus 5.5 if available + Remotion. The viewer should enjoy the animation, not receive a boring technical lecture. Style: premium detailed UI animation, NOT empty SaaS placeholders and NOT photoreal 3D product advertising.

## Authority order
1. `STORYBOARD.md` governs story, scene order, durations and VO guide.
2. `SKILL.md` governs visual style, art direction, animation quality and QA.
3. `REFERENCE_PROTOCOL.md` governs reference ingestion and documentation.
4. `ORIGINAL_LAUNCH_MOTION_SKILL.md` provides legacy technical conventions when consistent with above.

## Design system
Colors: canvas `#F5F2EC`, ink `#101114`, orange `#FF762B`, deep orange `#D9571A`, highlight `#FFC39E`, cream `#FFFCF7`, neutral `#B9B3AC`, white `#FFFFFF`, dark surface `#191A1E`. Typography: Inter or equivalent licensed locally; coherent weights and tracking. Radius scale: 8/14/22/30 px; spacing 4/8/12/16/24/32/48. Thin borders, intentional elevation, precise padding. Warm off-white majority, dark for contactless pulse and end card. Background ambience is a supporting layer, never the main attraction.

## Motion implementation
Single global 1200-frame composition at 60 fps. Shared hero geometry across scenes. Use scene components and global transition layers so hero objects don't pop at boundaries. Frame-deterministic animations using Remotion `interpolate`, `spring`, `Easing`; SVG stroke paths and masks where helpful. Easing must be purpose-specific. Overlap exits and entrances. Animate UI data changes, selection states, progress, cursor/gesture and subtle ambient movement. Keep any one large message readable around 1–1.5s; when multiple UI elements persist, choreograph them rather than freezing them.

## Detailed process
1. Inspect project files and dependencies; select Opus 5.5 only if present. Read all bundle documents.
2. Extract `references/original_inspiration.zip`, inventory, hash deduplicate and visually inspect unique images. Also inspect six `IMG_*.jpeg` UI examples. Record observed visual qualities; separately hypothesize motion. Do not pretend stills are videos.
3. Create `docs/reference-database.md`, `docs/style-decisions.md`, `docs/shot-list.md`, `docs/animation-curve-map.md`, and `docs/render-QA.md`.
4. Design polished still comps for frames 60, 210, 360, 510, 660, 810, 960, 1110. Inspect whether the UI is detailed and art-directed, and redesign anything that looks like generic template cards.
5. Build frames 0–299, including shared morph from card into phone/wallet. Render a 5-second proof and inspect 10+ frames and actual playback. Fix stutter, alignment, masking, text, transitions and overdone effects.
6. Implement the remaining storyboard, render keyframes and frame-boundary triplets for all scene changes. Build a contact sheet.
7. Render MP4 H.264 yuv420p 1920x1080 60fps, target quality CRF 16–18. Verify duration 20.0s, expected 1200 frames, valid codec, correct fonts, no blank frames, no out-of-bounds text and no unexpected frozen shots.
8. Deliver verified MP4 path, project changes, contact sheet, brief QA report, and one or two clear follow-up improvements. Never claim completion if rendering failed.

## Non-negotiables
No brand/trademark imitation. No flat skeleton placeholder UI. No neon cyberpunk. No random 3D glass sculptures. No unmotivated cuts, repetitive fade transitions, accidental linear movement, perpetual bouncing, or generic particle fields. No inaccurate payment-processing claims. No externally fetched fonts/assets at render time. No fabricated recorded voiceover.
