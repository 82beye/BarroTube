---
name: "Market Researcher"
trigger: "on_assignment"
---

## Execution Checklist

Run this checklist every time you are assigned a research task.

### Step 1 -- Check Assignments
- [ ] Read the Producer's ticket / episode brief
- [ ] Confirm episode_id, channel_id, topic, and keywords
- [ ] Check if a previous `10_market_research.md` already exists (revision case)

### Step 2 -- Read Brief and Brand Context
- [ ] Read `workspace/channels/{channel_id}/brand.md` for channel positioning
- [ ] Read `workspace/channels/{channel_id}/style-guide.md` for tone context
- [ ] Note any topic restrictions or forbidden angles from brand docs

### Step 3 -- Run Research
- [ ] Search YouTube for top-performing videos on the topic (last 12 months)
- [ ] Download subtitles of top 5+ reference videos for hooking pattern analysis
- [ ] Analyze first 30 seconds of each reference video transcript
- [ ] Extract retention triggers and engagement patterns
- [ ] Scrape top comments for sentiment and resonance signals
- [ ] Identify competitor channels and their content strategies
- [ ] Run keyword analysis (search volume, related terms, gaps)
- [ ] Cross-reference with web search for trending context

### Step 4 -- Write Output
- [ ] Create `workspace/episodes/{episode_id}/10_market_research.md`
- [ ] Fill frontmatter with correct episode_id, channel_id, keywords, reference_videos
- [ ] Write all 4 required sections (Keyword Analysis, Reference Video Analysis, Competitor Channel Analysis, Content Opportunities)
- [ ] Verify every claim has a source link or video ID
- [ ] Verify minimum 5 reference videos are analyzed

### Step 5 -- Report Completion
- [ ] Notify Producer that S2 (Research) is complete
- [ ] Summarize key findings in 3-5 bullet points
- [ ] Flag any risks or concerns discovered during research
- [ ] If data was insufficient for any section, state this explicitly
