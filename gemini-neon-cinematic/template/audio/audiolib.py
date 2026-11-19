# Deterministic music + sound-effect synth for animations (numpy + scipy, no samples).
# Same input -> same WAV. Use from audio.py:  from audiolib import *;  mx = Mix(duration)
import json, os, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(7)

def beats(path=None):
    """Load src/beats.json so sound lands on the same cue times as the picture."""
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'beats.json')
    return json.load(open(path))

# ---------------- basics ----------------
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)            # MIDI note -> Hz
def tt(d): return np.arange(int(SR * d)) / SR
def lp(sig, f, o=2): return sosfilt(butter(o, min(f, SR / 2 - 100), 'low', fs=SR, output='sos'), sig)
def hp(sig, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), sig)
def bp(sig, lo, hi, o=2): return sosfilt(butter(o, [lo, min(hi, SR / 2 - 100)], 'band', fs=SR, output='sos'), sig)
def noise(d): return rng.standard_normal(int(SR * d))
def brown(d):
    b = np.cumsum(noise(d)); b = b - lp(b, 8, 1); return b / (np.abs(b).max() + 1e-9)
def adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.full(n, s, float); a = min(a, n)
    if a: e[:a] = np.linspace(0, 1, a, endpoint=False)
    d2 = min(d, n - a)
    if d2 > 0: e[a:a + d2] = np.linspace(1, s, d2)
    if 0 < r < n: e[n - r:] *= np.linspace(1, 0, r)
    return e

# ---------------- instruments ----------------
def pluck(f, d=1.2, bright=1.0):
    t = tt(d); s = np.zeros_like(t)
    for k, a in enumerate([1, .5, .28, .16, .08, .05], 1):
        if f * k > 9000: break
        s += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.8 + k * 1.6 * bright))
    return s * np.minimum(1, t / 0.004) * 0.5
def kalimba(f, d=1.6):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 14)
    return s * np.minimum(1, t / 0.002) * 0.5
def marimba(f, d=1.0):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 18)
    return s * np.minimum(1, t / 0.002) * 0.55
def bell(f, d=3.0):
    t = tt(d); s = np.zeros_like(t)
    for r, a, dec in [(1, 1, 1.2), (2.76, .5, 2.4), (5.4, .3, 4), (8.93, .15, 7)]:
        if f * r < 15000: s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec)
    return s * np.minimum(1, t / 0.003) * 0.35
def pad(notes, d, att=1.5, rel=2.0, cut=1800, det=0.004, bright=8):
    t = tt(d); s = np.zeros_like(t)
    for m in notes:
        f = mf(m)
        for dv in (-det, 0, det):
            ph = rng.uniform(0, 6.28)
            for k in range(1, bright + 1):
                if f * k > cut * 2.5: break
                s += np.sin(2 * np.pi * f * (1 + dv) * k * t + ph * k) / k * (0.6 if k > 1 else 1)
    s = lp(s, cut, 2) * adsr(len(t), att, 0.1, 1.0, rel)
    return s / (len(notes) * 3) * 0.6
def bass(f, d=0.5, dec=4.0):
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)) * np.exp(-t * dec)
    return s * np.minimum(1, t / 0.006) * np.minimum(1, (d - t) / 0.03) * 0.6
def lead(f, d, vib=5.0):
    t = tt(d)
    fm = f * (1 + 0.006 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / 0.4))
    ph = 2 * np.pi * np.cumsum(fm) / SR
    s = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    return lp(s, 3000) * adsr(len(t), 0.08, 0.2, 0.8, 0.35) * 0.35
def whistle(f, d):
    t = tt(d); fm = f * (1 + 0.01 * np.sin(2 * np.pi * 6 * t)); ph = 2 * np.pi * np.cumsum(fm) / SR
    return (np.sin(ph) + 0.08 * bp(noise(d), f * 0.8, f * 1.3)) * adsr(len(t), 0.04, 0.1, 0.85, 0.12) * 0.3
def kick(g=1.0):
    t = tt(0.45); f = 48 + 90 * np.exp(-t * 28)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) + 0.15 * lp(noise(0.45), 2000) * np.exp(-t * 60)) * g
def snare(g=1.0):
    t = tt(0.3); return (0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) + bp(noise(0.3), 1500, 9000) * np.exp(-t * 18)) * g * 0.5
def hat(g=1.0):
    t = tt(0.06); return bp(noise(0.06), 7000, 15000) * np.exp(-t * 80) * g * 0.3
