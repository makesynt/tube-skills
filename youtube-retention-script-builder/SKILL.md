---
name: youtube-retention-script-builder
description: Generate and score YouTube hooks, then build a high-retention script around the best one. Use when the user needs hook ideas, hook grading, a script outline, full script, pacing plan, visual beats, pattern interrupts, end-screen bridge, or binge-watch flow for long-form or Shorts videos.
---

# YouTube Retention Script Builder

Use this skill to turn a clickable idea into a watchable video. It owns the full opening-to-payoff arc: generate and score hooks, pick the strongest, then build a retention spine and script around it. The script should keep viewers moving from promise to payoff without wasting the first minute on context.

## Automation

### 1. Score hook candidates

Generate hook candidates from the topic and viewer, then run the shared scorer:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py hook-score --topic "how to grow a new YouTube channel" --viewer "new creator with no audience" --hook "I got 10,000 subscribers with only 7 videos." --hook "In this video I will tell you some tips." --out .\hook-scores.json
```

The script's score is heuristic, not final truth. Use it to catch weak specificity, missing curiosity gap, or overly long openings, then apply the hook rubric below.

Optionally extract real openings from example videos to model: `collect-videos --video "https://www.youtube.com/watch?v=VIDEO_ID" --out .\hook-samples.json`.

### 2. Build the retention spine

With the best hook chosen, generate the time-coded spine:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py script-plan --topic "how to grow a YouTube channel with 7 skills" --hook "Most creators do not have a content problem. They have a workflow problem." --viewer "new YouTube creator" --minutes 8 --out .\retention-plan.json
```

The helper creates section timing, purpose, visual prompt, and retention device placeholders. The agent must then write the actual spoken script, examples, transitions, and end-screen bridge using the workflow below.

## HTML Report

When the user wants a richer deliverable or the task combines multiple YouTube skills, render the generated JSON artifacts into a standalone HTML report:

```powershell
python ..\_shared\scripts\youtube_growth_automation.py render-html-report --title "YouTube Growth Report" --bullseye .\bullseye-starter.json --titles .\title-scores.json --hooks .\hook-scores.json --script-plan .\retention-plan.json --search "Trend Search=.\trend-search.json" --outlier "Competitor Pulse=.\competitor-pulse.json" --out .\youtube-growth-report.html
```

Omit any artifact argument that does not exist. Prefer HTML when the user needs tables, scoreboards, timelines, or a dashboard-style review.

## Workflow

1. Gather inputs:
   - Topic, target viewer, and video goal.
   - Viewer pain, desired outcome, or false belief (drives the hook).
   - Existing hook or winning hook samples, if any.
   - Desired length and format (long-form or Shorts).
   - Creator voice and examples.
   - Call to action or next video to promote.

2. Generate and score hooks:
   - Build the hook rubric: specific viewer, clear promise, tension or curiosity gap, credibility signal, fast setup, natural voice, match with the rest of the video.
   - Generate hook families: contrarian truth, specific result, mistake warning, case study or teardown, time compression, personal proof, direct challenge.
   - Score each hook 1-10 with the helper on relevance, curiosity, specificity, credibility, retention momentum.
   - Pick the best hook; rewrite weak ones. Preserve the creator's voice and add visual beat suggestions for the opening seconds.

3. Build the retention spine (using the chosen hook):
   - Cold open, stakes, roadmap, escalating sections, pattern interrupts, payoff, end-screen bridge.

4. Design each section:
   - Viewer question it answers, main point, proof or example, visual idea, retention device, transition into the next section.

5. Write or outline:
   - If the user asks for a full script, write spoken language.
   - If the user asks for a production outline, provide beats and visual notes.
   - Keep language natural and remove filler.

6. Add binge-watch design:
   - Recommend playlist placement.
   - Write end-screen bridge to the next video.
   - Identify what follow-up video should exist if it does not.

Read `references/output-template.md` before finalizing.

## Rules

- The cold open is where the chosen hook lives; do not prescribe a separate competing opening.
- Start with the viewer's problem or curiosity, not a channel intro.
- Avoid fake urgency, unsupported claims, and generic "in this video" openings.
- Make the hook deliverable by the video.
- Include at least one subtle, non-clickbait hook option.
- Add visuals where retention would otherwise drop.
- Avoid generic CTAs before the value is delivered.
