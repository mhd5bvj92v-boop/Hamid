# Edit-plan: "Choosing a path in cybersecurity" (9:16, ~56 s)

Gemaakt met de `video-visual-editing` skill (workflow stap 1-5). **Alle timings zijn voorlopig**: ze komen uit de timestamps in je script, niet uit de echte video. Zodra de video er is, hertime je ze met woord-timestamps (zie "Stap 1" onderaan).

## Story (`workflow.md` stap 1)

- **Kern in één zin:** cybersecurity leuk vinden was niet het probleem; kiezen welk pad wél.
- **Structuur:** hook (0-3.5) → verwachting "het is gewoon hacken" (3.5-8) → ontdekking: zoveel richtingen (8-18) → alles is cool, en dan nog iets, en nog iets (18-35) → rabbit hole (35-41) → eerlijke reflectie (41-49) → payoff (49-56).
- **Emotionele boog:** energie piekt bij 31-39 (steeds sneller, dan de val in het rabbit hole). Vertrouwen en gezicht staan centraal bij 41-56. Daar weinig of niets in beeld.
- **Concrete zelfstandige naamwoorden:** pentesting, blue team, cloud security, networking.

## Stijlkeuzes

| Keuze | Waarde | Waarom |
|---|---|---|
| Families | SERIF-ACCENT-CAPTION + LIVE-UI (praatstukken), LIGHT-STREAK (één full-screen) | maximaal 3 families (design-language §5) |
| Accent praatstukken | blauw `#5B8CFF` (glow `rgba(47,107,255,.4)`) | cyber/tech, dominante bibliotheekkleur. **Is je footage warm gegraded? Wissel dan naar amber `#F2A14A`** |
| Accent full-screen | violet `#8B5CF6` / `#A78BFA` | FUL-093; een nieuwe sectie mag een eigen accent hebben |
| Fonts | Montserrat (alle sans) + Playfair Display Italic (sleutelwoorden) | huisregel 10 |
| Budget | 5 tekstbeats, 3 on-screen, 1 full-screen (~3.8 s = 7% van de runtime) | binnen de richtlijn voor 60 s |

## Beat sheet (`work/edit-plan.md`-formaat)

Tijden in seconden, in videotijd. In de configs staan tijden relatief aan het layer-begin.

