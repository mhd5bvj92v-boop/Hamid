#!/bin/bash
# Rigged character models from the three.js examples (Mixamo rigs).
cd "$(dirname "$0")"
for f in Michelle.glb Xbot.glb; do [ -f $f ] || curl -sSf -o $f https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/$f; done
