# System D: Professional Sound Design

This system adapts Joseph's sound design system (Ultimate Editors) to this skill's production environment.

- **Source:** `references/sources/UE-Sound-Design-Claude-Training-COMPLETE.md` is kept unmodified, with its sha256 recorded in `data/sources.json`. Read it once for the original voice.
- **What carries over:** this file keeps Joseph's aesthetic, his three sound families, his selection tables, his levels and his pass order (Part A of his document).
- **How it runs here:** his Remotion operating instructions (Part B) are mapped onto this repository's Remotion + cue-sheet pipeline in §11.
- **Where the procedure lives:** `sound-design-workflow.md`, with the library itself in `sound-library-index.md`.

**Remotion builds the picture; the cue sheet drives the sound.** Sound timing is measured from the Remotion beats (`edit_render.py sfx`), placed from a cue sheet by `scripts/sound_mix.py` (numpy + ffmpeg, sample-accurate, voice untouched) into editable per-family stems and the final export, and previewed in Remotion Studio (`edit_render.py sound-preview`).

**The gain presets in §6 are Joseph's starting clip gains, not loudness targets.** Keep them unless the material makes a change necessary, and record why. **Only authorised assets that are actually accessible are used**: never invent a sound, never claim a sound was added when the library doesn't have it, and never alter the user's dialogue.

---

## 1. Philosophy (Joseph, preserved)

1. **Sound emphasizes motion.** Every sound exists to emphasize something the viewer can see: a movement, a pop, a change, a transition, or a build toward the next moment. If nothing is happening on screen, nothing happens in the sound.
2. **Three jobs, three families:**
   - **Whooshes** for movement.
   - **Textures** for things that happen without sliding.
   - **Risers and hits** for anticipation and its release.
3. **Never too loud.** Whooshes sit low. Textures sit higher because they are short and need to be felt. Risers sit highest because they carry the build. Nothing ever covers the voice.
4. **Under animations: sound effects only, no music.** Music lives under the talking head only.
5. **One impact per scene.** Every scene has one loudest moment, and everything else sits under it.
6. **Sound scale matches shot scale.** Wide or full-screen scenes get bigger, roomier sounds. Macro or close UI gets small, intimate ones.
7. **Diegetic first.** If something on screen makes a sound in the real world (a keyboard, a camera shutter, a coin), that sound is the first choice. Name the source; don't just "add SFX".
8. **The whoosh peak sits on the fastest frame.** The loudest point of every whoosh lands exactly where the on-screen movement is fastest, so the sound rises into the motion and tails out of it.

**Our addition: silence is a design decision.** Joseph's coverage rule ("anytime there's a movement, there's a whoosh") applies to deliberate edit movements. In this skill, stay silent by default for:

- emotional or personal lines where the voice must stand alone;
- small entrance drifts that are really pops (`MICRO` segments in the motion report);
- exits;
- slow camera drifts of about 5% or less;
- connector words in captions;
- a moment that another sound already carries (one impact per scene);
- any spot where a sound would mask a word.

Every cue sheet records these decisions as `status: "silence"` or `"rejected"`, so the choice is deliberate and visible.

## 2. The families and this skill's library categories

Your library is indexed into nine categories, plus music. Each maps to one of Joseph's three jobs:

| Joseph's job | Library categories (prefix) | Track in the mix | Anchor used for timing |
|---|---|---|---|
| Whooshes (movement) | Whooshes (`WSH`) | WHOOSHES | loudest point → fastest frame of the movement |
| Textures (events without sliding) | Textures (`TEX`), UI sounds (`UI`), Pops and clicks (`POP`), Sci-fi sounds (`SCI`), Mechanical effects (`MEC`) | TEXTURES (TEXTURES_2 if two textures overlap) | transient → event frame |
| Risers and hits (anticipation) | Risers (`RIS`), Hits and impacts (`HIT`) | RISERS, HITS | riser loudest point (its resolution) → transition frame; hit transient → same frame |
| Beds (only when a scene needs one) | Environmental sounds (`ENV`) | ENV | clip start |
| Music (talking head only) | Music (`MUS`), supplied by the user | MUSIC | gated off in full-screen and graphic windows |

The index also detects Joseph's named sounds from file and folder names and stores them as `role`. Examples: `hollow-whoosh`, `deep-voice-whoosh`, `sharp-bass-riser`, `metallic-riser`, `suck-back-riser`, `ui-click`, `sci-fi-impact`, `camera-click`, `keyboard-writing`, `gears`, `success-reward`, `heavenly-choir`, `activate-energy`.

