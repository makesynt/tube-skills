---
name: youtube-title-strategist
description: Create and score CTR-focused YouTube titles only. Use when the user needs title options, title audits, title A/B variants, curiosity-gap refinement, promise clarity, search/recommendation framing, or title-only packaging before scripting or publishing.
---

# YouTube Title Strategist

Use this skill to design YouTube titles before scripting or publishing. The title should make the right viewer understand the video's promise, stakes, and curiosity gap without becoming misleading.

## Automation

When the user has multiple title candidates, save them as JSON and run the shared scoring helper:

```json
{
  "titles": [
    {
      "title": "How I Got 10K Subscribers With 7 Videos",
      "angle": "specific result case study"
    }
  ]
}
```

```powershell
python ..\_shared\scripts\youtube_growth_automation.py title-score --titles .\titles.json --topic "YouTube growth" --viewer "new creator with no audience" --out .\title-scores.json
```

The helper checks basic title signals: title length, number usage, curiosity markers, specificity, viewer/topic relevance, and generic wording. Use the output as a first-pass audit, then apply the title strategy below.

## HTML Report

When the user wants a richer deliverable or the task combines multiple YouTube skills, render the generated JSON artifacts into a standalone HTML report:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py render-html-report --title "YouTube Growth Report" --bullseye .\bullseye-starter.json --titles .\title-scores.json --hooks .\hook-scores.json --script-plan .\retention-plan.json --search "Trend Search=.\trend-search.json" --outlier "Competitor Pulse=.\competitor-pulse.json" --out .\youtube-growth-report.html
```

Omit any artifact argument that does not exist. Prefer HTML when the user needs tables, scoreboards, timelines, or a dashboard-style review.

## Workflow

1. Gather the video context:
   - Topic and target viewer.
   - Core promise, conflict, or transformation.
   - Desired tone: analytical, dramatic, practical, personal, skeptical, or premium.
   - Traffic intent: search, browse/recommended, subscriber loyalty, or trend response.
   - Existing title candidates, if auditing.

2. Define the click trigger:
   - What does the viewer instantly want to know?
   - What is the clearest outcome, mistake, contrast, or open loop?
   - What must stay truthful so the title does not overpromise?

3. Create title families:
   - Result-driven.
   - Curiosity gap.
   - Mistake/avoidance.
   - Contrarian.
   - Case study.
   - Time-bound or challenge.
   - Search-intent "how to" or "why" title.

4. Score title options:
   - CTR potential.
   - Accuracy.
   - Audience fit.
   - Differentiation.
   - Specificity.
   - Search or browse fit.

5. Recommend title sets:
   - Best overall title.
   - Safer/trust-building title.
   - Higher-curiosity title.
   - Search-friendly title.

Read `references/output-template.md` before finalizing.

## Rules

- Prefer concrete stakes over vague adjectives.
- Preserve trust; no promise the video cannot satisfy.
- Keep titles under YouTube's limit and preferably concise enough to scan on mobile.
