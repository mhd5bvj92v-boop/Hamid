# System A: On-Screen Visuals (speaker stays visible)

Graphics that share the frame with the talking head. They support the explanation while the speaker keeps eye contact.

**Primary references:** the five live composites ONS-001..ONS-005. These are the only references in the library that show graphics *on real footage*, so treat them as the ground truth for placement and scale.
**Element references:** ONS-006..ONS-079. These are elements designed on plain backgrounds; lift the element and place it on footage using the rules below.

## When to use

Use System A when the speaker says something that a viewer would understand faster *by seeing a familiar object*, and the speaker's face and delivery still matter:
- a number or result ("1,262 editors", "400% conversion"): ONS-002, ONS-024, ONS-050
- a list of 2-4 items (clients, tools, features): ONS-001, ONS-016, ONS-055, ONS-042
- a process or state in a product (inbox, calendar, checklist, prompt): ONS-003, ONS-004, ONS-077, ONS-034
- a comparison (A vs B): ONS-031, ONS-073
- a relationship or flow (you → clients, inputs → product): ONS-001, ONS-022, ONS-071

**Do not use it** when:
- the sentence is emotional or personal (keep the face, maybe add a caption accent only);
- the idea needs the whole frame to land (use System C);
- a visual was already on screen within the last ~4 seconds and this beat is not a new idea.

## How to design it

1. **Find the free zone.** Look at the actual frames (extract them with `scripts/compose.py frames`). The face plus 10% margin is forbidden. In the references, UI lives in the **55-85% height band**: over the chest, beside or over the mic, never over the eyes or mouth.
2. **Choose a real-world container:** list chips, a message card, a calendar, a widget, a stat card, a prompt bar or an app tile. Prefer the plainest object that carries the idea (ONS-003 uses two messages, not a dashboard).
3. **Size it for a phone.** At 1080x1920 the references use UI titles of ~30px, body ~24px, and chips about 40-45% of frame width (ONS-001). Panels for messages or calendars span 45-70% of the width (ONS-003, ONS-004). If text is under ~20px at 1080w it is unreadable on a phone; cut words instead of shrinking.
4. **Match the footage.** On dark, warm studio footage use dark-glass UI (`rgba(22,23,28,.86)`) with one blue accent (LIVE-UI family). On bright footage use FROST-LIGHT or NEUMORPHIC-LIGHT elements (ONS-018, ONS-035, ONS-065) or darken the plate locally.
5. **Separate it from the plate** in this order of preference:
   1. the footage's own dark lower area (most of ONS-001..005);
   2. the element's own shadow and hairline border;
   3. a bottom vignette or local darkening;
   4. a full-frame dim and blur (`--focus start:end:0.6:6`), only when the graphic is large or busy.
6. **Pair with a caption only when it helps.** The live references pair every UI beat with a 2-3 word caption above it ("to posting" plus a calendar). The caption names the idea and the UI proves it. See System B.
7. **One accent, one focal point.** Exactly one element is "active" (glowing border, blue fill or highlighted card). Everything else stays neutral.

## Placement map for 9:16 talking heads (measured from ONS-001..005)

| Zone | Height band | Contents |
|---|---|---|
| Face | 15-48% | nothing |
| Caption | 48-58% | 2-4 words, centred below the chin |
| UI | 58-85% | cards, lists, grids, widgets; left, right or centre of the mic |
| Bottom safe | 85-100% | keep clear: platform UI overlaps here (the references show a logo bubble at the bottom-left) |

For 16:9 talking heads with the speaker off-centre, put the UI on the empty side at 55-65% of the frame width, vertically centred on the speaker's shoulder line. This is inferred; no 16:9 live reference exists yet.

## Motion (see `motion.md` for curves)

- **Enter:** fade, a 12-22px rise and 6-8px blur to sharp over 250-400ms (outCubic). Lists stagger 60-120ms per item.
- **Emphasis:** a single action per beat, such as a counter ticking, cells filling, a line drawing, a border lighting up or a cursor click. Sync it to the stressed word.
- **Exit:** all elements together over 200-300ms (fade plus 8-10px drift), or a cut on the next scene change. Never let elements trickle out.
- **Duration:** on screen for the length of the idea, usually 2-4s. Under 1.2s nothing is readable.

## Implementation

| Need | Template / tool |
|---|---|
| list chips, message cards, "You" node with connector | `templates/live-ui-list.html` (ONS-001, ONS-003) |
| calendar, streak or progress grid | `templates/progress-grid.html` (ONS-004) |
| big stat with glowing curve | `templates/stat-card.html` (ONS-024, ONS-050) |
| AI prompt typing | `templates/ai-input-bar.html` (ONS-034, ONS-044) |
| anything else | copy the closest template and keep `_runtime.js` / `_ui.css` |

Render a transparent sequence with `node scripts/render_html.js`, then composite it with `python3 scripts/compose.py overlay --layer seq@START [--focus ...]`. For editor handoff, encode ProRes 4444 with `compose.py encode --out x.mov`. Full commands are in `implementation.md`.

## Common mistakes

- Covering the mouth or eyes, or letting a card cross the chin line.
- Dashboard overload: 3 or more charts on one card is a FUL-scene idea, not an overlay.
- Tiny text: ONS element references are designed at desktop scale and must be scaled up roughly 1.4-1.6x for 9:16 (the templates expose `uiScale`).
- Third-party watermarks copied from references (ONS-019 contains one; never reproduce it).
- Inventing data and presenting it as fact. Use the speaker's numbers or clearly illustrative UI.
- A new colour per overlay. Keep one accent per section.
- Overlays on every sentence. In the live references the graphics are frequent, but each one maps to a concrete noun the speaker says.

## Quality bar

Pass all of these, then run `quality-control.md` → System A checklist:
- [ ] The face is fully visible in every frame of the overlay (check frames at enter, mid and exit).
- [ ] All text is readable at phone size (view the frame at 360px wide).
- [ ] Side-by-side with the chosen reference (`scripts/compare.py`), the scale, surface, radius and accent feel like the same family.
- [ ] Motion starts on the right word, within ±3 frames.
