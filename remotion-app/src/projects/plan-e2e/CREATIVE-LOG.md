# Creative decision log: plan-e2e

Creative Director: the user. Generated from `edit.json` (the project file the Studio, the Remotion Player and the renderer use).
Source: `my-cut.mp4` (14.00 s, 30 fps; timeline preserved, never cut).
Phase: **4-animation-preview**. Updated 2026-10-14T18:31:39.

## Approvals

- **direction** (2026-10-14T18:31:39): "Direction approved (scene planning test)"

## Constants for the whole edit

- captionStyle: Montserrat 600 white, one key word in the accent font
- captionPosition: under-chin
- captionCase: as-spoken
- accentColor: #ff4d57
- secondaryColor: #F2A14A
- accentFont: Instrument Serif
- uiStyle: dark-glass
- transitions: fade-rise with blur clearing in; quick fade out; hard cuts in and out of full-screen scenes
- soundDensity: standard
- music: False
- notes: Security brand: calm, precise, no stock hacker clichés.

## Scenes

| Scene | Time | Spoken text | Scene type | Plan (what happens on screen) | Decision | Build | User |
|---|---|---|---|---|---|---|---|
| S01 | 00:00.5-00:03.6 | "Most companies find out about a breach months too late" | Captions Only | approved: Caption under my chin. Small white words 'Most companies find out about a breach', then 'months too late' lands big in the red accent serif. | open | v1 built |  |
| S02 | 00:04.1-00:07.5 | "Our system flags suspicious logins in under two seconds" | Captions + UI | approved: - | A (Claude Concept): Flagged login toast (ONS-041) | v1 built |  |
| S03 | 00:08.3-00:11.2 | "So attackers get locked out before they touch your data" | Fullscreen | approved: Full screen: black background. The words LOCKED OUT type in one letter at a time in big red monospace letters, with a blinking cursor.
After the last letter a padlock icon snaps shut under the text.
Leave with a quick glitch (2-3 frames of horizontal slices jumping sideways), then cut straight back to me.
Sound: a soft keyboard tick per letter and one heavy lock "clunk". | open | v1 built |  |
| S04 | 00:11.8-00:13.0 | "That is real protection" | Halfscreen | approved: Lower half: a dark panel with 'real protection' as the headline, three check rows from my earlier lines; I stay visible on top. | open | v1 built |  |

## Claude Concepts (all rounds)

**S02 round 1**
- A — Flagged login toast [A · to build · ONS-041 · claude]: Dark-glass login notifications stack beside you in the lower UI band, like a real security console. Two calm sign-ins arrive first; on "suspicious logins" a third toast drops in with a red status rim and a FLAGGED tag, pushing the others down.
- B — Under-two-seconds timer pill [A · to build · ONS-056 · claude]: A single red neon pill beside you turns the claim into a clock: a stopwatch runs and freezes before it reaches 2.0, then the pill reads "< 2 s · flagged". It uses only your words (no invented exact time).
- C — Unknown-location ping [A · to build · ONS-079 · claude]: A small dark map widget shows where sign-ins come from. Your usual location pings softly; then a far-away dot appears, a thin line connects it, and it turns red with a "suspicious" label.

## Built versions

- S01 v1 (active): CaptionAccent from claude via REQ-0003, built (2026-10-14T18:30:16): Built from the approved scene plan (Captions Only) with the kit's CaptionAccent kind, which already does exactly this layout; accent colour and accent font from the constants for the whole edit.
  - [x] caption under my chin — CaptionAccent default anchor (58% of the height), the speaker stays visible
  - [x] small white words 'Most companies find out about a breach' — two sans-sm lines in white, 0.1 s and 0.7 s into the scene
  - [x] then 'months too late' lands big in the red accent serif — serif line at 1.95 s (on the spoken words), Instrument Serif in #FF4D57
  - [x] constants: accent colour, accent font, caption position — accent #FF4D57, Instrument Serif, under the chin