def shaker(g=1.0):
    t = tt(0.09); return bp(noise(0.09), 5000, 12000) * np.exp(-t * 60) * np.minimum(1, t / 0.01) * g * 0.35
def clap(g=1.0):
    out = np.zeros(int(SR * 0.3))
    for o in (0, 0.012, 0.024):
        s = bp(noise(0.25), 900, 5000) * np.exp(-tt(0.25) * 30); i = int(o * SR); out[i:i + len(s)] += s[:len(out) - i]
    return out * g * 0.4
def timp(f=55, g=1.0, d=2.5):
    t = tt(d); fr = f * (1 + 0.08 * np.exp(-t * 6))
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 1.6) + 0.4 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR) * np.exp(-t * 3)
    return (s + 0.3 * lp(noise(d), 400) * np.exp(-t * 12)) * g * 0.9

# ---------------- sound effects ----------------
def step(kind='grass', g=1.0):
    d = 0.16; t = tt(d)
    if kind == 'grass': s = bp(noise(d), 300, 3500) * np.exp(-t * 35) * 0.6 + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 40) * 0.5
    elif kind == 'wood': s = bp(noise(d), 400, 3000) * np.exp(-t * 50) * 0.4 + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 35) * 0.7
    else: s = bp(noise(d), 800, 6000) * np.exp(-t * 60) * 0.5 + np.sin(2 * np.pi * 95 * t) * np.exp(-t * 45) * 0.6  # stone
    return s * g * rng.uniform(0.75, 1.0)
def paw(g=1.0):
    d = 0.18; t = tt(d)
    return (np.sin(2 * np.pi * 60 * t) * np.exp(-t * 30) + 0.25 * bp(noise(d), 200, 1500) * np.exp(-t * 40)) * g * rng.uniform(0.8, 1)
def thud(g=1.0, f=55, d=0.7):
    t = tt(d); fr = f * (1 + 1.2 * np.exp(-t * 25))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 6) + 0.5 * lp(noise(d), 900) * np.exp(-t * 14)) * g
def boing(f=180, g=1.0, d=0.5):       # cartoon bounce
    t = tt(d); fr = f * (1 + 0.6 * np.exp(-t * 9) * np.cos(2 * np.pi * 9 * t))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 7) * np.minimum(1, t / 0.003) * g * 0.6
def pop(g=1.0):
    t = tt(0.12); f = 600 + 900 * np.exp(-t * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * g * 0.6
def rustle(d=0.5, g=1.0):
    t = tt(d); am = np.abs(lp(noise(d), 25)); am /= am.max() + 1e-9
    return bp(noise(d), 1200, 7000) * am * np.sin(np.pi * t / d) * g * 0.8
def sweep_noise(d, f0, f1, g=1.0, q=0.6):
    n = int(SR * d); src = noise(d); out = np.zeros(n); B = 1024
    for i in range(0, n, B):
        u = i / max(1, n - 1); fc = f0 * (f1 / f0) ** u
        y = bp(src[max(0, i - 2048):i + B], max(30, fc * (1 - q / 2)), fc * (1 + q / 2))
        out[i:i + B] = y[-len(out[i:i + B]):]
    return out * np.sin(np.pi * np.arange(n) / n) ** 1.5 * g
def whoosh(d=0.8, up=True, g=1.0): return sweep_noise(d, 300 if up else 2500, 2500 if up else 300, g, 0.9)
def rumble(d, g=1.0):
    t = tt(d); s = lp(brown(d), 110, 2) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t))
    return s / (np.abs(s).max() + 1e-9) * g
def click(g=1.0):
    t = tt(0.12); return (bp(noise(0.12), 1500, 6000) * np.exp(-t * 90) + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 60) * 0.4) * g
def clunk(g=1.0):
    t = tt(0.5); return (np.sin(2 * np.pi * 120 * t * (1 - 0.3 * t)) * np.exp(-t * 18) + bp(noise(0.5), 1500, 6000) * np.exp(-t * 80) * 0.6) * g
