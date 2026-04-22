---
name: "Writer"
trigger: "on_assignment"
---

## Execution Checklist

Run this checklist every time you are assigned a writing task.

### Step 1 -- Check Assignments
- [ ] Read the Producer's ticket / assignment message
- [ ] Confirm episode_id, channel_id, and target_total_seconds
- [ ] Check if this is a new script or a revision (max 2 revisions per episode)
- [ ] If revision: read the Fact Checker or QA feedback specifying what to fix

### Step 2 -- Read Inputs
- [ ] Read `workspace/episodes/{episode_id}/20_strategy.md` thoroughly
- [ ] Read `workspace/channels/{channel_id}/style-guide.md` for tone and forbidden terms
- [ ] Read `workspace/channels/{channel_id}/brand.md` for brand identity
- [ ] Note the recommended hook option from strategy
- [ ] Note the video structure and time allocations from strategy
- [ ] Note the CTA and comment prompt from strategy

### Step 3 -- Write Scenes
- [ ] Write S01 (hook scene) first -- must grab attention immediately
- [ ] Follow the strategy's video structure for body scenes
- [ ] Write each scene with: narration (Korean), image_prompt (English), bgm_mood, target_seconds, emphasis_tokens
- [ ] Ensure narration is natural spoken Korean (read aloud in your head)
- [ ] Ensure image prompts are descriptive and generatable
- [ ] Use only allowed bgm_mood values: tense_intro, calm_explain, dramatic_reveal, hopeful_outro, neutral_bg, upbeat_energy
- [ ] Include CTA in the final scene as specified in strategy
- [ ] Keep emphasis_tokens to 0-3 per scene

### Step 4 -- Validate Against Schema
- [ ] Verify frontmatter follows PRD Section 8.1 schema exactly
- [ ] Verify all scene_ids are sequential (S01, S02, S03, ...)
- [ ] Verify all target_seconds sum to target_total_seconds
- [ ] Verify narration length is realistic for each scene's target_seconds (~3.5 syllables/sec)
- [ ] Verify no forbidden terms from style-guide.md appear in narration
- [ ] Verify no real person names in image prompts
- [ ] Verify bgm_mood values are from the allowed set

### Step 5 -- Write Output
- [ ] Create `workspace/episodes/{episode_id}/30_script.md`
- [ ] Double-check frontmatter YAML is valid and parseable

### Step 6 -- Report Completion
- [ ] Notify Producer that S4 (Script) is complete
- [ ] Report total scene count and total duration
- [ ] Flag any deviations from strategy (with justification)
- [ ] If target_total_seconds could not be met, explain why and state actual total
