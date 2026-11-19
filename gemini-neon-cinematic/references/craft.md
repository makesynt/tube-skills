# Craft: the hand-drawn render kit

How the kit works, the rules that keep renders correct, and what each helper does. The template's `src/10_example.js` uses most of it in about 200 lines. Everything is drawn on a plain 2D canvas in 1920x1080 space; no libraries.

## The frame contract

- `window.renderAt(t)` draws the frame at time `t` seconds onto the `#c` canvas. The renderer calls it for frame `f` with `t = f / fps`, in any order and in several browsers at once, so **a frame may depend only on `t`**.
- Never use `Date.now`, `performance.now`, `Math.random`, or anything carried from the last frame. Use `RNG(seed)` for scatter, `hash(i, seed)` for per-item values, `n1(x, seed)` / `n2(x, y, seed)` / `fbm` for organic variation.
- Anything expensive (painted plates, scattered props, a baked simulation) is made once in a shot's `prep()` and reused. `prep` may use `RNG` freely because it runs once with fixed seeds.
- `window.VIDEO` holds width, height, fps, duration and scale; `window.__ready` is true once the page can render.
- Page modes: no query = player; `?t=5.2` = one frame; `?render=1` = driven by `render.mjs`; `?scale=0.5` or `2` = render size (drawing stays in 1920x1080 space); `?design=1` = the design sheet.
- `build.mjs` puts `src/beats.json` in front of the code as `B`, so `B.duration`, `B.fps` and `B.cues` are available everywhere. `B.fadeIn` / `B.fadeOut` (seconds) are optional.

## Shots and time

- `shot(name, t0, t1, prep, draw, { in })`. `draw(g, local, t, state)` gets the shot's local time, the global time and what `prep` returned. Shots must cover `0..duration` with no gaps.
- Transitions: `in: { type: 'dissolve', dur }` or `in: { type: 'dip', dur, color }`. The previous shot keeps running past its end during the overlap, so animate the world on global `t`.
- Acting on twos: pass `on2(t)` to anything a character does (12 drawings a second, the hand-drawn feel). Camera moves and pans use `t` directly so they stay smooth.
- Keyframes: `kf(t, [[t0, v0], [t1, v1, E.out3], ...])` with numbers or arrays. The ease on a key shapes the segment that ends on it. Easings: `E.in2/in3`, `E.out2/out3/out4`, `E.io2/io3`. Mix them: `out3` for snapping into a pose, `in2` for a wind-up, `io2` for a camera move.
- `seg(t, a, b)` gives 0..1 progress; `clamp`, `lerp`, `sstep`.
- `overlay(g, t)`, if you define it, draws on top of every shot (titles, subtitles) before the film finish.

## Drawing helpers

- Geometry (`00_core.js`): points are `[x, y]` arrays. `catmull(pts, closed, per)` smooths a polygon, `bez`, `densify`, `rough(pts, amt, seed)` gives a hand-cut edge, `xf(pts, mat(x, y, rot, sx, sy))` places a drawing, `mmul` chains transforms, `offsetPts`, `area`, `path`, `fillPts`.
- Color: hex strings or `[r, g, b]` arrays. `css(c, alpha)`, `mixv(a, b, t)` / `mixc`, `jit(c, r, amt)` for per-dab variation, `stopsAt(stops, y)` samples a vertical color ramp, `grade(palette, toColor, amt)` tints a whole palette (time of day, haze).
- Ink (`01_ink.js`): `ink(g, pts, width, { col, t0, t1, min, jit, seed, a })` is an open tapered stroke; `inkLoop(g, pts, width, { col, lx, ly, bias })` is a closed outline that thickens away from the light; `seam(g, pts, w, col, seed, a)` is a fine inner line; `cel(g, pts, o)` is a filled, inked cel.
- Cels and shapes (`03_shapes.js`): `cels(g, pts, { base, sh, sw, rim, rw, rimA, L, shade: [{pts, col, a}], after(g), line, lw, seed })` is the main character/prop painter (base, offset shadow shape, rim light, extra shade shapes, inked outline). `capsule(a, b, w0, w1, bulge)` builds a limb between two joints; `rib(centerline, w, taper0, taper1, profile)` builds tapered bands (hair locks, ribbons, tails, branches); `pol(p, ang, len)` steps from a joint; `cloudMass` paints a soft cloud bank.
- Paint (`02_paint.js`): `dab` (one brush mark), `bristle` (dry brush), `paintRegion(g, pts, base, r, { size, dens, stretch, a, cols, colAt, dry, edge })` (fill and texture a region), `paintSky(g, w, h, stops, r, { n, var })` (sky in brush strokes), `stratus` (long low clouds), `paperOver(g, w, h, a)` (paper texture on a plate), `rayFan` (light shafts), `motes(g, t, n, seed, box, col, a)` (drifting dust).
- Kit (`04_kit.js`): `scallop`, `clump`, `crown`, `trunk`, `tree(g, x, y, h, w, pal4, r, o)` (pal4 = four greens, dark to light), `cumulus(g, cx, cy, w, h, { sh, mid, lit, hi, base }, r, { n, extra, front, lx, ly })`, `blades` (painted grass), `hazeBand`, `cam(g, cx, cy, zoom)`.
- Plates: `makePlate(x0, y0, w, h, S, g => { ...paint... })` paints once into an offscreen canvas at `S` times resolution (1.2 to 1.6), and `plateDraw(g, plate)` draws it. Make plates bigger than the frame when the camera moves, and use a higher `S` when the camera pushes in. Split far and near layers into separate plates for parallax.

Grow the kit when a scene needs something new (water, rain, a building, a vehicle, a creature): add a function with the same style of options to a numbered file, so the next animation can reuse it.

## Characters

- Design in a local coordinate box (for example head height 100 units) and place with `xf(pts, mat(x, y, rot, scale))`, so one drawing works at any size and in the design sheet.
- Build the body from joints: a pose is a few angles and positions, limbs are `capsule`s between joints, hair and cloth are `rib`s whose centerlines bend with `windAt(t)` and follow-through (offset the phase along the strand).
- Draw back to front: far limbs, body, near limbs, head, hair. Give each part a cel shadow on the side away from the light.
- Keep proportions in one place (a constants object) so they can't drift between shots.
- Faces: a small set of expression keys (eyes open/half/closed, brow up/down, mouth shapes) switched on twos, plus blinks.

## Performance

- Painting plates is the slow part: a full-frame plate can take a few seconds, once per shot per worker. Frames after that are fast (well under a second each).
- Keep per-frame work to the moving parts: characters, a few hundred grass blades, particles.
- `render.mjs` needs no GPU flags for 2D canvas. Set `CINEMATIC_CHROME_ARGS` to pass extra Chromium flags if a machine needs them.

## Gotchas

- Fonts: canvas text uses the fonts on the machine, so stick to common stacks (`Georgia, "Times New Roman", serif`) or draw lettering as shapes.
- `paperOver` works on the whole plate canvas, so call it last inside the plate painter.
- Colors from `mixv` are arrays; `css()` turns them into a fill style.
