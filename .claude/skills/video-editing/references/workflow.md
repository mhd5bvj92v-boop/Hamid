# Editing Workflow (talking-head video or script → finished visuals and sound)

Follow these steps in order. Steps 0-10 cover the visuals (Systems A-C), and step 7b covers the sound (System D, detailed in `sound-design-workflow.md`). Each step produces a concrete artifact in the project's `work/` folder, so progress is inspectable and resumable.

## 0. Intake

- Gather what you have: video file(s), script/transcript, aspect ratio, platform, brand colours/fonts, deadline, and the final destination (finished MP4, or overlay layers for an NLE).
- Probe the footage: `python3 scripts/compose.py probe input.mp4`. Extract review frames: `python3 scripts/compose.py frames input.mp4 --every 1 --out work/frames`.
- Check the tools: `ffmpeg`, `node` + Playwright/Chromium (`node scripts/render_html.js` errors clearly if they are missing), plus optionally Blender, an ASR (whisper), and a matting tool. For sound, run `python3 scripts/sound_selftest.py` and check the sound library (`python3 scripts/sfx_index.py search`). If it's empty, ask the user for an authorised SFX folder. Write down what is available in `work/notes.md`. Plan only with tools that exist.
- If only a script exists (no video), design for the script and mark all timings as provisional.

## 1. Understand the story

Read or listen to the whole thing before designing anything. Write `work/story.md`:
- The one-sentence point of the video.
- The structure: hook, setup, main points, payoff/CTA (with timestamps).
- The emotional arc: where trust and face matter most, and where energy should peak.
- The concrete nouns, numbers, names, tools, comparisons and processes mentioned.

## 2. Find the moments that need visual support

Go through the transcript and mark candidate beats. A beat qualifies if at least one is true:
- it contains a number, name, tool, list, comparison or process (good for System A);
- it is the hook, a rule, or a memorable phrase (good for System B);
- it is an abstract idea, a metaphor, a section break or a big reveal (good for System C).

Then **remove** candidates that are emotional or personal, that come less than ~4s after another beat with no new idea, or where the speaker is already showing something with their hands. Aim for clarity, not coverage.

## 3. Decide the treatment for each beat

For each beat, decide in this order:
1. **Nothing.** Is the face alone strongest here? If yes, keep it.
2. **Text (System B).** Is the *phrase itself* the point?
3. **On-screen (System A).** Would a familiar object (card, list, chart, UI) make it instantly concrete while keeping the speaker?
4. **Full-screen (System C).** Does it need the whole frame (metaphor, big number, structure, chapter)?

Budget guideline for a 60s talking head: about 6-10 text beats, 3-6 on-screen beats and 1-3 full-screen beats. Adjust to the content; it is not a quota.

## 4. Find references

For each beat, run `python3 scripts/search.py <keywords> --cat ONS|TXT|FUL`. Shortlist 1-3 IDs, then **open the images with Read** (the paths are printed). Do not design from memory or from the text descriptions alone. Read each entry's Observed vs Inferred notes (`--show ID`).

## 5. Write the visual concept

Create `work/edit-plan.md`, a beat sheet the user can approve:

```
| # | In-Out (s) | Spoken words | System | Concept (one line) | Refs | Family | Template/tool |
|---|-----------|--------------|--------|--------------------|------|--------|---------------|
| 1 | 0.4-2.9 | "What's the 30,000ft view on..." | B | sans lead + amber serif "30,000ft" | TXT-001 | SERIF-ACCENT-CAPTION | caption-serif-accent |
| 2 | 5.1-8.6 | "...consistency in posting" | A | 30-day calendar fills to 15/30 | ONS-004 | LIVE-UI | progress-grid |
| 3 | 12.0-14.8 | "we've helped over 300..." | C | horizon rises, 300 counts up | FUL-002 | HORIZON-ARC | fullscreen-horizon-title |
```

Add a **Sound** column with each beat's sound intent: whoosh, texture, riser/hit, or **silence**, following `sound-design.md` §10. Also state the section palette and family choices, chosen from the footage's grade (see `design-language.md` §5). **Share the plan with the user before heavy rendering** when a review loop is possible.

## 6. Develop each animation

For every beat, write a config JSON (`work/beats/02-calendar.json`) with exact timestamps from the transcript. Copy and modify a template when the design needs more than config. Keep `_runtime.js` timing helpers, and keep everything deterministic (`renderFrame(t)` must depend only on `t`).

## 7. Implement

- Overlays: `node scripts/render_html.js --html templates/<template>.html --config work/beats/NN.json --out work/seq/NN --fps <footage fps>`.
- Full-screen scenes: the same, with an opaque template (or Blender / generated-image paths, see `system-c-full-screen.md`).
- Composite: `python3 scripts/compose.py overlay --base input.mp4 --out work/edit_v1.mp4 --layer work/seq/01@0.40 --layer work/seq/02@5.10 --focus 5.0:8.6:0.62:6 --fullscreen work/seq/03@12.0`.
- For NLE handoff: `python3 scripts/compose.py encode --frames work/seq/NN --out work/layers/NN.mov` (ProRes 4444 with alpha), plus the beat sheet as the timing sheet.

## 7b. Sound design (System D)

Do this after the picture is locked (or at least the beat timings). The full procedure is in `sound-design-workflow.md`.

1. **Measure:** run `render_html.js --analyze-only --motion --cues` for every beat, and `video_events.py` on the composite.
2. **Draft:** run `sfx_plan.py` to produce `cues.json`, then write the breakdown (MOVEMENT / EVENT / BUILD / SILENCE) and report it.
3. **Pass 1 (whooshes), pass 2 (textures), pass 3 (risers and hits):** audition the variations, fill in `sound` and `auditioned`, then render with `sound_mix.py --passes ... --no-music` and report after each pass.
4. **Validate:** `sound_qc.py` must exit 0. Hand off for review.
5. **Pass 4 (music):** only after approval, -19 dB under the talking head, silent in `fullscreen_windows`. Then re-run QC.

## 8. Preview

- Render stills first: `node scripts/render_html.js ... --still <t> --bg work/frames/t_0012.png --out work/preview/NN.png` at the beat's key moments (entering, landed, before exit).
- Then render the composite and extract QC frames: `python3 scripts/compose.py frame work/edit_v1.mp4 --t 6.2 --out work/qc/6.2.png`.
- Look at the frames yourself with Read. Do not assume they look right.

## 9. Compare with the references

`python3 scripts/compare.py --render work/qc/6.2.png --refs ONS-004 --out work/qc/cmp-02.png`, then open it.
Judge it with `quality-control.md`. Write the result in `work/qc/report.md`: what matches, what differs, and what you will change.

## 10. Improve

Fix the gaps (scale, colour, timing, legibility, clutter), re-render, and re-compare. Usually 1-3 rounds. Stop when every beat passes QC or when the remaining gaps are limitations of the tools (state those honestly).

## Delivering

Tell the user exactly what exists:
- files produced (paths, durations, resolution, codec), including `final.mp4`, the sound stems, `cuesheet.csv`, `cues.json` and `qc_report.md`;
- the sound QC numbers: errors and warnings, true peak, loudest stack, sync errors, and the cues deliberately left silent. Say that the mix was verified by measurement and ask the user to listen;
- what was rendered and checked (which frames you inspected);
- what was *not* done or is approximate (for example: "3D hourglass replaced by a 2.5D still", "no ASR available, timings by hand", "fonts substituted").

Never claim a render, validation or tool output that did not happen.
