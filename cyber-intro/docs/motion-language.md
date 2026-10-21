# Motion language: "The Internet Looks Different Now"

This motion language is drawn from **still** references (`reference-database.md`). Every motion rule below is our own design decision. None of it was observed in a source video. Where a still suggested a principle, the reference ID is cited.

## 1. Principles taken from the stills (observed)
| Principle | Seen in | How we use it |
|---|---|---|
| One luminous focal object on near-black, large negative space | 023, 051, 095, 131 | Every scene has exactly one hero surface; everything else is ≤40% luminance |
| Frosted glass: light sits *behind* translucent panels and bleeds through the lower edge; a fine top highlight | 005, 042, 075, 123 | `Card.tsx` and `Browser.tsx` are glass (`backdrop-filter`), with warm light beneath. A single global keynote-style `Background.tsx`. |
| Thin luminous paths | 008, 033, 054, 104 | Connection paths are 1.5-2px orange hairlines carrying a 3.5px solid dot. No bloom halos (removed in revision 2 as too gimmicky). |
| Small rounded floating panels in a shallow depth stack | 005, 012, 026, 058 | Max 3 depth planes; parallax ratio 1 : 0.6 : 0.3 |
| Edge-lit input/pill bar as an entry point | 123, 096, 089, 039 | Scene 1 address bar |
| Node-to-node flow with travelling light | 125, 062, 107, 126 | Scene 3 network |
| Centred headline under a thin horizon or line | 087, 095, 116 | Scene 6 thesis composition |
| Below-the-surface metaphor | 083 | Scene 3 dive *through* the page |

## 2. Rules (our decisions)
1. **Frame-pure.** All motion is computed from `useCurrentFrame()` via `interpolate`, `spring` and `Easing`. Nothing uses CSS animations, timers, `Math.random` or mutable state. Variation comes from `seeded(n)` in `src/theme.ts`.
2. **Easing palette.** These are deliberately not all the same:
   - camera / layout: `Easing.bezier(0.65, 0, 0.35, 1)` (inOutCubic-like), 0.6-1.2 s
   - entrances: `spring({damping: 16, stiffness: 140, mass: 0.8})`, which overshoots about 3%
   - press / toggle: `spring({damping: 12, stiffness: 260})`, quick and with a visible settle
   - exits: `Easing.bezier(0.4, 0, 1, 1)` (accelerating), 0.2-0.35 s
   - path draw: `Easing.bezier(0.33, 0, 0.2, 1)`, a fast start that settles softly
3. **Timing.** Major entrances last 21-39 frames (0.35-0.65 s). Exits last 12-24 frames. Sibling stagger is 3 frames for cards and 6 frames for rows.
4. **Ambient life, not bounce.** During a hold, only *two* things move: the camera drift (≤1.5% scale, ≤12px translate) and one glow breathing at 0.25-0.5 Hz with ±8% opacity. Text never floats.
5. **Overlap.** Each scene's outgoing anchor stays alive 8-15 frames into the next scene (`OVERLAP` in `storyboard.ts`).
6. **Readability.** Copy holds for at least 0.6 s plus 0.25 s per word at full opacity. Body UI text is ≥22px and labels are ≥18px at 1080p. Off-white on near-black meets a contrast ratio of 17:1.
7. **Colour.** The page is near-black `#090A0B`. Orange (`#FF711C` / `#FF9C43`) appears only on light, accents and the single focal element. Off-white `#F5F1E9` is reserved for primary text and the hero surface. Blue, green and purple are not used.
8. **Blur budget.** Blur comes only from glass panels (`backdrop-filter`). Light fields are radial-gradient divs. There are no SVG blur filters and no glow orbs.
10. **Apple restraint.** Use sentence-case type, SemiBold, and tight tracking. Primary actions are white pills. Orange is the light, not the paint.
9. **Honesty.** All data is illustrative. Labels describe *concepts* (cookies, redirects, permissions). They never claim a real site is tracking anyone.
