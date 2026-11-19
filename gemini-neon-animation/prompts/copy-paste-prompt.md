# Gemini 4 Neon — Copy-Paste Cinematic Animation Prompt

If you want to try cinematic animations in **Google Antigravity (Gemini 4 Neon)** without installing the skill folder first, paste the prompt below and fill in `My animation:` at the bottom.

---

```text
I want you to make a cinematic animation for me using Gemini 4 Neon. Follow these instructions carefully.

BEFORE YOU START
Check my request for these four things, and ask me only for the ones I haven't given you, in one short message, with the default for each:
1. Length (default: 30 seconds).
2. Topic: what it's about. It can be a story (characters, a plot) or an explainer (how something works). If it's clear which one, don't ask. There's no default topic, so don't start until you have one.
3. Style (default: Storybook 3D, described below). I might name a style (e.g. Photorealism, Retro Pixel, Constellation Line Art, Ghibli Hand-Drawn) or point you to an example video or image.
4. Plan it together first, or get straight to work (default: straight to work).
If I say "you pick" or "default", use the defaults. Don't invent other requirements. When you deliver, tell me in one line any choice you made for me.

Fixed settings: 16:9 at 1920x1080, 24 fps, music and sound effects on.

STYLE EXAMPLES
If I give you an example of a style, copy only how it looks (palette, lighting, materials, line, texture, type) and how it moves (camera, timing, easing, transitions). Never copy its content, structure, shot order, characters, props or specific elements.

THE STORYBOOK STYLE (default)
- Bright daylight palette: sky gradient from mid blue (#7fb6e8) through pale blue (#cfe6f2) to warm cream at the horizon (#f6e7c8). Fresh grass greens, warm sand, soft warm grays, warm off-white haze in the distance.
- Main characters or the main object are the most saturated things in frame, in one or two bold accents (tomato red #e4572e, denim blue #35508a, sunflower yellow #ffd23f, caramel #d9a05b).
- Simple rounded toy shapes. Characters have big round heads, dot eyes with white surrounds, short tapered arms with mitten hands.
- Cel shading with 3 light bands, no textures. Thin dark outline (#2a2230) on characters and key objects only.
- One warm sun from the upper left with soft shadows and a fill light so shadows never go black. Light film grain and vignette.
- Title in a warm serif (like Fraunces SemiBold), warm white with a soft shadow.
- Everything eased, cameras always drift a little, small secondary motion (grass sway, blinks, clouds). Dissolves between related shots, quick whip pans for energy, cuts on action.

PLANNING
- Story: a character who wants something, what gets in the way, and how it turns out.
- Explainer: one idea per beat, in the order a viewer needs them. Show the thing itself working and move the camera to reveal each step. Short labels only, and use real facts.
- Write a short beat list with rough times. If I chose to plan together, show me the beat list plus a turnaround sheet of the main characters or key elements (front, three-quarter and side views) and wait for my OK before building.

HOW TO BUILD IT
- Make one self-contained HTML file in WebGL (or 2D Canvas for hand-drawn styles) that plays with sound (click or space to play), with sets, characters and shots in code.
- Every frame must depend only on time t: no clocks, no Math.random, no state carried from the last frame. Use a seeded random instead.
- Keep cue times (cuts, sound moments) in one place so picture and sound line up.
- Render an MP4 frame by frame with headless Chromium (Playwright) and ffmpeg, using parallel workers, and add sound at -16 LUFS.
- Make music that suits the mood and sound effects on every action (steps, landings, pickups). If I ask for Gemini API / Lyria audio, create a .env file with GEMINI_API_KEY= so I can paste my key locally (never ask me to paste the key in chat).
- Check a few stills before the full render.

REVIEW BEFORE YOU DELIVER
Make contact sheets (one frame per second) and check:
- Each shot follows from the one before: same things in the same places, action continues across the cut.
- Arms are short and tapered with mitten hands. No noodle arms, no limbs bending the wrong way.
- Characters actually touch what they use, feet on the ground, nothing floats, sinks or clips through anything.
- Every pickup and hand-off happens on screen. No disembodied close-up hands.
- Faces read, titles and labels are readable, and sound lands on its action.
- For explainers, every step is shown in the right order and nothing is factually wrong.
Fix anything that fails and re-render. Then give me the HTML and the MP4.

My animation:
```
