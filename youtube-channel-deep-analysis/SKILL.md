---
name: youtube-channel-deep-analysis
description: Deeply analyze a YouTube channel or set of videos to extract repeatable growth patterns. Use when the user wants to understand why a channel works, compare winners and losers, analyze hooks, topics, thumbnails, formats, retention structure, or build a content strategy report.
---

# YouTube Channel Deep Analysis

Use this skill for strategic teardown of a user's channel or a competitor channel. The output should distinguish surface observations from repeatable patterns that can shape future videos.

## Automation

Use automation to gather and normalize source material before the deep strategy pass:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py collect-videos --video "https://www.youtube.com/watch?v=VIDEO_ID" --out .\channel-sample.json
python ..\_shared\scripts\youtube_growth_automation.py dataset-summary --input .\channel-sample.json --out .\channel-summary.json
```

When `YOUTUBE_API_KEY` is available and the user provides a channel ID:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py channel-videos --channel-id UCxxxx --max-results 30 --out .\channel-recent.json
```

If `YOUTUBE_API_KEY` is missing, stop before running live channel collection and ask the user to configure it, for example: `$env:YOUTUBE_API_KEY="your_api_key_here"`.

Use transcript openings, titles, descriptions, publish dates, and metrics from the generated JSON files. The script prepares the evidence table; the agent must still compare winners vs underperformers and identify repeatable growth patterns.

## HTML Report

When the user wants a richer deliverable or the task combines multiple YouTube skills, render the generated JSON artifacts into a standalone HTML report:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py render-html-report --title "YouTube Growth Report" --bullseye .\bullseye-starter.json --titles .\title-scores.json --hooks .\hook-scores.json --script-plan .\retention-plan.json --search "Trend Search=.\trend-search.json" --outlier "Competitor Pulse=.\competitor-pulse.json" --out .\youtube-growth-report.html
```

Omit any artifact argument that does not exist. Prefer HTML when the user needs tables, scoreboards, timelines, or a dashboard-style review.

## Workflow

1. Gather the dataset:
   - Channel URL or video list.
   - Date range, default 30-60 days for an active channel.
   - Whether to analyze all videos or only top performers.
   - Metrics if available: views, CTR, retention, subscribers gained, traffic sources.
   - Transcripts, titles, thumbnails, and descriptions when available.

2. Segment the videos:
   - Winners, baseline performers, and underperformers.
   - Search-driven, recommendation-driven, trend-driven, and audience-loyalty videos.
   - Broad reach vs niche authority.

3. Analyze pattern layers:
   - Topics and promises.
   - Hooks and first 30 seconds.
   - Title structure.
   - Thumbnail design and click trigger.
   - Format and pacing.
   - Viewer identity and emotional payoff.
   - Binge-watch path.

4. Find non-obvious differences:
   - Compare winners against losers.
   - Look for topic-framing, specificity, stakes, tension, packaging, and timing differences.
   - Identify what should be repeated, avoided, or tested.

5. Produce a strategy report:
   - Current growth hypothesis.
   - Content pillars.
   - Repeatable formats.
   - Next experiments.

Read `references/output-template.md` before finalizing.

## Rules

- Do not declare a pattern from one video unless it is clearly supported.
- Separate data-backed observations from creative hypotheses.
- Turn insights into specific next videos.
