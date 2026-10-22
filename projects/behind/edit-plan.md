# Edit-plan: "Are we actually behind?" (9:16, 35 s)

Overlays voor jouw talking-head, in dezelfde huisstijl als de cyber-path-video: **oranje op zwart**, Montserrat + Playfair Display Italic, zwart glas. **Alle timings zijn voorlopig.** Ze komen uit de timestamps in je script, niet uit je echte opname. Zodra je clip er is, verschuif je alleen de starttijden in `render.sh` (`LAYERS=`); verder verandert er niets.

## Story
- **Kern in één zin:** je bent misschien niet achter; je ziet alleen de highlights van anderen.
- **Boog:** vraag (0–6) → herkenbaar (6–11) → vergelijking/feed (11–18) → dip (18–21) → omslag: het iceberg-moment (21–26) → menselijk (26–29) → open vraag terug (29–35).
- Gezicht staat centraal op de emotionele zinnen (18–21 alleen kleine tekst, 26–29 rustig).

## Beat sheet
| # | In–uit (s) | Gesproken | Systeem | Wat je ziet | Template / config | Geluid |
|---|---|---|---|---|---|---|
| 1 | 0.00–2.80 | "Are we actually **learning too slowly**" | B | "are we actually learning" + oranje serif **too slowly?** | `caption-serif-accent` / `01-hook.json` (TXT-004) | zachte pop op de serif; muziek start (alleen akkoorden) |
| 2 | 2.80–6.10 | "…everyone online just make it look like they're learning faster" | A | zwart-glas kaart *Learning progress*: **Everyone online 94%** (witte balk) vs **Me 12%** (oranje balk), "Based only on what gets posted" | `progress-compare` (nieuw) / `02-compare.json` | click bij binnenkomst, lage tik als de oranje balk stopt |
| 3 | 6.40–11.00 | "…an entire day trying to understand one thing" | A | stat-kaart *Time on one concept* telt traag op tot **9 h**, curve, "and it still hasn't clicked" | `stat-card` / `03-day.json` | landing + zachte swoosh op de curve; bas en kick komen erin |
| 4 | 11.40–17.80 | "…someone your age building some crazy project or already working at some huge company" | A | feed *For you*: @maya.builds (full-stack app at 19), @jordan.dev (game engine from scratch), @sam.codes (Day 1 at a huge tech company), elk op zijn woorden | `live-ui-list` / `04-feed.json` (ONS-001) | één UI-click per post; volle groove |
| 5 | 18.10–21.05 | "And I'm just like… bro, **what am I even doing?**" | B | "bro, what am I" + serif **even doing?** | `caption-serif-accent` / `05-doing.json` | **geen SFX**, groove valt terug (emotionele zin) |
| 6 | 21.10–25.40 | "…we only see the stuff people **actually post**" | **C (enige full-screen)** | één gepolijste post boven een oranje stippellijn (**POSTED**); de camera zakt eronder: Draft 1 (deleted), Build failed 03:12, Day 9 still don't get it, Tutorial #14 abandoned, Error 404 (6 hours on a typo), Started over, "Does anyone get this?" (no replies). Teller: **1 posted · 7 not posted** | `fullscreen-iceberg-feed` (nieuw, ONS-028 iceberg-idee) / `06-iceberg.json` | sub-hit op de cut, diepe swoosh tijdens het zakken, swell terug naar je gezicht |
| 7 | 26.00–29.10 | "…all the times they were **completely lost** too" | B | "all the times they were completely" + serif **lost too.** | `caption-serif-accent` / `07-lost.json` | geen SFX, muziek zacht |
| 8 | 30.70–35.00 | "Are we actually behind, or does the internet just **make us feel** like we are?" | B | getrackte regel ARE WE ACTUALLY BEHIND? → "or does the internet just" + serif **make us feel** | `caption-serif-accent` / `08-behind.json` (TXT-002) | kleine tik, lage warme toon op "make us feel"; muziek fadet uit |

Budget: 5 tekst-beats, 3 on-screen UI's, 1 full-screen (4.3 s ≈ 12%). Elke tekst-beat heeft een andere opbouw, zodat het niet repetitief wordt.

## Plaatsing (9:16)
- Gezicht vrij: tekst op 68–70% hoogte, UI-kaarten in de borstzone (60–90%).
- **Controleer met je echte footage**: als je hoofd lager in beeld zit, zet `anchor.y` in de caption-configs een paar procent omhoog of omlaag.

## Geluid
Er waren geen audiobestanden, dus muziek en SFX zijn **gesynthetiseerd** (origineel, geen samples): `tools/make_audio.py`.
- `music_bed.wav`: lo-fi in A-mineur, 80 BPM, op ±−23 LUFS zodat hij onder je stem blijft (zet hem in je NLE nog ~6 dB zachter als je stem zacht is).
- `sfx.wav`: alle effecten op de tijden hierboven.
- `preview_mix.wav`: muziek + SFX samen, alleen voor de preview zonder stem.

## Wat je krijgt
- `work/mov/NN-*.mov`: per beat een ProRes 4444-bestand met alpha. Leg ze in je editor op de starttijd uit de tabel.
- `work/mov/behind-overlays-full.mov`: **één spoor van 35 s** met alles al op zijn plek. Zet het op 00:00 boven je clip, klaar.
- `work/behind-preview-placeholder.mp4`: preview op een **nep-achtergrond** (geen echte footage), met muziek en SFX.
- Met je echte clip: `projects/behind/render.sh /pad/naar/jouw-clip.mp4` geeft `work/edit_v1.mp4`.
