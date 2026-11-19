# Gemini Neon Documentary — Multi-Frame QC Checklist

Before delivering any documentary or embedding a sample clip inside a larger production, run `node render.mjs --stills ...` and inspect every generated `build/review/contact-*.jpg` sheet plus audio transitions against these six non-negotiable gates:

1. **Multi-Frame Coverage Per Beat (Never Single-Thumbnail Sign-Off)**:
   - Inspect at least **4 frames per scene/insert** (entry transition, mid-motion, annotation peak, settle frame).
   - Confirm zero dark/underexposed muddiness, zero blown-out white clipping after impact flashes, and clear figure-ground contrast on every card.

2. **Safe-Margin & Optical Zoom Check**:
   - No typewriter label, year card, intertitle, or subtitle may touch or clip within `56px` of the `1920×1080` frame border at maximum camera zoom/tilt.
   - Verify no missing font glyphs (`□` tofu boxes) in either Latin coordinates or CJK subtitles.

3. **Annotation Target Precision & Semantic Discipline**:
   - Crimson (`#C8322B`) circles must enclose their intended ship/subject/logbook phrase cleanly without slicing across unrelated faces or obscuring primary captions.
   - Map pins and dashed routes must sit on geographically/structurally plausible coordinates (never floating in the wrong ocean or off the schematic).

4. **Engine B `12fps` Insert Continuity**:
   - Iris wipe enters and exits cleanly on its anchor pin with zero 1-frame flash/pop at `t0` or `t1`.
   - Boiling-ink outlines stay cohesive across `12fps` steps without detached floating strokes or unreadable silhouettes.

5. **Acoustic Waveform Sync (`<50ms`) & Broadcast Loudness (`-14 LUFS`)**:
   - Listen to key transitions: rubber stamps, pen circles, typewriter strips, and 16mm projector clatter must land synchronously on the narrator's trigger words.
   - Music underscore ducks smoothly beneath narration (`~11–13 dB` below voice) with zero mud in the `2–3.5 kHz` vocal presence band, and zero subtitle bleeds across scene transitions.

6. **Honest Attribution**:
   - Every archival photo in `assets/archive/` has a matching public-domain or user-supplied entry in `assets/archive_ledger.json`.
   - Any on-screen audio/model badge matches the exact voice and music pipeline actually executed.
