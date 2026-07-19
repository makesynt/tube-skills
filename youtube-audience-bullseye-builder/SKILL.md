---
name: youtube-audience-bullseye-builder
description: Build a five-ring audience bullseye and content mix for a YouTube channel. Use when the user needs channel positioning, ICP clarity, niche expansion, topic boundaries, or a repeatable content ratio for narrow-but-scalable YouTube growth.
---

# YouTube Audience Bullseye Builder

Use this skill to turn a vague channel idea into a clear audience map. The output should make it obvious who the channel serves, which topics are too narrow or too broad, and how to balance authority content with reach content.

## Automation

Use the shared automation helper before the strategic pass when the user provides channel context in a JSON file or asks for a structured starter artifact:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py bullseye --context .\channel-context.json --out .\bullseye-starter.json
```

Expected `channel-context.json` fields include `channel_promise`, `niche`, `target_viewer`, `current_status`, `painful_problem`, `desired_outcome`, `false_belief`, `monetization_goal`, and `topics_to_avoid`. Treat `bullseye-starter.json` as a structured draft, then refine the five rings with the workflow below and `references/output-template.md`.

If the user only gives free-form text, first convert it into a small JSON context object, save it near the working files, run the helper, then continue.

If the helper returns `specificity_status: needs_interview`, do not finalize the bullseye. Ask the missing questions first. A useful bullseye must name a specific viewer, their current situation, painful problem, desired outcome, and false belief.

## HTML Report

When the user wants a richer deliverable or the task combines multiple YouTube skills, render the generated JSON artifacts into a standalone HTML report:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py render-html-report --title "YouTube Growth Report" --bullseye .\bullseye-starter.json --titles .\title-scores.json --hooks .\hook-scores.json --script-plan .\retention-plan.json --search "Trend Search=.\trend-search.json" --outlier "Competitor Pulse=.\competitor-pulse.json" --out .\youtube-growth-report.html
```

Omit any artifact argument that does not exist. Prefer HTML when the user needs tables, scoreboards, timelines, or a dashboard-style review.

## Workflow

1. Gather the channel context:
   - Channel promise or niche.
   - Target viewer or customer.
   - Product, service, or monetization goal.
   - Current audience size and strongest existing videos, if any.
   - Topics the creator wants to avoid.

2. Define the center:
   - Name one specific viewer who would be thrilled to find the channel.
   - State their painful problem, desired outcome, and current false belief.
   - Reject broad labels such as "business owners" unless the user truly wants a broad channel.
   - Reject labels like "new creator", "entrepreneur", or "people interested in AI" unless they include current status, pain, outcome, and buying/behavioral intent.

3. Build five rings:
   - Ring 5: exact ICP and highest commercial fit.
   - Ring 4: adjacent niche with strong relevance.
   - Ring 3: larger category with still-qualified viewers.
   - Ring 2: broad interest layer that can bring reach.
   - Ring 1: mass-market layer; use rarely or exclude if it attracts noisy viewers.

4. Recommend the content mix:
   - Default to `3-2-2`: three Ring 5 videos, two Ring 3-4 videos, two Ring 2 videos per seven uploads.
   - Adjust for stage: new channels may need more Ring 2-3; monetization-focused channels may need more Ring 4-5.

5. Produce topic boundaries:
   - "Always make" topics.
   - "Sometimes make" reach topics.
   - "Do not make" topics that confuse the algorithm or audience.

Read `references/output-template.md` before finalizing the report.

## Output Rules

- Make the bullseye actionable, not academic.
- Include example video ideas for every ring.
- Tie every ring back to viewer intent and business value.
- Flag conflicts between reach and monetization.
- If Ring 5 does not describe one imaginable person in a chair, ask for more detail before creating content recommendations.
