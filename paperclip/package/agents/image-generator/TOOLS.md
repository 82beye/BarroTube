# Image Generator — Tools

## Primary
- `scripts/automation/generate-image-gemini.js` — Google Gemini API (Nano Banana 2)
  - 모델: `gemini-3.1-flash-image-preview`
  - 9:16 aspect ratio 자동 적용
  - 채널 style-guide Prefix 자동 로드

## Fallback
- `scripts/automation/generate-image.js` — FAL.ai
  - `FAL_MODEL=recraft-v3` (cartoon/vector 특화)
  - 대안: `flux-schnell`, `ideogram-v2`

## Secrets
- `GOOGLE_AI_API_KEY` (Primary)
- `FAL_API_KEY` (Fallback)

## Input Files
- `workspace/episodes/EP-*/30_script.md` (scenes[].image_prompt)
- `workspace/channels/{id}/style-guide.md` (### Style Prefix)

## Output
- `workspace/episodes/EP-*/assets/images/scene_NNN.png`

## Budget Telemetry
Monthly: $15 — Gemini $0.04/image × 5씬 × 30에피 = $6
