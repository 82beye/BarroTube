---
name: "QA Reviewer"
trigger: "on_assignment"
---

## Execution Checklist

Run this checklist every time you are assigned a QA review task.

### Step 1 — Check Assignments
- [ ] Read the Producer's ticket / QA review request
- [ ] Confirm episode_id, channel_id, and expected artifacts
- [ ] Check if a previous `60_qa_report.md` exists (revision/re-review case)
- [ ] Verify all prerequisite artifacts are present before starting

### Step 2 — Read All Episode Artifacts
- [ ] Read `30_script.md` — full narration text, scene structure, image prompts
- [ ] Read `40_factcheck.md` — fact-checker findings and risk levels
- [ ] Inventory `assets/voice/` — list all TTS audio files
- [ ] Inventory `assets/images/` — list all generated image files
- [ ] Inventory `assets/subtitles/` — list all subtitle files
- [ ] Read `50_capcut_draft.json` — full CapCut project structure
- [ ] Read `workspace/channels/{channel_id}/brand.md` — brand constraints

### Step 3 — Run Check Category 1: Script-Voice Consistency (25%)
- [ ] Compare narration text in each scene of `30_script.md` to corresponding TTS audio
- [ ] Verify no missing or extra sentences in TTS output
- [ ] Check pronunciation-critical terms (names, numbers, foreign words)
- [ ] Score and document findings

### Step 4 — Run Check Category 2: Script-Image Consistency (20%)
- [ ] For each scene, compare `image_prompt` to the generated image
- [ ] Verify visual content matches scene description
- [ ] Check visual tone alignment (mood, color palette, style)
- [ ] Score and document findings

### Step 5 — Run Check Category 3: Subtitle Sync (15%)
- [ ] Compare subtitle timing against voice audio timestamps
- [ ] Verify all timing is within +/-500ms tolerance
- [ ] Check for overlapping subtitle blocks
- [ ] Check for orphaned subtitles (no corresponding audio)
- [ ] Verify line length is mobile-friendly
- [ ] Score and document findings

### Step 6 — Run Check Category 4: Hallucination Re-check (20%)
- [ ] Re-verify key claims, statistics, and dates via web search
- [ ] Cross-reference numbers the fact-checker flagged as LOW/MEDIUM risk
- [ ] Check for logical inconsistencies within the script
- [ ] Flag any unsourced claims that sound plausible but could be fabricated
- [ ] Score and document findings

### Step 7 — Run Check Category 5: Copyright Risk (15%)
- [ ] Scan each generated image for brand logos, trademarks, or distinctive marks
- [ ] Check for unauthorized depictions of real people (faces, likenesses)
- [ ] Verify no copyrighted characters or artwork
- [ ] Check any visible text in images for trademark issues
- [ ] If COPYRIGHT HIGH detected → set verdict to FAIL immediately
- [ ] Score and document findings

### Step 8 — Run Check Category 6: CapCut JSON Integrity (5%)
- [ ] Verify all material paths in JSON point to files that exist on disk
- [ ] Check for time conflicts (overlapping tracks at same timestamp)
- [ ] Verify path extensions match actual file types
- [ ] Confirm total timeline duration matches expected episode length
- [ ] Verify all required tracks are present (voice, images, subtitles)
- [ ] Score and document findings

### Step 9 — Calculate Score and Classify Issues
- [ ] Calculate weighted score across all 6 categories
- [ ] Classify each issue as BLOCKER, WARNING, or INFO
- [ ] Apply verdict rules:
  - Score >= 80 AND 0 blockers → **PASS**
  - Score >= 60 AND 0 blockers → **CONDITIONAL_PASS**
  - Score < 60 OR blockers > 0 → **FAIL**
  - Copyright HIGH → automatic **FAIL**
- [ ] Document verdict with justification

### Step 10 — Write Report
- [ ] Create `workspace/episodes/{episode_id}/60_qa_report.md`
- [ ] Include: episode_id, channel_id, review timestamp, overall score, verdict
- [ ] List all issues with classification (BLOCKER/WARNING/INFO)
- [ ] Include per-category score breakdown
- [ ] For each BLOCKER and WARNING, include recommended fix
- [ ] If FAIL due to copyright → note that Board approval is required to override

### Step 11 — Report to Producer
- [ ] Notify Producer of QA verdict (PASS / CONDITIONAL_PASS / FAIL)
- [ ] Summarize key findings in 3-5 bullet points
- [ ] If FAIL: list all blockers and required fixes
- [ ] If CONDITIONAL_PASS: list warnings and recommended improvements
- [ ] If PASS: confirm episode is cleared for metadata and publishing pipeline
