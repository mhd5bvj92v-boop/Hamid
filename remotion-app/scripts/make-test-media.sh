#!/usr/bin/env bash
# Generates the TEST-ONLY media used by the Remotion setup check.
# Nothing here is real footage or an authorised sound effect: the files
# are synthetic sync markers and are git-ignored (public/test-media/).
#
#   public/test-media/footage.mp4  1080x1920, 60 fps, 5 s, H.264 + AAC
#                                  white flash on frames 150-152 and a
#                                  1 kHz beep starting at 2.500 s (same instant)
#   public/test-media/pop.wav      0.15 s decaying tone, used as the
#                                  "card lands" marker in the overlay
#
# Replace the footage with real talking-head footage in public/footage/ and
# pass it as the `footageSrc` prop of the FootageComposite composition.
set -euo pipefail
cd "$(dirname "$0")/.."
out=public/test-media
mkdir -p "$out"
font=$(fc-match -f '%{file}' 'DejaVu Sans Mono' 2>/dev/null || true)
counter=""
if [ -n "$font" ] && [ -f "$font" ]; then
  counter=",drawtext=fontfile=${font}:text='TEST FOOTAGE  frame %{frame_num}':x=(w-tw)/2:y=h-220:fontsize=44:fontcolor=white@0.55"
fi

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "gradients=s=1080x1920:r=60:d=5:c0=0x0d1117:c1=0x2b3a55:c2=0x14202e:n=3:speed=0.015" \
  -f lavfi -i "aevalsrc=0.5*sin(2*PI*1000*t)*between(t\,2.5\,2.6):s=48000:d=5" \
  -filter_complex "[0:v]drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill:enable='between(n,150,152)'${counter},format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -preset veryfast -crf 20 -r 60 -c:a aac -b:a 160k \
  -movflags +faststart -t 5 "$out/footage.mp4"

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "aevalsrc=0.6*sin(2*PI*660*t)*exp(-30*t):s=48000:d=0.15" \
  "$out/pop.wav"

echo "Test media written to $out/"
