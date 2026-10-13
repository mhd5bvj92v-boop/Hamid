# Implementation Guide: the HTML template toolchain

**The default engine for talking-head edits is Remotion (`remotion.md`).** This file documents the original toolchain, **HTML/CSS/SVG templates → Playwright/Chromium frame capture → ffmpeg**, which stays fully supported for:
- the **design sandbox**: the six templates are the reference-matched originals that the Remotion kit ports 1:1, and the place to prototype a new design quickly;
- **NLE handoff**: transparent ProRes 4444 / VP9 layers plus a timing sheet when the user finishes in Premiere, Resolve or Final Cut;
- a **fallback** where the Remotion app is not available (for example the skill uploaded to the Claude apps).

Its compositing commands (`compose.py overlay`) also keep the footage's audio and timing untouched. The timeline rules in `SKILL.md` apply to both engines.

## 0. Check the environment first

```bash
ffmpeg -version | head -1                     # required for compositing/encoding
node -e "console.log(process.version)"        # required for render_html.js
node scripts/render_html.js --html templates/stat-card.html --still 1 --out /tmp/vv_check.png   # proves Playwright + Chromium
python3 -c "import PIL; print(PIL.__version__)"   # required for library scripts
which blender whisper rembg 2>/dev/null       # optional: 3D, word timestamps, subject matting
```

If Playwright is missing: `npm i -D playwright && npx playwright install chromium`. On a machine with a preinstalled Chromium, set `CHROMIUM_PATH=/path/to/chromium`.
Fonts: the templates load Montserrat (the house sans, always used for sans text) and Playfair Display from Google Fonts. Offline, install the fonts locally or change `fonts` in the config. Always check a still to confirm the intended font actually rendered.

## 1. Template contract

Every template in `templates/` follows this contract:
- includes `_runtime.js` (and `_ui.css` for UI templates);
- defines `window.DEFAULT_CONFIG`, `setup(cfg)`, `renderFrame(t, cfg)` and `duration(cfg)`;
- poses everything from `t` alone (no CSS keyframes, no timers), so every frame is reproducible;
- uses a transparent body, so the output PNGs carry alpha. Full-screen templates paint their own background;
- sizes in `rem`, where `1rem = 10px` at 1080px width (scaled by `setup`). Configs use frame-fraction coordinates;
- opened directly in a browser, it auto-plays as a live preview.

| Template | System | Recreates |
|---|---|---|
| `templates/caption-serif-accent.html` | B | TXT-001..TXT-009 caption stacks + name supers |
| `templates/live-ui-list.html` | A | ONS-001 chips + node + connector, ONS-003 message cards |
| `templates/progress-grid.html` | A | ONS-004 calendar / progress grid |
| `templates/stat-card.html` | A / C | ONS-024, ONS-050 stat cards (`fullscreen: true` for System C) |
| `templates/ai-input-bar.html` | A | ONS-034, ONS-044 prompt bars |
| `templates/fullscreen-horizon-title.html` | C | FUL-002 horizon numeral title (HORIZON-ARC family) |

To build a new design, copy the closest template, keep the contract, and put the new design tokens in CSS variables. If the design should be reusable, add it to `templates/` and to the table above.

## 2. Render

```bash
# preview one frame over a real frame of the footage (opaque output)
node scripts/render_html.js --html templates/progress-grid.html --config work/beats/02.json \
     --still 1.8 --bg work/frames/t_0006.png --out work/preview/02.png

# full transparent sequence (match the footage fps and resolution)
node scripts/render_html.js --html templates/progress-grid.html --config work/beats/02.json \
     --out work/seq/02 --fps 30 --width 1080 --height 1920
```

## 3. Composite & encode (ffmpeg via `scripts/compose.py`)

```bash
# --layer: PNG sequence or alpha video placed at <seconds>
# --focus start:end:brightness:blur  -> here: dim to 62% + blur sigma 6 under beat 2
# --fullscreen: opaque full-screen scene placed at <seconds>
python3 scripts/compose.py overlay --base input.mp4 --out work/edit_v1.mp4 \
   --layer work/seq/01@0.40 \
   --layer work/seq/02@5.10 --focus 5.0:8.6:0.62:6 \
   --fullscreen work/seq/03@12.0
python3 scripts/compose.py encode --frames work/seq/02 --fps 30 --out work/layers/02.mov   # ProRes 4444 + alpha
python3 scripts/compose.py encode --frames work/seq/02 --fps 30 --out work/layers/02.webm  # VP9 + alpha
python3 scripts/compose.py frame work/edit_v1.mp4 --t 6.2 --out work/qc/6.2.png
```

