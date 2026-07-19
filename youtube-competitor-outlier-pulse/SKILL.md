---
name: youtube-competitor-outlier-pulse
description: Create a recurring or one-off pulse report of competitor YouTube videos that outperform their channel baseline. Use when the user wants to monitor competitors, find recent outlier videos, avoid manual scrolling, or build a daily/weekly research digest.
---

# YouTube Competitor Outlier Pulse

Use this skill to surface what is working now across competitor or adjacent channels. The goal is a watchlist and pattern scan, not a full deep analysis unless the user asks for it.

## Automation

Prefer an automated pulse when the user provides channel IDs or a JSON dataset with views:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py channel-videos --channel-id UCxxxx --max-results 25 --out .\competitor-recent.json
python ..\_shared\scripts\youtube_growth_automation.py outlier-pulse --input .\competitor-recent.json --min-views 1000 --out .\competitor-pulse.json
```

`channel-videos` requires `YOUTUBE_API_KEY`. If it is missing, stop before running live channel collection and ask the user to configure it, for example: `$env:YOUTUBE_API_KEY="your_api_key_here"`.

If the user already has a CSV/JSON export, normalize it into `videos[]` with `title`, `url`, `published_at`, and `views`, then run `outlier-pulse`.

Use `competitor-pulse.json` as the ranking layer. The final report still needs agent interpretation: repeatable pattern, audience fit, and recommended action.

## HTML Report

When the user wants a richer deliverable or the task combines multiple YouTube skills, render the generated JSON artifacts into a standalone HTML report:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py render-html-report --title "YouTube Growth Report" --bullseye .\bullseye-starter.json --titles .\title-scores.json --hooks .\hook-scores.json --script-plan .\retention-plan.json --search "Trend Search=.\trend-search.json" --outlier "Competitor Pulse=.\competitor-pulse.json" --out .\youtube-growth-report.html
```

Omit any artifact argument that does not exist. Prefer HTML when the user needs tables, scoreboards, timelines, or a dashboard-style review.

## Workflow

1. Collect watchlist inputs:
   - Competitor channel URLs or names.
   - Time range, default last 7 days.
   - Thresholds: views, view velocity, outlier ratio, or "top N per channel".
   - Whether to include all recent videos or only outliers.

2. Normalize the pulse table:
   - Channel.
   - Video title and URL.
   - Publish date.
   - Views and relative performance, if available.
   - Topic category.
   - Hook/title pattern.
   - Thumbnail pattern.

3. Interpret lightly:
   - Identify recurring topics or formats.
   - Separate one-off news spikes from repeatable formats.
   - Flag videos worth deep analysis.

4. Recommend action:
   - Watch now.
   - Save for swipe file.
   - Adapt into user's niche.
   - Ignore because audience fit is weak.

5. If the user wants automation, propose a cadence and output destination such as a Markdown report, Notion page, Slack digest, or local HTML leaderboard.

Read `references/output-template.md` before finalizing.

## Rules

- Do not overclaim causality from surface metrics.
- Prefer recent, repeatable patterns over isolated viral anomalies.
- Always include why each outlier matters to the user's channel.
