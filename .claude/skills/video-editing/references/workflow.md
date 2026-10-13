# Editing Workflow (already-cut talking head → finished visuals, sound and export)

This is the **default workflow for every talking-head project**. The user supplies a video that is already cut: its cuts, pauses, reactions, dialogue and pacing are intentional. Claude adds text, on-screen visuals, full-screen animations and sound design, then composites and exports. Claude never edits the cut itself.

Every step writes a concrete artifact to `work/<slug>/` (git-ignored), so progress is inspectable and resumable. Editable sources live in `remotion-app/src/projects/<slug>/` (Remotion, plus the committed creative decision log) and `work/<slug>/sound/cues.json` (sound).

**The user is the Creative Director.** These craft steps run inside the five mandatory phases of `creative-director.md`:

| Phase | Steps here |
|---|---|
| 1 Analyze | 0 Intake, 1 Story (timecoded transcript), 2 Moments (+ keep-visible) |
| 2 Options | 3 Treatments, 4 References → three concepts A/B/C per major moment + D, preview frames |
| 3 Approval | 5 Storyboard → the user approves the direction (gate) |
| 4 Animation preview | 6 Build, 8 Sound (draft), motion previews, feedback rounds (gate) |
| 5 Final render | only after the explicit final approval: 7 Picture, 8 Sound (final mix), 9 Final QC, Delivering |

## The timeline contract (read before every project)

| Never | Allowed |
|---|---|
| remove footage, add cuts, rearrange or re-order clips | layering graphics over the footage |
| change speed; shorten or lengthen pauses | covering the footage with a full-screen scene while it keeps running underneath |
| replace the dialogue or generate a different voice | adding effects and music *under* the untouched dialogue |
| automatic zooms or reframing nobody asked for | a dim/blur of the footage behind a busy overlay (look only, `FOCUS` in `beats.ts`) |
| animations that exist only for retention | a centre crop to 9:16 when the source is not vertical, **only with the user's approval** (`--fit cover`) |

How it is enforced:
- the footage enters only through `SourceFootage` (no trim, speed, loop or order props exist);
- the composition is exactly `round(source duration × fps)` frames long, and `TalkingHeadEdit` throws if it is not;
- the final mix uses the **original** file's dialogue at 0 dB (`sound_mix.py` refuses any other gain);
- `edit_qc.py` compares the export with the original: duration, frame count, frame-by-frame alignment outside the graphics, the return to sync after every full-screen scene, audio lag 0 ms, and the original's sha256.

## 0. Intake

```bash
python3 scripts/edit_init.py /path/to/my-cut.mp4 --slug my-video
```

- It probes the footage (resolution, rotation, frame rate, VFR, duration, audio), records its sha256, links the original's folder into `remotion-app/public/projects/<slug>/footage/` (no copy), writes `work/<slug>/project.json`, and creates `remotion-app/src/projects/<slug>/` with the composition `Edit-<slug>`.
- **Frame rate:** the approved rate defaults to the source's constant frame rate. A variable-frame-rate source, or any other delivery rate, needs `--fps N` after the user approves it. State the rate in the plan.
- **Aspect:** a source that isn't 9:16 stops intake. Ask the user how to reframe; `--fit cover` (centre crop) only after approval.
- Extract review frames at the source resolution and look at them: `python3 scripts/compose.py frames <original> --every 1 --out work/<slug>/frames`.
- Check the tools once per environment: `python3 scripts/edit_selftest.py` (Remotion render + mix + QC on synthetic media, ~2 min). Check the sound library: `python3 scripts/sfx_index.py search`. If it's empty, ask for an authorised SFX folder and say plainly that no sound effects can be placed until then. Write what is available in `work/<slug>/notes.md`. Plan only with tools and assets that exist.

## 1. Understand the story

Watch/listen to the whole cut and read the transcript before designing anything. Get word timestamps (a user-supplied transcript/SRT, or a local ASR such as whisper if installed; check before promising). Write `work/<slug>/plan/story.md`:
- the one-sentence point of the video;
- the structure: hook, setup, main points, payoff/CTA (with timestamps);
- the emotional arc: where trust and face matter most, where energy peaks;
- the concrete nouns, numbers, names, tools, comparisons and processes mentioned.

