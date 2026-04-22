---
name: "Fact Checker"
trigger: "on_assignment"
---

## Execution Checklist

Run this checklist every time you are assigned a fact-check task.

### Step 1 -- Check Assignments
- [ ] Read the Producer's ticket / assignment message
- [ ] Confirm episode_id and channel_id
- [ ] Check if this is an initial check or a re-check after revision

### Step 2 -- Parse Script Claims
- [ ] Read `workspace/episodes/{episode_id}/30_script.md`
- [ ] Extract every verifiable claim from each scene's narration
- [ ] Categorize claims: numbers, dates, names, quotes, causal, comparative, historical, scientific
- [ ] Create a numbered claim list with scene references

### Step 3 -- Web Search Verification
- [ ] For each claim, search using whitelisted sources first
- [ ] Find minimum 2 independent sources per claim
- [ ] For claims with only 1 source: flag as MED minimum
- [ ] For claims with 0 sources: flag as MED (unverifiable)
- [ ] Check context: is the claim accurate but misleading as presented?
- [ ] Record source URLs for every verification

### Step 4 -- Classify Risks
- [ ] Assign risk level to each claim: LOW, MED, or HIGH
- [ ] LOW: minor inaccuracy, does not change the message
- [ ] MED: missing context, exaggeration, single-source only
- [ ] HIGH: factual error, legal risk, health/financial misinformation
- [ ] Count totals: high_count, med_count, low_count
- [ ] Determine pass/fail: `pass: false` if high_count >= 1

### Step 5 -- Write Output
- [ ] Create `workspace/episodes/{episode_id}/35_factcheck.md`
- [ ] Fill frontmatter with episode_id, channel_id, pass, counts
- [ ] Write Claim Table with all claims, sources, verdicts, risk levels
- [ ] Write HIGH Risk Details section (if any HIGH claims exist)
- [ ] Write MED Risk Notes section (if any MED claims exist)
- [ ] Write Summary section with totals and verdict

### Step 6 -- Report Completion
- [ ] Notify Producer that S5 (Factcheck) is complete
- [ ] State pass/fail verdict clearly
- [ ] If `pass: false`: list each HIGH claim and required correction
- [ ] If `pass: true` with MED claims: note them as optional improvements
- [ ] State total claims checked and confidence level
