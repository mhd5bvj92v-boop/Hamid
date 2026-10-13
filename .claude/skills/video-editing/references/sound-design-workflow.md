# Sound Design Workflow (System D, step by step)

This is how Claude performs the sound design on a real project in this environment, with no Remotion. It is the operational counterpart to `sound-design.md`, which holds the rules and taste. Everything runs from the skill folder; project files live in the project's `work/` folder.

Claude does the editing: analysis, cue sheet, sound selection, placement, mix, export and validation. **Claude measures and inspects audio but cannot hear it.** Never write "I listened to" anything. Write "measured" or "auditioned by analysis", and ask the user to listen to the final mix.

---

## Step 0. Confirm tools and assets

```bash
ffmpeg -version | head -1 && ffprobe -version | head -1
python3 -c "import numpy, PIL; print('numpy', numpy.__version__)"
node scripts/render_html.js --html templates/stat-card.html --still 1 --out /tmp/vv_check.png   # only if animations are rendered here
python3 scripts/sound_selftest.py          # ~1 min: proves index -> audition -> mix -> QC on synthetic fixtures (temp folder)
```

If any of these is missing, stop and tell the user exactly what's missing. Don't fall back to Remotion or to tools that aren't installed.

**Library:** `python3 scripts/sfx_index.py search` (or read `sound-library-index.md`).
- If it is **empty**, ask the user for an authorised SFX folder, then run `sfx_index.py scan <folder>`.
- Search only folders the user has provided or authorised. Never scan system folders or download sounds without explicit approval.
- Review entries marked `signal (low)` or `UNC`, and fix them with `sfx_index.py set ID --category ... --role ...`.

**Picture and voice:**
- Locate the edited picture: the composite from the visual systems (`work/edit_vN.mp4`) or the user's export.
- Locate the dialogue source. If the picture's audio track is just the voice, the cue sheet's `dialogue.file` is the picture itself. If the original audio also contains music or old effects, ask for a clean dialogue file. The old audio is then simply not used ("muted"); it is never deleted or edited.
- Note the fps (`compose.py probe`). All timing is frame-based.

## Step 1. Analyse first, always

Never place a single sound before this breakdown exists.

1. **Animations built with this skill** (exact, measured). For every rendered beat, run:
   ```bash
   node scripts/render_html.js --html templates/<template>.html --config work/beats/NN.json \
        --analyze-only --motion work/sound/NN_motion.json --cues work/sound/NN_cues.json --fps <footage fps>
   ```
   - The **motion report** gives every element's movement segments, with travel, fastest frame, first-visible and last-visible frames. `MOVEMENT` means a slide or zoom (whoosh); `MICRO` means a drift inside a pop (texture or silence).
   - The **cue file** gives the template's declared sound intents (`recommended` / `optional` / `silence-ok`), with times resolved from the measured motion.
   - Times are layer-relative. The plan's `offset` (the layer's `@start` in `compose.py`) places them on the video timeline.
2. **Footage and existing animations** (candidates, to be confirmed visually):
   ```bash
   python3 scripts/video_events.py work/edit_v1.mp4 --out work/sound/video_events.json --strip work/sound/events.png
   ```
   This finds cuts (transition frames), motion segments with their fastest frame, and speech regions. Open the strip with Read and keep only real edit events. Gestures and head turns don't get sound.
3. **Story and voice:** take the hook end, segment changes, chapters, reveals and conclusions from the edit plan (`work/edit-plan.md`) and the transcript.
4. **Draft the cue sheet:**
   ```bash
   python3 scripts/sfx_plan.py work/sound/plan.json --out work/sound/cues.json
   ```
   `plan.json` lists the video, `hook_end`, every layer (`cues` file, `offset`, `system`, `fullscreen` + `duration`), the optional `events` file and the optional user `music`.
5. **Write the breakdown** (`work/sound/breakdown.md`) and report it before placing anything. One row per moment, classified as **MOVEMENT** (whoosh), **EVENT** (texture) or **BUILD** (riser and hit), plus the deliberate **SILENCE** decisions:
   ```
   | TC          | Moment                          | Class    | Source of timing            | Plan                      |
   |-------------|---------------------------------|----------|-----------------------------|---------------------------|
   | 00:00:04:28 | horizon planet rises (03)       | MOVEMENT | motion: .planet fastest     | classy airy, -10 dB       |
   | 00:00:03:27 | calendar card revealed (02)     | EVENT    | motion: .pg first visible   | sci-fi impact, -7 dB      |
   | 00:00:04:27 | cut into full-screen (03)       | BUILD    | layer offset / detected cut | metallic riser + hit      |
   | 00:00:03:09 | caption exits                   | SILENCE  | -                           | exits stay silent         |
   ```

