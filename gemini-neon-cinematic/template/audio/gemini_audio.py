"""Optional Gemini API cinematic audio generator (Lyria music + Gemini TTS).

Reads GEMINI_API_KEY from the project's .env file (never hardcode or paste keys in chat).
Usage:
  python audio/gemini_audio.py --music-prompt "Warm orchestral piano and strings, hopeful adventure" --out build/audio.wav
  python audio/gemini_audio.py --music-prompt "Dramatic ocean storm score" --vo-text "He held the line." --voice Kore --out build/audio.wav
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def load_dotenv(env_path: Path) -> None:
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def ensure_env_template(project_dir: Path) -> Path:
    env_path = project_dir / ".env"
    if not env_path.exists():
        env_path.write_text(
            "# Get your key at https://aistudio.google.com -> API keys\nGEMINI_API_KEY=\n",
            encoding="utf-8",
        )
    return env_path


def run_cli(cmd: list[str]) -> str:
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return res.stdout.strip()


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate cinematic Lyria music + Gemini TTS voiceover.")
    ap.add_argument("--music-prompt", default="", help="Prompt for Google Lyria (lyria-3.5) score")
    ap.add_argument("--vo-text", default="", help="Optional narration text for Gemini TTS (gemini-3.8-flash-tts)")
    ap.add_argument("--voice", default="Kore", help="Gemini TTS voice name (default: Kore)")
    ap.add_argument("--out", default="build/audio.wav", help="Output mixed WAV path")
    ap.add_argument("--init-env", action="store_true", help="Create .env template and exit")
    args = ap.parse_args()

    project_dir = Path.cwd()
    env_path = ensure_env_template(project_dir)
    if args.init_env:
        print(f"Created/verified {env_path}. Paste your GEMINI_API_KEY there locally.")
        return 0

    load_dotenv(env_path)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print(
            f"[ERROR] GEMINI_API_KEY is empty in {env_path}.\n"
            "Get a key at https://aistudio.google.com -> API keys and paste it into .env locally.",
            file=sys.stderr,
        )
        return 2

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    music_tmp = out_path.parent / "_lyria_music.wav"
    vo_tmp = out_path.parent / "_gemini_vo.wav"

    have_music = False
    have_vo = False

    if args.music_prompt:
        run_cli(["gemini-api", "music", args.music_prompt, "-m", "lyria-3.5", "--out", str(music_tmp)])
        have_music = music_tmp.exists()

    if args.vo_text:
        run_cli(["gemini-api", "tts", args.vo_text, "-m", "gemini-3.8-flash-tts", "-v", args.voice, "--out", str(vo_tmp)])
        have_vo = vo_tmp.exists()

    if have_music and have_vo:
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(music_tmp), "-i", str(vo_tmp),
                "-filter_complex",
                "[0:a]volume=0.35[m];[1:a]volume=1.0[v];[m][v]amix=inputs=2:duration=longest:dropout_transition=0,volume=1.8,loudnorm=I=-16:TP=-1.5:LRA=11",
                "-ar", "48000", "-ac", "2", str(out_path),
            ],
            check=True,
        )
    elif have_music:
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(music_tmp),
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "2", str(out_path),
            ],
            check=True,
        )
    elif have_vo:
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(vo_tmp),
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "2", str(out_path),
            ],
            check=True,
        )
    else:
        print("Provide --music-prompt and/or --vo-text (or --init-env).", file=sys.stderr)
        return 1

    print(f"Wrote cinematic audio -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
