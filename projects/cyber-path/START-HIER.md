# START HIER: "Choosing a path in cybersecurity"

Alles voor deze video op één plek: instellingen, bestanden, de opdracht voor Claude en het volledige geluidsplan.
Route: je eigen `video-visual-editing` skill (HTML + Playwright + ffmpeg, **zonder Remotion**, regel 8 van je skill).

---

## 1. Instellingen: `C:\Users\Khamo\.claude\settings.json`

Je huidige lijst mist nog twee Film Score-mappen. Vervang het blok door dit:

```json
{
  "permissions": {
    "additionalDirectories": [
      "C:\\Users\\Khamo\\Desktop\\sfx",
      "C:\\Users\\Khamo\\Desktop\\muziek",
      "C:\\Users\\Khamo\\Desktop\\Film Score Collection Vol 1",
      "C:\\Users\\Khamo\\Desktop\\Film Score Collection Vol 2",
      "C:\\Users\\Khamo\\Desktop\\FILM SCORE COLLECTION VOL 3",
      "C:\\Users\\Khamo\\Desktop\\CHPTRS FILM SCORE COLLECTION (BY KEY Final)",
      "C:\\Users\\Khamo\\Desktop\\VUL-HIER-DE-NAAM-IN-VAN-Film-Score-Colle..."
    ]
  }
}
```

