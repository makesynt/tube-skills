# Score + sound effects for the example video. Replace the cue section for a new video.
# usage: python3 audio/audio.py build/audio.wav
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audiolib import *

B = beats(); cue = B['cues']; D = B['duration']
mx = Mix(D)

# ---------------- music: light and bouncy, F major, 100 bpm ----------------
bar = 60 / 100 * 4
F, Bb, C, Dm = 65, 70, 60, 62
prog = [(0.2 + i * bar, bar, r, q) for i, (r, q) in enumerate([(F, 'add9'), (Bb, 'M7'), (Dm, 'm7'), (C, 'sus4'), (F, 'add9')]) if 0.2 + i * bar < D]
mx.pads(prog, 0.30, cut=1500)
mx.arp([p for p in prog if p[0] >= bar * 0.9], bar / 8, 0.20, marimba, 65, 84, (0, 2, 1, 3, 2, 4, 3, 1))
mx.bassline([p for p in prog if p[0] >= bar * 0.9], 0.45, every=bar / 4, dec=5)
for i in range(int((D - bar) / (bar / 8))):          # soft shaker on the eighths once the tune gets going
    mx.music(bar + i * bar / 8, shaker(0.5 if i % 2 else 0.8), 0.6, 0.3)
mx.music(cue['title'], bell(mf(77), 3.5), 0.45); mx.music(cue['title'] + 0.08, bell(mf(84), 3.5), 0.3)

# ---------------- ambience + sound effects on the story cues ----------------
mx.bed(0, D, meadow, 0.5, fi=0.8, fo=1.2)
for k in range(6): mx.sfx(0.8 + k * 1.9 + rng.uniform(0, 0.6), chirp(0.5), 1, rng.uniform(-0.8, 0.8))
walk_end = cue['throw'] - 0.9
mx.steps(cue['walk-start'] + 0.2, walk_end, 0.47, 'grass', 0.28)
for i in range(int((walk_end - cue['walk-start']) / 0.27)): mx.sfx(cue['walk-start'] + 0.1 + i * 0.27, paw(0.18), 1, 0.2)
mx.sfx(cue['throw'] - 0.15, whoosh(0.5, True, 0.35), 1, 0.2)
mx.sfx(cue['ball-lands'], boing(220, 0.5), 1, 0.4)
for j, dt in enumerate([0.45, 0.8, 1.05]): mx.sfx(cue['ball-lands'] + dt, boing(260 + 30 * j, 0.32 - j * 0.08, 0.3), 1, 0.45)
for i in range(int((cue['catch'] - cue['throw'] - 0.3) / 0.16)): mx.sfx(cue['throw'] + 0.3 + i * 0.16, paw(0.22), 1, 0.3)
mx.sfx(cue['catch'], pop(0.6), 1, 0.3); mx.sfx(cue['catch'] + 0.25, yip(0.5), 1, 0.3, 0.2)
mx.sfx(cue['catch'] + 0.9, breath(False, 0.25, 0.2), 1, 0.3); mx.sfx(cue['catch'] + 1.15, breath(True, 0.2, 0.2), 1, 0.3)

mx.write(sys.argv[1] if len(sys.argv) > 1 else 'build/audio.wav', fade_out=0.9)
