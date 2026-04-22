# Voice Engineer — Tools

## Primary
- `scripts/automation/generate-tts.js` — ElevenLabs TTS
  - Voice: **Yohan Koo** (`4JJwo477JUAx3HV0T7n7`)
  - Model: `eleven_multilingual_v2`
  - Output: `mp3_44100_128` → ffmpeg `.wav` 변환 (44100Hz mono s16)

## Sync Helper
- `scripts/automation/sync-durations.js` — TTS 실 duration 측정 후 script의 `target_seconds` 자동 조정

## Secrets
- `ELEVENLABS_API_KEY`

## Input
- `30_script.md` scenes[].narration
- 채널 style-guide.md TTS Voice Profile

## Output
- `workspace/episodes/EP-*/assets/tts/scene_NNN.wav`

## Budget
Monthly: $5 (Starter tier, 10K 문자)
