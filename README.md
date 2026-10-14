# Talking-head video finishing: Claude Code + Remotion

This repository turns an **already-cut** talking-head video into a premium vertical edit. Claude never re-edits the cut: no removed footage, new cuts, re-ordering, speed changes, re-timed pauses or replaced dialogue. It adds:

1. **Text design and text animation** (System B)
2. **On-screen visuals and overlays** beside the visible speaker (System A)
3. **Full-screen animations** that cover the footage while the original timeline keeps running underneath (System C)
4. **Sound design** based on Joseph's system (Ultimate Editors) (System D)
5. **Final compositing and export**: a 1080x1920 H.264 MP4 at the approved frame rate

| Part | Where |
|---|---|
| The editing skill (rules, workflow, reference library, sound system, scripts) | [`.claude/skills/video-editing/`](.claude/skills/video-editing/SKILL.md) |
| The Remotion app (edit kit, one project per video, the Creative Director Studio) | [`remotion-app/`](remotion-app/README.md) |
| Official Remotion Agent Skill (API knowledge) | [`.claude/skills/remotion-best-practices/`](.claude/skills/remotion-best-practices/SKILL.md), pinned in `skills-lock.json` |
| Project rules for Claude Code | [`CLAUDE.md`](CLAUDE.md) |

Claude Code discovers both skills automatically in any session started in this repository. The `video-editing` skill is the default workflow for every talking-head project.

## You are the Creative Director

Every video goes through five phases (`.claude/skills/video-editing/references/creative-director.md`):

1. **Analyze:** you provide your timestamped script (pasted, SRT, VTT or JSON; imported exactly as written, problems flagged for you to fix). Claude studies the footage and dialogue and finds the moments that could use visuals and the ones where staying on camera is stronger.
2. **Options:** for every major moment, Claude offers **A, B, C** (three genuinely different concepts from your reference library, with real preview frames) and **D, your own idea**. You can always ask for three new concepts.
3. **Approval:** a concise, grouped, timecoded storyboard. You approve the creative direction.
4. **Animation preview:** Claude builds it in Remotion and sends short motion previews with draft sound. You request changes.
5. **Final render:** only after you explicitly approve the edit.

All choices, concept rounds, feedback and approvals are saved per project in one file, `remotion-app/src/projects/<slug>/edit.json` (readable as `CREATIVE-LOG.md`). The Remotion Player, the previews and the final render all read it. The final render refuses to run without your recorded approval.

## The Creative Director Studio

```bash
cd remotion-app && npm i && npm run studio      # http://127.0.0.1:3010
```

Two connected workspaces over one `edit.json` and one Remotion composition:
- **Scene Planning:** set the Constants for the Whole Edit, then plan sentence by sentence: scene type (Captions Only, Captions + UI, Halfscreen, Fullscreen, with examples from your library), what happens on screen, optional "Ask Claude for Ideas" with A/B/C/D, then approve the plans.
- **Timeline Editor:** the multi-track timeline, Remotion Player, inspector, sound track and export. Retime a scene in either view and the other, its animation and its sounds follow.

Claude Code processes your requests in a Claude Code session (no automatic Claude connection): `python3 .claude/skills/video-editing/scripts/edit_decisions.py pending`. It writes the Remotion components; nothing counts as built until Remotion has rendered it. **Everything you export is rendered by Remotion**: your original footage and dialogue (unchanged), every animation layer and every sound effect, then QC. Quick Drafts are instant template versions, labelled as such. Details: `.claude/skills/video-editing/references/remotion.md` §8. Tests: `npm run studio:test`, `studio:test:claude`, `studio:test:plan`.

## The workflow in short

