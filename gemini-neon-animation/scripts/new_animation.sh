#!/bin/bash
# Start an animation project from the skill's template and check the tools it needs.
# usage: new_animation.sh <project-folder>
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; P="$1"
[ -z "$P" ] && { echo "usage: new_animation.sh <project-folder>"; exit 1; }
if [ -e "$P/src/story.js" ]; then echo "$P already has a project; not overwriting"; exit 1; fi
mkdir -p "$P"; cp -R "$HERE/../template/." "$P/"; chmod +x "$P/py"; cd "$P"
missing=()
command -v node >/dev/null || missing+=("node (brew install node)")
command -v ffmpeg >/dev/null || missing+=("ffmpeg (brew install ffmpeg)")
[ ${#missing[@]} -gt 0 ] && { echo "missing: ${missing[*]}"; exit 1; }
npm install --silent --no-audit --no-fund
# Playwright: use one that's already installed (cloud containers have it); only install if none works.
if ! node -e "require('playwright')" 2>/dev/null; then
  echo "installing playwright + chromium (one time)"; npm install --silent --no-audit --no-fund -D playwright; npx playwright install chromium
fi
# Python with numpy + scipy for the sound
if ! python3 -c "import numpy, scipy" 2>/dev/null; then
  V="$HOME/.cache/animation-skill/venv"
  [ -x "$V/bin/python3" ] || python3 -m venv "$V"
  "$V/bin/python3" -c "import numpy, scipy" 2>/dev/null || "$V/bin/pip" install -q numpy scipy
fi
echo "ready: $P  (edit src/beats.json, src/story.js, audio/audio.py)"