When your library uses different names, choose by the measured character instead:

- **Length:** match it to the movement.
- **Attack** (transient to loudest point): roughly half the movement's duration for a whoosh.
- **Brightness** (spectral centroid): sci-fi or "futuristic" sounds measure brighter.
- **Low-end weight:** "deep", "bass" and "heavy" sounds carry more energy below 150 Hz.

You can tag a sound's role yourself: `python3 scripts/sfx_index.py set ID --role metallic-riser`.

## 3. Whooshes (movement)

Use a whoosh any time something **moves**: text sliding in from the side or up/down, an image or UI element sliding in (sliding, not popping), a camera pan, a zoom, a camera move inside an animation, or a scene transition.

**Placement:** find the fastest frame of the movement and put the whoosh's loudest point exactly there. For animations built with this skill, the frame is measured, not guessed: each Remotion beat's pose functions report the fastest frame (`edit_render.py sfx`; for HTML templates, `render_html.js --motion`). For footage, `video_events.py` proposes candidates.

Joseph's whoosh palette and selection logic (preserved):

| Joseph's whoosh | How he uses it | Role tag |
|---|---|---|
| Classy airy | Big, heavy. Rarely used; only for large, weighty movements. | `classy-airy-whoosh` |
| Hollow | Used frequently. Has texture. A go-to for standard slides and pans. | `hollow-whoosh` |
| Futuristic | Used frequently. Textured, slightly sci-fi. A go-to alongside hollow. | `futuristic-whoosh` |
| Deep voice | Used very frequently. Sci-fi texture that fits most animations. **Default when unsure.** | `deep-voice-whoosh` |
| Generic long | Slowly builds the viewer into a quick transition; half riser, half whoosh. | `generic-long-whoosh` |
| Organic wind | Slow, methodical movements, gentle slides, slow camera drifts. Softer. | `organic-wind-whoosh` |
| Short | Rare. Only very quick, small movements. | `short-whoosh` |
| Synthetic / Transition spacey / Water dropper | Scene-to-scene transitions, sci-fi edge. | `synthetic-whoosh`, `transition-spacey-whoosh`, `water-dropper` |

**Selection:** match the movement's length, pace and weight.

- Slow and methodical → organic wind.
- Standard slide or pan → hollow, futuristic or deep voice.
- A build into a fast transition → generic long.
- A scene change → synthetic, spacey or water dropper.
- A tiny fast move → short (rare).
- A big heavy move → classy airy (rare).

To compare variations by length and attack against the movement duration, use `sfx_audition.py --fit-duration <seconds of movement>`.

## 4. Textures (events without sliding)

Use a texture when something happens that is **not** a slide: a pop, click, reveal, colour change, letter-by-letter write-out, button press, UI element appearing, or object entering. The texture's **transient lands on the event frame**.

Joseph's core mapping (preserved):

| On screen | Texture | Category / role |
|---|---|---|
| Text pops up as a whole element | Pop | `POP` · `pop` |
| UI element pops up | UI click | `UI` · `ui-click` |
| A click, or something changing inside the animation (a UI changes colour) | Sci-fi click | `SCI` · `sci-fi-click` |
| Text writes out letter by letter / mechanical typewriter pop | Gears (complex mechanism gizmo, tiny gearwheel) | `MEC` · `gears`, `mechanism-gizmo` |
| Typing on screen | Keyboard writing | `POP` · `keyboard-writing` |
| One image or object pops up and needs emphasis | Video scan / gears moving (single click-type) | `MEC`/`SCI` · `video-scan` |
| Several assets pop up in sequence | Complex mechanism gizmo, **one emphasis per element** | `MEC` · `mechanism-gizmo` |
| A new UI or object is **revealed** entering the scene | Sci-fi impact | `SCI` · `sci-fi-impact` |
| Transition into a brand-new animation | Activate-protection-energy style sci-fi entry | `SCI` · `activate-energy` |
| Clip-to-clip transition or camera flash | Digital camera click, **on the transition frame** | `MEC` · `camera-click` |
| A big reveal that is a big deal | Cartoon musical heavenly choir | `TEX` · `heavenly-choir` |
| A conclusion is reached | Success reward | `UI`/`TEX` · `success-reward` |
| Low-volume anticipation (rare) | Alarm buzzer, very low | `UI` · `alarm-buzzer` |

Joseph's favourite and most used family is the **sci-fi impact**: high-quality hits for revealing new elements. The **sci-fi hit** is also his common scene-to-scene transition texture.