## Step 2. Ask, then wait (when a review loop exists)

Ask 2 or 3 questions that change the palette: Is there anything to avoid? Is any moment special? Which moment should be the loudest? If the user isn't available, state your assumptions in the breakdown and proceed.

## Steps 3-5. The passes

For each cue in the pass:

1. **Choose by the rules** (`sound-design.md` §3-5). Look up candidates with `sfx_index.py search ...` or the `candidates` list in the draft.
2. **Audition the variations by analysis:**
   ```bash
   python3 scripts/sfx_audition.py --group "<variation folder>" --fit-duration <movement seconds> --out work/sound/aud_<cue>.png
   ```
   Open the sheet. Pick the variation whose length, attack (time to loudest point) and weight fit the moment. Record your choice in the cue as `"sound": "WSH-004"` and `"auditioned": ["WSH-003", "WSH-004", "WSH-005"]`, with a one-line `reason`.
3. **Keep the measured target time.** `t` is the fastest frame for movements, the event frame for textures, and the transition frame for risers and hits. Keep `link.event_t` pointing at the visual event so QC can verify it.
4. **Use the preset gain.** Deviate only with a `gain_override_reason`.
5. **Mark silence explicitly** with `"status": "silence"` or `"rejected"` and a reason.

Render and report after each pass:

```bash
python3 scripts/sound_mix.py work/sound/cues.json --out work/sound/pass1 --passes 1 --no-music
python3 scripts/sound_mix.py work/sound/cues.json --out work/sound/pass2 --passes 1,2 --no-music
python3 scripts/sound_mix.py work/sound/cues.json --out work/sound/pass3 --passes 1,2,3 --no-music
python3 scripts/sound_qc.py work/sound/pass3 --events work/sound/video_events.json
```

Report each pass from `cuesheet.csv`: what was placed, where (timecode), which variation was chosen and why, and what was deliberately left silent.

## Step 6. Flag the mix

`qc_report.md` names the **loudest stack** and any clipping. If clipping happens:
- the mixer has already pulled the **hits** that caused it and logged `auto_fixes`;
- if it still clips, lower the riser/hit stack or move it off the speech;
- never touch the voice;
- `--limiter` exists for emergencies only, and using it must be reported as a deviation.

## Step 7. Hand off for review, then music

Deliver pass 3 for review. Add music only after approval:

```bash
python3 scripts/sound_mix.py work/sound/cues.json --out work/sound/final_v1 --passes 1,2,3      # includes "music" from cues.json
python3 scripts/sound_qc.py work/sound/final_v1 --events work/sound/video_events.json
```

**Music** goes in `cues.json` as `"music": {"file": "<user track>", "gain_db": -19, "fade": 0.4}`. The mixer silences it inside `fullscreen_windows` and `graphic_windows`, and QC verifies that.

## Step 8. Learn from corrections

When the user changes something, either by editing `cues.json` or by reporting what they changed in their NLE/DAW (moved a whoosh 2 frames earlier, swapped a variation, changed a level):

1. Diff the old and new cue sheets: `python3 -c "import json;..."`, or read both.
2. Name the rule behind the change. For example: "whooshes on card slides lead the fastest frame by 2 frames", "this edit prefers sci-fi impact over UI click for reveals", or "textures sit at -8 dB on this voice".
3. Apply the same rule to **every similar cue** in the video (same family, same kind of visual event). Re-render and report which cues changed.
4. If the user says "every X in this sequence, replace with ID", do it across the whole sequence in one pass.

## Deliverables (what "done" means)

All of these live in `work/sound/final_vN/`:

| File | What it is |
|---|---|
| `final.mp4` | Picture stream copied untouched, plus the mixed audio (AAC 320k, 48 kHz) |
| `mix.wav` | The full mix, 48 kHz / 24-bit |
| `stems/*.wav` | DIALOGUE, WHOOSHES, TEXTURES, RISERS, HITS, ENV, MUSIC, each aligned to 00:00:00:00, to drop onto separate tracks in any NLE/DAW |
| `cuesheet.csv` | Track, cue, anchor timecode, clip-in timecode, file, gain, event and reason |
| `session.json` | Every placement as rendered, plus source file hashes and auto-fixes |
| `qc_report.md` / `.json` | The validation results |

Also deliver the editable `cues.json` itself. Report the numbers from the QC report: errors and warnings, true peak, the loudest stack, the sync errors in milliseconds, and which cues were left silent and why.