- S02 v1 (active): LoginAlertStack from claude via REQ-0002, built (2026-10-14T18:30:46): Concept A on a Captions + UI scene: LoginAlertStack with its caption line (new optional prop; without it earlier versions render as before).
  - [x] enter: two neutral toasts with a green dot slide down one after the other, fading in and de-blurring — calmPose: 0.34 s outCubic slide from -26 px, blur 7 -> 0, 0.25 s stagger
  - [x] move: the red 'Suspicious sign-in' toast drops in on top on "suspicious logins" and pushes the stack down — alertPose.push moves the calm toasts down by one toast height; alertAt 1.1 s
  - [x] move: the red rim pulses once — one 0.7 s sine glow on the red rim after landing
  - [x] move: a FLAGGED tag stamps in with a small scale pop — tag scales 1.45 -> 1 and fades in 0.42 s after the drop
  - [x] exit: the whole stack slides up a little and fades out together at the end of the line — shared exit at outAt 3.2 s: -18 px and fade over 0.3 s; ends at 7.70 s
  - [x] placement: lower UI band beside the speaker, face never covered — centred at 70% of the height (UI band 58-85%)
  - [x] style: dark-glass toasts as in ONS-041 — kit dark-glass surface, hairline border, status dots
  - [x] sound: soft UI tick per neutral toast, sharper alert click on the red toast — sound intents 'toasts' and 'alert' become SFX items on the SFX track; the sound library is empty, so they have no sound asset yet (shown as missing)
  - [x] scene type Captions + UI: a caption with the UI — caption 'flags suspicious logins' above the stack, 'suspicious' in the alert red
- S03 v1 (active): LockdownTitle from claude via REQ-0004, built (2026-10-14T18:31:15): New kind LockdownTitle (src/kit/custom/) for your own idea (D). JetBrains Mono Bold is bundled from npm for the monospace letters. The scene covers the footage from 8.30 to 11.20 s; your footage and dialogue keep running underneath.
  - [x] full screen, black background — System C full-screen scene on pure black, covering 8.30-11.20 s
  - [x] the words LOCKED OUT type in one letter at a time — one letter every 0.085 s from 0.15 s (10 characters, done by 1.0 s)
  - [x] big red monospace letters — JetBrains Mono Bold 126 px (inside the 6% side margins), #FF3B3B with a soft red glow
  - [x] with a blinking cursor — block cursor follows the typing, then blinks every 0.5 s
  - [x] after the last letter a padlock icon snaps shut under the text — padlock fades up under the text, its shackle drops shut 0.18 s after the last letter with a small squash
  - [x] leave with a quick glitch (2-3 frames of horizontal slices jumping sideways) — the last 0.1 s (3 frames at 30 fps): 8 horizontal slices shift sideways, different each frame
  - [x] then cut straight back to me — the scene ends right after the glitch (hard cut, no fade) at 11.20 s
  - [x] sound: a soft keyboard tick per letter and one heavy lock clunk — sound intents 'typing' (one per letter) and 'lock' are on the SFX track; your sound library is empty, so no sound assets are assigned yet (shown as missing, nothing invented)
  - [x] your reference FUL-006 — used for the deep black frame with one glowing element; its blue light streaks were not added because your text asks for a plain black background
- S04 v1 (active): HalfPanel from claude via REQ-0005, built (2026-10-14T18:31:34): Halfscreen built with the kit's HalfPanel (no half-screen reference exists in the library). Rows restate the earlier lines of the script; nothing invented.
  - [x] lower half: a dark panel — HalfPanel fills 50-100% of the height on a dark gradient; the speaker stays visible above
  - [x] 'real protection' as the headline — headline 'That is real protection' with 'real protection' in the red accent serif (constants)
  - [x] three check rows from my earlier lines — 'breaches found in seconds', 'attackers locked out', 'your data untouched' stagger in
  - [x] I stay visible on top — nothing above 50% of the frame changes

## Requests for Claude Code

- REQ-0001 concepts S02: **completed** (2026-10-14T18:29:50) — round 1: Claude Concepts A/B/C written
- REQ-0002 implement S02: **completed** (2026-10-14T18:29:51) — v1 built (LoginAlertStack, 4.10-7.70 s), 9/9 items done
- REQ-0003 implement S01: **completed** (2026-10-14T18:29:51) — v1 built (CaptionAccent, 0.50-3.70 s), 4/4 items done
- REQ-0004 implement S03: **completed** (2026-10-14T18:29:51) — v1 built (LockdownTitle, 8.30-11.20 s), 9/9 items done
- REQ-0005 implement S04: **completed** (2026-10-14T18:29:51) — v1 built (HalfPanel, 11.80-13.00 s), 4/4 items done

