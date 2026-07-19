---
name: youtube-trend-jacking-finder
description: Find trend-jacking opportunities for YouTube cold starts and growth spikes. Use when the user needs video ideas based on trending creators, products, news, controversies, tools, platform changes, or popular niche conversations that can attract an existing audience.
---

# YouTube Trend Jacking Finder

Use this skill when a channel lacks its own audience or wants a fast-relevance angle. Trend jacking means borrowing attention from an existing topic and converting that viewer into the channel's audience.

## Automation

When the user provides a niche, product category, creator name, or trend query, use the shared helper to pull current YouTube search results. This command requires `YOUTUBE_API_KEY`.

```powershell
python ..\_shared\scripts\youtube_growth_automation.py search-videos --query "AI coding agents for creators" --order date --published-after 2026-06-01T00:00:00Z --max-results 15 --out .\trend-search.json
```

Use `--order date` with `--published-after` (a recent ISO date, roughly 30-90 days before today) so the results reflect current trends. Avoid `--order viewCount` without `--published-after` - that returns all-time top videos, not current trends. To surface recent videos that already have proven demand, use `--order viewCount --published-after <recent date>` instead.

If `YOUTUBE_API_KEY` is missing, stop before running live search and ask the user to configure it, for example: `$env:YOUTUBE_API_KEY="your_api_key_here"`.

Use `trend-search.json` to ground the opportunity map in real titles, channels, thumbnails, publish dates, and view counts. If the user declines to configure an API key, continue manually with the workflow below and clearly state that live YouTube search was skipped.

For trend-jacking, the helper only finds raw demand signals. The agent must still score relevance, differentiation, conversion potential, and reputation risk.

## HTML Report

When the user wants a richer deliverable or the task combines multiple YouTube skills, render the generated JSON artifacts into a standalone HTML report:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py render-html-report --title "YouTube Growth Report" --bullseye .\bullseye-starter.json --titles .\title-scores.json --hooks .\hook-scores.json --script-plan .\retention-plan.json --search "Trend Search=.\trend-search.json" --outlier "Competitor Pulse=.\competitor-pulse.json" --out .\youtube-growth-report.html
```

Omit any artifact argument that does not exist. Prefer HTML when the user needs tables, scoreboards, timelines, or a dashboard-style review.

## Workflow

1. Clarify the strategic lane:
   - Niche and audience bullseye, if known.
   - Platform: long-form YouTube, Shorts, or both.
   - Creator's authority angle: analyst, practitioner, skeptic, teacher, builder, or storyteller.
   - Risk tolerance for controversy.

2. Build a trend source map:
   - Large creators in the niche.
   - Recent platform/product changes.
   - Viral formats, frameworks, failures, launches, or public debates.
   - Search-driven topics with active viewer intent.

3. Score each opportunity:
   - Relevance to target viewer.
   - Existing demand.
   - Freshness.
   - Differentiation angle.
   - Conversion potential into future channel topics.
   - Reputation risk.

4. Create angles, not copies:
   - Avoid reacting with generic praise or criticism.
   - Add a unique mechanism, teardown, experiment, comparison, case study, or contrarian lesson.
   - Connect the borrowed topic back to the user's own channel promise.

5. Output a prioritized idea list with titles, thumbnail hooks, and follow-up videos.

Read `references/output-template.md` before finalizing.

## Quality Bar

- A good trend-jack idea should make sense even after the trend fades.
- Prefer "what this reveals about X" over shallow commentary.
- Include a suggested conversion path: what video should the viewer watch next?
