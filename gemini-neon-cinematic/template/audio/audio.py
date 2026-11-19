# Score + sound effects for the example "The Straw Hat". Replace the cue section for a new animation.
# A quiet, warm theme (soft strings pad, plucked harp-like arpeggio, a bell when the hat lets go) over a wind bed.
# usage: python3 audio/audio.py build/audio.wav
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audiolib import *

B = beats(); cue = B['cues']; D = B['duration']
mx = Mix(D)

# ---------------- music: D major, 72 bpm, lifts to the IV chord as the hat flies ----------------
bar = 60 / 72 * 4
D_, G_, A_, Bm = 62, 67, 69, 59
prog = [(0.3, bar, D_, 'add9'), (0.3 + bar, bar, Bm, 'm7'), (0.3 + 2 * bar, bar, G_, 'M7'), (0.3 + 3 * bar, D - 0.3 - 3 * bar, D_, 'sus4')]
mx.pads(prog, 0.32, cut=1400, att=2.0, rel=2.5)
mx.arp([p for p in prog if p[0] > 1], bar / 6, 0.16, pluck, 66, 86, (0, 2, 4, 1, 3, 5))
mx.music(cue['lift'], bell(mf(81), 4.0), 0.4); mx.music(cue['lift'] + 0.12, bell(mf(86), 4.0), 0.28)
mx.music(cue['sky-tumble'], bell(mf(78), 4.0), 0.3)

# ---------------- wind, grass and the hat ----------------
mx.bed(0, D, meadow, 0.35, fi=1.0, fo=1.5)
mx.bed(0, D, wind, 0.5, fi=1.5, fo=2.0)
mx.sfx(cue['first-breeze'], rustle(1.4, 0.4), 1, -0.3)
mx.sfx(cue['gust'] - 0.3, whoosh(2.2, True, 0.55), 1, 0.2)
for k, dt in enumerate([0.15, 0.5, 0.85]): mx.sfx(cue['gust'] + dt, rustle(0.6, 0.5), 1, -0.4 + k * 0.4)
mx.sfx(cue['rock'], creak(0.4, 0.25), 1, 0.3); mx.sfx(cue['rock'] + 0.35, creak(0.35, 0.2), 1, 0.3)
mx.sfx(cue['lift'] - 0.05, whoosh(1.0, True, 0.5), 1, 0.4)
mx.sfx(cue['sky-tumble'], whoosh(1.6, False, 0.3), 1, 0.5, 0.3)
for k in range(3): mx.sfx(1.5 + k * 3.1, chirp(0.35), 1, rng.uniform(-0.8, 0.8))

mx.write(sys.argv[1] if len(sys.argv) > 1 else 'build/audio.wav', fade_out=1.2)