## Cue sheet schema (`cues.json`)

```json
{
  "video": "/abs/path/edit_v1.mp4",
  "dialogue": {"file": "/abs/path/edit_v1.mp4", "gain_db": 0},
  "hook_end": 3.0,
  "fullscreen_windows": [[12.0, 14.8]],
  "graphic_windows": [],
  "music": null,
  "mix": {"ceiling_dbfs": -1.0},
  "cues": [
    {"id": "W01", "pass": 1, "family": "whoosh", "t": 12.033, "sound": "WSH-004", "gain_db": -10,
     "auditioned": ["WSH-003", "WSH-004", "WSH-005"], "event": "03 horizon: planet rises",
     "reason": "big slow move -> classy airy, -10 for size", "link": {"event_t": 12.033, "what": "planet fastest frame"}},
    {"id": "T07", "pass": 2, "family": "texture", "times": [5.71, 5.79, 5.88], "sound": "MEC-002", "gain_db": -7,
     "event": "02 calendar cells fill"},
    {"id": "R02", "pass": 3, "family": "riser", "subtype": "metallic", "t": 12.0, "sound": "RIS-003", "gain_db": -5,
     "trim": [0.6, null], "fade_in": 0.05, "event": "build into full-screen"},
    {"id": "H02", "pass": 3, "family": "hit", "t": 12.0, "sound": "HIT-001", "gain_db": -6, "event": "under R02"},
    {"id": "01-exit", "family": "texture", "t": 3.3, "status": "silence", "reason": "exits stay silent"}
  ]
}
```

**Field reference:**

| Field | Meaning |
|---|---|
| `family` | `whoosh` \| `texture` \| `riser` \| `hit` \| `env`. This sets the default `track`, `anchor` and `gain_db`. |
| `anchor` | `peak` (loudest point; default for whoosh and riser), `onset` (transient; default for texture and hit), `start` or `end`. Use `anchor_offset` (seconds into the clip) to hand-pick the hit point. |
| `lead_frames` | Shifts the anchor earlier. Joseph leads cut-transition sounds by 2-3 frames. Don't lead textures on event frames or whooshes on fastest frames. |
| `times` | A sequence: one emphasis per element. `sounds: [..]` alternates variations. |
| `trim [in, out]`, `fade_in`, `fade_out` | Shape a clip non-destructively. Anchors are re-measured after the trim. |
| `track` | Override the track (e.g. `TEXTURES_2` when two textures overlap). Never mix families on one track. |
| `status` | `proposed` (draft), `silence` / `rejected` (deliberately not placed), or `review`. |
| `subtype` | `sharp-bass` \| `metallic` \| `suck-back` \| ... Used by the QC style and level checks. |

## Timing maths for this skill's easings (where the fastest frame is)

| Easing (`_runtime.js`) | Fastest point of the move |
|---|---|
| `outCubic`, `outQuart`, `outQuint`, `outExpo` | at the very start (frame 1 of the move) |
| `inCubic` | at the very end |
| `inOutCubic`, `inOutSine` | the midpoint |
| `linear` | constant speed: put the whoosh's loudest point at the midpoint |

Always prefer the measured value from `--motion` over this table. The table is for sanity checks and for moves made outside the templates.

## Acceptance criteria (check before handing off)

- [ ] The breakdown was written before the first pass, and a report was given after each pass.
- [ ] Every edit movement has a whoosh with its loudest point on the fastest frame (±1 frame), at -12 dB (max -10), or an explicit silence decision.
- [ ] Every non-slide event that needs emphasis has a texture on its event frame (±1 frame), at -6 to -7 dB.
- [ ] A riser resolves about 5 s in, after the hook, with a hit beneath. Section changes and cuts into full-screen scenes are built. The target of 2 sharp bass + 2 metallic risers is met, or the reason it isn't is stated.
- [ ] No music under any full-screen or graphic window, and music at -19 dB under the talking head (pass 4, after approval).
- [ ] The voice is untouched (the stem is bit-identical to the source) and nothing is louder than it during speech.
- [ ] No clipping: mix sample peak and final true peak are within the ceiling. The loudest stack was identified and reported.
- [ ] One family per track. Original audio and every library file are unchanged (sha256).
- [ ] Every placed sound was compared with its variations (`auditioned`).
- [ ] `final.mp4` exists, has picture and audio, and its picture is bit-identical to the edited picture.
- [ ] `sound_qc.py` exits 0. Report its warnings honestly.
