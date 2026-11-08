#!/bin/bash
# usage: ./stills.sh <name> <times> <cols>x<rows>
set -e
cd "$(dirname "$0")"
out="work/$1"; mkdir -p "$out"
node render.js stills "$2" "$out" | grep -v "^still" || true
ffmpeg -y -loglevel error -pattern_type glob -i "$out/t*.jpg" -vf "scale=360:640,tile=$3" -frames:v 1 "work/$1.jpg"
