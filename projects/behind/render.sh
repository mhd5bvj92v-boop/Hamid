#!/usr/bin/env bash
# "Are we actually behind?" - 9:16 overlay package (orange on black, cyber-path house style).
# Usage:
#   projects/behind/render.sh                 # render overlays + full-length alpha track + placeholder preview
#   projects/behind/render.sh /path/face.mp4  # ...and composite onto your real footage (work/edit_v1.mp4)
# Outputs go to projects/behind/work/ (git-ignored).
set -euo pipefail
IN="${1:-}"; FPS="${FPS:-60}"
HERE="$(cd "$(dirname "$0")" && pwd)"; SKILL="$HERE/../../video-visual-editing"; W="$HERE/work"
mkdir -p "$W"/{seq,mov,qc,sound}
cd "$SKILL"

# layer start times (video time, seconds). Provisional: taken from the script timestamps.
# Retime against your real take: move these, nothing else changes.
LAYERS=(
  "caption-serif-accent:01-hook:0.00"
  "progress-compare:02-compare:2.80"
  "stat-card:03-day:6.40"
  "live-ui-list:04-feed:11.40"
  "caption-serif-accent:05-doing:18.10"
  "fullscreen-iceberg-feed:06-iceberg:21.10"
  "caption-serif-accent:07-lost:26.00"
  "caption-serif-accent:08-behind:30.70"
)

# 1. render each beat as a transparent PNG sequence (beat 06 is the opaque full-screen)
for L in "${LAYERS[@]}"; do IFS=: read -r tpl beat at <<<"$L"
  [ -d "$W/seq/$beat" ] && [ -n "$(ls -A "$W/seq/$beat")" ] && [ -z "${FORCE:-}" ] && continue
  node scripts/render_html.js --html "templates/$tpl.html" --config "$HERE/beats/$beat.json" --out "$W/seq/$beat" --fps "$FPS" \
       --cues "$W/sound/${beat}_cues.json"
done

# 2. per-beat ProRes 4444 (alpha) for your NLE
for L in "${LAYERS[@]}"; do IFS=: read -r tpl beat at <<<"$L"
  python3 scripts/compose.py encode --frames "$W/seq/$beat" --fps "$FPS" --out "$W/mov/$beat.mov"
done

# 3. one full-length 35 s alpha track with every beat already placed (drop it above your clip at 00:00)
python3 "$HERE/tools/overlay_track.py" --fps "$FPS" --dur 35 --out "$W/mov/behind-overlays-full.mov" \
  $(for L in "${LAYERS[@]}"; do IFS=: read -r tpl beat at <<<"$L"; echo "$W/seq/$beat@$at"; done)

# 4. preview on the synthetic placeholder plate (NOT real footage) + synthesised music/SFX
python3 "$HERE/tools/make_audio.py" --out "$W/sound"
python3 "$HERE/tools/overlay_track.py" --fps "$FPS" --dur 35 --plate "$HERE/placeholder-plate.png" --audio "$W/sound/preview_mix.wav" \
  --out "$W/behind-preview-placeholder.mp4" $(for L in "${LAYERS[@]}"; do IFS=: read -r tpl beat at <<<"$L"; echo "$W/seq/$beat@$at"; done)

# 5. with real footage: composite + QC frames
if [ -n "$IN" ]; then
  python3 scripts/compose.py probe "$IN"
  args=(); for L in "${LAYERS[@]}"; do IFS=: read -r tpl beat at <<<"$L"
    if [ "$beat" = "06-iceberg" ]; then args+=(--fullscreen "$W/seq/$beat@$at"); else args+=(--layer "$W/seq/$beat@$at"); fi; done
  python3 scripts/compose.py overlay --base "$IN" --out "$W/edit_v1.mp4" "${args[@]}"
  for t in 2.2 5.2 9.4 16.8 20.4 23.5 28.4 34.6; do python3 scripts/compose.py frame "$W/edit_v1.mp4" --t $t --out "$W/qc/$t.png"; done
  echo "Done: $W/edit_v1.mp4 (voice from your clip). Music/SFX stems: $W/sound/music_bed.wav, $W/sound/sfx.wav"
fi
