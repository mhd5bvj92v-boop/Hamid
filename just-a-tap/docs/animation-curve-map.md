# Animation curve map

| Behaviour | Curve | Duration | Used for |
|---|---|---|---|
| Camera push / track | `bezier(0.65, 0, 0.35, 1)` slow in-out | 0.8–2.5 s | every camera rig; push ≤ 4%, tilt ≤ 3° |
| Tactile UI entry | `spring(damping 16, stiffness 170, mass 0.7)`, one ~3% overshoot | ~0.45 s | panels, rows, pills, terminal |
| Settle / heavy | `spring(damping 22, stiffness 110)` | ~0.7 s | card tilt settle, end capsule |
| Press | `spring(damping 13, stiffness 300)`, scale 1 → 0.96 → 1 | 8–12 f | focus ring hops, row selection |
| Fast exit | `bezier(0.5, 0, 0.75, 0)` ease-in | 0.18–0.35 s | panel content, rows leaving |
| Shared morph | `bezier(0.7, 0, 0.2, 1)` expo-ish in-out | 0.6–0.85 s | panel → phone, rail → panel |
| Travel on arc | in-out bezier on the *parameter* of a quadratic Bézier path | 0.5–0.9 s | glyph flight, phone glide, focus ring |
| Counter | `bezier(0.16, 1, 0.3, 1)` ease-out | ~1 s | €24.90, balance |
| Line / path draw | `bezier(0.33, 0, 0.2, 1)` | 0.4–1.2 s | arcs, traces, check, underline, stroke |
| Ambient | sine, 0.05–0.1 Hz, ≤ 6 px / ≤ 1% | continuous | background light, idle phone float |

Stagger: 2–4 frames for repeated items. Overlap: each next action starts in the last 15–25% of the previous one.