def powerup(d=1.4, g=1.0):
    t = tt(d); f = 180 * (5.0 ** (t / d)); ph = 2 * np.pi * np.cumsum(f) / SR
    return ((np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * (t / d) ** 1.5 + 0.4 * sweep_noise(d, 400, 4000, 1)) * g * 0.5
def shimmer(d=2.0, g=1.0, lo=84, hi=100, dens=14):
    out = np.zeros(int(SR * (d + 2.5)))
    for _ in range(int(d * dens)):
        b = bell(mf(rng.integers(lo, hi)), 2.0) * rng.uniform(0.3, 1); i = int(rng.uniform(0, d) * SR)
        out[i:i + len(b)] += b[:len(out) - i]
    return out * g * 0.5
def roar(d=1.0, g=1.0, base=95):
    t = tt(d); f0 = base * (1 + 0.35 * np.sin(np.pi * t / d)); ph = 2 * np.pi * np.cumsum(f0) / SR
    growl = 0.6 + 0.4 * np.sin(2 * np.pi * 31 * t + 3 * lp(noise(d), 60))
    src = sum(np.sin(k * ph) / k for k in range(1, 18)) * growl + 0.9 * noise(d) * growl
    s = bp(src, 250, 450) + bp(src, 600, 950) * 0.8 + bp(src, 1100, 1700) * 0.5 + lp(src, 180) * 0.6
    return s / (np.abs(s).max() + 1e-9) * adsr(len(t), 0.06, 0.15, 0.85, min(0.4, d * 0.4)) * g
def bark(g=1.0, f=520):
    d = 0.22; t = tt(d); fr = f * (1 + 0.5 * np.sin(np.pi * t / d)) ; ph = 2 * np.pi * np.cumsum(fr) / SR
    src = sum(np.sin(k * ph) / k for k in range(1, 10)) + 0.4 * noise(d)
    return (bp(src, 500, 2500) * adsr(len(t), 0.01, 0.05, 0.7, 0.08)) * g * 0.5
def yip(g=1.0): return bark(g * 0.7, 900)
def breath(inhale=False, g=1.0, d=0.38):
    t = tt(d); return bp(noise(d), 600 if inhale else 400, 2600 if inhale else 1800) * np.sin(np.pi * t / d) ** 2 * g * 0.6
def chirp(g=1.0):
    d = rng.uniform(0.06, 0.14); t = tt(d); f0 = rng.uniform(2600, 4200)
    f = f0 * (1 + rng.uniform(-0.3, 0.4) * t / d) + 300 * np.sin(2 * np.pi * rng.uniform(25, 60) * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * g * 0.25
def creak(d=0.6, g=1.0):
    t = tt(d); f = 140 + 60 * np.sin(np.pi * t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    pulses = (np.sin(2 * np.pi * 38 * t) > 0.6).astype(float)
    return bp(np.sin(ph) * pulses + 0.2 * noise(d), 300, 2500) * np.sin(np.pi * t / d) * g
def splash(g=1.0, d=0.9):
    t = tt(d); return (bp(noise(d), 600, 8000) * np.exp(-t * 6) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 23 * t))) + 0.4 * thud(0.5, 70, d)) * g * 0.6

# ambience generators: bed(mx, t0, t1, meadow, g)
def meadow(d):
    t = tt(d); return 0.18 * bp(noise(d), 300, 2500) + 0.012 * np.sin(2 * np.pi * 4800 * t) * np.clip(lp(noise(d), 0.5, 1) * 40, 0, 1)
def wind(d): return 0.5 * bp(brown(d) + 0.2 * noise(d), 200, 1200)
def room(d): return 0.2 * lp(noise(d), 500) + 0.05 * bp(noise(d), 800, 3000)
def night(d):
    t = tt(d); cr = (np.sin(2 * np.pi * 3.1 * t) > 0.75).astype(float) * np.sin(2 * np.pi * 4300 * t) * 0.03
    return 0.08 * lp(noise(d), 600) + cr

# ---------------- harmony helpers ----------------
CH = {'m': [0, 3, 7], 'M': [0, 4, 7], 'm7': [0, 3, 7, 10], 'M7': [0, 4, 7, 11], 'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14],
      'sus2': [0, 2, 7], 'sus4': [0, 5, 7], '7': [0, 4, 7, 10], '6': [0, 4, 7, 9]}
def chord(root, q, lo=50, hi=70):
    return sorted({root + iv + 12 * o for o in range(-2, 4) for iv in CH[q] if lo <= root + iv + 12 * o <= hi})
# note names (octave 4): C4=60
C4, D4, E4, F4, G4, A4, B4 = 60, 62, 64, 65, 67, 69, 71

