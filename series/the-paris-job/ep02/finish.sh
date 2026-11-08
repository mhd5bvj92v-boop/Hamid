#!/bin/bash
# Join rendered segments + soundtrack (-14 LUFS) -> output/
set -e
cd "$(dirname "$0")"
printf "file 'seg0.mp4'\nfile 'seg1.mp4'\nfile 'seg2.mp4'\n" > work/seg/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i work/seg/list.txt -c copy work/video.mp4
python3 audio.py
OUT=../../../output/the-paris-job_ep02_the-competition
ffmpeg -y -loglevel error -i work/video.mp4 -i work/audio.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart ${OUT}_share.mp4
echo done