Notes:
- Layers are scaled to the base resolution. Render them at the base resolution to avoid resampling.
- Audio from the base is copied untouched.
- `--focus` ramps in and out over ≤0.3s. Use it only when an overlay needs separation (see System A).
- Talking-head footage at 23.976/29.97 fps: pass `--fps 29.97` to the renderer and the encoder.

## 4. Other building blocks (use when available)

| Need | Tool | Notes |
|---|---|---|
| Word timestamps | the user's own timestamped script (default); `whisper`/`faster-whisper` only if installed and the user asks (label the times unverified) | Verify alignment on 3 random words |
| Subject matte (text behind subject, TXT-005) | `rembg` per frame, RobustVideoMatting, or the NLE's magic mask | Check hair edges at 200% |
| 3D objects / numerals / glass | Blender (Eevee + bloom, emission rims) → PNG sequence | `blender -b scene.blend -a` |
| Hero still for 3D-METAPHOR scenes | an image-generation or stock tool the user has | Record its source and licence. Animate with parallax layers |
| Halftone (EDITORIAL-PRINT) | ImageMagick `-ordered-dither h6x6a` or PIL on a grayscale cut-out | Keep the dot size consistent across scenes |
| Background blur / darken | `compose.py --focus` (gblur + colorchannelmixer) | |
| Light streaks / particles | Canvas in a template, or Blender particles | Keep them behind the text |
| Finishing in an NLE | ProRes 4444 layers + beat sheet | Premiere / Resolve / Final Cut import alpha directly |

## 4b. Audio / sound design toolchain (System D, used by both engines)

| Need | Tool (in `scripts/`) |
|---|---|
| Index the user's SFX library in place (category, Joseph role, duration, loudness, transient, loudest point, shape) | `sfx_index.py scan|search|show|set|build-doc` → `data/sounds.json` + `references/sound-library-index.md` |
| Audition variations by measurement (waveform/envelope sheet with anchors, fit to the movement length) | `sfx_audition.py` |
| Measure animation motion (fastest frames, visible frames) and the declared sound intents | Remotion beats: `edit_render.py sfx <slug>`; HTML templates: `render_html.js --analyze-only --motion X.json --cues Y.json` |
| Find cuts, motion peaks and speech in footage | `video_events.py` |
| Draft the cue sheet from layers + events | `sfx_plan.py` |
| Render stems + mix + final export (anchor-accurate placement, presets, music gating, hit-first clip protection) | `sound_mix.py` |
| Validate sync, levels, clipping, dialogue, assets and export | `sound_qc.py` |
| Prove the toolchain works in this environment | `sound_selftest.py` |

**Dependencies:** ffmpeg/ffprobe (decode, encode, loudness via `ebur128`, mux), Python 3 with numpy and Pillow. No scipy, librosa, sox or DAW is required. Audio is processed at 48 kHz in float32, and stems are written as 24-bit WAV. Memory is about 23 MB per stem per minute, which is fine for short-form; split very long videos into sections.

## 5. Performance

- Frame capture runs at roughly real time to a few times slower for 1080x1920, depending on effects (backdrop-filter and big blurs are the slowest). For long videos, render only each beat's time window, not the whole video.
- Use `--still` previews for design iteration and render sequences only once the design is approved.
- Work in a `work/` folder. PNG sequences are large: delete them after encoding, or keep only the `.mov` layers.

## 6. Verified in this skill's build (2026-10-13)

These commands were actually run during construction, on a synthetic 1080x1920 test plate (no real footage was available):
- all six templates rendered stills; QC comparisons were made against TXT-001, TXT-003, ONS-001, ONS-003, ONS-004, ONS-024, ONS-050, ONS-034 and FUL-002;
- `render_html.js` rendered transparent PNG sequences for the caption, progress-grid and horizon templates;
- `compose.py encode` produced ProRes 4444 (`yuva444p12le`) and VP9 alpha WebM files;
- `compose.py overlay` composited a caption (`.mov`), a grid (PNG sequence) with `--focus`, and a full-screen scene onto a 10s test clip with audio, and QC frames were extracted and inspected.
Results and known gaps are listed in `quality-control.md` → "Build-time test log".
