#!/usr/bin/env bash
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-my-documentary}"
mkdir -p "$DEST"
cp -R "$SK/template/"* "$DEST/"
mkdir -p "$DEST/assets/archive" "$DEST/build"
echo "Initialized gemini-neon-documentary project in $DEST"
echo "Next: cd $DEST && npm install && node build.mjs && node render.mjs --stills 2,6,11"
