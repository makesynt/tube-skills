# Storybook: the default look

The look of the example in `template/`. Use it whenever no style is named. It's a look only; it works for stories and explainers alike.

## Color

- Bright, clean daylight palette: sky gradient from mid blue (#7fb6e8) through pale blue (#cfe6f2) to warm cream at the horizon (#f6e7c8).
- Fresh grass greens (#8cc263, #6fae52, #5d9b4a), warm sand (#e2c98f), soft warm grays for stone (#9a978f).
- Main subjects (characters, the object being explained) are the most saturated things in frame, in one or two bold accents (tomato red #e4572e, denim blue #35508a, sunflower yellow #ffd23f, caramel #d9a05b).
- Horizon fog in a warm off-white (#e9eadb) so distance fades softly.

## Shape and line

- Simple, rounded toy forms built from primitives: spheres, capsules, tapered cylinders, chunky low-detail icosahedron foliage.
- Characters have big round heads, dot eyes with white surrounds, short tapered limbs, mitten hands.
- Thin dark ink outline (#2a2230, about 0.018 units) on characters and hero objects only, never on scenery.

## Surface and light

- Cel shading with 3 light bands (`toon(color, 3)`), no textures.
- One warm sun from high front-left with soft-edged shadows, plus a sky/ground hemisphere fill so shadows never go black.
- ACES tone mapping at exposure 1.0.
- Finish: film grain 0.06, vignette 0.35, half-second fade in from black, short fade out.

## Type

- Fraunces SemiBold (`Title`), warm white (#fffaf0) with a soft drop shadow, large and centered high in frame. Rises a little as it fades in.

## Motion

- Everything eased (in-out for camera, out for arrivals, springy settle for pops and landings). Nothing moves linearly except wind.
- Cameras always drift a little: slow push-ins, gentle side moves, a light handheld wobble of a few centimeters.
- Small secondary motion keeps the world alive: grass swaying, clouds drifting, blinks, tail wags.

## Transitions

- Dissolves (about 0.6 s) between related shots, a quick whip pan (about 0.35 s) for energy or a jump in place, straight cuts on action.

## Composition

- Eye-level or slightly high camera, horizon around the upper third, ground always visible.
- Subject on a third with room in front of where it faces; wides at fov 30–35, mediums and close-ups at fov 34–38.
