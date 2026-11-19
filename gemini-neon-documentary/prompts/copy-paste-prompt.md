# Gemini 4 Neon — Copy-Paste Documentary Director Prompt

Use this zero-setup prompt directly in **Google Antigravity (Gemini 4 Neon)** if you haven't installed the `gemini-neon-documentary` skill folder yet. Fill in `My documentary:` at the bottom.

---

```text
I want you to create a narrated documentary video in code using Gemini 4 Neon — zero CapCut, zero After Effects. Follow these rules strictly.

1. CHECK BEFORE BUILDING
Ask me in one short message ONLY for anything missing (with defaults):
- Topic & script/voiceover (required; if I only give a topic, draft a tight sentence-by-sentence documentary script first).
- Target length (default: 75 seconds).
- Board surface style (default: Nautical/Expedition Map Board; options: Forensic Blueprint, Charcoal Microfilm Dossier, Cream Archival Press).
- Which dramatic moment(s) had no camera present and should become a 12fps Vintage 2D Boiling-Ink animation insert.
Fixed settings: 1920x1080, 30 fps, -14 LUFS broadcast mix with documentary underscore + physical foley.

2. DUAL-ENGINE DOCUMENTARY GRAMMAR
- Engine A (Evidence & Cartography World Board): One 5200x4200 tactile surface with ONE continuous physical camera (smooth log-space zoom, damped pan/tilt, subtle handheld drift — never hard-cut between board cards). Place shallow-tilted (+/- 2 to 6 deg) cream-bordered archival photo cards, typewriter black-tape labels (24 chars/s), dashed map routes, rubber stamps, rolling serif year cards, and hand-drawn wobbling crimson (#C8322B) circles/strings synced to spoken trigger words. Use crimson ONLY for investigative meaning.
- Engine B (12fps Vintage 2D Reconstruction Insert): Transition from a map pin via a circular brass-lens Iris Wipe into an acting-on-twos (12fps) boiling-ink copperplate etching or cyanotype blueprint 2D scene (sepia parchment or blueprint stock, 16mm gate weave, film grain, vertical scratches, brief impact flash, and a classic double-ruled serif Intertitle Card), then Iris Wipe back onto the next board pin.
- Finale: Pull the camera back to reveal the complete connected investigation network and resolve with a strikethrough-to-serif Thesis Card.

3. ARCHIVAL IMAGES & TIMING
- Never scrape unverified portraits or copy another creator's video scenes. Fetch verified Public-Domain / CC0 images (Wikimedia Commons / NASA / Library of Congress) with a license ledger, or use images I place in assets/archive/.
- Measure the voiceover WAV's 48kHz RMS energy envelope and breath pauses so every camera move, ink circle, typewriter strip, and stamp lands within 50ms of its spoken keyword.
- Every frame must be a pure deterministic function renderAt(t) (seeded RNG only; zero Math.random or frame-to-frame state).

4. SOUND, MULTI-FRAME QC & DELIVERY
- Mix voiceover + dark minimalist cello/pulse underscore (ducked under speech) + tactile foley (paper slide, pen scratch, pin thud, stamp slam, 16mm projector clatter) normalized to -14 LUFS. If I ask for Gemini API audio, create a local .env with GEMINI_API_KEY= (never ask me to paste keys in chat) for gemini-3.8-flash-tts / lyria-3.5.
- Render multi-frame Contact Sheets covering opening, mid-beat, climax, and ending of every beat and 2D insert; fix any text clipping, dark exposure, or misaligned circle before full parallel Chromium + FFmpeg 1080p MP4 render.
- Deliver both the self-contained playable HTML file and the 1080p MP4.

My documentary:
```
