---
name: stickman-story-lock
description: >-
  Interactive 6-question What-If scriptwriting wizard and STORY LOCK + FACT BANK generator
  for viral 2D stickman animations. Use this skill when the user wants to brainstorm topics,
  lock scientific facts against a What-If premise, or write a high-retention stickman voiceover script.
---

# Stickman Story-Lock & Fact-Bank Script Engine

Use this skill in **Google Antigravity** (recommended model: **Gemini 4 Carbon**) to turn a high-curiosity everyday "What-If" premise into a tight, fact-anchored stickman narrative script.

## Step 1: 5 High-Resonance Everyday What-If Sub-Niches

Avoid generic cosmic clichés ("What if Earth stopped spinning?"). Guide the user into one of the **5 Everyday Personal-Stakes Sub-Niches**:
1. **Money & Daily Rule Mutation** (e.g., *What if bank balances reset every 30 days?*)
2. **Sudden Disappearance of Modern Tech** (e.g., *What if every smartphone vanished tonight?*)
3. **Extreme Human Dilemma / Trade-off** (e.g., *¥10M cash, but your best friend forgets you exist*)
4. **Hidden Social Metrics Made Visible** (e.g., *Overhead neon RPG bars showing Crush % or Lie Count*)
5. **Everyday Superpower Physics Disenchantment** (e.g., *What if you woke up able to fly without wings or thrusters?*)

## Step 2: Interactive 6-Question Wizard

If the user has not specified all parameters, ask up to 6 quick multiple-choice questions:
1. **Track**: `What-If Science` / `Social Dilemma` / `Overhead Status HUD`
2. **Sub-Niche**: Choose from the 5 everyday sub-niches above (or custom topic)
3. **Protagonist**: Everyday relatable character (e.g., commuter *Azhe*, student, office worker) + 1 supporting foil (e.g., *Grandma Lin*, kid *Duoduo*, *Officer Chen*)
4. **Format**: `Standalone Story` vs `Series Episode`
5. **Aspect & Target Length**: `16:9 Long-form (90s–210s)` vs `9:16 Shorts (45s–60s)`
6. **Visual Theme Preset**: `dusk` / `midnight` / `golden` / `neon` / `storybook`

## Step 3: Output `STORY LOCK + FACT BANK` Blueprint

Before generating the spoken script, output and lock the structured blueprint:

```markdown
### STORY LOCK
- **CENTRAL QUESTION**: [One-sentence relatable premise]
- **COLD HOOK (0–8s)**: [Immediate physical anomaly in an everyday room/street]
- **THE 1 FICTIONAL SWITCH**: [The ONLY supernatural rule allowed]
- **ESCALATING REALITY CHECKS**:
  1. [Low-stakes comic humiliation]
  2. [High-stakes physical/biological crisis]
  3. [Clever low-altitude / human-scale resolution]

### FACT BANK (100% Verifiable Real Laws)
- **Fact #1**: [Exact formula/number + intuitive everyday analogy]
- **Fact #2**: [Exact formula/number + intuitive everyday analogy]
- **Fact #3**: [Exact formula/number + intuitive everyday analogy]
- **Fact #4**: [Exact formula/number + intuitive everyday analogy]
```

## Step 4: Export Short-Clause TTS Narration Script

Once the user approves the `STORY LOCK`, output:
1. **`narration_manifest.json`**: Clean short-clause spoken cues (`6–14` Chinese characters per clause, natural breath pauses, zero markdown symbols inside `tts`), ending with a **Reality Check triad** and a **4-option next-episode poll**.
2. **`shot_plan.md`**: Shot-by-shot visual action notes alternating between **2.35:1 Cinema Narrative Shots** and **Borderless Dark Science Data Stages** (~2.2s–3.0s average cut rhythm).
