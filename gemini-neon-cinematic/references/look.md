# The look: classic Japanese feature animation

How the film should look and move. It's a look only; the subject, setting and action always come from the request. All designs are original. Take the feeling of the tradition (hand-inked cels over painted backgrounds, patient direction, weather and light you can feel) without copying any film's characters, creatures, places or shots.

## Line

- Tapered ink lines (`ink`, `inkLoop`): fine at the ends, fuller in the middle, a little heavier on the side away from the light. Never one uniform stroke weight.
- Warm sepia-black for line (`P.ink`), cooler line (`P.inkCool`) at night. Inner detail lines (folds, seams, hair strands) are thinner than outlines (`seam`).
- Characters and key props are inked. Backgrounds are painted, not outlined; at most a soft, broken edge on near objects.
- Slight irregularity on purpose: `rough()` on hand-cut shapes, wobble from seeded noise. Fixed per drawing, so lines never boil.

## Color and shading

- Classic cel shading: a flat base, one shadow tone as a designed shape (not a gradient), and an optional thin rim of light on the lit edge (`cels` with `sh`, `sw`, `rim`, `rw`). Shadows are restrained: lighter and warmer than you think, never black.
- Characters carry the most saturated colors in the frame; backgrounds are softer and slightly hazier with distance.
- One clear light direction per scene (`L = { lx, ly }`), shared by every character, prop and background in it.
- Time of day sets the whole palette: cool blue morning, warm gold afternoon, peach and violet dusk, deep blue night with warm windows.
- Haze and atmosphere: far things lighter and bluer (`hazeBand`, `mixv` toward the sky color), never just smaller.

## Backgrounds

- Painted in watercolor or gouache: skies built from horizontal brush dabs over a base wash (`paintSky`), regions filled and worked with dabs and dry brush (`paintRegion`), foliage as scalloped clumps with leaf marks breaking the tone edges (`clump`, `crown`, `tree`), big lit cumulus (`cumulus`, `cloudMass`), paper texture over the plate (`paperOver`).
- Lived-in: weathering and natural irregularities everywhere. Chipped paint, moss at the base of walls, worn paths, leaning posts, patched roofs, puddles, laundry, uneven stones.
- Vary everything that repeats. No two trees, houses or clouds alike; break up rows; leave gaps.
- Detail where the eye goes; simpler, softer painting at the edges of frame.

## Motion and acting

- Characters on twos (12 drawings a second, `on2`) with held key poses; cameras on ones.
- Strong key poses that read in silhouette. Hold them. Move between them with short, decisive timing: fast out of one pose, settle into the next. Mix fast and slow; never the same ease on everything.
- Anticipation before every big move (a dip before a jump, a lean back before a throw), weight on every landing (a small squash, a settle).
- Secondary motion everywhere it's natural: hair, clothes, scarves, grass and trees in the wind, drifting leaves, petals, dust, steam, rain. Drive it all from one wind or force function so it agrees.
- Small acting beats carry emotion: a blink, a glance away, a breath, hands tightening.

## Camera and composition

- Frame like a film: an establishing wide, mediums for action, close-ups for the emotional beat, a release shot at the end. Each shot answers "why this framing now?".
- Camera moves are slow and motivated: a gentle push in, a tilt up to the sky, a pan following the subject. Pans over a wide painted background (one large plate moving past the frame) are a classic move.
- Strong, simple compositions: clear foreground, middle ground and background; the subject on a third with room to look or move into; big skies.
- Transitions: straight cuts on action most of the time, dissolves for time passing, a dip to black or white for a big change.

## Type

- Titles are optional, small and quiet: a serif or brush-like title near the end, or none at all. Never over the action.

## Finish

- Fixed paper or film tooth over the frame (never animated, so a paused frame and a playing frame look the same), a gentle lens falloff, fade in from and out to black.
