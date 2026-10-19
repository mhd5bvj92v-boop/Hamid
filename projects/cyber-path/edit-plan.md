# Edit-plan: "Choosing a path in cybersecurity" (9:16, ~56 s)

Gemaakt met de `video-visual-editing` skill (workflow stap 1-5). **Versie 2:** oranje op zwart, vooral gezicht + tekst. **Alle timings zijn voorlopig**: ze komen uit de timestamps in je script, niet uit de echte video. Zodra de video er is, hertime je ze met woord-timestamps (zie "Stap 1" onderaan).

## Story (`workflow.md` stap 1)

- **Kern in één zin:** cybersecurity leuk vinden was niet het probleem; kiezen welk pad wél.
- **Structuur:** hook (0-3.5) → verwachting "het is gewoon hacken" (3.5-8) → ontdekking: zoveel richtingen (8-18) → alles is cool, en dan nog iets, en nog iets (18-35) → rabbit hole (35-41) → eerlijke reflectie (41-49) → payoff (49-56).
- **Emotionele boog:** energie piekt bij 31-39 (steeds sneller, dan de val in het rabbit hole). Vertrouwen en gezicht staan centraal bij 41-56. Daar weinig of niets in beeld.
- **Concrete zelfstandige naamwoorden:** pentesting, blue team, cloud security, networking.

## Stijlkeuzes

| Keuze | Waarde | Waarom |
|---|---|---|
| Verhouding | **vooral jouw gezicht + tekst on screen**, 1 on-screen snapje, 1 full-screen | jouw voorkeur |
| Kleuren | **oranje op zwart**: accent `#FF8A2A`, glow `rgba(255,138,42,.42)`, script/lichte tint `#FFB36B`, tekst wit | jouw voorkeur; past bij de warme familie in de bibliotheek (TXT-001..004) |
| Full-screen | zwart (`#160A02` → `#000`) met oranje lichtdeuren | dezelfde kleur als de rest, zodat het één video blijft |
| Families | SERIF-ACCENT-CAPTION (bijna alles), LIVE-UI (1×), LIGHT-STREAK (1×) | |
| Fonts | Montserrat (alle sans) + Playfair Display Italic (sleutelwoorden) | huisregel 10 |
| Budget | 7 tekstbeats, 1 on-screen, 1 full-screen (~3.8 s = 7% van de runtime) | |
| Grade | houd je footage neutraal tot licht warm, met diepe zwarten. Oranje tekst valt weg op een oranje/warm-geel shot | |

## Beat sheet

Tijden in seconden, in videotijd. In de configs staan tijden relatief aan het layer-begin.

| # | In-Out (s) | Gesproken | Systeem | Concept | Refs | Template / config | Geluid |
|---|---|---|---|---|---|---|---|
| 1 | 0.00-4.20 | "The deeper I got… harder it became to **choose a path**" | B | kleine sans "the harder it became to" → oranje serif **choose a path** → getrackte sub-regel "THE DEEPER I GOT" | **TXT-002** | `caption-serif-accent` / `01-hook.json` | pop op "choose a path" (-7 dB); muziekbed start |
| – | 4.2-6.4 | "…biggest problems I had…" | gezicht | – | – | – | – |
| 2 | 6.40-8.80 | "…think it's just… **hacking**" | B | stilte in de pauze, dan **HACKING** in vette caps met wit→oranje verloop | **TXT-006** | `02-hacking.json` (stijl `bold`) | muziek 0.4 s weg in de "…"; sci-fi click op HACKING |
| 3 | 11.80-13.95 | "…so many **different things** you can do" | B | "there are so many" + serif **different things** | **TXT-004** | `03-different-things.json` | pop (-7 dB) |
| 4 | 14.00-18.75 | "Pentesting, blue team, cloud security, networking" | **A (het enige on-screen snapje)** | zwarte glazen chip-lijst "Cyber paths", oranje badge, elke chip op zijn woord | **ONS-001** (plaatsing), **ONS-072** (zwart glas + oranje) | `live-ui-list` / `04-paths.json` | één UI-click per chip, variaties afwisselen (-7 dB) |
| – | 18.8-28.6 | "Every time I learn about one of them…" | gezicht | punch-in 110% rond 23 s in je NLE, verder niets | – | – | – |
| 5 | 28.60-31.10 | "…this is actually **really cool**" | B | kleine caps "THIS IS ACTUALLY" over de breedte + licht-oranje script **really cool** | **TXT-009** | `05-really-cool.json` | pop (-7 dB) |
| 6 | 31.20-35.10 | "But then I find **something else**. And then something else." | B | "but then I find" + serif **something else**; blijft staan tijdens de herhaling | **TXT-001** | `06-something-else.json` | pop; **riser start ~32.5** en lost op bij beat 7 |
| 7 | 35.30-39.10 | "…stuck in this massive **rabbit hole**…" | **C (de enige full-screen)** | zwart scherm, oranje lichtdeur (FUL-093), camera valt door steeds snellere deuren, serif **rabbit hole** | **FUL-093** (deur), **ONS-072** (oranje gloed op zwart) | `fullscreen-portal-tunnel` / `07-rabbit-hole.json` | riser lost op op de cut + hit eronder; deep/hollow whoosh laat in de val; geen muziek |
| – | 39.1-46.4 | "…focus on. / better problem to have…" | gezicht | hard terug naar jou | – | – | bewuste stilte, geen muziek |
| 8 | 46.40-49.15 | "…honestly one of the **hardest parts**" | B | "honestly one of the" + serif **hardest parts** | **TXT-004** | `08-hardest-parts.json` | **geen geluid** (emotionele zin) |
| – | 49.2-53.3 | "Not figuring out if I liked cybersecurity…" | gezicht | – | – | – | muziek komt zacht terug (~49.0) |
| 9 | 53.30-56.00 | "…which part of it I actually wanted to **stick with**" | B | "I actually wanted to" + serif **stick with** | **TXT-001** | `09-stick-with.json` | pop; eventueel heel zacht *success reward* als afsluiter |