## 5. Risers and hits (anticipation)

Risers build anticipation into the next moment and hits release it. They are placed **last**, after every whoosh and texture, by asking one question from the top of the video to the bottom: *"Where do I want my viewer to build up into the next segment?"*

**Where they go:**
- About 5 seconds in, after the hook: a riser blended into the cut into the body, with a hit underneath.
- Every segment-to-segment transition that should feel built.
- A-roll to B-roll transitions that need smoothing. In this skill, that means cuts into System C full-screen scenes.
- Any shift to a new idea, chapter or reveal.

**Placement:** the riser **resolves on the transition frame** (its loudest point, or its end, sits on the cut), and the hit's transient lands on the same frame.

| Riser / hit | Joseph's use | Role |
|---|---|---|
| Sharp bass riser | ~5 s into the video. One of his two favourites. | `sharp-bass-riser` |
| Metallic riser | His other favourite. | `metallic-riser` |
| Suspenseful build-ups | Available, use sparingly. | `suspenseful-build` |
| Suck-back risers | Beautiful slow build. Set **very low or very loud, never in the middle**. | `suck-back-riser` |
| Impact hits | Under a riser, so the riser resolves into the next segment. | `impact-hit` |

**Style target:** at least **two sharp bass and two metallic risers** across a video. A short video may not have four transitions that earn a build. When it doesn't, say so rather than forcing risers in. QC reports this as a warning, or as an error with `--strict-style`.

**Risers and speech:** a riser at -5 dB must not swell over the speaker's words. Trim the riser's head (`trim`) so the build starts after the sentence ends, choose a shorter variation, or move the transition. Never lower the voice.

## 6. Levels: default gain presets

These are **clip-gain presets applied to the library file as it is** (the "-12 dB" Joseph dials in on a clip). They are **not loudness targets**. Keep them unless the source loudness or the mix makes a change necessary. When you deviate, write the reason in the cue's `gain_override_reason`; QC then downgrades the deviation from an error to a warning.

| Family | Preset | Notes |
|---|---|---|
| Whooshes | **-12 dB**, up to **-10 dB** for larger movements | Never above -10 dB. |
| Textures | **-6 to -7 dB** | Shorter sounds can sit slightly hotter (-6). |
| Risers | **-5 dB** | Suck-backs: very low (≤ -15 dB) or very loud (≥ -6 dB), never in between. |
| Hits | **Layered beneath the riser**; the riser + hit stack is the transition's loudest moment | Joseph gives no number. This skill starts at **-6 dB** (our default, adjust by the meter). If the stack clips, **pull the hit**, never the voice. `sound_mix.py` does this automatically and logs it. |
| Music | **-19 dB** under the talking head | **Silent** under full-screen animations and graphic-only sequences. |
| Voice | Untouched (0 dB) | Dialogue always takes priority. No effect may be louder than the voice while the speaker talks. |

**Sanity checks:**
- If a library file is mastered unusually quiet or loud (its peak in the index is outside roughly -6 to 0 dBFS), the preset will feel wrong. Measure it, adjust the gain with an override reason, and tell the user.
- QC verifies clipping (sample peak and true peak under -1 dB by default) and dialogue clarity on every render.

## 7. Music

- Music goes under the talking head only, at -19 dB. It is **never under animations or graphics**: the mixer gates it out of `fullscreen_windows` and `graphic_windows` with short fades.
- Music is the **last** pass, added only after the effects passes are approved. Render with `--no-music` until then.
- Use only tracks the user supplies. Don't generate or download music unless the user asks for options to audition.

## 8. The passes (the order is not negotiable)

1. **Whooshes.** Go top to bottom through every zoom, slide, pan, camera move and scene transition. Audition the variations, pick one, and put its loudest point on the fastest frame at -12 dB (up to -10 for bigger moves).
2. **Textures.** Go top to bottom asking: where does something happen that isn't a slide?
   - Mechanical pop-ups → clicks and gears.
   - UI animations → sci-fi.
   - Text pops → pop.
   - Letter-by-letter → gears.
   - Reveals → sci-fi impact.
   - Transitions → camera click or sci-fi hit.
   Put each transient on the event frame at -6 to -7 dB.
3. **Risers and hits.** Go top to bottom asking where to build anticipation. Put the first riser about 5 s after the hook with a hit beneath, then cover segment changes and A-roll→B-roll (full-screen) cuts. Aim for at least 2 sharp bass and 2 metallic, at -5 dB.
4. **Music.** Only after passes 1-3 are approved: -19 dB under the talking head, never under graphics.