class Mix:
    """Three buses: music, sfx, and a reverb send. write() levels, limits and saves 16-bit WAV."""
    def __init__(self, duration):
        self.dur = duration; self.N = int(SR * duration) + SR
        self.MUS = np.zeros((2, self.N)); self.SFX = np.zeros((2, self.N)); self.WET = np.zeros((2, self.N))
    def _put(self, bus, t, sig, g=1.0, pan=0.0):
        i = int(t * SR)
        if i >= self.N or len(sig) == 0 or i < 0: return
        sig = sig[:self.N - i].copy(); k = min(len(sig), int(0.02 * SR)); sig[-k:] *= np.linspace(1, 0, k)
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        bus[0, i:i + len(sig)] += sig * g * l * 1.414; bus[1, i:i + len(sig)] += sig * g * r * 1.414
    def music(self, t, sig, g=1.0, pan=0.0): self._put(self.MUS, t, sig, g, pan)
    def sfx(self, t, sig, g=1.0, pan=0.0, wet=0.0):
        self._put(self.SFX, t, sig, g, pan)
        if wet: self._put(self.WET, t, sig, g * wet, pan)
    def bed(self, t0, t1, gen, g, fi=1.5, fo=1.5):
        s = gen(t1 - t0); n = len(s); e = np.ones(n); a, b = int(fi * SR), int(fo * SR)
        e[:a] = np.linspace(0, 1, a); e[n - b:] *= np.linspace(1, 0, b); self._put(self.SFX, t0, s * e, g)
    def steps(self, t0, t1, every, kind='grass', g=0.35, pan=0.0, wet=0.0):
        t, i = t0, 0
        while t < t1:
            self.sfx(t, step(kind, g), 1, pan + (0.05 if i % 2 else -0.05), wet); t += every * rng.uniform(0.96, 1.04); i += 1
    def pads(self, prog, g, cut=1600, lo=50, hi=69, att=1.2, rel=1.8):
        for (t0, d, root, q) in prog: self.music(t0, pad(chord(root, q, lo, hi), d + rel * 0.5, att, rel, cut), g)
    def arp(self, prog, step_, g, inst=pluck, lo=62, hi=81, pat=(0, 1, 2, 3, 2, 1), pan=0.15):
        for (t0, d, root, q) in prog:
            notes = chord(root, q, lo, hi)
            for i in range(int(round(d / step_))):
                self.music(t0 + i * step_, inst(mf(notes[pat[i % len(pat)] % len(notes)]), 1.2), g * (1.0 if i % 2 == 0 else 0.7), pan * (1 if i % 2 else -1))
    def bassline(self, prog, g, every=None, dec=3.0):
        for (t0, d, root, q) in prog:
            r = root - 24 if root >= 50 else root - 12
            if every is None: self.music(t0, bass(mf(r), d * 0.95, dec), g)
            else:
                for i in range(int(round(d / every))): self.music(t0 + i * every, bass(mf(r), every * 0.9, dec), g * (1 if i % 2 == 0 else 0.75))
    def write(self, path, fade_out=1.0):
        def reverb(sig, dur=2.4, seed=3):
            r = np.random.default_rng(seed); n = int(dur * SR); t = np.arange(n) / SR
            ir = r.standard_normal(n) * np.exp(-t * 6.9 / dur); ir = lp(ir, 5000); ir[:int(0.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
            return fftconvolve(sig, ir)[:len(sig)]
        mw = np.stack([reverb(self.MUS[0], 2.6, 1), reverb(self.MUS[1], 2.6, 2)])
        sw = np.stack([reverb(self.WET[0] + self.SFX[0] * 0.08, 2.2, 3), reverb(self.WET[1] + self.SFX[1] * 0.08, 2.2, 4)])
        mix = hp(self.MUS * 0.9 + mw * 0.35 + self.SFX + sw * 0.45, 28)[:, :int(self.dur * SR)]
        fi, fo = int(0.3 * SR), int(fade_out * SR)
        mix[:, :fi] *= np.linspace(0, 1, fi); mix[:, -fo:] *= np.linspace(1, 0, fo)
        env = np.sqrt(lp((mix ** 2).mean(0), 0.6, 1).clip(1e-10)); tgt = np.sqrt((mix ** 2).mean())
        mix = mix * 10 ** (np.clip(20 * np.log10(tgt / env) * 0.55, -6, 10) / 20)   # gentle leveler
        pk = np.abs(mix).max(); mix = np.tanh(mix / pk * 0.95 * 1.6) / np.tanh(1.6)    # soft limiter
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        wavfile.write(path, SR, (mix.T * 32000).astype(np.int16))
        print(f'wrote {path}: {mix.shape[1] / SR:.1f} s')
