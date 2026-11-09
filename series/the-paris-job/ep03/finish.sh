#!/bin/bash
# Join rendered segments + sound design (-14 LUFS, true peak under -1.5 dB) -> output/
set -e
cd "$(dirname "$0")"
printf "file 'seg0.mp4'\nfile 'seg1.mp4'\nfile 'seg2.mp4'\nfile 'seg3.mp4'\n" > work/seg/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i work/seg/list.txt -c copy work/video.mp4
python3 audio.py
ffmpeg -y -loglevel error -i work/audio.wav -af "loudnorm=I=-14:TP=-2:LRA=11,aresample=48000,alimiter=limit=0.7:attack=1:release=60:level=false" -ar 48000 work/audio_norm.wav
OUT=../../../output/the-paris-job_ep03_lockdown
ffmpeg -y -loglevel error -i work/video.mp4 -i work/audio_norm.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 23 -maxrate 9M -bufsize 18M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart ${OUT}_share.mp4
ffmpeg -y -loglevel error -i ${OUT}_share.mp4 -vf scale=720:1280 -c:v libx264 -profile:v main -level 4.0 -preset slow -b:v 1500k -maxrate 2000k -bufsize 4000k \
  -pix_fmt yuv420p -c:a aac -b:a 128k -ar 44100 -movflags +faststart ${OUT}_small.mp4
echo done