Each pass is rendered and reported separately (`sound_mix.py --passes 1`, then `1,2`, then `1,2,3`).

## 9. Never-do list (adapted)

- Never put music under an animation or graphic.
- Never use a whoosh for something that pops, and never a pop for something that slides.
- Never place a whoosh with its loudest point off the fastest frame (QC tolerance: 1 frame).
- Never push a whoosh above -10 dB.
- Never let any sound sit over the voice louder than the voice. Never lower or process the voice to make room.
- Never use a generated, downloaded or synthetic sound when the user's library has a fit. Never ship the self-test's synthetic sounds.
- Never place a variation without comparing the others in its folder (`auditioned` lists the IDs compared).
- Never put two sound families on one track.
- Never delete, overwrite, move or re-encode original audio or library files. All outputs are new files; the original audio stays in the source, simply not used in the mix ("muted").
- Never place a suck-back riser at a middle volume.
- Never invent a sound asset or report a sound as placed when the library doesn't have a fit. Say what is missing and ask.
- Never claim you listened to a sound. Claude measures and inspects audio; it cannot hear it. Say so, and ask the user to listen to the final mix.

## 10. Integration with the visual systems

Every animation gets a sound plan derived from its movement, its events and its purpose. Each Remotion beat kind declares its intents in its `*.timing.ts` (`sfx(props, fps)`), with times measured from the same pose functions the component renders; `edit_render.py sfx` exports them per beat. (HTML templates do the same via `window.sfxCues` and `render_html.js --cues`.) Priorities are `recommended`, `optional` and `silence-ok`.

### System A (on-screen visuals, speaker visible)

| Visual event | Sound | Default |
|---|---|---|
| Card, list or widget appears (fade + small rise) | UI click, or sci-fi impact if it's a *reveal* | recommended, -7 dB |
| Several rows or chips appear in sequence | one emphasis per element (mechanism gizmo / UI click), varied variations | recommended |
| Grid cells fill, counters tick | gears / mechanism, one per element, or one continuous gears clip if the ticks are under ~70 ms apart | recommended / optional |
| Line or curve draws, connector travels | short or futuristic whoosh on the fastest frame | optional (recommended when it travels far) |
| State change (active row, colour change, button press) | sci-fi click / UI click | recommended |
| Typing in a prompt bar | keyboard writing, trimmed to the typing window | recommended |
| Exit | silence | silence-ok |

**Keep A-layer sounds intimate** (shot scale = small UI). They play over speech more than any other system, so check every one against the voice (QC dialogue check). Prefer a pause between words for the transient.

### System B (text)

| Visual event | Sound | Default |
|---|---|---|
| Key phrase lands (serif/script/bold accent) | pop (clean whole-element pop), or sci-fi click for a techier edit | recommended, -7 dB |
| Connector words fade-rise | none | silence-ok |
| Letter-by-letter or typewriter text | gears, one emphasis per letter/element | recommended |
| Text slides in from off-frame (large travel) | whoosh on the fastest frame | recommended |
| Name super appears | UI click | optional |
| Big conclusion phrase | success reward (sparingly) | optional |

Text sound must never mask the word it decorates: the transient sits on the first visible frame, which is a few frames before the stressed syllable resolves.

### System C (full-screen)

| Visual event | Sound | Default |
|---|---|---|
| Cut into the scene | activate-energy / sci-fi entry, or camera click / sci-fi hit, on the cut frame | recommended |
| Build into the cut | riser resolving on the cut, hit beneath (pass 3) | recommended for section changes |
| Hero object or camera makes a big move | whoosh sized to the move: classy airy or organic wind for big and slow, deep voice or hollow for standard; -10 dB allowed | recommended |
| Big reveal | sci-fi impact, or heavenly choir for a "big deal" | one per scene |
| Numbers counting, small body text | gears, or silence | optional / silence-ok |
| Slow push of 5% or less | none | silence-ok |
| Music | **none** inside the scene | enforced by the mixer and QC |

Full-screen scenes carry the widest, roomiest sounds and the scene's single loudest moment.

## 11. Joseph's Remotion instructions in this pipeline

His document assumed Remotion, and so does this pipeline: **Remotion places and mixes every sound in the final render** (Remotion-first, `SKILL.md` rule 8). The cue sheet is planned with `sfx_plan.py`; `sound_mix.py` mixes it offline only so `sound_qc.py` can check the plan (anchors, presets, voice on top, headroom, the hits it pulls to avoid clipping); `edit_render.py sound-preview` / `final --session` put exactly those placements and gains into the Remotion composition as `<Audio>` layers, and `edit_qc.py` then checks the Remotion render itself (voice untouched, every effect present, no clipping). In the Studio, the SFX track of `edit.json` is placed by `StudioEdit` the same way.

