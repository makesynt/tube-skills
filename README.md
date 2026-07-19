# Tube Skills

Six agent skills for building a repeatable YouTube research, packaging, and retention workflow.

## Skills

- `youtube-audience-bullseye-builder`: define a five-ring target audience and content mix.
- `youtube-trend-jacking-finder`: find timely YouTube topics that fit the channel promise.
- `youtube-competitor-outlier-pulse`: identify recent competitor videos that outperform their channel baseline.
- `youtube-channel-deep-analysis`: compare winners and losers to extract repeatable patterns.
- `youtube-title-strategist`: generate and score titles for clarity, specificity, and click intent.
- `youtube-retention-script-builder`: turn a hook and topic into a paced retention plan and production-ready script structure.

## Shared Helper

The skills use `_shared/scripts/youtube_growth_automation.py` for YouTube collection, scoring, structured outputs, and HTML reports. Keep `_shared` next to the six skill directories so the relative commands in each `SKILL.md` continue to work.

The helper uses the Python standard library. Transcript collection optionally uses:

```bash
pip install youtube-transcript-api
```

Live YouTube search and channel collection require a YouTube Data API key:

```powershell
$env:YOUTUBE_API_KEY="your_api_key_here"
```

## Repository Layout

```text
_shared/
  scripts/youtube_growth_automation.py
youtube-audience-bullseye-builder/
youtube-channel-deep-analysis/
youtube-competitor-outlier-pulse/
youtube-retention-script-builder/
youtube-title-strategist/
youtube-trend-jacking-finder/
```

Each skill directory includes its `SKILL.md`, agent metadata, and output template.
