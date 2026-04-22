---
name: "Metadata Writer"
trigger: "on_assignment"
---

## Execution Checklist

Run this checklist every time you are assigned a metadata writing task.

### Step 1 — Check Assignments
- [ ] Read the Producer's ticket / metadata request
- [ ] Confirm episode_id, channel_id, and expected inputs
- [ ] Check if a previous `70_publish_meta.json` exists (revision case)

### Step 2 — Read Strategy and Keywords
- [ ] Read `workspace/episodes/{episode_id}/20_strategy.md`
- [ ] Extract primary keywords, secondary keywords, target audience
- [ ] Note the content angle and SEO recommendations
- [ ] Identify any keyword gaps or opportunities mentioned

### Step 3 — Read Script and Scene Structure
- [ ] Read `workspace/episodes/{episode_id}/30_script.md`
- [ ] Understand the narrative arc and key talking points
- [ ] Identify the most compelling hook / key insight
- [ ] Note any topics requiring disclaimers (finance, health, legal)

### Step 4 — Read CapCut Draft Timing
- [ ] Read `workspace/episodes/{episode_id}/50_capcut_draft.json`
- [ ] Extract scene boundary timestamps for chapter generation
- [ ] Calculate total episode duration
- [ ] Map scene transitions to meaningful chapter breaks

### Step 5 — Read Brand Guidelines
- [ ] Read `workspace/channels/{channel_id}/brand.md`
- [ ] Note forbidden terms and phrases
- [ ] Note channel voice and tone requirements
- [ ] Note optimal posting times and schedule preferences
- [ ] Note any required disclaimer templates or social links

### Step 6 — Craft Titles (5 candidates)
- [ ] Generate 5 title candidates with different angles
- [ ] Verify each title is <= 50 characters
- [ ] Verify keywords are front-loaded in each title
- [ ] Verify no forbidden terms from brand.md
- [ ] Verify readability on mobile (key info in first 30 chars)
- [ ] Label each title with its angle (curiosity, benefit, question, etc.)

### Step 7 — Write Description
- [ ] Write compelling opening hook (first 2 lines standalone)
- [ ] Add chapter timestamps section
- [ ] Add hashtags at the end
- [ ] Add disclaimer if topic requires it
- [ ] Add channel social links from brand.md
- [ ] Verify first 2-3 lines work as search result preview

### Step 8 — Generate Tags, Hashtags, and Thumbnail Copy
- [ ] Create 15 tags sorted by relevance
- [ ] Verify no duplicate or near-duplicate tags
- [ ] Create 5 hashtags starting with `#`
- [ ] Create 2-3 thumbnail text overlay options (max 6 words each)
- [ ] Verify thumbnail copy does not duplicate any title exactly

### Step 9 — Calculate Chapters from Timing
- [ ] Map CapCut scene boundaries to chapter timestamps
- [ ] Ensure first chapter starts at `0:00`
- [ ] Ensure minimum 3 chapters for videos over 3 minutes
- [ ] Verify each chapter title is <= 40 characters
- [ ] Verify chapter titles are descriptive and keyword-aware

### Step 10 — Set Publish Schedule
- [ ] Determine publish_at datetime based on brand.md posting schedule
- [ ] Set visibility (default: public, unless specified otherwise)
- [ ] Format as ISO 8601

### Step 11 — Write Output
- [ ] Create `workspace/episodes/{episode_id}/70_publish_meta.json`
- [ ] Validate JSON structure against PRD section 8.3 schema
- [ ] Verify all required fields are present and correctly formatted

### Step 12 — Report to Producer
- [ ] Notify Producer that metadata is complete
- [ ] Share the recommended title (top pick from 5 candidates) with rationale
- [ ] Note any concerns (e.g., disclaimer needed, schedule conflicts)
