#!/usr/bin/env python
"""Automation helpers for YouTube growth skills.

The script intentionally stays dependency-light. It can:
- collect YouTube video metadata and transcripts from URLs
- query YouTube Data API when YOUTUBE_API_KEY is available
- normalize video datasets for agent analysis
- create heuristic scores for hooks and titles
- emit script-plan and audience-bullseye starter artifacts
- render standalone HTML reports from generated JSON artifacts
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import math
import os
import re
import statistics
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


YOUTUBE_API = "https://www.googleapis.com/youtube/v3"


def eprint(*args: Any) -> None:
    print(*args, file=sys.stderr)


def load_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str | Path, data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def http_json(url: str, timeout: int = 20) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def extract_video_id(value: str) -> str | None:
    value = value.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value
    parsed = urllib.parse.urlparse(value)
    host = parsed.netloc.lower()
    if "youtu.be" in host:
        candidate = parsed.path.strip("/").split("/")[0]
        return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate or "") else None
    if "youtube" in host:
        qs = urllib.parse.parse_qs(parsed.query)
        if "v" in qs and qs["v"]:
            candidate = qs["v"][0]
            return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate or "") else None
        parts = [p for p in parsed.path.split("/") if p]
        if "shorts" in parts:
            idx = parts.index("shorts")
            if idx + 1 < len(parts):
                candidate = parts[idx + 1]
                return candidate if re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate or "") else None
    return None


def fetch_oembed(video_id: str) -> dict[str, Any]:
    url = "https://www.youtube.com/watch?v=" + video_id
    api = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(url)
    try:
        data = http_json(api)
    except Exception as exc:
        return {"error": str(exc)}
    return {
        "title": data.get("title"),
        "author_name": data.get("author_name"),
        "author_url": data.get("author_url"),
        "thumbnail_url": data.get("thumbnail_url"),
        "provider_name": data.get("provider_name"),
    }


def fetch_transcript(video_id: str, languages: list[str] | None = None) -> dict[str, Any]:
    languages = languages or ["en", "en-US", "zh-Hans", "zh-CN", "zh"]
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        transcript = YouTubeTranscriptApi().fetch(video_id, languages=languages)
        items = [
            {
                "text": item.text.replace("\n", " ").strip(),
                "start": float(item.start),
                "duration": float(item.duration),
            }
            for item in transcript
        ]
        return {
            "available": True,
            "items": items,
            "text": " ".join(item["text"] for item in items),
            "language": getattr(transcript, "language_code", None),
        }
    except Exception as exc:
        return {"available": False, "error": str(exc), "items": [], "text": ""}


def first_seconds(transcript: dict[str, Any], seconds: float = 30.0) -> str:
    return " ".join(
        item["text"]
        for item in transcript.get("items", [])
        if float(item.get("start", 0)) <= seconds
    ).strip()


def collect_videos(args: argparse.Namespace) -> None:
    videos = list(args.video or [])
    if args.videos_file:
        videos.extend(
            line.strip()
            for line in Path(args.videos_file).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        )
    results = []
    for raw in videos:
        video_id = extract_video_id(raw)
        if not video_id:
            results.append({"input": raw, "error": "Could not extract video id"})
            continue
        meta = fetch_oembed(video_id)
        transcript = fetch_transcript(video_id, languages=args.language or None)
        results.append(
            {
                "input": raw,
                "video_id": video_id,
                "url": "https://www.youtube.com/watch?v=" + video_id,
                "metadata": meta,
                "transcript": transcript,
                "opening_30s": first_seconds(transcript, 30),
                "opening_60s": first_seconds(transcript, 60),
                "collected_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    write_json(args.out, {"videos": results})


def youtube_api(path: str, params: dict[str, Any]) -> dict[str, Any]:
    params = {k: v for k, v in params.items() if v is not None}
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        raise RuntimeError(
            "YOUTUBE_API_KEY is not configured. In PowerShell, run: "
            '$env:YOUTUBE_API_KEY="your_api_key_here"'
        )
    params["key"] = key
    url = f"{YOUTUBE_API}/{path}?" + urllib.parse.urlencode(params)
    return http_json(url)


def enrich_video_stats(video_ids: list[str]) -> dict[str, Any]:
    if not video_ids:
        return {}
    out: dict[str, Any] = {}
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i : i + 50]
        data = youtube_api(
            "videos",
            {
                "part": "snippet,statistics,contentDetails",
                "id": ",".join(chunk),
                "maxResults": 50,
            },
        )
        for item in data.get("items", []):
            out[item["id"]] = item
    return out


def search_videos(args: argparse.Namespace) -> None:
    data = youtube_api(
        "search",
        {
            "part": "snippet",
            "q": args.query,
            "type": "video",
            "order": args.order,
            "publishedAfter": args.published_after,
            "maxResults": args.max_results,
            "regionCode": args.region,
            "relevanceLanguage": args.language,
        },
    )
    ids = [item["id"]["videoId"] for item in data.get("items", []) if item.get("id", {}).get("videoId")]
    stats = enrich_video_stats(ids)
    videos = [normalize_api_video(stats.get(video_id), fallback=item) for video_id, item in zip(ids, data.get("items", []))]
    write_json(args.out, {"query": args.query, "videos": videos})


def resolve_uploads_playlist(channel_id: str) -> str | None:
    """Resolve a channel ID or @handle to its uploads playlist ID via channels.list (1 unit)."""
    raw = (channel_id or "").strip()
    params: dict[str, Any] = {"part": "contentDetails"}
    if raw.startswith("UC") and len(raw) == 24:
        params["id"] = raw
    elif raw.startswith("@"):
        params["forHandle"] = raw[1:]
    elif raw:
        params["forHandle"] = raw
    else:
        return None
    data = youtube_api("channels", params)
    items = data.get("items", [])
    if not items:
        return None
    return items[0].get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")


def channel_videos(args: argparse.Namespace) -> None:
    """Fetch a channel's recent videos via the uploads playlist (~3 units, not 100).

    Uses channels.list -> playlistItems.list -> videos.list instead of search.list,
    which cuts the per-channel quota cost from 100 units to roughly 3.
    """
    uploads_playlist = resolve_uploads_playlist(args.channel_id)
    if not uploads_playlist:
        write_json(
            args.out,
            {
                "channel_id": args.channel_id,
                "videos": [],
                "error": "Could not resolve uploads playlist for this channel.",
            },
        )
        return

    # Pull video IDs newest-first from the uploads playlist. Fetch a little
    # headroom so a publishedAfter filter can still fill the requested count.
    fetch_target = max(args.max_results, 50)
    video_ids: list[str] = []
    next_page: str | None = None
    while len(video_ids) < fetch_target:
        data = youtube_api(
            "playlistItems",
            {
                "part": "contentDetails",
                "playlistId": uploads_playlist,
                "maxResults": min(50, fetch_target - len(video_ids)),
                "pageToken": next_page,
            },
        )
        for item in data.get("items", []):
            vid = item.get("contentDetails", {}).get("videoId")
            if vid:
                video_ids.append(vid)
        next_page = data.get("nextPageToken")
        if not next_page:
            break

    stats = enrich_video_stats(video_ids)
    videos = [normalize_api_video(stats.get(vid)) for vid in video_ids]
    videos = [v for v in videos if v.get("video_id")]

    # uploads playlist is newest-first; drop anything older than the cutoff.
    if args.published_after:
        videos = [v for v in videos if (v.get("published_at") or "") >= args.published_after]

    videos = videos[: args.max_results]
    write_json(
        args.out,
        {
            "channel_id": args.channel_id,
            "uploads_playlist": uploads_playlist,
            "videos": videos,
        },
    )


def normalize_api_video(item: dict[str, Any] | None, fallback: dict[str, Any] | None = None) -> dict[str, Any]:
    item = item or {}
    fallback = fallback or {}
    snippet = item.get("snippet") or fallback.get("snippet") or {}
    statistics_data = item.get("statistics") or {}
    video_id = item.get("id") or fallback.get("id", {}).get("videoId")
    def as_int(name: str) -> int | None:
        value = statistics_data.get(name)
        try:
            return int(value) if value is not None else None
        except ValueError:
            return None
    return {
        "video_id": video_id,
        "url": "https://www.youtube.com/watch?v=" + video_id if video_id else None,
        "title": snippet.get("title"),
        "channel_id": snippet.get("channelId"),
        "channel_title": snippet.get("channelTitle"),
        "published_at": snippet.get("publishedAt"),
        "description": snippet.get("description"),
        "thumbnail_url": (snippet.get("thumbnails") or {}).get("high", {}).get("url"),
        "views": as_int("viewCount"),
        "likes": as_int("likeCount"),
        "comments": as_int("commentCount"),
        "duration": item.get("contentDetails", {}).get("duration"),
    }


def dataset_summary(args: argparse.Namespace) -> None:
    data = load_json(args.input)
    videos = data.get("videos", data if isinstance(data, list) else [])
    rows = []
    for video in videos:
        title = video.get("title") or video.get("metadata", {}).get("title")
        opening = video.get("opening_30s") or ""
        rows.append(
            {
                "video_id": video.get("video_id"),
                "title": title,
                "url": video.get("url"),
                "views": video.get("views"),
                "opening_30s": opening[:800],
                "has_transcript": bool(video.get("transcript", {}).get("available")),
            }
        )
    write_json(args.out, {"count": len(rows), "videos": rows})


def outlier_pulse(args: argparse.Namespace) -> None:
    data = load_json(args.input)
    videos = data.get("videos", data if isinstance(data, list) else [])
    view_values = [v.get("views") for v in videos if isinstance(v.get("views"), int)]
    baseline = args.baseline or (statistics.median(view_values) if view_values else None)
    ranked = []
    for video in videos:
        views = video.get("views")
        ratio = None
        if baseline and isinstance(views, int):
            ratio = round(views / baseline, 2) if baseline else None
        ranked.append(
            {
                **video,
                "outlier_ratio": ratio,
                "pulse_action": classify_outlier(ratio, views, args.min_views),
            }
        )
    ranked.sort(key=lambda v: (v.get("outlier_ratio") or 0, v.get("views") or 0), reverse=True)
    write_json(args.out, {"baseline_views": baseline, "videos": ranked})


def classify_outlier(ratio: float | None, views: int | None, min_views: int) -> str:
    if views is not None and views < min_views:
        return "ignore_low_volume"
    if ratio is None:
        return "needs_metrics"
    if ratio >= 3:
        return "deep_analyze"
    if ratio >= 1.5:
        return "watch_and_tag"
    return "baseline"


POWER_WORDS = {
    "mistake",
    "wrong",
    "secret",
    "truth",
    "fast",
    "faster",
    "only",
    "never",
    "before",
    "after",
    "why",
    "how",
    "stop",
    "best",
    "worst",
    "million",
    "beginner",
    "nobody",
    "everyone",
    "everything",
    "actually",
    "failed",
    "quit",
    "lies",
    "free",
    "proven",
    "exactly",
    "brutal",
    "honest",
    "banned",
    "warning",
    "finally",
    "really",
    "still",
    "hard",
    "easy",
    "lazy",
    "worse",
    "zero",
    "avoid",
}

# Opening patterns that signal a slow, generic setup. These are the hooks the
# retention-script-builder skill explicitly bans ("in this video", "I will
# show you"), so the scorer must penalize them instead of scoring them average.
WEAK_HOOK_OPENERS = {
    "in this video": r"\bin this video\b",
    "i will show/tell/share": r"\bi (will|'ll) (show|tell|share|explain|teach|give|reveal|walk)\b",
    "i'm going to show/tell": r"\bi'?m going to (show|tell|share|explain|give|walk)\b",
    "let me show/tell": r"\blet me (show|tell|share|explain)\b",
    "welcome back": r"\bwelcome back\b",
    "today i/we will": r"\btoday (i|we) (will|'ll|are going to)\b",
    "do you want to know": r"\bdo you want to know\b",
    "some tips/tricks/things": r"\bsome (tips|tricks|things)\b",
}

GENERIC_HOOK_WORDS = {
    "tips",
    "tricks",
    "stuff",
    "things",
    "something",
    "anything",
    "everything",
}

# Negation and contrast markers correlate with contrarian/tension hooks.
CONTRAST_MARKERS = {
    "but",
    "instead",
    "without",
    "none",
    "nobody",
    "never",
    "not",
    "no",
    "stop",
    "quit",
    "failed",
    "wrong",
    "mistake",
    "avoid",
    "actually",
    "worse",
    "unless",
    "until",
    "zero",
}


def score_hook_text(text: str, viewer: str = "", topic: str = "") -> dict[str, Any]:
    words = re.findall(r"[A-Za-z0-9']+|[\u4e00-\u9fff]", text.lower())
    length = len(words)
    has_number = bool(re.search(r"\d", text))
    has_question = "?" in text or "？" in text
    power_hits = sorted({w for w in words if w in POWER_WORDS})
    weak_hits = sorted(label for label, pattern in WEAK_HOOK_OPENERS.items() if re.search(pattern, text.lower()))
    generic_hits = sorted({w for w in words if w in GENERIC_HOOK_WORDS})
    contrast_hits = sorted({w for w in words if w in CONTRAST_MARKERS})
    first_person = bool(re.search(r"\b(I|my|we|our|me)\b", text))
    viewer_hits = keyword_overlap(text, viewer)
    topic_hits = keyword_overlap(text, topic)
    relevance = min(10, 4 + viewer_hits + topic_hits)
    curiosity = max(
        1,
        min(
            10,
            2
            + (2 if has_question else 0)
            + (1 if has_number else 0)
            + min(3, len(power_hits))
            + (2 if contrast_hits else 0)
            - (3 if weak_hits else 0),
        ),
    )
    specificity = max(
        1,
        min(
            10,
            2
            + (3 if has_number else 0)
            + min(2, length // 10)
            + (1 if topic_hits else 0)
            - (2 if generic_hits and not has_number else 0),
        ),
    )
    # First person alone is cheap; first person plus a concrete number reads as proof.
    credibility = max(
        1,
        min(10, 3 + (1 if first_person else 0) + (2 if has_number else 0) + (1 if first_person and has_number else 0)),
    )
    momentum = max(
        1,
        min(10, (8 if 6 <= length <= 30 else 6 if length < 45 else 3) - (3 if weak_hits else 0)),
    )
    score = round((relevance * 0.28 + curiosity * 0.25 + specificity * 0.2 + credibility * 0.12 + momentum * 0.15), 1)
    if score >= 6.5:
        verdict = "strong"
    elif score >= 4.5:
        verdict = "workable"
    else:
        verdict = "weak"
    return {
        "hook": text,
        "score": score,
        "verdict": verdict,
        "subscores": {
            "relevance": relevance,
            "curiosity": curiosity,
            "specificity": specificity,
            "credibility": credibility,
            "retention_momentum": momentum,
        },
        "signals": {
            "word_count": length,
            "has_number": has_number,
            "has_question": has_question,
            "first_person": first_person,
            "power_words": power_hits,
            "contrast_markers": contrast_hits,
            "weak_openers": weak_hits,
            "generic_words": generic_hits,
        },
    }


def keyword_overlap(text: str, keywords: str) -> int:
    if not keywords:
        return 0
    text_l = text.lower()
    hits = 0
    for token in re.findall(r"[A-Za-z0-9']+|[\u4e00-\u9fff]{2,}", keywords.lower()):
        if token and token in text_l:
            hits += 1
    return min(hits, 3)


def hook_score(args: argparse.Namespace) -> None:
    hooks = list(args.hook or [])
    if args.hooks_file:
        hooks.extend(
            line.strip()
            for line in Path(args.hooks_file).read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        )
    scored = [score_hook_text(hook, args.viewer or "", args.topic or "") for hook in hooks]
    scored.sort(key=lambda h: h["score"], reverse=True)
    write_json(args.out, {"topic": args.topic, "viewer": args.viewer, "hooks": scored})


def title_score(args: argparse.Namespace) -> None:
    data = load_json(args.titles)
    if isinstance(data, dict):
        titles = data.get("titles", [])
    else:
        titles = data
    scored = []
    for item in titles:
        if isinstance(item, str):
            item = {"title": item}
        title = item.get("title", "")
        words = re.findall(r"[A-Za-z0-9']+|[\u4e00-\u9fff]", title)
        title_words = len(words)
        has_number = bool(re.search(r"\d", title))
        has_question = "?" in title or "？" in title
        power_hits = sorted({w.lower() for w in words if w.lower() in POWER_WORDS})
        topic_hits = keyword_overlap(title, args.topic or "")
        viewer_hits = keyword_overlap(title, args.viewer or "")
        generic_penalty = 2 if re.search(r"\b(tips|things|stuff|advice|guide)\b", title.lower()) and not has_number else 0
        length_score = 2 if 5 <= title_words <= 12 else 1 if 3 <= title_words <= 16 else 0
        specificity = min(3, (1 if has_number else 0) + topic_hits + viewer_hits)
        curiosity = min(2, (1 if has_question else 0) + (1 if power_hits else 0))
        score = max(1, min(10, 4 + length_score + specificity + curiosity - generic_penalty))
        scored.append(
            {
                **item,
                "score": score,
                "diagnostics": {
                    "title_words": title_words,
                    "has_number": has_number,
                    "has_question": has_question,
                    "power_words": power_hits,
                    "topic_overlap": topic_hits,
                    "viewer_overlap": viewer_hits,
                    "generic_penalty": generic_penalty,
                },
            }
        )
    scored.sort(key=lambda p: p["score"], reverse=True)
    write_json(args.out, {"topic": args.topic, "viewer": args.viewer, "titles": scored})


def simple_similarity(a: str, b: str) -> float:
    aw = set(re.findall(r"[A-Za-z0-9']+|[\u4e00-\u9fff]", a.lower()))
    bw = set(re.findall(r"[A-Za-z0-9']+|[\u4e00-\u9fff]", b.lower()))
    if not aw or not bw:
        return 0.0
    return len(aw & bw) / len(aw | bw)


def script_plan(args: argparse.Namespace) -> None:
    minutes = max(0.25, float(args.minutes))
    total_seconds = max(15, int(round(minutes * 60)))

    names = [
        "Cold open",
        "Stakes",
        "Roadmap",
        "Main beat 1",
        "Main beat 2",
        "Main beat 3",
        "Payoff",
        "End-screen bridge",
    ]
    purposes = [
        "State the viewer problem or curiosity immediately.",
        "Make the cost of not watching concrete.",
        "Promise the path without overexplaining.",
        "Deliver the first proof or mechanism.",
        "Escalate with contrast, example, or teardown.",
        "Show the actionable framework.",
        "Resolve the promise and name the takeaway.",
        "Give a reason to watch the next video.",
    ]
    # Proportional breakpoints so the spine scales from Shorts (15s) up to
    # long-form. Sections stay contiguous, ordered, and non-overlapping even
    # when total_seconds is small (fixed 15/45/70s anchors broke Shorts).
    fractions = [0.0, 0.05, 0.12, 0.18, 0.38, 0.62, 0.82, 0.94, 1.0]
    bounds = sorted({int(round(f * total_seconds)) for f in fractions})
    if bounds[0] != 0:
        bounds.insert(0, 0)
    if bounds[-1] != total_seconds:
        bounds[-1] = total_seconds

    sections = []
    for i, name in enumerate(names):
        if i + 1 >= len(bounds):
            break
        start = bounds[i]
        end = bounds[i + 1]
        if end <= start:
            continue
        sections.append(
            {
                "name": name,
                "start_seconds": start,
                "end_seconds": end,
                "purpose": purposes[i],
                "visual_prompt": "Add a concrete visual, text callout, or example here.",
                "retention_device": "question loop, contrast, proof, or pattern interrupt",
            }
        )

    out = {
        "topic": args.topic,
        "hook": args.hook,
        "target_viewer": args.viewer,
        "target_duration_seconds": total_seconds,
        "sections": sections,
    }
    write_json(args.out, out)


def clean_context_value(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(str(v).strip() for v in value if str(v).strip())
    return str(value or "").strip()



# --- Vagueness detection for the bullseye center -----------------------
# Presence checks alone let templated, interchangeable answers ("grow
# subscribers", "doesn't know what to post") through as if they were a real
# answer. These heuristics catch the common stock phrases that could apply
# to almost any channel in any niche, so the skill asks a sharper follow-up
# instead of building rings around a viewer who isn't a real person.

VIEWER_FILLER_TOKENS = {
    "new", "small", "solo", "aspiring", "beginning", "growing", "established",
    "serious", "casual", "with", "a", "an", "the", "no", "some", "little",
    "low", "any", "of", "their", "own", "who", "that", "just", "started",
    "starting", "early", "stage",
}
GENERIC_ROLE_TOKENS = {
    "creator", "creators", "entrepreneur", "entrepreneurs", "marketer",
    "marketers", "beginner", "beginners", "viewer", "viewers", "audience",
    "user", "users", "business", "owner", "owners", "person", "people",
}
GENERIC_VIEWER_PHRASES = {
    "people interested in ai", "the ideal viewer", "ai users", "target audience",
}
GENERIC_PAIN_PHRASES = {
    "doesn't know what to post", "don't know what to post",
    "doesn't know what to make", "don't know what to make",
    "doesn't know how to grow", "don't know how to grow",
    "not sure what to post", "not sure how to grow", "no audience",
    "not getting views", "not getting subscribers", "struggling to grow",
    "wants to grow", "needs help growing", "not sure how to start",
    "doesn't have time",
}
GENERIC_OUTCOME_PHRASES = {
    "grow subscribers", "grow their channel", "grow the channel",
    "get more views", "get more subscribers", "more views", "more subscribers",
    "succeed on youtube", "make money on youtube", "grow their audience",
    "build an audience", "get better",
}
GENERIC_BELIEF_PHRASES = {
    "thinks more", "believes more", "thinks they need", "believes they need",
    "doesn't think they can", "isn't confident",
}


def viewer_is_generic(text: str) -> bool:
    t = text.lower().strip()
    if not t or re.search(r"\d", t):
        return False
    if t in GENERIC_VIEWER_PHRASES:
        return True
    tokens = re.findall(r"[a-z']+", t)
    meaningful = [tok for tok in tokens if tok not in VIEWER_FILLER_TOKENS]
    return bool(meaningful) and all(tok in GENERIC_ROLE_TOKENS for tok in meaningful)


def text_is_generic(text: str, generic_phrases: set[str], max_words: int = 7) -> bool:
    t = text.lower().strip()
    if not t or re.search(r"\d", t):
        return False
    if len(t.split()) > max_words:
        return False
    return any(phrase in t for phrase in generic_phrases)


def bullseye_specificity(ctx: dict[str, Any]) -> tuple[list[str], list[str]]:
    required = [
        ("channel_promise", "What promise should the channel make to its viewer?"),
        ("niche", "What niche or category should YouTube associate the channel with?"),
        ("target_viewer", "Who is the one specific viewer the channel should serve first?"),
        ("current_status", "Where is that viewer right now, before watching?"),
        ("painful_problem", "What painful problem makes them need this channel now?"),
        ("desired_outcome", "What concrete outcome do they want?"),
        ("false_belief", "What belief or assumption is blocking them?"),
    ]
    missing = [field for field, _ in required if not clean_context_value(ctx.get(field))]
    questions = [question for field, question in required if field in missing]

    checks = [
        ("target_viewer", viewer_is_generic, None, "target_viewer",
         "reads like a generic role. Name one person: their current numbers/stage, a "
         "concrete constraint, or a specific behavior that separates them from every "
         "other creator in this niche."),
        ("painful_problem", text_is_generic, GENERIC_PAIN_PHRASES, "painful_problem",
         "is generic enough to apply to almost any creator. Add a number, timeframe, "
         "or specific symptom (hours spent, videos posted, views or subscribers lost)."),
        ("desired_outcome", text_is_generic, GENERIC_OUTCOME_PHRASES, "desired_outcome",
         "is too vague to script against. State a measurable target: subscriber "
         "count, upload cadence, revenue, or timeframe."),
        ("false_belief", text_is_generic, GENERIC_BELIEF_PHRASES, "false_belief",
         "is stated too generally. Name the specific wrong assumption or piece of "
         "advice they are following instead."),
    ]
    for field, check_fn, phrases, label, guidance in checks:
        if field in missing:
            continue
        value = clean_context_value(ctx.get(field))
        is_generic = check_fn(value) if phrases is None else check_fn(value, phrases)
        if is_generic:
            missing.append(f"{field}_specificity")
            questions.append(f'{label} ("{value}") {guidance}')
    return missing, questions


def topic_list(seed: str, items: list[str]) -> list[str]:
    return [item.format(seed=seed) for item in items]


def short_phrase(value: str, fallback: str, max_words: int = 8) -> str:
    words = value.split()
    if not words:
        return fallback
    if len(words) <= max_words:
        return value
    return " ".join(words[:max_words]).rstrip(",.;:") + "..."


def bullseye(args: argparse.Namespace) -> None:
    ctx = load_json(args.context)
    missing, questions = bullseye_specificity(ctx)
    niche = clean_context_value(ctx.get("niche") or ctx.get("channel_promise") or "your niche")
    viewer = clean_context_value(ctx.get("target_viewer") or ctx.get("customer") or "the ideal viewer")
    current_status = clean_context_value(ctx.get("current_status"))
    painful_problem = clean_context_value(ctx.get("painful_problem"))
    desired_outcome = clean_context_value(ctx.get("desired_outcome"))
    false_belief = clean_context_value(ctx.get("false_belief"))
    monetization = clean_context_value(ctx.get("monetization_goal")) or "audience trust and eventual conversion"
    topics_to_avoid = ctx.get("topics_to_avoid") or []
    if isinstance(topics_to_avoid, str):
        topics_to_avoid = [topics_to_avoid]

    if missing:
        write_json(
            args.out,
            {
                "specificity_status": "needs_interview",
                "missing_fields": missing,
                "interview_questions": questions,
                "provided_context": {
                    "channel_promise": clean_context_value(ctx.get("channel_promise")),
                    "niche": niche,
                    "target_viewer": viewer,
                    "current_status": current_status,
                    "painful_problem": painful_problem,
                    "desired_outcome": desired_outcome,
                    "false_belief": false_belief,
                    "monetization_goal": monetization,
                },
                "why_this_matters": (
                    "A useful bullseye starts from one imaginable viewer with a current "
                    "situation, urgent pain, desired outcome, and blocking belief. Without "
                    "that center, the rings become generic labels."
                ),
            },
        )
        return

    outcome_short = short_phrase(desired_outcome, "the promised outcome")
    pain_short = short_phrase(painful_problem, "the painful problem")
    niche_short = short_phrase(niche, "the niche", 7)
    exact_icp = (
        f"{viewer}; current status: {current_status}; painful problem: {painful_problem}; "
        f"desired outcome: {desired_outcome}; false belief: {false_belief}"
    )
    adjacent = (
        f"Nearby viewers in {niche} with the same pain and outcome, but a slightly "
        "different stage, role, or budget."
    )
    category = f"Active learners searching for ways to achieve {desired_outcome} in {niche}."
    broad = f"Ambitious viewers attracted to the outcome of {desired_outcome}, before they feel the exact pain."
    mass = f"General viewers curious about visible stories, mistakes, or transformations around {niche}."

    out = {
        "specificity_status": "ready",
        "channel_promise": ctx.get("channel_promise", ""),
        "exact_viewer": {
            "who": viewer,
            "current_status": current_status,
            "painful_problem": painful_problem,
            "desired_outcome": desired_outcome,
            "false_belief": false_belief,
        },
        "monetization_goal": monetization,
        "default_mix": {"ring_5": 3, "ring_3_or_4": 2, "ring_2": 2, "per_uploads": 7},
        "rings": [
            {
                "ring": 5,
                "label": "Exact ICP",
                "audience": exact_icp,
                "viewer_intent": "ready to solve the painful problem now",
                "example_topics": [
                    f"The exact first step to get {outcome_short} without wasting a month",
                    f"Why your current approach to {outcome_short} keeps stalling",
                    f"A teardown: from {pain_short} to {outcome_short}",
                ],
                "business_fit": "highest commercial fit",
            },
            {
                "ring": 4,
                "label": "Adjacent niche",
                "audience": adjacent,
                "viewer_intent": "recognizes the problem and is comparing approaches",
                "example_topics": topic_list(
                    niche_short,
                    [
                        "The decision checklist for choosing a {seed} strategy",
                        "Common {seed} mistakes that look smart at first",
                        "What changes when you move from beginner to serious operator in {seed}",
                    ],
                ),
                "business_fit": "high relevance",
            },
            {
                "ring": 3,
                "label": "Category",
                "audience": category,
                "viewer_intent": "actively learning and building vocabulary",
                "example_topics": topic_list(
                    niche_short,
                    [
                        "The simple map of {seed} for people starting today",
                        "How to know which {seed} advice applies to you",
                        "The beginner-to-advanced ladder in {seed}",
                    ],
                ),
                "business_fit": "qualified reach",
            },
            {
                "ring": 2,
                "label": "Broad interest",
                "audience": broad,
                "viewer_intent": "wants inspiration, examples, or a shortcut",
                "example_topics": topic_list(
                    outcome_short,
                    [
                        "The visible before-and-after of reaching {seed}",
                        "What most people misunderstand about {seed}",
                        "A surprising case study that makes {seed} feel possible",
                    ],
                ),
                "business_fit": "reach layer; filter hard in the video",
            },
            {
                "ring": 1,
                "label": "Mass layer",
                "audience": mass,
                "viewer_intent": "casual curiosity",
                "example_topics": topic_list(
                    niche_short,
                    [
                        "A broad story about a dramatic change in {seed}",
                        "A myth-busting video with mainstream appeal",
                        "A timely controversy or news hook related to {seed}",
                    ],
                ),
                "business_fit": "low fit; use rarely",
            },
        ],
        "topic_boundaries": {
            "always_make": [
                f"Videos that help {viewer} move from {pain_short} toward {outcome_short}",
                "Specific teardowns, decision frameworks, and proof-backed tutorials",
            ],
            "sometimes_make": [
                f"Broader {niche} stories that still name the exact viewer inside the intro",
                "Trend or case-study videos that bridge back to the channel promise",
            ],
            "avoid": topics_to_avoid
            or [
                "Topics that attract viewers with no intent to solve the painful problem",
                "Generic news, tool lists, or entertainment that do not reinforce the channel promise",
            ],
        },
        "questions_for_agent": [
            "What painful problem makes Ring 5 watch immediately?",
            "Which Ring 2 topics attract reach without damaging audience quality?",
            "Which topics should be excluded because they confuse the channel promise?",
        ],
    }
    write_json(args.out, out)


def esc(value: Any) -> str:
    return html_lib.escape(str(value if value is not None else ""))


def fmt_num(value: Any) -> str:
    if isinstance(value, (int, float)):
        return f"{value:,.0f}" if float(value).is_integer() else f"{value:,.2f}"
    return esc(value or "")


def load_optional_json(path: str | None) -> dict[str, Any] | None:
    if not path:
        return None
    return load_json(path)


def read_labeled_json_specs(specs: list[str] | None) -> list[tuple[str, dict[str, Any]]]:
    out: list[tuple[str, dict[str, Any]]] = []
    for spec in specs or []:
        if "=" in spec:
            label, path = spec.split("=", 1)
        else:
            path = spec
            label = Path(path).stem.replace("-", " ").title()
        out.append((label.strip(), load_json(path.strip())))
    return out


def html_table(headers: list[str], rows: list[list[Any]]) -> str:
    if not rows:
        return '<p class="muted">No rows available.</p>'
    head = "".join(f"<th>{esc(h)}</th>" for h in headers)
    body = "\n".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>"
        for row in rows
    )
    return f"<div class=\"table-wrap\"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>"


def html_list(items: list[Any]) -> str:
    if not items:
        return '<p class="muted">No items available.</p>'
    return "<ul>" + "".join(f"<li>{esc(item)}</li>" for item in items) + "</ul>"


def badge(value: Any, tone: str = "neutral", suffix: str = "") -> str:
    return f"<span class=\"badge {tone}\">{esc(value)}{esc(suffix)}</span>"


def score_badge(value: Any) -> str:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return '<span class="badge score-badge neutral"></span>'
    tone = "good" if score >= 8 else "warn" if score >= 6 else "neutral"
    return f"<span class=\"badge score-badge {tone}\">{fmt_num(score)}/10</span>"


def ratio_badge(value: Any) -> str:
    try:
        ratio = float(value)
    except (TypeError, ValueError):
        return '<span class="badge ratio-badge neutral"></span>'
    tone = "hot" if ratio >= 3 else "good" if ratio >= 1.5 else "neutral"
    return f"<span class=\"badge ratio-badge {tone}\">{fmt_num(ratio)}x</span>"


def render_bullseye_section(data: dict[str, Any] | None) -> str:
    if not data:
        return ""
    exact = data.get("exact_viewer") or {}
    if data.get("specificity_status") == "needs_interview":
        return f"""
        <section id="audience" class="section-fill band-amber">
          <h2>Audience Bullseye Needs Interview</h2>
          <div class="warning">Missing fields: {esc(", ".join(data.get("missing_fields", [])))}</div>
          <h3>Questions</h3>
          {html_list(data.get("interview_questions", []))}
        </section>
        """
    rings = data.get("rings", [])
    rows = []
    for ring in rings:
        topics = "<br>".join(esc(t) for t in ring.get("example_topics", [])[:3])
        rows.append([
            esc(ring.get("ring")),
            f"<strong>{esc(ring.get('label'))}</strong><br><span class=\"muted\">{esc(ring.get('audience'))}</span>",
            esc(ring.get("viewer_intent")),
            topics,
            esc(ring.get("business_fit")),
        ])
    boundaries = data.get("topic_boundaries", {})
    return f"""
    <section id="audience" class="section-fill band-blue">
      <h2>Audience Bullseye</h2>
      <div class="grid three">
        <div class="card"><span>Promise</span><strong>{esc(data.get("channel_promise"))}</strong></div>
        <div class="card"><span>Exact Viewer</span><strong>{esc(exact.get("who"))}</strong></div>
        <div class="card"><span>Default Mix</span><strong>{esc((data.get("default_mix") or {}).get("ring_5"))}-{esc((data.get("default_mix") or {}).get("ring_3_or_4"))}-{esc((data.get("default_mix") or {}).get("ring_2"))}</strong></div>
      </div>
      {html_table(["Ring", "Audience", "Intent", "Example Topics", "Business Fit"], rows)}
      <div class="grid three">
        <div><h3>Always Make</h3>{html_list(boundaries.get("always_make", []))}</div>
        <div><h3>Sometimes Make</h3>{html_list(boundaries.get("sometimes_make", []))}</div>
        <div><h3>Avoid</h3>{html_list(boundaries.get("avoid", []))}</div>
      </div>
    </section>
    """


def render_video_rows(videos: list[dict[str, Any]], limit: int = 10, include_ratio: bool = False) -> list[list[Any]]:
    rows: list[list[Any]] = []
    for video in videos[:limit]:
        title = esc(video.get("title") or video.get("metadata", {}).get("title") or "Untitled")
        url = esc(video.get("url") or "#")
        link = f"<a href=\"{url}\">{title}</a>"
        views = fmt_num(video.get("views"))
        channel = esc(video.get("channel_title") or video.get("metadata", {}).get("author_name") or "")
        date = esc(video.get("published_at") or "")
        if include_ratio:
            rows.append([link, channel, views, ratio_badge(video.get("outlier_ratio")), esc(video.get("pulse_action")), date])
        else:
            rows.append([link, channel, views, date])
    return rows


def render_search_sections(searches: list[tuple[str, dict[str, Any]]]) -> str:
    blocks = []
    for label, data in searches:
        query = data.get("query") or label
        rows = render_video_rows(data.get("videos", []), limit=8)
        blocks.append(
            f"""
            <section class="section-fill band-blue">
              <h2>Trend Search: {esc(query)}</h2>
              {html_table(["Video", "Channel", "Views", "Published"], rows)}
            </section>
            """
        )
    return "\n".join(blocks)


def render_outlier_sections(outliers: list[tuple[str, dict[str, Any]]]) -> str:
    blocks = []
    for label, data in outliers:
        rows = render_video_rows(data.get("videos", []), limit=8, include_ratio=True)
        blocks.append(
            f"""
            <section class="section-fill band-green">
              <h2>Competitor Outlier Pulse: {esc(label)}</h2>
              <div class="metric"><span>Baseline views</span><strong>{fmt_num(data.get("baseline_views"))}</strong></div>
              {html_table(["Video", "Channel", "Views", "Outlier Ratio", "Action", "Published"], rows)}
            </section>
            """
        )
    return "\n".join(blocks)


def render_titles_section(data: dict[str, Any] | None) -> str:
    if not data:
        return ""
    rows = []
    for item in data.get("titles", [])[:12]:
        diagnostics = item.get("diagnostics", {})
        rows.append([
            score_badge(item.get("score")),
            esc(item.get("title")),
            esc(item.get("angle")),
            f"words: {esc(diagnostics.get('title_words'))}; topic: {esc(diagnostics.get('topic_overlap'))}; viewer: {esc(diagnostics.get('viewer_overlap'))}; penalty: {esc(diagnostics.get('generic_penalty'))}",
        ])
    return f"""
    <section id="titles" class="section-fill band-amber">
      <h2>Title Board</h2>
      <p class="muted">Topic: {esc(data.get("topic"))} | Viewer: {esc(data.get("viewer"))}</p>
      {html_table(["Score", "Title", "Angle", "Diagnostics"], rows)}
    </section>
    """


def render_hooks_section(data: dict[str, Any] | None) -> str:
    if not data:
        return ""
    rows = []
    for item in data.get("hooks", [])[:10]:
        subs = item.get("subscores", {})
        rows.append([
            score_badge(item.get("score")),
            esc(item.get("hook")),
            f"relevance {esc(subs.get('relevance'))}, curiosity {esc(subs.get('curiosity'))}, specificity {esc(subs.get('specificity'))}, credibility {esc(subs.get('credibility'))}",
        ])
    return f"""
    <section id="hooks" class="section-fill band-violet">
      <h2>Hook Board</h2>
      {html_table(["Score", "Hook", "Subscores"], rows)}
    </section>
    """


def render_script_plan_section(data: dict[str, Any] | None) -> str:
    if not data:
        return ""
    rows = []
    for section in data.get("sections", []):
        rows.append([
            f"{fmt_num(section.get('start_seconds'))}-{fmt_num(section.get('end_seconds'))}s",
            esc(section.get("name")),
            esc(section.get("purpose")),
            esc(section.get("retention_device")),
        ])
    return f"""
    <section id="script" class="section-fill band-teal">
      <h2>Retention Script Plan</h2>
      <div class="card wide"><span>Hook</span><strong>{esc(data.get("hook"))}</strong></div>
      {html_table(["Time", "Section", "Purpose", "Retention Device"], rows)}
    </section>
    """


def render_html_report(args: argparse.Namespace) -> None:
    bullseye_data = load_optional_json(args.bullseye)
    titles_data = load_optional_json(args.titles)
    hooks_data = load_optional_json(args.hooks)
    script_data = load_optional_json(args.script_plan)
    searches = read_labeled_json_specs(args.search)
    outliers = read_labeled_json_specs(args.outlier)

    title = args.title or "YouTube Growth Report"
    subtitle = args.subtitle or "Generated from YouTube growth skill artifacts"
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    best_title = ""
    if titles_data and titles_data.get("titles"):
        best_title = titles_data["titles"][0].get("title", "")
    best_hook = ""
    if hooks_data and hooks_data.get("hooks"):
        best_hook = hooks_data["hooks"][0].get("hook", "")
    search_video_count = sum(len(data.get("videos", [])) for _, data in searches)
    outlier_channel_count = len(outliers)
    top_outlier_ratio = 0.0
    for _, data in outliers:
        for video in data.get("videos", []):
            try:
                top_outlier_ratio = max(top_outlier_ratio, float(video.get("outlier_ratio") or 0))
            except (TypeError, ValueError):
                pass
    title_count = len((titles_data or {}).get("titles", []))
    hook_count = len((hooks_data or {}).get("hooks", []))
    script_section_count = len((script_data or {}).get("sections", []))

    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <style>
    :root {{ color-scheme: light; --ink:#111827; --muted:#6b7280; --subtle:#9ca3af; --line:#e5e7eb; --paper:#f7f8fb; --surface:#ffffff; --surface-2:#f3f4f6; --blue:#2563eb; --green:#059669; --amber:#d97706; --violet:#6d5dfc; --teal:#0d9488; --red:#dc2626; --blue-fill:#eaf2ff; --green-fill:#eaf8f1; --amber-fill:#fff3dd; --violet-fill:#f1efff; --teal-fill:#e6f7f5; }}
    * {{ box-sizing:border-box; }}
    html {{ scroll-behavior:smooth; }}
    body {{ margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif; color:var(--ink); background:var(--paper); line-height:1.42; }}
    a {{ color:#1d4ed8; text-decoration:none; }}
    a:hover {{ text-decoration:underline; }}
    .report-shell {{ display:grid; grid-template-columns:248px minmax(0,1fr); min-height:100vh; }}
    .side-nav {{ position:sticky; top:0; height:100vh; padding:24px 18px; background:#0f172a; color:#dbeafe; border-right:1px solid #1e293b; }}
    .side-nav .brand {{ color:#ffffff; font-weight:700; font-size:15px; margin-bottom:4px; }}
    .side-nav .generated {{ color:#93a4b8; font-size:12px; margin-bottom:24px; }}
    .side-nav a {{ display:block; color:#cbd5e1; padding:8px 10px; border-radius:6px; font-size:13px; text-decoration:none; }}
    .side-nav a:hover {{ background:#1e293b; color:#ffffff; }}
    .content {{ min-width:0; }}
    header {{ background:var(--surface); border-bottom:1px solid var(--line); padding:28px 34px 22px; }}
    main {{ padding:24px 34px 34px; max-width:1360px; }}
    h1 {{ margin:7px 0 8px; font-size:30px; line-height:1.14; letter-spacing:0; }}
    h2 {{ margin:0 0 14px; font-size:19px; letter-spacing:0; }}
    h3 {{ margin:18px 0 8px; font-size:14px; }}
    p {{ margin:0 0 12px; }}
    section {{ background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:20px; margin:0 0 18px; }}
    .section-fill {{ position:relative; background:var(--band-fill,#fff); border-color:var(--band-border,var(--line)); box-shadow:inset 6px 0 0 var(--band-color,var(--line)); }}
    .section-fill h2 {{ display:inline-block; padding:4px 9px; border-radius:6px; background:var(--band-chip,#fff); color:var(--band-text,var(--ink)); }}
    .band-blue {{ --band-fill:var(--blue-fill); --band-border:#bfdbfe; --band-color:var(--blue); --band-chip:#dbeafe; --band-text:#1e3a8a; }}
    .band-green {{ --band-fill:var(--green-fill); --band-border:#bbf7d0; --band-color:var(--green); --band-chip:#dcfce7; --band-text:#14532d; }}
    .band-amber {{ --band-fill:var(--amber-fill); --band-border:#fde68a; --band-color:var(--amber); --band-chip:#fef3c7; --band-text:#78350f; }}
    .band-violet {{ --band-fill:var(--violet-fill); --band-border:#ddd6fe; --band-color:var(--violet); --band-chip:#e9d5ff; --band-text:#4c1d95; }}
    .band-teal {{ --band-fill:var(--teal-fill); --band-border:#99f6e4; --band-color:var(--teal); --band-chip:#ccfbf1; --band-text:#134e4a; }}
    .eyebrow {{ color:var(--muted); font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.08em; }}
    .muted {{ color:var(--muted); font-size:12px; }}
    .summary-grid {{ display:grid; grid-template-columns:2fr 1.1fr; gap:16px; margin-top:18px; }}
    .recommendation {{ border:1px solid var(--line); background:#fbfdff; border-radius:8px; padding:14px; }}
    .recommendation.blue {{ background:var(--blue-fill); border-color:#bfdbfe; }}
    .recommendation.green {{ background:var(--green-fill); border-color:#bbf7d0; }}
    .recommendation span, .card span, .metric span, .stat span {{ display:block; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; }}
    .recommendation strong, .card strong, .metric strong {{ display:block; font-size:15px; }}
    .stat-strip {{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; margin-top:16px; }}
    .stat {{ border:1px solid var(--line); background:var(--surface); border-radius:8px; padding:12px; }}
    .stat.blue {{ background:var(--blue-fill); border-color:#bfdbfe; }}
    .stat.green {{ background:var(--green-fill); border-color:#bbf7d0; }}
    .stat.amber {{ background:var(--amber-fill); border-color:#fde68a; }}
    .stat.violet {{ background:var(--violet-fill); border-color:#ddd6fe; }}
    .stat.teal {{ background:var(--teal-fill); border-color:#99f6e4; }}
    .stat strong {{ display:block; font-size:21px; line-height:1.1; font-variant-numeric:tabular-nums; }}
    .grid {{ display:grid; gap:12px; margin-top:12px; }}
    .grid.three {{ grid-template-columns:repeat(3, minmax(0,1fr)); }}
    .card, .metric {{ border:1px solid var(--line); border-radius:8px; padding:12px; background:rgba(255,255,255,.78); }}
    .wide {{ margin-bottom:12px; }}
    .warning {{ border-left:4px solid var(--amber); background:#fffbeb; padding:12px; border-radius:6px; }}
    .table-wrap {{ overflow-x:auto; border:1px solid var(--band-border,var(--line)); border-radius:8px; background:#ffffff; }}
    table {{ width:100%; border-collapse:separate; border-spacing:0; font-size:12px; background:#ffffff; }}
    th, td {{ border-bottom:1px solid var(--line); padding:9px 10px; vertical-align:top; text-align:left; }}
    th {{ position:sticky; top:0; z-index:1; color:#374151; background:var(--band-chip,#f8fafc); font-size:11px; text-transform:uppercase; letter-spacing:.05em; font-weight:700; }}
    tr:last-child td {{ border-bottom:0; }}
    tr:hover td {{ background:#fafafa; }}
    ul {{ margin:8px 0 0 18px; padding:0; }}
    li {{ margin:5px 0; }}
    .pill {{ display:inline-flex; align-items:center; padding:4px 8px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:12px; font-weight:600; }}
    .badge {{ display:inline-flex; align-items:center; justify-content:center; min-width:46px; padding:3px 8px; border-radius:999px; font-size:12px; font-weight:700; font-variant-numeric:tabular-nums; background:#f3f4f6; color:#374151; }}
    .badge.good {{ background:#ecfdf5; color:#047857; }}
    .badge.hot {{ background:#eff6ff; color:#1d4ed8; }}
    .badge.warn {{ background:#fffbeb; color:#b45309; }}
    footer {{ padding:0 34px 28px; color:var(--muted); font-size:12px; }}
    @media (max-width:900px) {{ .report-shell {{ grid-template-columns:1fr; }} .side-nav {{ position:relative; height:auto; }} .summary-grid, .grid.three, .stat-strip {{ grid-template-columns:1fr; }} header, main, footer {{ padding-left:18px; padding-right:18px; }} h1 {{ font-size:26px; }} }}
  </style>
</head>
<body>
  <div class="report-shell">
    <aside class="side-nav">
      <div class="brand">YouTube Growth OS</div>
      <div class="generated">Generated {esc(generated)}</div>
      <a href="#summary">Executive Summary</a>
      <a href="#audience">Audience</a>
      <a href="#trend">Trend Data</a>
      <a href="#outliers">Competitors</a>
      <a href="#titles">Titles</a>
      <a href="#hooks">Hooks</a>
      <a href="#script">Script Plan</a>
    </aside>
    <div class="content">
      <header id="summary">
        <span class="pill">Data Report</span>
        <h1>{esc(title)}</h1>
        <p class="muted">{esc(subtitle)}</p>
        <div class="summary-grid">
          <div class="recommendation blue"><span>Recommended Title</span><strong>{esc(best_title or "Add title-score artifact")}</strong></div>
          <div class="recommendation green"><span>Recommended Hook</span><strong>{esc(best_hook or "Add hook-score artifact")}</strong></div>
        </div>
        <div class="stat-strip">
          <div class="stat blue"><span>Trend Videos</span><strong>{fmt_num(search_video_count)}</strong></div>
          <div class="stat green"><span>Competitors</span><strong>{fmt_num(outlier_channel_count)}</strong></div>
          <div class="stat amber"><span>Top Outlier</span><strong>{fmt_num(top_outlier_ratio)}x</strong></div>
          <div class="stat violet"><span>Titles</span><strong>{fmt_num(title_count)}</strong></div>
          <div class="stat teal"><span>Hooks / Beats</span><strong>{fmt_num(hook_count)} / {fmt_num(script_section_count)}</strong></div>
        </div>
      </header>
      <main>
        {render_bullseye_section(bullseye_data)}
        <div id="trend">{render_search_sections(searches)}</div>
        <div id="outliers">{render_outlier_sections(outliers)}</div>
        {render_titles_section(titles_data)}
        {render_hooks_section(hooks_data)}
        {render_script_plan_section(script_data)}
      </main>
      <footer>Source artifacts are local JSON files generated by youtube_growth_automation.py.</footer>
    </div>
  </div>
</body>
</html>
"""
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(html, encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="YouTube growth skill automation helpers")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("collect-videos")
    p.add_argument("--video", action="append", help="Video URL or 11-character ID")
    p.add_argument("--videos-file")
    p.add_argument("--language", action="append")
    p.add_argument("--out", required=True)
    p.set_defaults(func=collect_videos)

    p = sub.add_parser("search-videos")
    p.add_argument("--query", required=True)
    p.add_argument("--order", default="relevance", choices=["date", "rating", "relevance", "title", "videoCount", "viewCount"])
    p.add_argument("--published-after")
    p.add_argument("--max-results", type=int, default=10)
    p.add_argument("--region")
    p.add_argument("--language")
    p.add_argument("--out", required=True)
    p.set_defaults(func=search_videos)

    p = sub.add_parser("channel-videos")
    p.add_argument("--channel-id", required=True)
    p.add_argument("--published-after")
    p.add_argument("--max-results", type=int, default=25)
    p.add_argument("--out", required=True)
    p.set_defaults(func=channel_videos)

    p = sub.add_parser("dataset-summary")
    p.add_argument("--input", required=True)
    p.add_argument("--out", required=True)
    p.set_defaults(func=dataset_summary)

    p = sub.add_parser("outlier-pulse")
    p.add_argument("--input", required=True)
    p.add_argument("--baseline", type=float)
    p.add_argument("--min-views", type=int, default=0)
    p.add_argument("--out", required=True)
    p.set_defaults(func=outlier_pulse)

    p = sub.add_parser("hook-score")
    p.add_argument("--topic")
    p.add_argument("--viewer")
    p.add_argument("--hook", action="append")
    p.add_argument("--hooks-file")
    p.add_argument("--out", required=True)
    p.set_defaults(func=hook_score)

    p = sub.add_parser("title-score")
    p.add_argument("--titles", required=True, help="JSON list or object with titles[]")
    p.add_argument("--topic")
    p.add_argument("--viewer")
    p.add_argument("--out", required=True)
    p.set_defaults(func=title_score)

    p = sub.add_parser("script-plan")
    p.add_argument("--topic", required=True)
    p.add_argument("--hook", default="")
    p.add_argument("--viewer", default="")
    p.add_argument("--minutes", type=float, default=8)
    p.add_argument("--out", required=True)
    p.set_defaults(func=script_plan)

    p = sub.add_parser("bullseye")
    p.add_argument("--context", required=True)
    p.add_argument("--out", required=True)
    p.set_defaults(func=bullseye)

    p = sub.add_parser("render-html-report")
    p.add_argument("--title")
    p.add_argument("--subtitle")
    p.add_argument("--bullseye", help="Path to bullseye JSON")
    p.add_argument("--titles", help="Path to title-score JSON")
    p.add_argument("--hooks", help="Path to hook-score JSON")
    p.add_argument("--script-plan", help="Path to script-plan JSON")
    p.add_argument("--search", action="append", help="Path or label=path for search-videos JSON")
    p.add_argument("--outlier", action="append", help="Path or label=path for outlier-pulse JSON")
    p.add_argument("--out", required=True)
    p.set_defaults(func=render_html_report)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.func(args)
    except Exception as exc:
        eprint("ERROR:", exc)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