- De laatste regel: vervang die door de volledige naam van de map die begint met `Film-Score-Colle…` (Shift + rechtsklik op de map → **Als pad kopiëren**; schrijf elke `\` dubbel).
- Staat er al meer in dit bestand, voeg dan alleen de mappen aan de bestaande lijst toe.
- Start Claude Code daarna opnieuw.

## 2. Bestanden klaarzetten

| Wat | Waar naartoe |
|---|---|
| map `video-visual-editing` (uit branch `claude/wizardly-hopper-urzr8p`) | `<je projectmap>\.claude\skills\video-visual-editing\` |
| map `projects\cyber-path` (zelfde branch) | `<je projectmap>\projects\cyber-path\` |
| je **geknipte** video, 1080×1920 MP4 | `<je projectmap>\projects\cyber-path\input.mp4` |

`<je projectmap>` is de map waar je Claude Code opent, bijvoorbeeld `remotion-app` of `Hamid`.

## 3. De opdracht: plak dit in Claude Code

```
Maak de cyber-path video volledig af, inclusief geluid, met de skill in
.claude\skills\video-visual-editing en volgens projects\cyber-path\START-HIER.md
en projects\cyber-path\edit-plan.md. Gebruik de pipeline van de skill
(render_html.js, compose.py, sfx_index.py, sfx_plan.py, sound_mix.py, sound_qc.py),
niet Remotion. Video: projects\cyber-path\input.mp4 (al geknipt).

0. Controleer Python (pillow, numpy), Node + Playwright/Chromium, ffmpeg en whisper;
   installeer wat ontbreekt. render.sh is bash: draai de stappen als Windows-
   commando's of via Git Bash.
1. Geluidsbibliotheek: scan met sfx_index.py scan C:\Users\Khamo\Desktop\sfx en
   alle Film Score-mappen uit mijn settings (NIET de map muziek). Zet WSH-001,
   ENV-001 en ENV-002 (kettingen) op MEC. Laat me het aantal per categorie zien
   (vooral RIS, HIT, WSH, UNC).
2. Timing: maak een transcript met woord-timestamps (whisper) en stem alle tijden
   in beats\*.json, render.sh en sound-plan.json af op de echte woorden.
3. Beeld: render en composite alle 9 beats, bekijk de QC-frames en verbeter wat
   niet klopt (gezicht vrij, tekst leesbaar, oranje op zwart).
4. Geluid: volg het geluidsplan in START-HIER.md §4. Kies per cue een geluid uit
   mijn bibliotheek (sfx_audition.py), mix pass 1, dan 1+2, dan 1+2+3 (--no-music)
   en draai sound_qc.py; die moet met 0 errors eindigen.
5. Muziek: stel 3 rustige, donkere tracks voor uit mijn Film Score-mappen. Wacht
   op mijn keuze, voeg hem toe op -19 dB en draai sound_qc.py opnieuw.
6. Laat me final.mp4 zien plus een eerlijk overzicht: wat er gedaan is, welke
   geluiden waar zitten (cuesheet.csv) en wat nog niet perfect is.
```

Jij doet daarna nog twee dingen: een muziektrack kiezen (stap 5) en de eindvideo bekijken en beluisteren.

---

## 4. Geluidsplan (System D)

Tijden zijn voorlopig (uit het script) en worden in stap 2 afgestemd op je video. Volumes zijn de presets van je skill. Je stem blijft altijd onaangeroerd en het luidst.

| Tijd (s) | Moment | Pass | Soort geluid | Volume | Waarom |
|---|---|---|---|---|---|
| 0.00 | start video | 4 | **muziekbed start** | -19 dB | onder het pratende hoofd |
| 2.63 | "**choose a path**" landt | 2 | pop | -7 dB | sleutelwoord van de hook |
| 4.20 | einde hook | 3 | korte **riser → hit** (sharp bass) | -5 / -6 dB | markeert de overgang van hook naar verhaal |
| 6.9-7.3 | "it's just… " (pauze) | – | **stilte**, muziek 0.4 s weg | – | spanning voor de grap |
| 7.43 | "**HACKING**" landt | 2 + 3 | sci-fi click + **metallic hit** | -7 / -6 dB | de punchline |
| 12.53 | "**different things**" | 2 | pop | -7 dB | |
| 14.27-17.23 | 4 paden-chips | 2 | 4× UI-click / muisklik, **telkens een andere variant** | -7 dB | één tik per chip, niet robotisch |
| 29.43 | "**really cool**" | 2 | pop | -7 dB | |
| 31.90 | "**something else**" | 2 | pop | -7 dB | |
| ~32.5 → 35.30 | opbouw naar rabbit hole | 3 | **riser** (metallic of sharp bass), lost op op de cut | -5 dB | de spanning loopt op; begin pas na "something else" zodat hij niet over je woorden zwelt |
| 35.30 | **cut naar full-screen** | 2 + 3 | sci-fi entry / energy + **sharp-bass hit** onder de riser | -7 / -6 dB | het luidste moment van de video |
| 35.30-39.10 | rabbit hole | 4 | **geen muziek** | – | full-screen = geen muziek (de mixer regelt dit) |
| 36.43 | "**rabbit hole**" landt | – | stilte (de whoosh draagt het) | – | |
| ~38.1 | val door de deuren (snelste moment) | 1 | **lange diepe/holle whoosh**, luidste punt laat | -10 dB | inCubic: de val is het snelst aan het eind |
| 39.10 | hard terug naar je gezicht | 3 | **metallic hit** (zacht) of niets | -8 dB | "uit het konijnenhol" |
| 39.1-49.0 | eerlijk stuk | – | **bewuste stilte**, geen muziek | – | laat je verhaal ademen; muziektrack hier zelf uitfaden |
| 47.40 | "**hardest parts**" | – | **geen geluid** | – | emotionele zin |
| 49.00 | muziek terug | 4 | muziekbed, zachte fade-in | -19 dB | opbouw naar de payoff |
| 54.50 | "**stick with**" landt | 2 | pop + eventueel heel zacht *success reward* | -7 / -12 dB | afsluiter |
| alle exits | tekst verdwijnt | – | stilte | – | exits zijn altijd stil |

Checks die `sound_qc.py` moet halen: minstens **2 sharp-bass en 2 metallic hits** (hier: 4.20, 35.30, 7.43 en 39.10), niets luider dan je stem, geen clipping, geen muziek in 35.30-39.10, en alles binnen 1 frame van het beeld.

**Muziek kiezen:** rustig, donker, licht spannend; geen drums die met je stem concurreren. In de CHPTRS-collectie staat alles op toonsoort: kies iets in mineur.

## 5. Wat er al klaarstaat

- `edit-plan.md`: het volledige beeldplan (9 beats, oranje op zwart, welke referentie per beat)
- `beats\*.json`: configs voor alle 9 beats
- `sound-plan.json`: plaatsing van de beats voor het geluid
- `render.sh`: alle commando's op volgorde
- `preview-sheet.png`: zo ziet elke beat eruit (over een placeholder, niet over je echte video)
