# Gemini Neon Documentary — Visual & Sonic Style Guide

## 1. Core Documentary Grammar (Engine A: World Board)

1. **One Continuous World Camera**:
   - The board lives on a `5200×4200` world plane. All board storytelling happens via eased log-space zoom, spring-damped pan, and subtle `±1.8°` camera roll.
   - **Never hard-cut** from one board card to another; let physical camera momentum and taut red strings carry the viewer's eye across space.
   - During holds (`2.5–4.5s`), maintain a slow `2–4%` optical push or drift so the frame stays alive.

2. **Tactile Shallow-Depth Cards**:
   - Archival photographs sit inside warm cream silver-gelatin borders (`#EAE3D2`, `18px` margin, `28px` bottom caption lip), rotated `±1.8°–6.5°`, with soft layered contact + ambient shadows.
   - Documents and logbooks render on aged cotton stock with subtle fiber tooth.

3. **Single Semantic Accent (`#C8322B` Archival Crimson)**:
   - Reserve **Archival Crimson (`#C8322B`)** strictly for investigative meaning:
     - Hand-drawn fountain-pen circles/ellipses (`0.30–0.45s` wobbling stroke draw on the spoken keyword)
     - Taut red investigation strings stretched between brass/crimson map pins (`A → B`)
     - Dashed expedition or trajectory paths across charts
     - Declassified rubber stamps (`CRUSHED BY ICE`, `CONFIRMED`, `ABORT`) with micro camera-shake (`6 frames`) on impact
     - Strikethrough bar on the false assumption in the finale Thesis Card

4. **Typography Pair**:
   - **Monospace Typewriter** (`Courier New` / `Noto Sans Mono Bold` / `Consolas`): embossed white-on-obsidian Dymo tape labels (`24 chars/s` type-on), latitude/longitude coordinates, timestamps, and archival catalog IDs.
   - **Editorial High-Contrast Serif** (`Georgia` / `Playfair` / `Noto Serif SC Bold`): rolling `YEAR_CARD` numerals, silent-film intertitles, and the resolved Thesis statement.

---

## 2. Five Built-In Archival Surfaces (`src/01_surfaces.js`)

| Surface ID | Palette & Texture | Best Niche |
| :--- | :--- | :--- |
| `nautical` | Deep abyssal slate-teal (`#10212B` → `#18313F`), bathymetric contour rings, compass rose, latitude/longitude graticule | Maritime history, polar expeditions, geopolitical map investigations |
| `blueprint` | Prussian cyanotype blue (`#0B2340` → `#12355B`), `1mm` millimeter engineering grid, registration crosshairs | Aerospace incidents, engineering forensics, megaprojects |
| `microfilm` | Dark obsidian-charcoal (`#111317`), warm phosphor scanlines, microfilm frame numbers & aperture marks | Cold War mysteries, cyber/financial investigations, space telemetry |
| `press` | Warm unbleached archival cotton (`#E8DFCE`), faint dot matrix, editorial column rules | Biographies, cultural history, investigative journalism |
| `coda` | Deep cinema black (`#07090D`), subtle floating dust motes, precision digital counters | Modern aftermath, present-day statistics & epilogue |

---

## 3. Ten Canonical Beat Recipes

- `YEAR_CARD`: World dims subtly while two brass/crimson horizontal rules expand and serif year numerals roll into lock (`1914` → `1915`).
- `REVEAL_PHOTO`: Camera glides to world target as archival photo card slides in with slight back-out settle and contact shadow.
- `MAP_ROUTE`: Camera tracks a dashed crimson trajectory drawing across nautical/topographic coordinates with waypoint pins.
- `NAME_TAG`: Black-tape monospace label types on (`24 chars/s`) with a crisp leader line to the subject pin.
- `DOC_FOCUS`: Quick damped whip-pan to an archival logbook/manifest, followed by a crimson highlighter swipe or fountain-pen underline.
- `CONNECT_STRING`: Taut crimson thread draws from Pin A to Pin B as the narrator reveals causality.
- `STAMP_SLAM`: Framed crimson rubber stamp slams onto a card (`scale 1.8 → 1.0` in `0.18s`) with slight ink distress and `5px` damped camera jolt.
- `VINTAGE_2D_INSERT`: Brass-lens circular **Iris Wipe** closes on a map pin and opens inside an Engine B `12fps` hand-drawn historical reconstruction.
- `NETWORK_PULLOUT`: Camera pulls out to `zoom ≈ 0.36–0.44`, bringing every photo, route, string, and restored tag into a single panoramic proof web.
- `THESIS_STRIKE`: Monospace old assumption appears, crimson stroke crosses it out, and bold serif truth lands beneath with a crimson period.

---

## 4. Vintage 2D Reconstruction Layer (Engine B: `src/03_vintage_2d.js`)

Use Engine B whenever the script reaches a dramatic turning point **where no camera existed** (e.g., an open lifeboat in a midnight hurricane, an internal spacecraft adapter rig, an ancient or unphotographed encounter).

- **Two Authentic 2D Stocks**:
  1. `copperplate` (Historical / Expedition): Warm aged parchment (`#E2D0AC`), walnut-sepia ink (`#2E2016`), fine cross-hatching, crimson focal accent (`#C8322B`).
  2. `cyanotype` (Engineering / Science): Deep blueprint indigo (`#0D2949`), chalk-white technical drafting ink (`#F2F6FA`),amber/crimson callout arrows.
- **Acting on Twos (`12fps`) + Boiling Ink**:
  - Quantize scene motion (`t2 = Math.floor(t * 12) / 12`) and perturb stroke vertices deterministically per 12fps step so every line feels hand-inked on paper rather than sterile vector Flash animation.
  - Switch to full `30fps` for `0.25s` only at a physical impact peak (e.g., rogue wave cresting bow) paired with a brief parchment luminance flash.
- **Optical Film Finish**:
  - `±1.2px` 16mm projector gate-weave, subtle luminance breathe (`±4%`), `1–2` faint vertical emulsion scratches, and warm vignette.
  - Close the sequence (or punctuate its midpoint) with an authentic **Silent-Film Intertitle Card** (charcoal plate, double ivory hairline frame, crimson corner rosettes, centered serif caption) before iris-wiping back to the world board.
