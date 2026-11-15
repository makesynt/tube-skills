# Stickman 2D Studio — Antigravity Production Rules

When authoring or rendering 2D stickman What-If, science-explainer, or narrative animations with this plugin, enforce these six non-negotiable standards:

1. **100% True Vector Rendering (Zero Bitmap Upscale Blur)**:
   - Render all characters, props, multi-plane worlds, and camera zooms/pans directly in HTML5 Canvas 2D / SVG driven by a deterministic paused GSAP timeline inside HyperFrames (`window.__timelines["main"]`).
   - Never crop and upscale low-resolution raster bitmaps for close-up inserts; drive camera magnification via sub-pixel canvas `translate` / `scale` / `rotate` transforms.

2. **Alpha-Masked Silhouette Rim Lighting (Zero Detached Joint Lines)**:
   - Draw stickman limbs, torso, and head onto a pooled offscreen canvas first, then composite crescent rim highlights using `globalCompositeOperation = "source-atop"` and `"destination-out"` so rim light never bleeds across interior overlapping black joints.

3. **Explicit Multi-Plane Parallax & Foreground Occlusion**:
   - Every narrative world must maintain at least 3 depth planes (distant sky/horizon, mid-ground architecture/vehicles, foreground occlusion elements such as bridge railings, lampposts, stay-cables, or clipped car windows) with physically grounded contact shadows and suspension reaction.

4. **`STORY LOCK × FACT BANK` Narrative Discipline**:
   - Every script must lock **at most 1 fictional premise** ("What-If switch") collided against **at least 3 verifiable real-world scientific or economic facts** (`FACT BANK`), ending with a concise Reality Check summary and an audience poll hook.

5. **44.1kHz Acoustic Waveform Lock (`< 50ms` Sync)**:
   - Measure PCM RMS energy envelopes and breath valleys of all synthesized voiceover `.wav` files before locking shot boundaries (`start_frame`, `end_frame`) and progressive karaoke subtitle segments so zero subtitle bleeds across a scene cut.

6. **Mandatory Contact-Sheet Visual QC Before Final Render**:
   - Run `npx hyperframes lint`, `npx hyperframes inspect`, and `npx hyperframes snapshot` across representative beats to inspect a 16-frame contact sheet at full resolution and fix any clipping, z-order, or label-overlap defect prior to full 1080p MP4 rendering.
