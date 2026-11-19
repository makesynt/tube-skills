# Gemini Neon Documentary — Engine & Tooling Reference

## 1. Project File Layout

```text
<project>/
  assets/
    archive/               # Verified public-domain photos/maps (embedded into HTML at build time)
    archive_ledger.json    # License & source attribution log produced by fetch_archive.py
  audio/
    audio.py               # Zero-API documentary cello/pulse bed + cue-locked physical foley + -14 LUFS ducking
    gemini_audio.py        # Optional .env GEMINI_API_KEY upgrade (gemini-3.8-flash-tts + lyria-3.5)
  src/
    beats.json             # Single source of truth: title, duration, fps, surface, cues, subtitles
    00_core.js             # Seeded RNG, easing, log-zoom camera interpolation, offscreen canvas helpers
    01_surfaces.js         # 5 world surfaces: nautical, blueprint, microfilm, press, coda
    02_board_engine.js     # Engine A: 5200x4200 world board, photo/doc cards, tags, strings, circles, stamps
    03_vintage_2d.js       # Engine B: Iris wipe, 12fps boiling-ink copperplate/cyanotype 2D + intertitles
    10_documentary.js      # Project-specific cards, routes, camera keyframes, annotations & 2D insert scenes
    99_main.js             # Deterministic window.renderAt(t) + interactive browser player
  build.mjs                # Bundles src/*.js + assets/archive/* + build/audio.wav -> standalone build/<slug>.html
  render.mjs               # Parallel Playwright Chromium + NVENC/x264 -> build/<slug>.mp4 + contact sheets
```

---

## 2. Core Data Structures (`src/10_documentary.js`)

Define `window.DOC_SPEC` with:

- `surface`: `'nautical' | 'blueprint' | 'microfilm' | 'press' | 'coda'`
- `world`: `{ width: 5200, height: 4200 }`
- `cameraKeys`: array of `{ t, x, y, zoom, rot, ease }`
  - Always pair an arrival move (`0.8–1.4s`, `io3` ease) with a gentle drift hold (`2.5–5.0s`, `+3%` zoom push) so the camera never freezes dead.
  - Zoom interpolates in logarithmic space (`exp(lerp(log(z0), log(z1), k))`) so wide pull-outs feel optically linear.
- `cards`: array of archival items on the world plane:
  - Photo card: `{ kind: 'photo', id, img: 'ship.jpg', x, y, w, rot, t0, caption }`
  - Document card: `{ kind: 'doc', id, x, y, w, h, rot, t0, header, lines, highlightLine }`
- `routes`: array of `{ points: [[x,y], ...], t0, dur, label }`
- `strings`: array of `{ from: [x1,y1], to: [x2,y2], t0, dur }`
- `circles`: array of `{ x, y, rx, ry, rot, t0, dur }`
- `tags`: array of `{ x, y, dx, dy, text, t0, fadeAt, returnAt }`
- `stamps`: array of `{ x, y, rot, text, subtext, t0 }`
- `overlays`: screen-space milestones:
  - `{ kind: 'year', t0, t1, year, label }`
  - `{ kind: 'thesis', t0, t1, oldText, newText }`
  - `{ kind: 'counter', t0, t1, from, to, unit, caption }`
- `inserts`: array of Engine B `12fps` reconstructions:
  - `{ t0, t1, stock: 'copperplate' | 'cyanotype', irisDur: 0.65, pinScreen: [960, 540], draw(g, localT, insertDur, helpers), intertitle: { startFrac, endFrac, eyebrow, text } }`

---

## 3. Helper Scripts

### `scripts/fetch_archive.py`
Queries **Wikimedia Commons** (`action=query&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata`) or **NASA Images API** (`https://images-api.nasa.gov/search`), filters strictly for public-domain / CC0 / NASA media, downloads high-resolution JPEGs/PNGs into `assets/archive/`, and appends provenance records to `assets/archive_ledger.json`.

### `scripts/align_timing.py`
Reads a `22.05kHz–48kHz` mono/stereo `.wav` voiceover, computes `20ms` RMS energy envelopes and breath pause valleys, and maps ordered script sentences + trigger keywords to exact timestamps (`<50ms` lock), writing `cues` and `subtitles` into `src/beats.json`.