| Joseph's document (Remotion) | This pipeline |
|---|---|
| Sound design "inside the Remotion project, on the composition timeline" | The **cue sheet** (`work/<slug>/sound/cues.json`, or the Studio's SFX track) is planned from the Remotion beats' measured motion and placed in the Remotion composition as `<Audio>` layers (`SFX <id>`); the final MP4 is rendered by Remotion with them. `sound_mix.py` is an offline check of the plan. |
| "Separate editable tracks so Joseph can inspect in Remotion Studio" | In Studio: one `<Audio>` sequence per placement (preview, ±½ frame). For mixing: **per-family stems** (DIALOGUE, WHOOSHES, TEXTURES, RISERS, HITS, ENV, MUSIC) aligned to 00:00:00:00, plus `cuesheet.csv` and `session.json`. Stems import into Premiere, Resolve, Final Cut, Audacity or any DAW. |
| Remotion `<Audio>` volume per clip | `gain_db` per cue (clip gain), with family presets; the preview converts it to `volume`. |
| Composition fps / frames | The approved fps of `Edit-<slug>` (the source's rate unless approved otherwise); timecodes in HH:MM:SS:FF. |
| "Mute anything that isn't the voice" in the composition | The mix uses the dialogue source and **excludes** other original audio (or a separate dialogue file is given). Original files are never modified or deleted, and the stems make "un-muting" a one-line change. |
| "Library connected to the project" | The user's authorised folders, **indexed in place** by `sfx_index.py` (`sound-library-index.md`). |
| "Audition the variations" (listening) | `sfx_audition.py`: measured envelope, transient, loudest point, length, loudness, brightness and low-end, drawn side by side. Claude inspects the sheet; it cannot listen. |
| "Joseph fixes something by hand in Remotion Studio" (Step 8) | The user edits `cues.json` (or tells Claude what they changed while previewing in Studio or in their NLE). Claude diffs the cue sheets and extends the same logic to every similar cue (`sound-design-workflow.md` §8). |
| "Generate a sound when the library has no fit" (one per generation) | No sound-effect generation model is available here. Report the gap and ask the user for a sound. Synthetic ffmpeg/numpy placeholders are allowed **only** for timing previews the user knows about, never in a delivered edit. |
| "You cannot EQ/muffle audio you didn't create" | ffmpeg *can* process audio here. Keep Joseph's spirit: don't reshape library sounds by default. If a processed variant is needed (muffled, filtered), write it as a **new file**, log it in the cue, and never touch the original. |
| Hand off in Remotion Studio for manual finishing | Hand off the Remotion render (`renders/final_vN.mp4`), the Remotion project (`Edit-<slug>` with its sound layers, or `edit.json` in the Studio), the analysis stems, `cuesheet.csv`, `cues.json` and the QC reports. Expect the user to refine; that's by design. |

## 12. Quick reference

```bash
python3 scripts/sfx_index.py scan /path/to/authorised/SFX              # index the user's library in place
python3 scripts/sfx_index.py search riser metallic --cat RIS
python3 scripts/sfx_audition.py --group "Whooshes/Hollow" --fit-duration 0.6 --out work/<slug>/sound/aud_hollow.png
python3 scripts/edit_render.py sfx <slug>                               # Remotion beats -> measured intents + timeline + plan.json
python3 scripts/video_events.py work/<slug>/renders/picture.mp4 --out work/<slug>/sound/video_events.json --strip work/<slug>/sound/events.png
python3 scripts/sfx_plan.py work/<slug>/sound/plan.json --out work/<slug>/sound/cues.json      # draft cue sheet (proposals)
python3 scripts/sound_mix.py work/<slug>/sound/cues.json --out work/<slug>/sound/final_v1 --passes 1,2,3 --no-music   # offline check of the plan
python3 scripts/sound_qc.py work/<slug>/sound/final_v1 --events work/<slug>/sound/video_events.json
python3 scripts/edit_render.py sound-preview <slug> --session work/<slug>/sound/final_v1/session.json   # the placements -> Remotion composition
python3 scripts/edit_render.py final <slug> --session work/<slug>/sound/final_v1/session.json          # Phase 5: Remotion renders the final, edit_qc checks it
python3 scripts/sound_selftest.py                                         # proves the toolchain works here
```
