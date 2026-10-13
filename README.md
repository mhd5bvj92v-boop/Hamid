# Video Visual Editing Skill

A reusable Claude Skill for premium short-form video editing, built from a curated reference library of on-screen visuals, text animations and full-screen animations.

- **Skill source:** [`video-visual-editing/`](video-visual-editing/SKILL.md)
- **Installable package:** [`dist/video-visual-editing.skill`](dist/video-visual-editing.skill) (zip archive, about 21 MB)

## What's inside

| Part | Contents |
|---|---|
| Reference library | 182 unique references (ONS 79, TXT 10, FUL 93) built from all 219 files of `inspiration.zip`. Originals are preserved byte-for-byte (37 duplicate/resized copies kept as linked alternates). Each entry records 12 fields, separating **observed** detail from **inferred** motion and use. Palettes are measured from the pixels. |
| Searchable index | `references/library/INDEX.md`, per-category docs, `FAMILIES.md`, `SOURCES.md` (every original file → ID), contact sheets, `scripts/search.py` |
| Design language | 10 principles, colour/type/shape tokens, composition patterns and 13 style-family recipes, all linked to reference IDs |
| Three systems | A on-screen visuals, B text and text animation, C full-screen animations: when to use, how to design and implement, mistakes, QC |
| Workflow | 10-step process from story → beats → references → plan → build → preview → compare → improve |
| Tooling | Deterministic HTML animation templates, `render_html.js` (Playwright → transparent PNG sequences), `compose.py` (ffmpeg: ProRes 4444/WebM alpha, overlay, focus dim/blur, full-screen cuts), `compare.py` (side-by-side QC). Remotion is not required. |
| Extensibility | `ingest.py scan/commit` (exact and perceptual duplicate detection, alternates, next IDs, batch log), `validate.py` (integrity, checksums, docs in sync) |

## Install

- **Claude Code (personal):** copy `video-visual-editing/` to `~/.claude/skills/video-visual-editing/`
- **Claude Code (project):** copy it to `<project>/.claude/skills/video-visual-editing/`
- **Claude apps:** upload `dist/video-visual-editing.skill` where Skills are managed

Requirements: Python 3 + Pillow for the library scripts; Node + Playwright/Chromium and ffmpeg for rendering.

## Adding more references later

```bash
cd video-visual-editing
python3 scripts/ingest.py scan /path/to/new-images --batch-name batch-002
# Claude analyses each new image and fills data/inbox/draft.json
python3 scripts/ingest.py commit
python3 scripts/validate.py
```

See `video-visual-editing/references/extending-library.md`.
