#!/bin/bash
# usage: shared/stills.sh <epdir> <name> <times> <cols>x<rows>
set -e
cd "$(dirname "$0")/.."
out="$1/work/$2"; rm -rf "$out"; mkdir -p "$out"
node shared/render.js "$1" stills "$3" "$out" | grep -v "^still" || true
ffmpeg -y -loglevel error -pattern_type glob -i "$out/t*.jpg" -vf "scale=360:640,tile=$4" -frames:v 1 "$1/work/$2.jpg"
