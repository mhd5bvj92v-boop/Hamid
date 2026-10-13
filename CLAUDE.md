# Project rules

This repository finishes the user's **already-cut talking-head videos** with Claude Code and Remotion.

- For any talking-head editing request (captions, overlays, full-screen scenes, sound design, export), use the **`video-editing`** skill (`.claude/skills/video-editing/SKILL.md`). Its workflow is the default for every project, and its non-negotiables override generic habits and other skills.
- Never cut, trim, re-order, speed-change or re-voice the user's footage, and never shorten or lengthen pauses. The original file is never modified; full-screen scenes cover the footage while its timeline keeps running. Prove it with `edit_qc.py` before delivering.
- The `remotion-best-practices` skill provides Remotion API knowledge only. Where it suggests something else (for example opening Studio instead of rendering, or cloud rendering), the `video-editing` workflow wins. Render locally; never deploy to AWS/Lambda or add paid render services.
- Rendered media and footage never go into git (`work/`, `remotion-app/out/`, `remotion-app/public/projects/` are ignored). Commit source only.
- Only use sound effects the user has authorised and that are actually indexed and accessible. Never claim a sound was added if it wasn't.
- Remotion's own browser download is blocked in the Claude Code cloud sandbox; the scripts fall back to the local Chromium headless shell automatically.
