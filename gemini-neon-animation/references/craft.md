# Craft for rendered animations

The kit is built on the three.js rendering library (imported as `THREE`). How the kit works, the rules that keep renders correct, and recipes for common looks. The template's `src/story.js` shows all of it in about 120 lines. `story.js` holds explainers too: a set is any place, and the "characters" can be machines, cells, products or modeled diagrams with their own `pose`/`update(t)`.

## The frame contract

- `window.renderAt(t)` draws the frame at time `t` seconds onto the `#c` canvas. The renderer calls it for frame `f` with `t = f / fps`, in any order and in several browsers at once, so **a frame may depend only on `t`**.
- Never use `Date.now`, `performance.now`, `THREE.Clock`, `Math.random`, physics engines that step, or anything carried from the last frame. Use `rng(seed)` for scatter and `wobble(x, seed)` for organic motion. To use a `THREE.AnimationMixer`, call `mixer.setTime(t)`.
- Precompute anything expensive (paths, scattered props, a simulation baked into an array at load) once at start-up, then index it by `t`.
- `window.VIDEO` holds width, height, fps, duration and scale; `window.__ready` turns true after fonts load.
- Page modes: no query = player; `?t=5.2` = show one frame; `?render=1` = driven by `render.mjs`; `?scale=2` = 4K (overlays still draw in 1920x1080 space).

## World time vs shot time

- Animate characters and props in each set's `update(t)` with **global** `t`. Cameras use the shot's local time (`cam(local, p)` where `p` runs 0→1 over the shot).
- Several shots can use the same set; they are just different cameras on one continuous world. That is what keeps cuts continuous.
- Transitions render both shots at the same `t`: the outgoing shot keeps running past its end during the overlap.

## Kit reference (`src/kit.js`)

- Time and math: `clamp`, `lerp`, `seg(t, a, b)`, `ease.{linear,in,out,io,smooth,back,spring,arc}`, `keys(t, [[t0, v0], [t1, v1, 'out'], ...])` (numbers or arrays), `rng`, `wobble`.
- Stage and film: `createStage({video, exposure})`, `makeFilm(stage, {sets, shots, overlay, finish})`, `boot(film)`. `finish` takes `grain`, `vignette`, `letterbox` (fraction of height), `fadeIn`, `fadeOut`, `fadeColor`.
- Per shot or per set: `bloom: {strength, radius, threshold}` (costly in software GL; use for glows, magic, night lights), `grade: 'saturate(1.1) contrast(1.05) sepia(0.1)'` (a CSS filter applied to the frame).
- Transitions (`in: {type, dur}`): `dissolve`, `dip` (through `color`), `iris` (`x`, `y` as 0..1 screen position), `whip` (`dir` 1 or -1), `wipe`.
- Materials: `toon(color, steps)` cel bands, `clay(color, roughness)` soft matte toy look, `glowMat(color, intensity)` for things that light up (pair with bloom), `outline(mesh, width, color)` ink line by inverted hull.
- Building: `mesh(geo, mat, {pos, rot, scale, shadow})`, `group(...)`, `skyGradient(scene, stops)`, `sunlight(scene, {...})`, `scatter(seed, n, make, xRange, zRange, avoid)`, props `tree`, `rock`, `cloud`, `grass` (instanced, call `.sway(t)`).
- Characters: `makeCharacter({skin, shirt, pants, hair, shoe, height, mat, outline})` → `.pose({walk, phase, yaw, headYaw, headTilt, blinkT, wave, waveT, armsUp, bounce, smile})`, with parts `arm.L/R.{sh, el, hand}`, `leg.L/R`, `head`, `neck`. `makeCritter({fur, belly, ear, size})` → `.pose({trot, phase, yaw, wag, t, headYaw, headTilt, hop, sit})`.
- Design sheet: return `design: [{name, note, make, pose?, float?, zoom?}]` (and `designTitle`) from `buildStory`; `node render.mjs --design` writes `build/design/design-sheet.png` with front, three-quarter and side views of each item. `?design=1` shows it in the browser. Build models as factories in a `cast` object so the sheet and the film share them.
- `onPath(points, p)` → `{pos, yaw, length}` along a smooth path. Drive walk `phase` from distance travelled divided by stride length (about 0.95 for the kid, 0.55 for the pup) so feet don't slide.
- To find where a hand or mouth is (for holding props), use `part.getWorldPosition(v)` or `part.localToWorld(v)` after posing.

Grow the kit when a story needs something new (a bird, a house, water, rain, a vehicle): add a builder to `kit.js` with the same style of options and a `pose`/`update` function of `t`, so later videos can reuse it.

## Looks that work

- **Storybook (the default):** full spec in [default-style.md](default-style.md); the template's `story.js` is a working example.
- **Soft clay / felt:** `clay` materials, roughness 0.8–0.95, lower sun, stronger hemisphere fill, no outlines, slight `grade` warmth.
- **Night or magic:** dark blue sky gradient, low hemisphere light, a few `PointLight`s, `glowMat` on lamps, fireflies or stars, `bloom: {strength: 0.9, threshold: 0.6}`.
- **Low-poly:** `flatShading: true` in the material options, `IcosahedronGeometry` detail 0–1, hard sun.
- **Painterly or ink look from a style guide:** match its palette with `toon` colors, outlines in its ink color, its grain and vignette amounts, and its transition types. Don't add its subject matter.
- Keep the palette tight: 2–3 main hues plus neutrals. Make characters the most saturated thing in the frame.

## Camera

- Lenses: wides at fov 30–40 from 6–12 units; mediums at fov 35–40 from 2.5–4 units; close-ups at fov 30–35 from 1–1.5 units at eye height. Avoid wide fov close to characters (distorts faces).
- Always move a little (slow push, drift or handheld via `wobble` at 0.02–0.05 units). Ease moves with `ease.io`. Keep the horizon level unless the moment wants a tilt.
- Frame for 16:9: subject on a third, look-room in front of faces, ground plane visible so nobody floats.

## Performance

- Cloud containers render with SwiftShader (software GL): about 2 frames a second at 1080p with 3 workers. Shadows, bloom and big instanced grass are the main costs. Keep shadow map 2048, one shadow-casting light, and grass under about 6000 blades.
- On a Mac, `render.mjs` asks Chromium for Metal and is much faster. If WebGL fails there, set `ANIMATION_GL_ARGS` (for example `--use-angle=swiftshader --enable-unsafe-swiftshader`) and rerun.
- `render.mjs` prints the GL renderer it got; check it once per machine.

## Gotchas

- Library release r187 removed `PCFSoftShadowMap`; the kit uses `PCFShadowMap` with `shadow.radius`.
- `CapsuleGeometry(radius, height, capSegments, radialSegments)`; `height` excludes the caps.
- Colors given as hex strings are sRGB; the renderer outputs sRGB with ACES tone mapping, so very bright colors flatten. Lower `exposure` in `createStage` for darker films.
- The 2D canvas `filter` (grade, whip blur) works in Chromium; keep it to CSS filter syntax.
- Fonts: only `src/assets/title.woff2` is embedded (family `Title`). To use another, replace that file with any OFL woff2.
