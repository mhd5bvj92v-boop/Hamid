# Motion & Animation Philosophy

The references are stills, so motion is always a creative inference. This document fixes the *house motion style* so those inferences stay consistent and premium.

## Philosophy

Every animation needs a reason to exist. Before animating anything, answer: *what does this movement tell the viewer?* Valid answers:
- **Arrival:** something new enters the conversation.
- **Emphasis:** this is the important part (a number lands, a node glows).
- **Causality or flow:** A leads to B (line draws, connector travels, scribble becomes cube).
- **Change over time:** count-ups, fills, growth.
- **Transition:** we are moving to a new section.

If none applies, it should not move. Sometimes the strongest decision is to keep the speaker on screen with nothing added.

**Prioritise** smooth, purposeful motion, natural timing, one action at a time, light as motion (glows igniting, sweeps), and camera moves that are slow and singular.
**Avoid** generic template moves, excessive zoom, random bounce or elastic overshoot, spinning, shake, glitch, cheap transitions (star wipes, spins, 3D cube flips), effects on every word, and motion that competes with the speaker's gestures.

## Timing (at 30 fps; scale proportionally for 24/60)

| Action | Duration | Easing (`templates/_runtime.js`) |
|---|---|---|
| Small UI element enter | 240-320 ms (7-10 f) | `outCubic` |
| Hero card / modal enter | 350-450 ms | `outQuart` |
| Key word landing | 380-450 ms | `outQuart` (scale 0.92→1, blur 10→0) |
| Stagger between list items | 60-120 ms | n/a |
| Line / connector draw | 600-1200 ms | `inOutCubic` |
| Count-up | 600-1100 ms | `outExpo` (fast start, gentle settle) |
| Sequential fill (grid cells) | 800-1400 ms total | `inOutSine` |
| Light ignite / bloom pulse | 200-300 ms up, 500-700 ms decay | `outCubic` / `inCubic` |
| Exit (all together) | 200-300 ms | `inCubic` |
| Camera push on full-screen | whole shot, 3-5% scale | `linear` or `inOutSine` |
| Full-screen reveal (sunrise, light) | 1.2-1.8 s | `outQuart` |

Rules:
- **Overshoot:** none by default. The `settle` easing is the maximum (a barely visible settle). Never use elastic or bounce.
- **Blur:** entering elements resolve from 6-10px blur. This is the house "premium" signature, because it reads as focus-pull, not fade.
- **Distance:** rises are 10-30px at 1080w. Large travel looks cheap.
- **One thing at a time:** within a beat, sequence the actions (card enters, then line draws, then number counts). Don't fire them all at once.
- **Hold:** content stays still long enough to read it: about 0.3s per word, at least 1.2s.

## Transitions

| From → To | Default | Section-change option |
|---|---|---|
| Talking head → full-screen | hard cut on a speech beat | 8-frame blur + brightness dip; light-streak flash (FUL-006, FUL-012); portal rise (FUL-093) |
| Full-screen → talking head | hard cut | soft defocus (FUL-060 style blurred bars) |
| Overlay in/out | element enter/exit only, the plate is untouched | `--focus` dim/blur ramps 0.3s |
| Full-screen → full-screen | match-cut on shape (arc → arc, circle → orb) | light sweep across the frame |

Rules: transitions last ≤10 frames unless they are a section opener. The cut happens on the consonant or beat of speech, not mid-word.

## Camera language for full-screen scenes

- One move per shot: a push-in (most common), a lateral drift (data/forecast), a tilt reveal (iceberg ONS-028: start on the tip, tilt below the waterline), or a slow orbit (3D numerals, glass objects).
- Depth: 2-4 parallax layers moving at different rates sell 2.5D (background slowest).
- Rack focus: to point at the "different" object (FUL-017 blue king, FUL-043 clay figure).

## Syncing sound to motion (System D)

- **Whooshes:** the sound's **loudest point** sits on the movement's **fastest frame**. With this skill's easings, out-curves (`outCubic`/`outQuart`/`outExpo`) are fastest at the start of the move and in-out curves at the midpoint. Prefer the value measured by `render_html.js --motion`.
- **Textures:** the sound's **transient** sits on the **first visible frame** of the pop or reveal, or on the frame the state changes.
- **Risers:** they **resolve on the transition frame**, with a hit's transient on the same frame. Lead cut-transition sounds by 2-3 frames only when they're not peak- or event-locked.
- **Motion and sound are one design.** When an animation is re-timed, re-run `--motion/--cues` and re-render the sound. QC flags anything more than 1 frame off.

## Syncing motion to speech

1. Mark the stressed words and the sentence boundaries in the transcript.
2. The key action resolves *on* the stressed syllable, so the entrance begins 4-6 frames earlier.
3. Exits finish before the next idea's first word.
4. If the speaker gestures (hands pointing or counting), align the element with the gesture direction and timing (in ONS-004 the speaker's open hand sits right beside the calendar card; the UI and the gesture share one zone without overlapping).
