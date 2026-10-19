#!/usr/bin/env bash
# Render + composite pipeline for "Choosing a path in cybersecurity".
# Usage: projects/cyber-path/render.sh /path/to/input.mp4 [fps]
# Run from anywhere; outputs go to projects/cyber-path/work/ (git-ignored).
set -euo pipefail
IN="${1:?usage: render.sh input.mp4 [fps]}"; FPS="${2:-30}"
HERE="$(cd "$(dirname "$0")" && pwd)"; SKILL="$HERE/../../video-visual-editing"; W="$HERE/work"
mkdir -p "$W"/{seq,frames,qc,sound}
cd "$SKILL"

# 0. probe + review frames (check: face zone, free chest band, grade warm or cool?)
python3 scripts/compose.py probe "$IN"
python3 scripts/compose.py frames "$IN" --every 1 --out "$W/frames"

# 1. render each beat as a transparent PNG sequence (full-screen beat 7 is opaque)
r() { node scripts/render_html.js --html "templates/$1.html" --config "$HERE/beats/$2.json" --out "$W/seq/$2" --fps "$FPS" \
        --motion "$W/sound/$2_motion.json" --cues "$W/sound/$2_cues.json"; }
r caption-serif-accent     01-hook
r caption-serif-accent     02-hacking
r caption-serif-accent     03-different-things
r live-ui-list             04-paths
r caption-serif-accent     05-really-cool
r caption-serif-accent     06-something-else
r fullscreen-portal-tunnel 07-rabbit-hole
r caption-serif-accent     08-hardest-parts
r caption-serif-accent     09-stick-with

# 2. composite (start times = video time of each layer; keep in sync with edit-plan.md)
python3 scripts/compose.py overlay --base "$IN" --out "$W/edit_v1.mp4" \
  --layer "$W/seq/01-hook@0.00" \
  --layer "$W/seq/02-hacking@6.40" \
  --layer "$W/seq/03-different-things@11.80" \
  --layer "$W/seq/04-paths@14.00" \
  --layer "$W/seq/05-really-cool@28.60" \
  --layer "$W/seq/06-something-else@31.20" \
  --fullscreen "$W/seq/07-rabbit-hole@35.30" \
  --layer "$W/seq/08-hardest-parts@46.40" \
  --layer "$W/seq/09-stick-with@53.30"

# 3. QC frames at the landing moments; open them and compare with the refs
for t in 3.2 7.6 13.2 17.4 30.2 32.0 37.0 48.2 55.2; do python3 scripts/compose.py frame "$W/edit_v1.mp4" --t $t --out "$W/qc/$t.png"; done
python3 scripts/compare.py --render "$W/qc/17.4.png" --refs ONS-001 --out "$W/qc/cmp-04.png"
python3 scripts/compare.py --render "$W/qc/3.2.png"  --refs TXT-001 --out "$W/qc/cmp-01.png"

# 4. sound (System D): needs an indexed SFX library (scripts/sfx_index.py scan <folder>)
python3 scripts/video_events.py "$W/edit_v1.mp4" --out "$W/sound/video_events.json" --strip "$W/sound/events_strip.png"
cp "$HERE/sound-plan.json" "$W/sound/plan.json"     # layer offsets: keep in sync with step 2 above
python3 scripts/sfx_plan.py "$W/sound/plan.json" --out "$W/sound/cues.json"
echo "Done. Draft cue sheet: $W/sound/cues.json  (next: choose sounds, then sound_mix.py passes 1 / 1,2 / 1,2,3 + sound_qc.py)"
