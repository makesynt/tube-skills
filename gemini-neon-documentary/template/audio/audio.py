"""Documentary Underscore + Physical Foley Synthesizer & Broadcast -14 LUFS Mixer.

Synthesizes a brooding cello/minimalist documentary pulse bed + cue-synced foley
(paper slide, fountain-pen ink scratch, pin thud, typewriter clicks, rubber stamp slam,
and 16mm film projector clatter during vintage 2D inserts), then mixes with optional
build/voiceover.wav using automatic vocal-band ducking.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import wave
from pathlib import Path
import numpy as np

SR = 48000


def write_wav(path: Path, samples: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(samples * 32767.0, -32768, 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


def add_burst(buf: np.ndarray, t0: float, sig: np.ndarray) -> None:
    i0 = max(0, int(round(t0 * SR)))
    if i0 >= len(buf):
        return
    L = min(len(sig), len(buf) - i0)
    buf[i0 : i0 + L] += sig[:L]


def synth_doc_bed(duration: float, cues: list[dict], seed: int = 1915) -> np.ndarray:
    n = int(round(duration * SR))
    t = np.arange(n, dtype=np.float32) / SR
    rng = np.random.default_rng(seed)
    bed = np.zeros(n, dtype=np.float32)

    # Warm, restrained low cello & sub-bass documentary drone (D minor: D2, A2, F3, G3)
    prog = [
        (0.0, 0.28, [73.42, 110.0, 174.61]),
        (0.28, 0.56, [65.41, 98.0, 164.81]),
        (0.56, 0.80, [58.27, 116.54, 174.61]),
        (0.80, 1.01, [73.42, 110.0, 220.0]),
    ]
    for f0_frac, f1_frac, notes in prog:
        i0, i1 = int(f0_frac * n), min(n, int(f1_frac * n))
        if i1 <= i0:
            continue
        lt = np.arange(i1 - i0, dtype=np.float32) / SR
        seg_d = (i1 - i0) / SR
        env = np.minimum(1.0, lt / 1.1) * np.minimum(1.0, (seg_d - lt) / 1.1)
        chord = np.zeros_like(lt)
        for idx, freq in enumerate(notes):
            vib = 1.0 + 0.0025 * np.sin(2 * np.pi * (4.3 + idx * 0.4) * lt)
            # Soft bowed harmonic richness without harshness
            tone = np.sin(2 * np.pi * freq * vib * lt) + 0.28 * np.sin(4 * np.pi * freq * vib * lt)
            chord += tone / len(notes)
        bed[i0:i1] += 0.13 * env * chord

    # Subtle rhythmic investigative pulse (92 BPM muted felt heartbeat)
    beat_step = 60.0 / 92.0
    for bt in np.arange(0.4, duration - 0.6, beat_step):
        lt = np.arange(int(0.18 * SR), dtype=np.float32) / SR
        thump = 0.065 * np.exp(-lt * 24.0) * np.sin(2 * np.pi * (86.0 - 28.0 * lt) * lt)
        add_burst(bed, float(bt), thump)

    # Cue-synced physical foley
    for cue in cues:
        kind = cue.get("kind", "")
        ct = float(cue.get("t", 0.0))
        if kind == "card":
            # Soft archival paper slide
            lt = np.arange(int(0.22 * SR), dtype=np.float32) / SR
            noise = np.convolve(rng.normal(0, 1, len(lt)), np.ones(16) / 16, mode="same").astype(np.float32)
            add_burst(bed, ct, 0.075 * np.sin(np.pi * lt / 0.22) ** 2 * noise)
        elif kind == "circle":
            # Fountain pen / nib scratch across cotton stock
            lt = np.arange(int(0.34 * SR), dtype=np.float32) / SR
            scratch = np.convolve(rng.normal(0, 1, len(lt)), np.ones(6) / 6, mode="same").astype(np.float32)
            env = np.sin(np.pi * lt / 0.34) * (0.65 + 0.35 * np.sin(2 * np.pi * 14 * lt))
            add_burst(bed, ct, 0.06 * env * scratch)
        elif kind == "pin":
            # Brass pin into cork board
            lt = np.arange(int(0.09 * SR), dtype=np.float32) / SR
            add_burst(bed, ct, 0.14 * np.exp(-lt * 48.0) * np.sin(2 * np.pi * 210 * lt))
        elif kind == "stamp":
            # Heavy rubber stamp thud
            lt = np.arange(int(0.26 * SR), dtype=np.float32) / SR
            noise = np.convolve(rng.normal(0, 0.5, len(lt)), np.ones(10) / 10, mode="same").astype(np.float32)
            thud = (0.24 * np.exp(-lt * 19.0) * np.sin(2 * np.pi * 92 * lt)) + 0.09 * np.exp(-lt * 32.0) * noise
            add_burst(bed, ct, thud)
        elif kind == "type":
            # Brief mechanical typewriter ticks
            for k in range(8):
                lt = np.arange(int(0.025 * SR), dtype=np.float32) / SR
                add_burst(bed, ct + k * 0.048, 0.055 * np.exp(-lt * 120.0) * rng.normal(0, 1, len(lt)).astype(np.float32))
        elif kind == "projector":
            # 16mm film projector clatter + ocean/wind swell across vintage 2D insert
            dur_ins = float(cue.get("dur", 6.0))
            L = int(dur_ins * SR)
            lt = np.arange(L, dtype=np.float32) / SR
            env = np.minimum(1.0, lt / 0.5) * np.minimum(1.0, (dur_ins - lt) / 0.5)
            swell = np.convolve(rng.normal(0, 0.22, L), np.ones(36) / 36, mode="same").astype(np.float32)
            add_burst(bed, ct, 0.16 * env * swell)
            for tick in np.arange(ct, ct + dur_ins, 1.0 / 12.0):
                kt = np.arange(int(0.014 * SR), dtype=np.float32) / SR
                add_burst(bed, float(tick), 0.028 * np.exp(-kt * 180.0) * rng.normal(0, 1, len(kt)).astype(np.float32))

    fade = min(n // 4, int(0.6 * SR))
    if fade > 0:
        bed[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
        bed[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
    return bed


def main() -> int:
    ap = argparse.ArgumentParser(description="Build documentary underscore + foley and mix voiceover.")
    ap.add_argument("--beats", default="src/beats.json")
    ap.add_argument("--vo", default="build/voiceover.wav")
    ap.add_argument("--out", default="build/audio.wav")
    args = ap.parse_args()

    beats = json.loads(Path(args.beats).read_text(encoding="utf-8"))
    duration = float(beats.get("duration", 15.0))
    cues = beats.get("sound_cues", [])

    bed_only = Path(args.out).parent / "_bed_foley.wav"
    write_wav(bed_only, synth_doc_bed(duration, cues))

    vo_path = Path(args.vo)
    if vo_path.exists():
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(vo_path),
                "-i", str(bed_only),
                "-filter_complex",
                "[1:a]aformat=channel_layouts=stereo,equalizer=f=2500:t=q:w=1.2:g=-3.0,volume=0.34[bg];"
                "[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.08[vo];"
                "[vo][bg]amix=inputs=2:duration=longest:dropout_transition=0,volume=1.85,loudnorm=I=-14.0:TP=-1.0:LRA=9",
                "-t", f"{duration:.3f}", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le",
                str(args.out),
            ],
            check=True,
        )
    else:
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(bed_only),
                "-af", "aformat=channel_layouts=stereo,loudnorm=I=-16.0:TP=-1.2:LRA=9",
                "-t", f"{duration:.3f}", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le",
                str(args.out),
            ],
            check=True,
        )
    bed_only.unlink(missing_ok=True)
    print(f"[AUDIO] Wrote documentary mix -> {args.out} ({duration:.2f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
