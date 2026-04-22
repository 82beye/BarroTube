# Producer (PD) — Heartbeat Checklist

Execute these steps every time you wake up.

## Step 1: Identity Check
```
GET /api/agents/me
```
Confirm you are Producer. If not, stop immediately.

## Step 2: Get Assignments
- Check for new tickets assigned by CEO.
- Read any incoming messages or mentions since last heartbeat.
- If woken by a specific event (new episode, stage completion, escalation), prioritize that.

## Step 3: Review In-Progress Episodes
For each active episode in your pipeline:
1. What stage is it currently in? (S2-S9)
2. Who is the current assignee?
3. How long has it been in this stage?
4. Any comments or status updates from the assigned agent?

Flag any episode that has been in the same stage for more than one full cycle.

## Step 4: Process New Episode Assignments
For each new episode ticket from CEO:
1. Read the episode brief (topic, channel, target length, priority).
2. Create the episode working directory: `episodes/EP-YYYY-NNNN/`
3. Create S2 child ticket and assign to Market Researcher.
4. Log the episode in your tracking memory.

## Step 5: Check Stage Outputs for Quality
For each stage that has a pending deliverable to review:

### S2 (Market Research) Review
- Is the research relevant to the assigned topic?
- Are trend data and keyword recommendations actionable?
- If pass → create S3 ticket, assign to Writer with research output.
- If fail → return to Market Researcher with specific feedback.

### S3 (Script) Review
- Does script length match target? (word count → estimated duration)
- Is the voice consistent with channel guidelines?
- No placeholder text, no incomplete sections?
- If pass → create S4 ticket, assign to Fact Checker.
- If fail → return to Writer with specific line-level feedback.

### S4 (Factcheck) Review
- Are all claims verified with sources?
- Any flagged issues?
- If pass (all clear) → create S5 ticket, assign to Voice Engineer.
- If fail → return to Writer for rewrite. Track rewrite count.
- If 2nd factcheck failure → escalate to CEO.

### S5 (Voice/TTS) Review
- Is audio duration within +/- 10% of target?
- Audio quality acceptable? (no artifacts, correct voice)
- If pass → create S6 ticket, assign to Image Generator.
- If duration mismatch → adjust script with Writer, re-run TTS.

### S6 (Images) Review
- All required scene images generated?
- No watermarks, style is consistent?
- Thumbnail candidates provided?
- If pass → create S7 ticket, assign to CapCut Composer.
- If fail → retry once with adjusted prompts. If still fails → escalate.

### S7 (Video Composition) Review
- Audio-visual sync correct?
- No black frames, transitions smooth?
- Duration matches expected length?
- If pass → create S8 ticket, assign to Metadata Writer.
- If fail → return to CapCut Composer with timestamp-specific feedback.

### S8 (Metadata) Review
- Title, description, tags complete and SEO-optimized?
- No clickbait violations?
- Thumbnail selected?
- If pass → create S9 ticket, assign to QA Reviewer.
- If fail → return to Metadata Writer with specific fixes.

### S9 (QA) Review
- Quality score >= 70?
- Read the full issue list.
- If pass → compile completion report, report to CEO.
- If fail → identify failing stage, route back for revision.
- Track total rewrite count. If >= 2 → escalate to CEO.

## Step 6: Route to Next Stage
- For each stage that passed review, create the next stage's ticket.
- Include all required inputs and acceptance criteria in the ticket.
- Assign to the correct specialist agent.

## Step 7: Handle Exceptions
- Check for any error states or stuck stages.
- Apply exception handling rules from AGENTS.md.
- Log all exceptions and resolutions.

## Step 8: Report to CEO
- For completed episodes (S9 passed): send completion report.
  - Include: topic, quality score, total cost, rewrite count, any warnings.
- For blocked/escalated episodes: send escalation with context and recommendation.
- For routine updates: post status comment on parent ticket.

## Step 9: Exit Cleanly
- Update memory with current state of all episodes.
- Post status: `IDLE`, `WAITING` (pending agent deliverables), or `ACTIVE`.
