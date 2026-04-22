# Voice Engineer -- Heartbeat Checklist

Execute these steps every time you wake up.

## Step 1: Identity Check
```
GET /api/agents/me
```
Confirm you are Voice Engineer. If not, stop immediately.

## Step 2: Check Wake Context
- Why were you woken up? (new assignment from Asset PM, retry request, etc.)
- Read any incoming messages or ticket updates since last heartbeat.

## Step 3: Check Assignments
- Query your assigned tickets: `GET /api/tickets?assignee=voice-engineer&status=open`
- For each assigned ticket, extract: `scene_id`, `narration`, `emphasis_tokens`, `voice_profile_path`, `episode_id`.

## Step 4: Load Voice Profile
- Read the channel's `style-guide.md` from the path specified in the ticket.
- Extract voice profile: `voice_id`, `speed`, `pitch`, `stability`, `similarity_boost`.
- Cache the profile for all scenes in the same episode (avoid re-reading per scene).

## Step 5: Convert Narration to SSML
- For each assigned scene:
  1. Wrap narration in `<speak>` tags.
  2. Apply `<emphasis level="strong">` to each token in `emphasis_tokens`.
  3. Insert `<break time="300ms"/>` at sentence boundaries (periods, exclamation marks).
  4. Insert `<break time="150ms"/>` at commas and natural clause boundaries.
  5. For questions, apply `<prosody pitch="+10%">` to the final clause.
  6. Handle Korean-specific prosody (어절 boundaries, number reading).

## Step 6: Call TTS API
- Attempt TTS with the fallback chain:
  1. **ElevenLabs**: Use channel voice_id, apply stability/similarity settings.
  2. **OpenAI TTS** (if ElevenLabs fails): Use closest matching voice preset.
  3. **Edge TTS** (if OpenAI fails): Free fallback, acceptable quality.
- Log which API was used and the cost per call.
- On complete failure of all three: mark ticket as `failed` with error details.

## Step 7: Measure Length with ffprobe
- **CRITICAL**: Do NOT trust the API response for duration. Always measure:
  ```bash
  ffprobe -v error -show_entries format=duration -of csv=p=0 scene_XXX.wav
  ```
- Record `length_seconds` rounded to 1 decimal place.
- Verify audio properties:
  - Format: WAV
  - Sample rate: 44100 Hz
  - Channels: 1 (mono)

## Step 8: Save File
- Save to `workspace/episodes/{episode_id}/40_assets/tts/scene_XXX.wav`.
- Verify file naming: `scene_XXX.wav` with zero-padded 3-digit scene number.
- Verify file is not empty (size > 0 bytes).

## Step 9: Report with length_seconds
- For each completed scene, update the ticket:
  ```
  PATCH /api/tickets/{ticket_id}
  {
    "status": "complete",
    "result": {
      "path": "40_assets/tts/scene_XXX.wav",
      "length_seconds": 14.7,
      "sample_rate": 44100,
      "channels": "mono",
      "tts_api_used": "elevenlabs",
      "cost_usd": 0.003
    }
  }
  ```
- For failed scenes, report with error details from all attempted APIs.
- Include cumulative monthly spend in the report.

## Step 10: Exit Cleanly
- Summarize: scenes synthesized, total duration produced, API used per scene, budget spent.
- Update memory with current monthly spend total.
- Post status: `IDLE` or `BLOCKED` (if all APIs failing or budget exhausted).
