---
name: gemini-neon-animation
description: Make a cinematic 3D/WebGL animated video (story or explainer) with Gemini 4 Neon in Google Antigravity, delivered as a self-contained HTML file that plays with sound plus an MP4 rendered frame-by-frame from the same code. Supports any visual style (default Storybook 3D, Photorealistic, Retro, Constellation Line Art, or any reference image/video) and optional Gemini API audio upgrade (Gemini TTS + Google Lyria music via .env). Use whenever someone says "create an animation", "make a 3D animation", "animate X", "make an animated explainer", or asks to redo or extend one of these videos.
---

# Gemini Neon Animation (`gemini-neon-animation`)

Makes a cinematic animated video — either a **story** or an **explainer** — powered by **Gemini 4 Neon** (in Google Antigravity or any compatible agent), delivered as one self-contained HTML file that plays in a browser with sound, plus a 1080p MP4 rendered frame-by-frame from the same deterministic code.

Everything lives in this skill folder (`SK`). `scripts/new_animation.sh` (or copying `template/` on Windows) starts a project `P` from `template/`, which holds a working 12-second example in the default Storybook 3D look.

## 1. Ask before building

Don't assume what the video is. Check the request for these four things:

- **Length**: how long the video should be (default: **30 seconds**).
- **Topic**: what it's about — a **story** (characters, a plot) or an **explainer** (how something works, a concept, a process). No default topic; do not start until you have one.
- **Style**: the visual look (default: **Storybook 3D**, see [references/default-style.md](references/default-style.md)). The user can name any style (e.g. `Photorealism`, `Stylized 3D`, `Retro Pixel`, `Constellation Line Art`) or point to a reference image/video.
- **Plan together or get straight to work**: plan the beats and character turnaround sheet first, or go straight to building (default: **straight to work**).

Ask only for what wasn't given, in one short message, naming the defaults. Fixed settings (don't ask): **16:9 at 1920×1080, 24 fps, music and sound effects on**.

**Style examples: look and motion only.** When given a reference video or image, extract only how it looks (palette, lighting, materials, line, texture, type) and how it moves (camera, timing, easing, transitions). Never copy its content, shot order, characters, or props. See [references/content-and-style.md](references/content-and-style.md).

## 2. Plan the video

- **Story:** a character who wants something, what gets in the way, and how it turns out, told in shots of characters in places.
- **Explainer:** one idea per beat, in viewer order. Show the thing itself working and move the camera to reveal each step. Short labels only; real facts only.
- Write a short beat list (one line per beat, with rough times).

**If planning together was chosen:**
1. Share the beat list.
2. Scaffold project `P`, build only the main characters / key objects, and run `node render.mjs --design` to generate the front / three-quarter / side turnaround sheet.
3. Wait for approval on the sheet + beat list before building all scenes.

**If straight to work was chosen:** post the beat list for reference and build immediately.

## 3. Start the project (Windows, macOS & Linux)

- `P` is the requested folder or `<slug>-animation/` in the current workspace.
- macOS/Linux: run `bash "$SK/scripts/new_animation.sh" "$P"`.
- Windows: copy `$SK/template` into `P`, run `npm install`, ensure `playwright` Chromium is installed (`npx playwright install chromium`), and ensure `ffmpeg` is on `PATH`.
- Layout: `src/beats.json` (title, length, cue times), `src/story.js` (sets, cast, shots), `src/kit.js` (shared Three.js/WebGL kit), `src/assets/title.woff2`, `audio/audio.py` + `audio/audiolib.py` (zero-API procedural synth), `audio/gemini_audio.py` (optional Gemini API TTS + Lyria cinematic score), `build.mjs`, `render.mjs`, and `build/` for outputs.

## 4. Build with Gemini 4 Neon

Read [references/craft.md](references/craft.md) before writing scene code.

1. **Beats (`src/beats.json`)**: single source of truth for `title`, `duration`, `fps`, and named `cues` shared by visuals and sound.
2. **Sets, cast, props**: build each location once as a `THREE.Scene` using `kit.js` helpers. Put every character/key object in `cast` and `design` so the film and `--design` sheet stay identical.
   - **Articulated human limb tip**: keep arms short and tapered with mitten hands; always verify `--design` and `--stills` contact sheets so joints never invert, clip, or float.
3. **Pure deterministic `t`**: every frame depends solely on global time `t` (`keys`, `seg`, `ease`, `onPath`, `pose()`). Zero `Math.random()`, zero wall-clock state, zero frame-to-frame carryover.
4. **Shots**: ordered list with `set`, `dur`, `cam(local, p)`, and optional `in` transition (`dissolve`, `dip`, `iris`, `whip`, `wipe`). Durations must sum to `duration`.
5. **Quick still check**: `node build.mjs` → `node render.mjs --stills 1,4.5,9` → inspect `build/stills/sheet.jpg` and fix geometry/framing issues before full render.

## 5. Sound — Local Synth or Gemini API + Lyria Cinematic Upgrade

- **Default (Zero API key)**: edit `audio/audio.py` with mood-matched music and cue-synced SFX, then run `python audio/audio.py build/audio.wav`.
- **Cinematic Upgrade (Gemini TTS + Google Lyria via `.env`)**:
  1. When the user asks for cinematic music or voiceovers, create a `.env` file in project `P` containing only `GEMINI_API_KEY=` (never ask the user to paste their API key into chat!).
  2. Have the user get a key from `https://aistudio.google.com` → **API keys** → **Create API key**, paste it into `.env`, and save.
  3. Run `python audio/gemini_audio.py --music-prompt "<mood>" --out build/audio.wav` (optionally `--vo-text "<script>" --voice Kore`) using `lyria-3.5` for orchestral/cinematic scoring and `gemini-3.8-flash-tts` for studio narration, mixed with cue SFX at `-16 LUFS`.

## 6. Render & Contact-Sheet Review

1. `node build.mjs` bundles code, font, and sound into `build/<slug>.html`.
2. `node render.mjs` renders in parallel via headless Chromium (`pathToFileURL` + cross-platform FFmpeg concat), mixes audio at `-16 LUFS`, and outputs `build/<slug>.mp4` plus 1-frame-per-second `build/review/contact-*.jpg`.
   - Use `--scale 0.5` for fast drafts, `--scale 2` for 4K, `--from` / `--to` for partial re-renders.
3. Inspect every contact sheet against [references/content-and-style.md](references/content-and-style.md) (continuity across cuts, feet grounded, clean limbs, readable titles, audio synced to actions). Fix and re-render until spotless.

## 7. Deliver

- Deliver both `build/<slug>.html` (click/space to play, arrow keys to step frames) and `build/<slug>.mp4`, with length and a one-line summary of any defaults chosen.
- For revisions, archive the previous cut to `P/v1/` (`v2/`, ...) before re-rendering.