The pacing is the user's. Don't note places to tighten, cut or speed up; that is not this job.

## 2. Find the moments that need visual support

Mark candidate beats in the transcript. A beat qualifies if at least one is true:
- it contains a number, name, tool, list, comparison or process (System A);
- it is the hook, a rule, or a memorable phrase (System B);
- it is an abstract idea, a metaphor, a section break or a big reveal (System C).

Then **remove** candidates that are emotional or personal, that come less than ~4s after another beat with no new idea, where the speaker is already showing something with their hands, or whose only purpose would be "keeping attention". Aim for clarity, not coverage.

## 3. Decide the treatment for each beat (feeds the A/B/C concepts)

For each beat, in this order (the result is your *recommendation*; the user still sees three concepts for every major moment):
1. **Nothing.** Is the face alone strongest here? Keep it.
2. **Text (System B).** Is the *phrase itself* the point? (hooks, rules, key words)
3. **On-screen (System A).** Would a familiar object (card, list, chart, label, diagram) make it concrete while the speaker stays visible?
4. **Full-screen (System C).** Does it need the whole frame (metaphor, big number, structure, chapter)? It covers the footage briefly; the dialogue continues.

Budget guideline for a 60s talking head: about 6-10 text beats, 3-6 on-screen beats and 1-3 full-screen beats (full-screen ≤ 20-25% of the runtime). It is not a quota.

## 4. Find references

For each beat, run `python3 scripts/search.py <keywords> --cat ONS|TXT|FUL`. Shortlist 1-3 IDs, then **open the images with Read**. Read each entry's Observed vs Inferred notes (`--show ID`). The library is the primary design inspiration: if a reference fits better than a kit component, build a new component from the reference rather than reusing a generic one.

## 5. Options, storyboard and approval (Phases 2-3)

Present A, B, C (+ D, + "three new concepts") per major moment in chat, with concept preview frames (`edit_render.py concept-frames`), record them (`edit_decisions.py propose`), then give the grouped storyboard (`edit_decisions.py storyboard`). The exact format and rules are in `creative-director.md`. Record the user's choices (`decide`) and wait for their approval of the direction (`approve --gate direction`).

The technical plan behind it goes in `work/<slug>/plan/edit-plan.md`:

```
Source: my-cut.mp4, 1080x1920, 30 fps, 58.4 s (timeline preserved: 1752 frames, no cuts/speed changes)
Approved frame rate: 30 fps (source)   Palette: warm amber accents (warm grade)   Sound library: 214 sounds indexed

| # | In-Out (s) | Spoken words | System | Concept (one line) | Refs | Kind / component | Sound |
|---|-----------|--------------|--------|--------------------|------|------------------|-------|
| 1 | 0.4-2.9 | "What's the 30,000ft view on..." | B | sans lead + amber serif "30,000ft" | TXT-001 | CaptionAccent | pop on key word |
| 2 | 5.1-8.6 | "...consistency in posting" | A | 30-day calendar fills to 15/30 | ONS-004 | ProgressGrid (port) | UI click + gears |
| 3 | 12.0-14.8 | "we've helped over 300..." | C | horizon rises, 300 counts up | FUL-002 | HorizonTitle | riser + hit, classy airy |
```

State what is *not* touched (the cut, the dialogue, the pacing) and any approximation. Nothing goes into `beats.ts` before the direction is approved.

## 6. Build in Remotion (Phase 4)

