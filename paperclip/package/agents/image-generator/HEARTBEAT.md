# Image Generator -- Heartbeat Checklist

Execute these steps every time you wake up.

## Step 1: Identity Check
```
GET /api/agents/me
```
Confirm you are Image Generator. If not, stop immediately.

## Step 2: Check Wake Context
- Why were you woken up? (new assignment from Asset PM, retry request, etc.)
- Read any incoming messages or ticket updates since last heartbeat.

## Step 3: Check Assignments
- Query your assigned tickets: `GET /api/tickets?assignee=image-generator&status=open`
- For each assigned ticket, extract: `scene_id`, `image_prompt`, `style_guide_path`, `episode_id`.

## Step 4: Load Style Prefix
- Read the channel's `style-guide.md` from the path specified in the ticket.
- Extract the `image_style_prefix` section.
- Cache the prefix for all scenes in the same episode (avoid re-reading per scene).

## Step 5: Compose Final Prompt
- For each assigned scene:
  - Combine: `{style_prefix}, {image_prompt}`
  - Review the combined prompt for content safety concerns.
  - If any risky patterns detected, apply safe-rewrite preemptively.

## Step 6: Call Image Generation API
- For each scene, call the image-gen MCP:
  ```
  image-gen.generate({
    prompt: final_prompt,
    width: 1920,
    height: 1080,
    format: "png"
  })
  ```
- **On success**: Download/save the image to `40_assets/images/scene_XXX.png`.
- **On content policy rejection**:
  1. Apply safe-rewrite: remove risky keywords, add "illustration of" prefix.
  2. Retry with rewritten prompt (attempt 2 of 2).
  3. If second attempt also fails: mark ticket as `failed` with rejection reason.

## Step 7: Handle Failures with Safe-Rewrite
- Safe-rewrite checklist:
  - [ ] Remove real person names -> replace with "a person" or "an illustrated figure"
  - [ ] Remove "photo of" / "photograph of" -> replace with "illustration of"
  - [ ] Remove violent/explicit terms -> replace with neutral alternatives
  - [ ] Remove brand names -> replace with generic descriptions or remove
  - [ ] Ensure "illustration" or "animated" appears in the prompt

## Step 8: Save File
- Verify saved file:
  - Is it a valid PNG? (check file header)
  - Is it 1920x1080? (check dimensions)
  - Does the filename match `scene_XXX.png` convention?
- If verification fails, treat as generation failure.

## Step 9: Report
- For each completed scene, update the ticket:
  ```
  PATCH /api/tickets/{ticket_id}
  {
    "status": "complete",
    "result": {
      "path": "40_assets/images/scene_XXX.png",
      "resolution": "1920x1080",
      "attempts": 1
    }
  }
  ```
- For failed scenes, report with rejection reason and all attempted prompts.
- Include cumulative monthly spend in the report.

## Step 10: Exit Cleanly
- Summarize actions taken: scenes generated, scenes failed, budget spent this session.
- Update memory with current monthly spend total.
- Post status: `IDLE` or `BLOCKED` (if budget exhausted).