| # | In-Out (s) | Gesproken | Systeem | Concept | Refs | Family | Template / config | Geluid |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.00-4.20 | "The deeper I got… harder it became to **choose a path**" | B | getrackte kicker "THE DEEPER I GOT" → sans "the harder it became to" → blauwe serif **choose a path** landt op "path" | TXT-001, TXT-004 | SERIF-ACCENT | `caption-serif-accent` / `beats/01-hook.json` | pop op "choose a path" (-7 dB). Muziekbed start op frame 0 |
| – | 4.2-6.4 | "…biggest problems I had…" | niets | gezicht | – | – | – | – |
| 2 | 6.40-8.80 | "…you kind of think it's just… **hacking**" | B | sans "you think it's just", dan **HACKING** in vette caps met blauw-wit verloop, op het woord **na** de pauze | TXT-007 | SERIF-ACCENT | `caption-serif-accent` (stijl `bold`) / `beats/02-hacking.json` | **stilte** in de "…"-pauze (muziek 0.4 s wegduiken), dan sci-fi click of pop op HACKING |
| – | 8.8-14.0 | "…so many different things you can do" | niets | gezicht; opbouw naar de lijst | – | – | – | – |
| 3 | 14.00-18.75 | "Pentesting, blue team, cloud security, networking" | A | glazen chip-lijst "Cyber paths (4)", elke chip verschijnt op zijn eigen woord, borsthoogte | ONS-001, ONS-042 | LIVE-UI | `live-ui-list` / `beats/03-paths.json` | één UI-click / mechanism-gizmo per chip, variaties afwisselen (-7 dB) |
| – | 18.8-28.6 | "Every time I learn about one of them…" | niets | gezicht (lang stuk: wissel de framing, punch-in 110% op ~23 s in je NLE) | – | – | – | – |
| 4 | 28.60-31.10 | "…this is actually **really cool**" | B | sans "this is actually" + crème script **really cool** | TXT-009, ONS-005 | SERIF-ACCENT | `caption-serif-accent` (stijl `script`) / `beats/04-really-cool.json` | pop (-7 dB) |
| 5 | 31.20-35.20 | "But then I find something else. And then something else." | A | chips stapelen zich op in twee golven (2 dan 3), steeds sneller: het overweldigende gevoel | ONS-042, ONS-077 | LIVE-UI | `live-ui-list` / `beats/05-something-else.json` | één tik per chip; golf 2 staat <120 ms uit elkaar, dus één doorlopende gears-clip. **Riser start hier** en lost op bij beat 6 |
| 6 | 35.30-39.10 | "…stuck in this massive **rabbit hole**…" | C | full-screen: violette deur (FUL-093), camera valt door geneste deuren die steeds sneller voorbij razen; "stuck in this massive" + serif **rabbit hole** | FUL-093, FUL-029 | LIGHT-STREAK | `fullscreen-portal-tunnel` (nieuw) / `beats/06-rabbit-hole.json` | riser lost op op de cut (35.30) met hit eronder; deep/hollow whoosh, luidst laat in de val (inCubic); **geen muziek** in de scène |
| – | 39.1-52.1 | "…what I wanted to focus on. / better problem… / hardest parts. / Not figuring out if I liked cybersecurity…" | niets | hard terug naar gezicht. Dit is het eerlijke, persoonlijke stuk: niets in beeld | – | – | – | **bewuste stilte**: laat de muziek pas terugkomen bij ~49.0 (zie D hieronder) |
| 7a | 52.10-56.00 | "…but figuring out **which part of it**…" | A | callback: dezelfde vier chips komen terug onder de kop "Which one?", **geen** actief (de vraag blijft open) | ONS-001 | LIVE-UI | `live-ui-list` / `beats/07-stick-with-paths.json` | zachte UI-clicks (of één), -8 dB |
| 7b | 53.30-56.00 | "…I actually wanted to **stick with**" | B | sans "I actually wanted to" + blauwe serif **stick with** boven de chips (ONS-001-patroon: caption benoemt, UI bewijst) | ONS-001, TXT-001 | SERIF-ACCENT | `caption-serif-accent` / `beats/07-stick-with-caption.json` | pop op "stick with"; eventueel *success reward* heel zacht als afsluiter |

**Bewust níet gedaan:** geen ondertitels woord voor woord (de skill werkt met ontworpen frases), geen glitch-transities en geen emoji. Ze staan op de vermijd-lijst in `motion.md` en `system-b-text.md`. Wil je toch volledige ondertitels voor toegankelijkheid? Dan komen die als aparte, rustige laag onderaan.

**Let op bij beat 5:** de onderwerpen (Malware analysis, Digital forensics, OSINT, AppSec, GRC) zijn **illustratief**. Vervang ze door de richtingen waar jij echt in bent gedoken.

## Sound (System D)

- **Je SFX-bibliotheek is nog leeg** (`validate.py`: 0 indexed sounds). Eerst: `python3 scripts/sfx_index.py scan /pad/naar/jouw/SFX`.
- Passes in vaste volgorde: 1 whooshes (alleen beat 6), 2 textures (pops en clicks op beats 1-5 en 7), 3 riser + hits (31.5 → 35.30), 4 muziek pas na goedkeuring.
- Muziek: -19 dB onder het pratende hoofd, automatisch stil in `fullscreen_windows` = `[[35.30, 39.10]]`. Voor de bewuste stilte van 39.1 tot 49.0 laat je de muziektrack daar zelf uitfaden (de mixer gate't alleen full-screen- en graphic-vensters).
- Haalbaar: minstens 2 sharp-bass hits en 2 metallic hits per video (regel uit `sound-design.md`). Kandidaten: 0.00 (hook), 6.9 (HACKING), 35.30 (rabbit-hole-cut), 39.10 (terug naar gezicht).

## Wat er nu al bestaat

- `beats/*.json`: 8 configs, klaar om te renderen.
- `templates/fullscreen-portal-tunnel.html`: nieuwe System C-template voor beat 6.
- `preview-sheet.png`: stills van elke beat over een **synthetische placeholder-plate** (geen echte footage). Met echte frames moet je positie en kleur nog controleren.
- `render.sh`: alle render-, composite- en sound-commando's op volgorde.
