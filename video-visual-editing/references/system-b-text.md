# System B: Text Inspiration & Text Animations

Typography that appears with speech: hooks, key phrases, numbers, name supers, and full-screen kinetic type.

**Primary references:** TXT-001..TXT-010.
**Captions on live UI frames:** ONS-001, ONS-002, ONS-005.
**Typographic full-screens:** FUL-010, FUL-063, FUL-087, FUL-090, FUL-092.

## The core idea: captions are designed, not transcribed

None of the references show word-for-word subtitles. They show **selected phrases**: 2-6 words, with one word lifted into an expressive voice. Treat text like a graphic that appears when a phrase deserves it, not as a running transcript.

- **Default density:** one designed text beat every ~4-8 seconds of talking, on the phrase that carries the point (the hook, the number, the rule, the payoff).
- If the client explicitly wants full subtitles for accessibility, make them a separate, quiet layer (small white sans, bottom-safe area, no animation beyond a cut). Keep the designed accents as the emphasis layer. Ask before adding both.

## When to use which treatment

| Moment in speech | Treatment | Refs |
|---|---|---|
| Hook / big concept | sans lead-in + large italic serif key phrase (pyramid stack) | TXT-001, TXT-002, TXT-004 |
| Rule with a quantity | asymmetric serif number + sans phrase | TXT-003 |
| Emotional verb / call to action | caps + script word + caps interlock | TXT-009, ONS-005 |
| One keyword | extended caps keyword with thin kicker | TXT-007 |
| Money / stat | big clean number with mint/white gradient, count-up | TXT-008 |
| Opinion statement | heavy tight sans with warm gradient + small sub-line | TXT-006 |
| Guest introduction | name super (plain, boxed, highlight box or serif with hairline) | TXT-002, TXT-006, TXT-008, TXT-009 |
| Magazine intro | giant name behind the subject (needs a matte) | TXT-005 |
| Over a UI beat | 2-3 word white sans above the UI, optional script word | ONS-001..ONS-005 |
| Full-screen sentence | words along glowing paths, or a mixed-weight stack | TXT-010, FUL-063 |

## Design rules (from the references)

1. **Two voices, maximum.** One quiet sans (Inter or SF, 500-600) plus one expressive voice: italic serif, script, gradient bold or extended caps. Never two expressive voices in one beat.
2. **Size contrast of 2-3x** between connector words and the key word. Micro caps can go down to 0.4x.
3. **Interlock the lines.** Tight leading (0.84-0.95). Lines nest into each other, and small words can tuck under or over the big word (TXT-001 "view on", TXT-009 "I WANT YOU TO").
4. **Colour from the footage.** Warm grade means amber `#F2A14A` or gold `#E7A93B` (TXT-001..004, TXT-009). Cool grade means white, mint or cream (TXT-007, TXT-008, ONS-005). Bright daylight means lime `#A6E35A` or dark ink (TXT-005). One accent colour per video section.
5. **Legibility without boxes.** Use a soft glow in the accent hue plus a dark, soft text-shadow. The references never use hard outlines or caption boxes (the only boxes are name tags).
6. **Placement:** centred at 50-62% of frame height, under the chin, over the chest. It may overlap the mic. Name supers go bottom-left (x≈6%, y≈85-90%) or top-right in serif (TXT-009). Keep 6% side margins.
7. **Numbers:** use lining figures (not old-style) and tabular figures for count-ups. Format them the way they are spoken ("30,000ft", "$100,000", "60mins").
8. **Language:** keep the speaker's wording; trim filler and don't paraphrase. Fix capitalisation for style (sentence case for sans, as-spoken for accents).

## Synchronisation with speech

1. Get word timestamps. Use the transcript the user supplies or a local ASR if one is installed (for example `whisper`/`faster-whisper` with word timestamps). Check what is available before promising it.
2. **Connector words** appear on their spoken onset, minus 2 frames.
3. **The key word lands on its stressed syllable.** Start the 0.35-0.45s entrance about 4-6 frames *before* the stress so it resolves on it.
4. **Hold** until the thought ends, at least 1.2s after the last word appears.
5. **Exit** with the phrase: 0.2-0.3s fade and drift, finished before the next designed beat begins. Do not overlap two text beats.
6. Put the timestamps into the template config: `lines[].at` per line, or `lines[].words[{w, at}]` per word.

## Animation vocabulary (pick one per beat)

- **Word-by-word fade-rise** (connector words): opacity 0→1, y 12→0px, blur 6→0, 240ms outCubic, 60-100ms stagger.
- **Blur-to-sharp landing** (key word): scale 0.92→1, blur 10→0, opacity, 380-450ms outQuart.
- **Tracking settle** (tracked lines, micro caps): letter-spacing 0.55em→0.3em while fading in.
- **Mask wipe** (gradient bold): reveal left to right with a soft-edged mask, 250-350ms.
- **Count-up** (numbers): 0→value, 600-900ms outExpo, ending on the spoken number.
- **Box draw** (name tags): the border or highlight box draws or scales from the left, then the text fades in.
- **Path flow** (full-screen sentence, TXT-010): strokes draw and words appear when the stroke head reaches them.

Avoid: bouncing letters, rotating words, per-letter random pops, typewriter on long sentences, emoji stickers, colour-cycling text, and karaoke highlight on every word. None of these appear in the library.

## Implementation

`templates/caption-serif-accent.html` covers the TXT-001..TXT-009 patterns. It supports these line styles: `sans`, `sans-sm`, `serif`, `script`, `bold`, `tracked`, `micro`, plus `nameSuper` (`plain`/`boxed`/`highlight`/`serif`). Example config:

```json
{
  "anchor": {"x": 0.5, "y": 0.58},
  "colors": {"accent": "#F2A14A", "glow": "rgba(242,161,74,.38)"},
  "lines": [
    {"text": "Lower Your", "style": "sans", "at": 0.10},
    {"text": "Resting Heart Rate", "style": "serif", "at": 0.45},
    {"text": "Before Bed", "style": "tracked", "at": 0.95}
  ],
  "outAt": 2.6,
  "nameSuper": {"name": "Guest Name", "role": "Role", "x": 0.06, "y": 0.86, "at": 0.2, "outAt": 2.4}
}
```

Text behind the subject (TXT-005) needs a per-frame subject matte. Check for `rembg`, `backgroundremover` or RobustVideoMatting, or ask the user for a matte or roto pass. Composite in this order: plate, then text, then the matted subject, then any foreground caption.

## Sound design (System D)

Captions are mostly quiet: the voice already says the words. Full rules are in `sound-design.md` §10.

- **Key phrase landing** (serif, script or bold accent): one pop, or a sci-fi click for techier edits, with its transient on the key word's first visible frame (from `--cues`, `measure: visible`), at -7 dB. Skip it on emotional lines.
- **Connector words, exits and micro-drifts:** silence.
- **Letter-by-letter or typewriter reveals:** gears, one emphasis per element. **Large slides from off-frame:** a whoosh on the fastest frame.
- **Name super:** an optional UI click. **A big conclusion phrase:** success reward, sparingly.
- **Never mask the word** the text decorates. The QC dialogue check must pass.

## Quality bar

- [ ] No more than two type voices in the beat, and one accent colour.
- [ ] The key word lands on its stressed syllable (scrub ±3 frames).
- [ ] Readable on a phone at 360px width; the glow/shadow separates text from busy backgrounds.
- [ ] Next to TXT-001 or the chosen reference, the size ratio, leading and glow feel the same.
- [ ] Text never covers the eyes or mouth, and it clears the platform UI zones (bottom 12%, right 12%).
