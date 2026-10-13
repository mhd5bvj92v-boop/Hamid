# Video Visual Editing Skill

A reusable Claude Skill for premium short-form video editing. It has four coordinated systems:

- **A:** on-screen visuals
- **B:** text and text animation
- **C:** full-screen animations, built from a curated reference library
- **D:** professional sound design, adapting Joseph's (Ultimate Editors) system to this toolchain

The skill itself does not use Remotion: its own pipeline is HTML templates, Playwright and ffmpeg.

## Remotion app (composition engine)

[`remotion-app/`](remotion-app/README.md) is a Remotion 4 project (React and TypeScript). It renders vertical 1080 × 1920, 60 fps H.264 MP4s and supports footage as a background layer, transparent overlays and frame-accurate audio. The official Remotion Agent Skill is installed at project level in [`.claude/skills/remotion-best-practices/`](.claude/skills/remotion-best-practices/SKILL.md) and pinned in `skills-lock.json`.

```bash
cd remotion-app && npm i && npm run test:render   # render the test compositions and verify them
```

Note: the `video-editing` skill still contains the rule "No Remotion, ever" (non-negotiable 8 and its validator). It has deliberately not been changed yet. Decide how the two should work together before using both in one edit.

- **Skill source:** [`.claude/skills/video-editing/`](.claude/skills/video-editing/SKILL.md) (skill name `video-editing`)
- **Installable package:** [`dist/video-visual-editing.skill`](dist/video-visual-editing.skill) (zip archive, about 21 MB). It was built before the move and still uses the old folder and skill name `video-visual-editing`. Apart from the name and the packaging note in `SKILL.md`, its content matches the current source byte for byte.

The skill used to live in `video-visual-editing/` at the repository root. It was moved to `.claude/skills/video-editing/` so Claude Code discovers it automatically. Only three things changed: the `name:` field and the packaging note in `SKILL.md`, and the `"skill"` label in `data/references.json`. Every other file is byte-identical. The old path is still in the git history.

## What's inside

| Part | Contents |
|---|---|
| Reference library | 182 unique references (ONS 79, TXT 10, FUL 93) built from all 219 files of `inspiration.zip`. Originals are preserved byte-for-byte (37 duplicate/resized copies kept as linked alternates). Each entry records 12 fields, separating **observed** detail from **inferred** motion and use. Palettes are measured from the pixels. |
| Searchable index | `references/library/INDEX.md`, per-category docs, `FAMILIES.md`, `SOURCES.md` (every original file → ID), contact sheets, `scripts/search.py` |
| Design language | 10 principles, colour/type/shape tokens, composition patterns and 13 style-family recipes, all linked to reference IDs |
| Visual systems | A on-screen visuals, B text and text animation, C full-screen animations: when to use, how to design and implement, mistakes, QC, plus a sound design section for each |
| Workflow | 10-step process from story → beats → references → plan → build → sound (System D passes) → preview → compare → improve |
| Tooling | Deterministic HTML animation templates, `render_html.js` (Playwright → transparent PNG sequences), `compose.py` (ffmpeg: ProRes 4444/WebM alpha, overlay, focus dim/blur, full-screen cuts), `compare.py` (side-by-side QC). Remotion is not required. |
| Sound design (System D) | `references/sound-design.md` (Joseph's philosophy, families, selection tables, levels, passes, integration with A/B/C, Remotion replacements) and `references/sound-design-workflow.md` (procedure + cue-sheet schema). Also `references/sound-library-index.md` (your SFX library, indexed in place; **currently empty**), the unmodified source in `references/sources/`, and the scripts `sfx_index`, `sfx_audition`, `video_events`, `sfx_plan`, `sound_mix`, `sound_qc` and `sound_selftest`. The motion-measured sound intents live in every template. |
| Extensibility | `ingest.py scan/commit` (exact and perceptual duplicate detection, alternates, next IDs, batch log), `validate.py` (integrity, checksums, docs in sync) |

## Install

- **This repository:** nothing to do. Claude Code loads project skills from `.claude/skills/`, so any session started in this repo has `video-editing` (also available as `/video-editing`).
- **Claude Code (personal):** copy `.claude/skills/video-editing/` to `~/.claude/skills/video-editing/`
- **Claude Code (other project):** copy it to `<project>/.claude/skills/video-editing/`
- **Claude apps:** upload `dist/video-visual-editing.skill` where Skills are managed

Requirements: Python 3 with Pillow and numpy; Node + Playwright/Chromium and ffmpeg for rendering; ffmpeg + numpy for sound.

## Adding your sound effects

```bash
cd .claude/skills/video-editing
python3 scripts/sfx_index.py scan /path/to/your/SFX     # indexed in place; nothing is copied or modified
python3 scripts/sound_selftest.py                       # checks the sound toolchain in this environment
```

## Adding more references later

```bash
cd .claude/skills/video-editing
python3 scripts/ingest.py scan /path/to/new-images --batch-name batch-002
# Claude analyses each new image and fills data/inbox/draft.json
python3 scripts/ingest.py commit
python3 scripts/validate.py
```

See `.claude/skills/video-editing/references/extending-library.md`.
