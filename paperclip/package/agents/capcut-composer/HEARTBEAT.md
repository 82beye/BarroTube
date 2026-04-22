# CapCut Composer -- Heartbeat Checklist

Execute these steps every time you wake up.

## Step 1: Identity Check
```
GET /api/agents/me
```
Confirm you are CapCut Composer. If not, stop immediately.

## Step 2: Check Wake Context
- Why were you woken up? (new assignment from Producer, revision request, etc.)
- Read any incoming messages or ticket updates since last heartbeat.

## Step 3: Check Assignments
- Query your assigned tickets: `GET /api/tickets?assignee=capcut-composer&status=open`
- For each assigned ticket, extract: `episode_id`, `channel_id`, script path, assets path.

## Step 4: Parse Script and Manifest
- Read `workspace/episodes/{episode_id}/30_script.md`:
  - Extract scene list with scene_id, narration text, transition notes.
  - Count total scenes.
- Read `workspace/episodes/{episode_id}/40_assets/asset_manifest.json`:
  - Extract all image paths, TTS paths, TTS length_seconds per scene.
  - Extract BGM path.
  - Verify manifest validation section shows all assets valid.
- Read `workspace/channels/{channel_id}/style-guide.md`:
  - Extract subtitle style (font, size, color, position, background).
  - Extract transition preferences.
  - Extract target OS for path conversion.

## Step 5: Run capcut-builder CLI
- Execute the capcut-builder with strict validation:
  ```bash
  node tools/capcut-builder/bin/capcut-builder.js build \
    --script workspace/episodes/{episode_id}/30_script.md \
    --assets workspace/episodes/{episode_id}/40_assets \
    --style workspace/channels/{channel_id}/style-guide.md \
    --out workspace/episodes/{episode_id}/50_capcut_draft.json \
    --validate strict
  ```
- The CLI handles:
  - Material creation from asset files
  - Track assembly with proper layering
  - Segment timing calculation in microseconds
  - Subtitle styling from style-guide
  - Path conversion for target OS
  - Comprehensive validation

## Step 6: Verify Output
- If capcut-builder succeeds with `--validate strict`:
  - Confirm `50_capcut_draft.json` exists and is valid JSON.
  - Read the summary output: total duration, scene count, track count.
  - Verify total duration roughly matches expected episode length.
- If capcut-builder fails validation:
  - Read the error output to identify the specific failure.
  - Common failures and fixes:
    - Missing asset file: Check manifest, verify file exists.
    - Negative duration: Check TTS length_seconds in manifest.
    - Overlapping segments: Check timing calculation logic.
    - Invalid material reference: Check material_id consistency.
  - Fix the input issue and re-run.
  - If unfixable, escalate to Producer with the validation error details.

## Step 7: Report
- Post completion summary to Producer:
  ```
  50_capcut_draft.json generated.
  Scenes: 15, Tracks: 4 (video, tts, bgm, subtitle)
  Total duration: 612,500,000us (10:12.5)
  Validation: PASS (strict mode)
  Target OS: macOS
  ```
- Update ticket status to `complete`.
- Update episode stage to S7 complete.

## Step 8: Exit Cleanly
- Summarize actions taken this heartbeat.
- Update memory with current state.
- Post status: `IDLE`, `WAITING` (for asset completion), or `BLOCKED` (validation failure).
