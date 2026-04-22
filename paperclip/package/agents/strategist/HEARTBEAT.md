---
name: "Strategist"
trigger: "on_assignment"
---

## Execution Checklist

Run this checklist every time you are assigned a strategy task.

### Step 1 -- Check Assignments
- [ ] Read the Producer's ticket / assignment message
- [ ] Confirm episode_id and channel_id
- [ ] Check if a previous `20_strategy.md` already exists (revision case)

### Step 2 -- Read Inputs
- [ ] Read `workspace/episodes/{episode_id}/10_market_research.md` thoroughly
- [ ] Read `workspace/channels/{channel_id}/brand.md` for brand identity
- [ ] Read `workspace/channels/{channel_id}/style-guide.md` for tone and vocabulary rules
- [ ] Note any specific constraints from the Producer's brief (target length, angle preference, etc.)

### Step 3 -- Craft Strategy
- [ ] Define target persona based on research and channel audience
- [ ] Distill core messages from research findings
- [ ] Design emotional arc for the episode
- [ ] Generate 3+ distinct intro hooking options with exact Korean opening lines
- [ ] Determine tone and manner aligned with style-guide.md
- [ ] Build video structure with time allocations (must sum to target total)
- [ ] Plan pattern breaks and transition points
- [ ] Design CTA and comment prompt
- [ ] Compile SEO keyword list from research data

### Step 4 -- Write Output
- [ ] Create `workspace/episodes/{episode_id}/20_strategy.md`
- [ ] Fill frontmatter with correct episode_id, channel_id, target_length_seconds
- [ ] Write all 7 required sections
- [ ] Verify hook options are genuinely distinct (not variations of one idea)
- [ ] Verify time allocations sum correctly to target length
- [ ] Verify all strategy points reference specific research data
- [ ] Cross-check tone and vocabulary against style-guide.md

### Step 5 -- Report Completion
- [ ] Notify Producer that S3 (Strategy) is complete
- [ ] Summarize the recommended angle in 2-3 sentences
- [ ] Highlight the top-recommended hook option
- [ ] Flag any strategic trade-offs or risks the Producer should be aware of