```bash
cd remotion-app && npm i && cd ..                                         # once
S=.claude/skills/video-editing/scripts
python3 $S/edit_init.py /path/to/my-cut.mp4 --slug my-video                # probe + hash + link the original (never copied or modified)
(cd remotion-app && npx tsx scripts/import-transcript.ts my-video /path/to/script.srt)   # your script, as written
# phases 1-3 with Claude: analysis, A/B/C/D options + preview frames, storyboard, your approval (edit_decisions.py, edit_render.py concept-frames)
python3 $S/edit_render.py sfx my-video                                     # measured sound intents -> plan.json
python3 $S/sfx_plan.py work/my-video/sound/plan.json --out work/my-video/sound/cues.json
python3 $S/edit_render.py draft-sound my-video && python3 $S/edit_render.py preview my-video --all   # phase 4 previews
python3 $S/edit_decisions.py approve my-video --gate final --quote "<your words>"                     # phase 5, after your approval
python3 $S/sound_mix.py work/my-video/sound/cues.json --out work/my-video/sound/final_v1 --passes 1,2,3   # offline check of the sound plan
python3 $S/sound_qc.py work/my-video/sound/final_v1
python3 $S/edit_render.py final my-video --session work/my-video/sound/final_v1/session.json
#   Remotion renders THE final (footage + every layer + those sounds) -> work/my-video/renders/final_v1.mp4,
#   then edit_qc proves duration, frames, sync, the dialogue untouched and every effect present
```

`work/`, `remotion-app/out/` and `remotion-app/public/projects/` are git-ignored: rendered media never goes into the repository. Rendering is local only (no AWS/Lambda, no paid render service).

## Checks

```bash
python3 .claude/skills/video-editing/scripts/validate.py        # library, docs, gain presets, Remotion kit, timeline contract
python3 .claude/skills/video-editing/scripts/edit_selftest.py   # end-to-end on synthetic footage, incl. tampered exports that must fail
python3 .claude/skills/video-editing/scripts/sound_selftest.py  # sound toolchain on synthetic fixtures
cd remotion-app && npm run lint && npm run test:render          # lint + type-check; Step 2 render checks
cd remotion-app && npm run studio:test                          # Creative Director Studio end-to-end (Chromium)
```

## What's inside the skill

| Part | Contents |
|---|---|
| Reference library | 182 unique references (ONS 79, TXT 10, FUL 93) from all 219 files of `inspiration.zip`, originals byte-for-byte, observed vs inferred notes, measured palettes, contact sheets, `search.py` |
| Design language | principles, tokens, composition patterns and 13 style-family recipes linked to reference IDs |
| Systems A/B/C | when to use, how to design, Remotion implementation, mistakes, QC, sound per system |
| Remotion edit kit | `remotion-app/src/kit/`: `SourceFootage` (untouched, full-length base layer), `TalkingHeadEdit`, `CaptionAccent` (TXT-001..009), `StatCard` (ONS-024/050), `HorizonTitle` (FUL-002), house motion, sound preview |
| Sound design (System D) | Joseph's rules and gain presets (whoosh -12/-10, texture -6..-7, riser -5, music -19 dB under the talking head only), library indexing in place, audition, cue sheet, sample-accurate mix with the original dialogue untouched, QC. The SFX library is **currently empty**. |
| Workflow scripts | `edit_init`, `edit_decisions` (creative log), `edit_render`, `edit_qc`, `edit_selftest`; the HTML template toolchain (`render_html.js`, `compose.py`) stays available for prototyping and NLE layer handoff |

## Adding sound effects or references

```bash
cd .claude/skills/video-editing
python3 scripts/sfx_index.py scan /path/to/your/SFX     # indexed in place; nothing is copied or modified
python3 scripts/ingest.py scan /path/to/new-images --batch-name batch-002   # then Claude fills the draft; ingest.py commit; validate.py
```

## History

The skill used to live in `video-visual-editing/` at the repository root (still in the git history). `dist/video-visual-editing.skill` is the package built before Step 1; it predates the Remotion workflow and still says "No Remotion". Rebuild it before uploading it to the Claude apps.