- Concepts for previews live in `concepts.ts` (`moment`, `option`, `round`, `beat`). After the direction approval, copy the chosen concepts (and D, implemented as the user described) into `beats.ts`.
- Write the beats in `remotion-app/src/projects/<slug>/beats.ts`: `id`, `kind`, `at` (seconds on the source timeline), `props` (times inside are seconds from the beat start), `reason`, `refs`. Use word timestamps for `at` and line/word times. Set `HOOK_END` (seconds) for the first riser.
- Kit kinds: `CaptionAccent` (B, TXT-001..009), `StatCard` (A; C with `fullscreen: true`; ONS-024/050), `HorizonTitle` (C, FUL-002). For anything else, port the closest template or build from the chosen references as a new component with a pure `*.timing.ts` (see `remotion.md` §4).
- Preview stills over the real footage at key moments (entering, landed, before exit): `python3 scripts/edit_render.py still <slug> --t <s>`. Open them with Read. Use Remotion Studio (`cd remotion-app && npm run dev`) for live review.
- **Motion previews for the user:** `edit_render.py preview <slug> --beat <id>` (half resolution, ±0.6 s handles, dialogue + draft sound) or `--all` for the whole edit. Send them, ask for feedback, record it (`edit_decisions.py feedback`), apply it, repeat. Record `approve --gate preview` when the user is happy with the previews.

## 7. Picture (Phase 5: only after the explicit final approval)

```bash
python3 scripts/edit_decisions.py approve <slug> --gate final --quote "<the user's words>"
python3 scripts/edit_render.py picture <slug>        # work/<slug>/renders/picture.mp4 (+ render log); refuses without the final approval
```

Extract QC frames from it (`compose.py frame`), compare them with the references (`compare.py`), and fix (steps 9-10).

## 8. Sound design (System D)

Draft in Phase 4, once the beat timings are approved; the final mix in Phase 5. Full procedure: `sound-design-workflow.md`.

1. **Measure:** `python3 scripts/edit_render.py sfx <slug>` writes `timeline.json`, per-beat sound intents measured from the same pose functions the components render (fastest frame, first visible frame), and `plan.json` (video = the picture, dialogue = the original). Optionally `video_events.py` on the picture for cuts and motion in the footage.
2. **Draft:** `python3 scripts/sfx_plan.py work/<slug>/sound/plan.json --out work/<slug>/sound/cues.json`, then write the breakdown (MOVEMENT / EVENT / BUILD / SILENCE) and report it.
3. **Passes 1-3:** audition, fill in `sound` and `auditioned`. In Phase 4, `edit_render.py draft-sound <slug>` mixes the current cue sheet as a draft (no export) and feeds the motion previews and Studio; report what was placed after each pass. In Phase 5, render the final with `sound_mix.py --passes 1,2,3` against the approved picture.
4. **Validate:** `sound_qc.py` must exit 0.
5. **Studio preview:** `python3 scripts/edit_render.py sound-preview <slug> --session work/<slug>/sound/final_vN/session.json` lets the user hear the placements in Remotion Studio.
6. **Pass 4 (music):** only after approval, -19 dB under the talking head, silent in full-screen windows. Re-run QC.

If the library is empty or has no fitting sound, place nothing and say so. Never invent or claim a sound.

## 9. Final QC

```bash
python3 scripts/sound_qc.py work/<slug>/sound/final_vN
python3 scripts/edit_qc.py <slug> --final work/<slug>/sound/final_vN/final.mp4
```

Both must exit 0. Then look at the frames yourself (`quality-control.md`): every beat entering, landed and before exit, plus the first and last frame of every full-screen scene.

## 10. Improve

Fix the gaps (scale, colour, timing, legibility, clutter), re-render, and re-compare. Usually 1-3 rounds. Stop when every beat passes QC or when the remaining gaps are limitations of the tools (state them honestly).

## Delivering

Tell the user exactly what exists:
- `work/<slug>/sound/final_vN/final.mp4` (1080x1920, approved fps, H.264 + AAC) with its duration and frame count, and the `edit_qc` and `sound_qc` results;
- the editable sources: `remotion-app/src/projects/<slug>/` (beats, components), `cues.json`, the stems and `cuesheet.csv`;
- what was rendered and checked (which frames you inspected);
- the sound numbers: errors and warnings, true peak, loudest stack, sync errors, deliberate silences; say the mix was verified by measurement and ask the user to listen;
- what was *not* done or is approximate (inferred motion, substituted fonts, missing sound categories).

Never claim a render, validation or tool output that did not happen. Rendered media stays out of git.
