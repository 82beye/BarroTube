# Asset PM -- Heartbeat Checklist

Execute these steps every time you wake up.

## Step 1: Identity Check
```
GET /api/agents/me
```
Confirm you are Asset PM. If not, stop immediately.

## Step 2: Check Wake Context
- Why were you woken up? (new assignment, child ticket completion, Producer ping, etc.)
- Read any incoming messages or ticket updates since last heartbeat.
- If woken by a specific event, prioritize handling that event first.

## Step 3: Check Assignments
- Query your assigned tickets: `GET /api/tickets?assignee=asset-pm&status=open`
- For each assigned episode ticket:
  - What stage is it in? (just assigned, tickets created, waiting for completion, validating)
  - Update internal tracking in `$AGENT_HOME/memory/`.

## Step 4: Parse Script (if new assignment)
- Read `workspace/episodes/{episode_id}/30_script.md`.
- Extract all scenes with: `scene_id`, `narration`, `emphasis_tokens`, `image_prompt`, `target_seconds`.
- Read `workspace/channels/{channel_id}/style-guide.md` for style prefix and voice profile.
- Count total scenes and calculate expected duration.

## Step 5: Create Parallel Tickets (if script parsed, tickets not yet created)
- For each scene, create child tickets via Paperclip API:
  - **Image Generator**: `POST /api/tickets` with scene_id, image_prompt, style reference.
  - **Voice Engineer**: `POST /api/tickets` with scene_id, narration, emphasis_tokens, voice profile.
- Create ONE BGM selection ticket.
- Log all created ticket IDs in memory for tracking.
- All tickets should be created in a single batch for maximum parallelism.

## Step 6: Monitor Completion
- Check status of all child tickets: `GET /api/tickets?parent={episode_ticket_id}`
- Tally: completed, in-progress, failed, pending.
- For failed tickets:
  - If first failure: retry by creating a replacement ticket.
  - If second failure: escalate to Producer with failure details.
- Report progress: "X/Y images done, X/Y TTS done, BGM: status".

## Step 7: Validate Assets (if all child tickets complete)
- For each scene, verify:
  - `40_assets/images/scene_XXX.png` exists, is 1920x1080, is valid PNG.
  - `40_assets/tts/scene_XXX.wav` exists, is WAV 44100Hz mono, has reported length.
  - File names follow `scene_XXX` convention (zero-padded 3 digits).
- Sum all TTS lengths and compare to target duration:
  - Deviation = `abs(actual - target) / target * 100`
  - If deviation > 15%, flag as warning in manifest and report to Producer.
- Verify BGM file exists at expected path.

## Step 8: Write Manifest
- Generate `40_assets/asset_manifest.json` with all paths, metadata, and validation results.
- Write to `workspace/episodes/{episode_id}/40_assets/asset_manifest.json`.
- Update episode ticket stage to S6 complete.

## Step 9: Report
- Post completion summary to Producer:
  - Total scenes, all assets valid (or list failures).
  - TTS total duration vs target (with deviation percentage).
  - Any warnings or issues.
- Update ticket status to `complete` (or `blocked` if validation failed).

## Step 10: Exit Cleanly
- Summarize actions taken this heartbeat in a status comment.
- Update memory with current state.
- Post status: `IDLE`, `WAITING` (child tickets in progress), or `BLOCKED` (failures).
