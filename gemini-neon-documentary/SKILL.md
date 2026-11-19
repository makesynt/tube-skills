---
name: gemini-neon-documentary
description: Create narrated investigative, historical, science, or forensic documentary videos with Gemini 4 Neon in Google Antigravity — combining a continuous-camera 3D-parallax archival Evidence Board (real public-domain photos, maps/blueprints, voice-locked crimson ink circles, taut strings, typewriter tags, rubber stamps) with seamless 12fps vintage 2D etching/cyanotype animated reconstructions for moments where no camera existed. Delivered as a self-contained HTML file plus a 1080p MP4 with -14 LUFS sound and Contact-Sheet QA.
---

# Gemini Neon Documentary (`gemini-neon-documentary`)

Build broadcast-grade narrated documentary videos in code — powered by **Gemini 4 Neon** in **Google Antigravity** (or any compatible coding agent) — without CapCut, Premiere, or After Effects.

Every project combines **two deterministic Canvas 2D engines** driven by a single master clock and outputs both a **self-contained interactive `.html` documentary** (with embedded archival images and sound) and a **1080p MP4** (`-14 LUFS`) verified via multi-frame Contact Sheets:

1. **Engine A — Continuous-Camera Evidence & Cartography Board (`src/02_board_engine.js`)**:
   One `5200×4200` tactile world canvas (`nautical`, `blueprint`, `microfilm`, `press`, or `coda` surface), one continuous log-zoom / spring-damped camera with zero jarring hard cuts, shallow-tilted silver-gelatin archival photo cards, typewriter black-tape labels, taut red investigation strings, rubber stamps, rolling serif year cards, and hand-drawn crimson ink circles synced `<50ms` to the narrator's voice.
2. **Engine B — 12fps Vintage 2D Chronicle Inserts (`src/03_vintage_2d.js`)**:
   For decisive historical or scientific moments **where no camera existed**. Transitions seamlessly from a board pin via an **optical iris wipe** into **acting-on-twos (`12fps`) boiling-ink copperplate etching or cyanotype blueprint 2D animation** with 16mm gate weave, film grain, subtle scratches, impact flash, and a double-ruled silent-film intertitle card, then iris-wipes cleanly back onto the board.

---

## 1. Intake & Clarify Before Building

Check the user's request for these five items and ask only for missing ones in one concise message (stating defaults):

- **Topic & Script / Voiceover**: What story, investigation, or scientific event is being told? (User may supply a script + voiceover `.wav`, or ask Gemini 4 Neon to write the script and synthesize narration).
- **Length**: Target duration (default: **60–90 seconds** for standalone shorts/sections; scales cleanly to multi-minute chapters).
- **Primary Surface**: `nautical` (oceanic/expedition chart, default for exploration/history), `blueprint` (engineering/aerospace fault tree), `microfilm` (charcoal investigative dossier), or `press` (cream archival newsprint).
- **Vintage 2D Reconstruction Moments**: Which dramatic beat(s) had no camera present and should cut into an Engine B `12fps` 2D etching/cyanotype insert?
- **Audio Mode**: Local zero-key documentary score + foley (`audio/audio.py`, default) or `.env` `GEMINI_API_KEY` upgrade (`gemini-3.8-flash-tts` + `lyria-3.5` cinematic score via `audio/gemini_audio.py`), or local studio TTS (e.g. CosyVoice).

Fixed defaults (don't ask unless requested): **16:9 at `1920×1080`, `30 fps`, broadcast `-14 LUFS` loudness**.

**Originality & Archival Rights Rule**:
- When given a reference documentary or tutorial, extract **only visual grammar and pacing** — never reuse its topic, photos, maps, or scenes.
- Source real historical/scientific imagery strictly from **verified Public-Domain / CC0 repositories** (Wikimedia Commons, NASA Images, Library of Congress) via `scripts/fetch_archive.py`, recording full attribution in `assets/archive_ledger.json`, or use files supplied by the user in `assets/archive/`. Never scrape copyrighted press logos or unverified portraits.

---

## 2. End-to-End Workflow

Read [references/style-guide.md](references/style-guide.md) before designing beats and [references/engine-guide.md](references/engine-guide.md) before editing scene code.

1. **Scaffold Project (`P`)**:
   - macOS/Linux: `bash "$SK/scripts/new_documentary.sh" "$P"`
   - Windows: copy `$SK/template` to `P`, ensure `playwright` Chromium (`npx playwright install chromium`) and `ffmpeg` are available.
2. **Gather Public-Domain Archival Assets**:
   - Run `python "$SK/scripts/fetch_archive.py" --query "<historical subject>" --out "$P/assets/archive"` (or place user-provided high-res images in `$P/assets/archive/`), renaming each file semantically (`beat01_ship_trapped.jpg`, `beat02_logbook.jpg`) and logging licenses in `assets/archive_ledger.json`.
3. **Synthesize Voiceover & Lock Waveform Timing (`<50ms`)**:
   - Place or generate narration WAV at `build/voiceover.wav`.
   - Run `python "$SK/scripts/align_timing.py" --wav build/voiceover.wav --script src/script.json --out src/beats.json` to detect 48kHz RMS energy envelopes and breath valleys so every camera move, ink circle, string draw, and stamp lands directly on its spoken trigger word.
4. **Author World Board + Vintage 2D Inserts (`src/10_documentary.js`)**:
   - Lay out cards across the `5200×4200` world without overlap so the finale `NETWORK_PULLOUT` reveals a coherent investigation web.
   - Author Engine B `12fps` 2D reconstructions for any beat marked `vintage_2d`, bounded by `irisIn` and `irisOut`.
5. **Multi-Frame Process Contact-Sheet Gate (Mandatory Before Final Delivery)**:
   - Run `node build.mjs` → `node render.mjs --stills 2,8,16,24,...` (sampling opening, mid-action, climax, and settle frames of every beat and 2D insert).
   - Visually inspect `build/stills/sheet.jpg` against [references/review.md](references/review.md): zero cropped labels, zero dark/muddy exposure, red ink marks centered on targets, clean map coordinates. Fix any defect first.
6. **Build Sound Bed & Render Full 1080p MP4**:
   - Run `python audio/audio.py --beats src/beats.json --vo build/voiceover.wav --out build/audio.wav` (or `audio/gemini_audio.py` when `.env` `GEMINI_API_KEY` is configured).
   - Run `node build.mjs` (bundles self-contained `build/<slug>.html`) and `node render.mjs` (parallel Chromium + NVENC/x264 encode → `build/<slug>.mp4` + `build/review/contact-*.jpg`).
7. **Deliver**:
   - Inspect all generated `build/review/contact-*.jpg` sheets and listen to key audio transitions, then deliver `build/<slug>.html`, `build/<slug>.mp4`, and `assets/archive_ledger.json`.