## Waarom deze referenties

Alleen de sterkste warme referenties uit je bibliotheek, en elke tekst-beat heeft een andere opbouw zodat het niet repetitief wordt (design-language §5):

| Ref | Wat het is | Gebruikt voor | Wat ik eruit overneem |
|---|---|---|---|
| TXT-002 | amber serif frase + getrackte sub-regel | hook | drie registers: kleine sans, grote serif, getrackte grijze sub-regel die in de serif haakt |
| TXT-006 | warme gradient bold sans | HACKING | zware sans met wit→warm verloop en glow, zonder box |
| TXT-004 | kleine lead-in + serif sleutelwoord | different things, hardest parts | één witte regel, daaronder het grote oranje serif-woord |
| TXT-009 | kleine caps + script woord | really cool | caps over de volle breedte, script-woord eronder in warme tint |
| TXT-001 | warme serif hook | something else, stick with | sans lead-in en serif met strakke regelafstand en zachte glow |
| ONS-001 | live UI over een pratend hoofd | paths | de enige echte live-composite in je bibliotheek: chips in de borstzone, gezicht vrij |
| ONS-072 | zwart glas met oranje gloed | paths, rabbit hole | oranje als enige accent op bijna-zwart |
| FUL-093 | lichtdeur uit de vloer | rabbit hole | deur met licht van onderen, perspectiefvloer |

Wat ik bewust niet gebruik: TXT-007 en TXT-008 (koel en mint, passen niet bij oranje) en TXT-005 (vereist een subject-matte).

**Wil je een tweede full-screen?** De beste kandidaat is de hook (0.0-3.5): het pad-bord uit FUL-030 (wegwijzer met Pentesting / Blue team / Cloud) in oranje op zwart. Dan begin je de video met een sterk beeld in plaats van met je gezicht. Het nadeel is dat kijkers je gezicht pas na 3.5 s zien. Mijn advies: houd het op één full-screen.

**Bewust níet gedaan:** geen ondertitels woord voor woord, geen glitch-transities en geen emoji (vermijd-lijst in `motion.md` en `system-b-text.md`).

## Sound (System D)

- **Je SFX-bibliotheek is nog leeg.** Eerst: `python3 scripts/sfx_index.py scan /pad/naar/jouw/SFX`.
- Passes in vaste volgorde: 1 whooshes (alleen beat 7), 2 textures (pops en clicks), 3 riser + hits (32.5 → 35.30), 4 muziek pas na goedkeuring.
- Muziek: -19 dB onder je stem, automatisch stil in `fullscreen_windows` = `[[35.30, 39.10]]`. Van 39.1 tot 49.0 laat je de muziektrack zelf uitfaden (de mixer gate't alleen full-screen- en graphic-vensters).
- Hit-kandidaten (minstens 2 sharp-bass en 2 metallic): 0.00, 6.9 (HACKING), 35.30 (rabbit-hole-cut), 39.10 (terug naar gezicht).

## Wat er nu al bestaat

- `beats/*.json`: 9 configs, klaar om te renderen.
- `templates/fullscreen-portal-tunnel.html`: nieuwe System C-template voor beat 6.
- `preview-sheet.png`: stills van elke beat over een **synthetische placeholder-plate** (geen echte footage). Met echte frames moet je positie en kleur nog controleren.
- `render.sh`: alle render-, composite- en sound-commando's op volgorde.
