# Style decisions: JUST A TAP

Authority: `brief/STORYBOARD.md` (story and timing) › `skills/premium-ui-motion-director/SKILL.md` (style) › `brief/REFERENCE_PROTOCOL.md` › `brief/ORIGINAL_LAUNCH_MOTION_SKILL.md`.

## (a) Observed evidence (stills only)
| Observation | Where |
|---|---|
| Hero widgets are **squircles** with large radii (≈5% of width) and a 1px inner hairline. Shadows are soft and tinted by the widget's own colour. | IMG_3124, 3127, 3128, 3129 |
| Numbers carry the hierarchy: a huge integer part, **dimmed decimals**, and a tiny uppercase unit or label. | IMG_3124 (`22,677.45`), 3126 (`2,593.16`), 3127, 3129 (`600 m`) |
| Light lives **inside** the UI as a soft field (bottom amber road light, top violet tab), not as an outer glow. | IMG_3129, 3128, 3127; archive 005, 123 |
| States are tiny and precise: a status pill (`Active`), one selected item in colour with the rest neutral, hairline circular buttons. | IMG_3124, 3128 |
| Detail density is moderate-high, but every element is legible. A single focal value per widget. | all anchors |
| Dark UI objects read best on a light grey canvas, with a soft coloured shadow. | IMG_3124; archive 096, 001 |
| Stacked cards peek out from under a panel. | IMG_3124; archive 026 |

## (b) Art-direction inference
- "Premium" here means *precise anatomy + restraint*, not effects. The references never use particle fields, lens flares or 3D objects for UI. The few 3D objects (archive 041, 045, 115) are posters, not UI.
- Orange works as **inner light** (3129) and as the **single selection colour** (3128's violet disc → our orange).
- Motion should come from **state changes** (focus moving, counters, pills updating, progress) and from **shared-element morphs**, because the stills are dense with states.

## (c) Decisions for this video
| Topic | Decision |
|---|---|
| Canvas | Light scenes: `#F5F2EC` with a broad, slowly drifting warm reflection (bounded, no visible blob edges) and a 48 px micro-grid at 3% ink. Dark scenes: `#101114` with soft amber falloff from below. Light ↔ dark always changes through a **shape mask** driven by a hero element (the NFC glyph, the confirmation panel, the final stroke), never a crossfade. |
| Hero objects | **Card** (ISO 85.6:54 ratio, r 30, dark `#191A1E`, orange field inside, chip, contactless glyph, masked `•••• 4821`) → **phone** (generic slim frame, no notch brand cues) → **terminal UI** (dark squircle, fictional `COFFEE HOUSE`) → **confirmation panel** (cream). All are on a global hero layer with keyframed geometry, so nothing pops at scene cuts. |
| Type | Inter (local OTF, OFL). Display 600 at −2.5% tracking; numerals 600 with decimals at 45% opacity; labels 500 at 18-20 px; micro labels 600 caps at +6% tracking, 13-14 px. |
| Radii | 8 / 14 / 22 / 30 px (+ 56 for the phone). |
| Spacing | 8 px grid with 4 px refinements. |
| Elevation | e1 `0 1px 2px` ink 6% · e2 `0 8px 24px` ink 8% · e3 `0 30px 80px` ink 14% + an orange-tinted ambient shadow under dark objects. |
| Orange | Only for actions, selection, state change and the shared element (glyph → arcs → trace → rail → underline). |
| Data | All fictional and plausible: €24.90 = 2 × Flat white €4.20 + Avocado toast €12.50 + Pastry €4.00. Balance €2,184.60. Time 12:08. No processing-speed or security claims. |
| Rejected | Glass sculptures, photoreal phone, brand marks, skeleton bars, neon, particle storms, generic fades. |
