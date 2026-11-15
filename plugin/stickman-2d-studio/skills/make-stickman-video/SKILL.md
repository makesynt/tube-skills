---
name: make-stickman-video
description: >-
  8-step automated 2D vector stickman animation director and HyperFrames renderer.
  Use this skill when the user wants to turn a voiceover audio file or STORY LOCK script
  into a finished 1080p@30fps stickman video with 44.1kHz waveform sync, 5 visual themes,
  and 16-grid Contact-Sheet visual QC.
---

# Make Stickman Video — 8-Step Vector Animation Pipeline

Use this skill with **Gemini 4 Carbon** + **HyperFrames** to compile voiceover audio and a `STORY LOCK` script into a broadcast-grade `1920x1080 @ 30fps` vector stickman film.

## Built-in Reusable Engine Assets

Copy these starter modules from this skill's `resources/` and `scripts/` folders into your target HyperFrames workspace:
- [themes.js](./resources/themes.js): 5 curated cinema palettes (`dusk`, `midnight`, `golden`, `neon`, `storybook`) mapped to top viral channel styles.
- [engine_rig.js](./resources/engine_rig.js): Pooled offscreen alpha-masked rim-lit stickman IK character rig, hoodie drawstrings, natural blinking, cane kinematics, and detailed multi-part vehicles with suspension compression (`compY`) and window-clip masks.
- [engine_worlds.js](./resources/engine_worlds.js): Sub-pixel camera zoom/pan/rotate helper, multi-plane parallax worlds (Bedroom, Dusk Lake, Urban Street, Cable-Stayed Bridge, Cliffhanger Rail, Navy Science Stage), and anti-banding film grain.
- [acoustic_sync.py](./scripts/acoustic_sync.py): `44.1kHz` PCM RMS energy valley detector & EBU R128 `-14.0 LUFS` spatial Foley master mixer.

## 8-Step Agentic Director Pipeline

1. **Acoustic Waveform Lock (`scripts/acoustic_sync.py`)**:
   - Analyze `44.1kHz` PCM RMS valleys of the voiceover `.wav` cues to snap every shot boundary (`start_frame`, `end_frame`) and progressive karaoke subtitle segment (`< 50ms` sync, zero cross-shot bleed).
2. **Visual Theme Selection (`resources/themes.js`)**:
   - Pick `dusk` (`@IfHumans` warm twilight), `neon` (`@JeremyBearimyTheory` overhead status tags), `golden` (`@Otherwisetale` bold yellow HUD), `midnight`, or `storybook`.
3. **Character Cast & Prop Rigging (`resources/engine_rig.js`)**:
   - Configure distinct silhouette accessories (`hoodie`, `ponytail`, `bun` + `cane`, `helmet` + goggles, `cap` + clipboard, `suit`) and physical contact poses (`walk_ik`, `run_ik`, `dogpaddle`, `car_push`, `embrace_hero`).
4. **Multi-Plane World & Shot Choreography (`engine_shots.js`)**:
   - Alternate `2.35:1` letterboxed narrative scenes with borderless science visualization stages (`hasLetterbox: false`), using 7-tap horizontal directional motion-blur whip-pans on high-energy cuts.
5. **Static & Runtime Gate**:
   - Run `npx hyperframes lint --json` and `npx hyperframes inspect --json`; resolve any errors or warnings to `0`.
6. **16-Frame Contact-Sheet Visual QC (`npx hyperframes snapshot`)**:
   - Capture 16–18 keyframe PNGs + contact sheets (`npx hyperframes snapshot --at ... --output snapshots`) and inspect full-resolution PNGs to verify zero limb-highlight artifacts, proper foreground railing/window occlusion, and clean label spacing.
7. **Preview Gate (Optional 30s Slice)**:
   - Render a fast preview slice (`--start 0 --end 30 --quality draft`) when requested for interactive director tweaks.
8. **Final 1080p Hardware-Accelerated Render**:
   - Render the full composition (`npx hyperframes render --fps 30 --quality looks --browser-gpu`) with `-14.0 LUFS / <= -1.0 dBTP` master audio and `-movflags +faststart`.
