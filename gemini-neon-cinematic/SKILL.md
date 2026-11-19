---
name: gemini-neon-cinematic
description: Make a short cinematic 2D hand-drawn animated sequence in the style of classic Japanese feature animation (Ghibli-inspired tapered ink lines, cel shading, watercolor/gouache painted backgrounds, acting on twos) with Gemini 4 Neon in Google Antigravity. Delivered as one self-contained HTML file that plays with sound plus an MP4 rendered from the same code, with optional Gemini TTS + Google Lyria orchestral music via .env.
---

# Gemini Neon Cinematic (`gemini-neon-cinematic`)

Makes a short hand-drawn cinematic sequence styled after classic Japanese feature animation (tapered ink lines, restrained cel shading, textured watercolor/gouache backgrounds, acting on twos) powered by **Gemini 4 Neon**. Delivered as one standalone HTML file + a 1080p MP4 rendered frame-by-frame from the same deterministic code.

Everything lives in this skill folder (`SK`). `scripts/new_cinematic.sh` (or copying `template/` on Windows) starts a project `P` from `template/`, which holds a working 13-second example (*"The Straw Hat"*).

## 1. Clarify before building

Never invent the premise. Check the request for:
- **Subject**: who or what the scene is about.
- **Setting**: where and when (place, time of day, weather, season).
- **Action**: what happens from start to end.
- **Length**: default **30 seconds**.
- **Plan together or get straight to work**: default **straight to work**.

Ask only for missing items in one short message. Fixed settings (don't ask): **16:9 at 1920×1080, 24 fps, music and sound effects on**.

## 2. Core aesthetic & what to avoid

Read [references/look.md](references/look.md) before designing anything.
- **Art direction**: organic tapered ink lines, restrained cel shadows (one shadow tone + subtle rim light), watercolor/gouache painted background plates with lived-in weathering (chipped paint, moss, worn paths).
- **Directing**: strong key poses, acting on twos (`on2(t)` = 12 drawings/sec), cameras on ones (smooth 24fps pans), anticipation, weight, and follow-through (wind in hair, cloth, grass).
- **Eliminate cheap digital tells**: no uniform vector strokes, no glossy plastic 3D shading, no stamped identical trees/clouds, no robotic uniform easing, no frame-by-frame flickering noise.

## 3. Plan & Start project (Windows, macOS & Linux)

- Find the emotional turn: what the subject wants/feels at the start and how it shifts by the end.
- Write a shot list (wide establishing → medium action → close-up emotional beat → release shot).
- If planning together: run `node render.mjs --design` for character/prop turnaround approval before building shots.
- macOS/Linux: `bash "$SK/scripts/new_cinematic.sh" "$P"`.
- Windows: copy `$SK/template` into `P`, run `npm install`, ensure Playwright Chromium and `ffmpeg` are available.
- Put characters/props in `src/05_*.js`, `src/06_*.js` and shots in `src/10_*.js`, `src/20_*.js` (`build.mjs` concatenates `src/*.js` in name order).

## 4. Build

Read [references/craft.md](references/craft.md) before writing scene code.
1. `src/beats.json`: single timing table (`title`, `duration`, `fps`, `cues`).
2. Paint each shot's background once into an offscreen plate in `prep`, then draw moving layers on top each frame.
3. Every frame depends solely on `t` (use `RNG(seed)`, `hash`, `n1`/`n2` — zero `Math.random()`).
4. Quick check: `node build.mjs` → `node render.mjs --stills 1,4.5,9` → inspect `build/stills/sheet.jpg`.

## 5. Sound — Local Synth or Gemini API + Lyria Cinematic Score

- **Default (Zero API key)**: edit `audio/audio.py` (piano/strings/woodwind theme + ambience + cue SFX) and run `python audio/audio.py build/audio.wav`.
- **Cinematic Upgrade (Gemini TTS + Google Lyria via `.env`)**:
  1. Create `.env` in project `P` with `GEMINI_API_KEY=` (never paste the key in chat).
  2. Obtain a key from `https://aistudio.google.com` → **API keys**.
  3. Run `python audio/gemini_audio.py --music-prompt "<cinematic mood>" --out build/audio.wav` (optionally `--vo-text "<narration>" --voice Kore`) for studio-grade Lyria music and Gemini TTS narration.

## 6. Render, Polish & Deliver

1. `node build.mjs` → `build/<slug>.html`.
2. `node render.mjs` → `build/<slug>.mp4` + `build/review/contact-*.jpg` (cross-platform Windows/macOS/Linux).
3. Inspect contact sheets against [references/review.md](references/review.md): consistent proportions, strong framing, every paused frame holds up as a film still.
4. Deliver `build/<slug>.html` and `build/<slug>.mp4`. Archive revisions to `P/v1/`, `P/v2/`.
