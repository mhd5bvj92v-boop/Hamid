# In je Creative Director Studio: "Choosing a path in cybersecurity"

Deze stappen zijn voor jouw eigen studio uit branch `claude/vibrant-cerf-gmkijt` (map `remotion-app`, http://127.0.0.1:3010).
Het plan zelf (oranje op zwart, vooral gezicht + tekst, 1 lijstje, 1 full-screen) is hetzelfde als in `edit-plan.md`.

---

## Stap 1: de goede map openen in VS Code

**File → Open Folder** → kies de **binnenste** map `Hamid-claude-vibrant-cerf-gmkijt`
(de map waarin zowel `.claude` als `remotion-app` staan, niet `remotion-app` zelf).
Dan ziet Claude je skill (`.claude\skills\video-editing`).

Kopieer je `settings.local.json` (met de SFX- en muziekmappen) van `remotion-app\.claude\` naar `.claude\` in deze map.
Herstart Claude Code daarna.

## Stap 2: de studio starten

Open de terminal (**Ctrl + `**) en typ:

```
cd remotion-app
npm i
npm run studio
```

`npm i` is alleen de eerste keer nodig. Open daarna in je browser: **http://127.0.0.1:3010**
Laat de terminal open staan, want dat is de studio.

## Stap 3: nieuw project met je video

In de studio: maak een nieuw project, **importeer je geknipte video** en noem het `cyber-path`.

## Stap 4: het script plakken

Plak dit bij het script/transcript. Het staat in het formaat dat je studio leest, en de overlap bij 6.5-8 / 6.5-14 is rechtgezet:

```
[00:00.0 - 00:03.5] The deeper I got into cybersecurity, the harder it became to choose a path.
[00:03.5 - 00:06.5] And this was probably one of the biggest problems I had when I first got into cyber.
[00:06.5 - 00:08.0] Because at first, you kind of think it's just… hacking.
[00:08.0 - 00:14.0] But then you get a little deeper into it and realize there are so many different things you can do.
[00:14.0 - 00:18.0] There's pentesting, blue team, cloud security, networking… basically so many different directions you can go.
[00:18.0 - 00:31.0] And every time I learn about one of them, I'm like, yeah… this is actually really cool.
[00:31.0 - 00:35.0] But then I find something else. And then something else.
[00:35.0 - 00:41.0] And before I knew it, I was just stuck in this massive rabbit hole trying to figure out what I actually wanted to focus on.
[00:41.0 - 00:46.0] And yeah, I know it's probably a better problem to have than realizing you don't like cybersecurity at all.
[00:46.0 - 00:49.0] But for me, that was honestly one of the hardest parts.
[00:49.0 - 00:56.0] Not figuring out if I liked cybersecurity… but figuring out which part of it I actually wanted to stick with.
```

Kloppen de tijden niet precies met je video? Pas ze aan in de studio (links in de Timeline Editor of in Scene Planning).

## Stap 5: Scene Planning → "Constants for the Whole Edit"

| Veld | Invullen |
|---|---|
| Caption style | serif accent: kleine witte Montserrat + één groot schuin Playfair-woord |
| Position | onder de kin, borsthoogte (±56% van de hoogte) |
| Case | zoals gesproken (sleutelwoord HACKING in hoofdletters) |
| Accent colours | oranje `#FF8A2A`, glow `rgba(255,138,42,.42)`, lichte tint `#FFB36B`, tekst wit, achtergronden zwart |
| Accent font | Playfair Display Italic |
| Interface style | zwart glas, oranje badge (ONS-001 + ONS-072) |
| Transitions | harde cuts; alleen de rabbit hole krijgt een eigen overgang |
| Sound density | laag tot middel: pops op sleutelwoorden, 1 grote opbouw naar de rabbit hole, eerlijk stuk stil |
| Music | rustig, donker, mineur, uit mijn Film Score-mappen, -19 dB, stil tijdens full-screen en 39-49 s |
| Notes | vooral mijn gezicht + tekst on screen; max 1 UI-moment en 1 full-screen; niets over ogen/mond |

## Stap 6: per zin het scene type + "What happens on screen"

