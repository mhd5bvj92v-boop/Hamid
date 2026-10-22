# Sound: music bed + SFX (synthesised, original)

The user asked for background music and sound effects. No audio files were supplied, so `tools/make_audio.py` **synthesises everything from code**: additive pads, plucks, a sine sub and kick, filtered noise, and bell partials. No samples or third-party recordings are used, and the noise is seeded so the output is reproducible. It is clearly *generated* audio, not a recorded or licensed track. There is no voice-over.

- **Music:** an original 120 BPM bed in F major (30 frames per beat, so it sits on the frame grid). The progression is Fmaj7 → Am7 → Dm9 → Bbmaj7 → Fmaj9. It is calm under the wallet, adds a heartbeat kick in the dark NFC scene, grooves after the confirmation, and resolves on Fmaj9 plus a low F under `JUST A TAP.`, fading out over the last 1.2 s. The music ducks −35% under the chime and the title.
- **Mix:** a soft tanh limiter, then two-pass `loudnorm` to **−13.9 LUFS integrated**, true peak ≤ −1.5 dBTP. 48 kHz, 24-bit (`out/audio/mix_master.wav`), muxed as AAC 256 kb/s.
- Stems: `out/audio/music.wav`, `out/audio/sfx.wav`.

Cue list (frame-accurate):

| Frame | Time | Event | Sound (as implemented) |
|---|---|---|---|
| 14 | 0.23 s | card settles into the wallet panel | soft card slide, low and short |
| 44 / 84 / 118 | 0.73 / 1.40 / 1.97 s | focus ring hops label → digits → glyph | three tiny UI ticks, rising pitch |
| 158–206 | 2.63–3.43 s | panel morphs into the phone | one gentle airy morph (the only "whoosh") |
| 306 | 5.10 s | terminal springs in | soft thud / panel landing |
| 352–414 | 5.87–6.90 s | glyph lifts off and arcs | faint shimmer following the arc |
| 450 / 468 / 486 | 7.50 / 7.80 / 8.10 s | NFC arc ripples | three soft pulses, decaying |
| 578 | 9.63 s | terminal → Approved, phone → DONE | **one crisp confirmation chime** |
| 664 | 11.07 s | check draws in the confirmation panel | (silent: the chime above already covers it) |
| 814 / 828 / 848 | 13.6 / 13.8 / 14.1 s | selection rail hops between rows | three light taps |
| 900–1040 | 15.0–17.3 s | orange stroke gesture | subtle continuous texture, swelling |
| 984–1012 | 16.4–16.9 s | receipt fragments snap into the capsule | soft magnetic snap |
| 1064 | 17.7 s | JUST A TAP. sets | low warm tone, then room tone to the end |

The VO guide lines are in `docs/vo-cues.srt`.
