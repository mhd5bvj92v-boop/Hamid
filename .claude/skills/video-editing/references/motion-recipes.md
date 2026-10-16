# Motion: lifecycle, tokens, recipes, transitions

Load this when you animate a scene. Values are house starting points (`src/kit/motionTokens.ts`): tune them on a rendered preview, never accept them blindly.

## Lifecycle

**Prepare** (only when it helps) → **Enter** → **Settle** → **Read / live hold** → **Transform** or **Exit**.

- **Hold:** essential text and UI stay still and crisp. One subordinate layer keeps life: a slow light drift, a ticking value, a gentle camera move.
- **Still hold:** an intentional still hold is allowed. Mark it in the scene brief (`stillHold`).
- **One dominant action at a time:** supporting actions are staggered around it, ambient motion stays quieter.
- **Properties per event:** one main motion property plus one or two supporting ones. Never everything at once (translate + opacity + scale + rotate + glow + blur + bounce).

## Timing (`DUR`)

| Action | Seconds |
| --- | --- |
| UI feedback | 0.12–0.22 (0.17) |
| Label / short text | 0.22–0.38 (0.30) |
| Card / panel | 0.35–0.65 (0.50) |
| Hero reveal | 0.6–1.0 (0.80) |
| Exit | 0.18–0.40 (0.28) |
| Stagger | 0.04–0.09 per item (0.06), total capped at 0.4 (`staggerAt`) |
| Ambient cycle | 6–14 s (10) |

- Convert to frames with the composition fps.
- `allocatePhases(total, enter, exit, minHold)` shrinks enter and exit before it eats reading time. A tiny segment gets a quick fade; a zero-length one is a step.
- Never lengthen the locked edit.
- `local(t, a, b)` gives clamped progress; coincident boundaries are a step (no division by zero).

## Curves and springs

**Curves:** `CURVE.arriveGently` (outQuart), `arriveFirm` (outExpo), `arriveSoftSettle` (≤1.5 % overshoot), `leaveDecisively` (inCubic), `leaveSoft`, `travel` (inOutCubic), `constant` (linear for progress).

**Springs:** `SPRING.preciseUi`, `softUi`, `emphasis`, for remotion `spring()`. Tune damping and stiffness per role; never one spring for everything.

**Keep opacity separate:** opacity has its own envelope, clamped 0..1. A bouncy position curve never drives alpha.

## Direction

- **Progressive default:** enter right → settle → exit left; left → right; bottom → up for progression.
- **Return** (the exit reverses the entrance) is a deliberate choice: a cancelled action, a drawer closing.
- **Off-screen distance** comes from the element's real bounds plus its glow (`DirectionalCard` `travel: "offscreen"`).
- **Stage edits** use short in-frame travel with opacity (§3c of premium-motion.md).

## Scale, rotation, origin

- **Scale:** UI scale stays in 0.96–1.00. A larger range only for a motivated object or icon reveal.
- **Origin = cause:** a popover grows from its trigger, a dropdown from its button, a detail panel from the selected row.
- **Rotation:** a few degrees for physicality, returning to a readable orientation.

## Recipes (kit kinds)

| Kind | Behaviour | Constraint |
| --- | --- | --- |
| `DirectionalCard` | Arrive, settle, ONE state change (`status.from → to`, optional `statusIcon: {from, to}` from `MORPH_SHAPES`: ring, check, dot, arrow), continue out (`exit: "return"` to go back) | Text holds still; the exit clears card, shadow and glow |
| `Popover` (`variant: "popover"`) | Trigger appears, is pressed, the popover grows from it with 1–3 rows, returns into it | Trigger, origin and destination stay readable |
| `Popover` (`variant: "notification"`) | A notice arrives at the top of the safe area, is read, clears upward | Clear of platform zones |
| `KineticText` | Phrase / line reveals (12 styles) | Keep word groups; mask with room for accents and descenders |
| `StatCard` | Counter + curve on a glass card | Values and units exact |
| `UiCard` (glass) | Rows of interface items | Plausible labels, no fake micro-dashboards |
| `AssetScene` | The user's object staged with light | 3D objects come from the user |
| `FocusBacking` (`src/kit/focus.tsx`) | Local scrim and blur behind a graphic over footage | Fades with the graphic; the presenter stays sharp |

A recipe is a starting construction. Recompose it for the sentence and the reference.

## Transitions

| Transition | Use |
| --- | --- |
| Clean cut | A new thought |
| Match cut | Related shape or object: align the anchor, scale and direction at the boundary |
| Shared object | The same thing changes state: one owner per frame, no duplicate during the handoff |
| Mask wipe / occlusion | An object naturally covers the view |
| Directional carry | Progression: outgoing and incoming vectors and speeds match (the stage flow) |
| Dissolve | A soft change: check the midpoint for overlapping text |
| Camera reveal | Revealing more space explains the relation |

Inspect the midpoint as well as the endpoints. Never use `TransitionSeries` overlaps on the locked timeline: they shorten it. Use fixed-position sequences.

## Diagnosis (fix the cause, one thing at a time)

| What looks wrong | Fix |
| --- | --- |
| Lifeless | Give the scene a real change and a result |
| Floaty | Firmer stops, less spring |
| Robotic | Shaped acceleration and selective overlap |
| Busy | Sequence the actions, quiet the background |
| Hard to read | A stable hold before decoration; contrast; line breaks |
| Cheap pop-in | Smaller displacement, anchored origin |
| Unfinished exit | Clear every part (glow, shadow) before the sequence ends |
| Jerky transition | Match position, scale and velocity at the handoff |
| Muddy glass | Fewer layers, a clear edge |
| Washed-out glow | Crisp core, less diffuse energy |
| Background steals focus | Lower the one parameter at fault |
| Interchangeable cards | A different visual relationship for the sentence |