| Zin | Scene type | What happens on screen (plakken) |
|---|---|---|
| 0:00 "…choose a path" | Captions Only | Kleine witte "the harder it became to", groot oranje schuin **choose a path** landt op "path", getrackte grijze sub-regel "THE DEEPER I GOT" eronder. Ref TXT-002. Pop op "choose a path". |
| 0:03.5 "…biggest problems…" | Captions Only, **leeg laten / geen beat** | Alleen mijn gezicht. |
| 0:06.5 "…just… hacking" | Captions Only | "you think it's just" klein, dan na de pauze **HACKING** in dikke caps met wit→oranje verloop. Ref TXT-006. Stilte in de pauze, dan sci-fi click + metallic hit. |
| 0:08 "…so many different things…" | Captions Only | "there are so many" + groot oranje schuin **different things**. Ref TXT-004. Pop. |
| 0:14 "pentesting, blue team…" | **Captions + UI** | Zwart glazen lijstje "Cyber paths" met oranje badge 4; chips Pentesting, Blue team, Cloud security, Networking verschijnen elk op hun woord, op borsthoogte, gezicht vrij. Ref ONS-001, ONS-072. Klikje per chip, steeds andere variant. |
| 0:18 "every time I learn…" | Captions Only | Pas aan het eind: kleine caps "THIS IS ACTUALLY" over de breedte + licht-oranje script **really cool**. Ref TXT-009. Pop. |
| 0:31 "something else…" | Captions Only | "but then I find" + groot oranje schuin **something else**, blijft staan tijdens de herhaling. Ref TXT-001. Pop; riser begint ~32.5 s. |
| 0:35 "…rabbit hole…" | **Fullscreen** (35.3-39.1 s) | Zwart scherm, oranje lichtdeur uit de vloer (FUL-093), camera valt door steeds snellere deuren, "stuck in this massive" + oranje schuin **rabbit hole**. Hard terug naar mij op 39.1. Riser lost op op de cut + bass hit + sci-fi entry; lange diepe whoosh; geen muziek. |
| 0:41 "better problem to have…" | **geen beat** | Alleen mijn gezicht, stil, geen muziek. |
| 0:46 "…hardest parts" | Captions Only | "honestly one of the" + groot oranje schuin **hardest parts**. Ref TXT-004. **Geen geluid.** |
| 0:49 "…stick with" | Captions Only | Pas bij het eind: "I actually wanted to" + groot oranje schuin **stick with**. Ref TXT-001. Pop + heel zacht success reward. Muziek terug vanaf 49 s. |

Daarna: **"Approve the scene plans"**. Dan maakt de studio voor elke scène een bouwverzoek voor Claude Code.

## Stap 7: Claude Code laten bouwen (in VS Code)

Laat de studio open en plak dit bij Claude Code:

```
Mijn studio draait (remotion-app, npm run studio) met project cyber-path.
1. Indexeer mijn geluiden met .claude\skills\video-editing\scripts\sfx_index.py scan:
   C:\Users\Khamo\Desktop\sfx en alle Film Score-mappen uit mijn settings (NIET de map muziek).
   Zet de kettinggeluiden op MEC. Laat het aantal per categorie zien (RIS, HIT, WSH, UNC).
2. Verwerk alle openstaande studio-verzoeken voor cyber-path met edit_decisions.py
   (pending / claim / built), volgens de scene plans en constants in edit.json en
   projects\cyber-path\STUDIO-STAPPEN.md. Oranje op zwart, alleen de genoemde referenties.
3. Wijs geluiden toe volgens de scene plans (pops, klikjes, riser + hits naar de rabbit
   hole, diepe whoosh, stiltes) en stel 3 donkere, rustige muziektracks voor uit mijn
   Film Score-mappen. Wacht op mijn keuze voor de muziek.
4. Zeg wanneer alles gebouwd is, zodat ik het in de studio kan bekijken.
```

## Stap 8: kijken en verbeteren in de studio

- Bekijk alles in de **Remotion Player** in je studio.
- Iets niet goed? Gebruik **"Request changes"** bij die scène en schrijf in gewone woorden wat anders moet. Laat Claude Code daarna de verzoeken opnieuw verwerken.
- Kies de **muziektrack** uit de 3 voorstellen.

## Stap 9: exporteren

Als alles goed is: geef de **final approval** en klik **Export**. De studio rendert de video met alle geluiden en draait de QC-check. De video komt in `work\cyber-path\renders\final_v1.mp4`.
