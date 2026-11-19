"""Optional Gemini API Documentary Audio Upgrade (Gemini 3.8 Flash TTS + Google Lyria 3.5).

Reads GEMINI_API_KEY strictly from local .env (never hardcode or paste keys in chat).
Supports either the `gemini-api` CLI or the official `google-genai` Python SDK.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import wave
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


def synth_tts_sdk(api_key: str, text: str, voice: str, out_wav: Path) -> bool:
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                    )
                ),
            ),
        )
        pcm = resp.candidates[0].content.parts[0].inline_data.data
        with wave.open(str(out_wav), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(24000)
            wf.writeframes(pcm)
        return True
    except Exception as exc:
        print(f"[WARN] SDK TTS fallback notice: {exc}", file=sys.stderr)
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description="Optional Gemini API TTS + Lyria documentary score.")
    ap.add_argument("--music-prompt", default="")
    ap.add_argument("--vo-text", default="")
    ap.add_argument("--voice", default="Charon")
    ap.add_argument("--out", default="build/audio.wav")
    ap.add_argument("--init-env", action="store_true")
    args = ap.parse_args()

    env_path = Path.cwd() / ".env"
    if args.init_env:
        if not env_path.exists():
            env_path.write_text("# Obtain key from https://aistudio.google.com -> API keys\nGEMINI_API_KEY=\n", encoding="utf-8")
        print(f"Verified {env_path}")
        return 0

    load_dotenv(env_path)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print(f"[ERROR] Missing GEMINI_API_KEY in {env_path}", file=sys.stderr)
        return 2

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cli = shutil.which("gemini-api")
    vo_tmp = out_path.parent / "_gemini_doc_vo.wav"
    music_tmp = out_path.parent / "_lyria_doc_music.wav"

    if args.music_prompt and cli:
        subprocess.run([cli, "music", args.music_prompt, "-m", "lyria-3.5", "--out", str(music_tmp)], check=True)
    if args.vo_text:
        if cli:
            subprocess.run([cli, "tts", args.vo_text, "-m", "gemini-3.8-flash-tts", "-v", args.voice, "--out", str(vo_tmp)], check=True)
        else:
            synth_tts_sdk(api_key, args.vo_text, args.voice, vo_tmp)

    if music_tmp.exists() and vo_tmp.exists():
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(vo_tmp), "-i", str(music_tmp),
                "-filter_complex",
                "[1:a]volume=0.32[m];[0:a]volume=1.05[v];[v][m]amix=inputs=2:duration=longest:dropout_transition=0,volume=1.8,loudnorm=I=-14:TP=-1.0:LRA=9",
                "-ar", "48000", "-ac", "2", str(out_path),
            ],
            check=True,
        )
    elif vo_tmp.exists():
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(vo_tmp), "-af", "loudnorm=I=-14:TP=-1.0:LRA=9", "-ar", "48000", "-ac", "2", str(out_path)], check=True)
    elif music_tmp.exists():
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(music_tmp), "-af", "loudnorm=I=-16:TP=-1.2:LRA=9", "-ar", "48000", "-ac", "2", str(out_path)], check=True)
    else:
        print("[ERROR] Could not synthesize requested cloud audio.", file=sys.stderr)
        return 1

    print(f"[GEMINI AUDIO] Wrote -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
