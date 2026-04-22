# CapCut Composer — Tools

## Primary (Render)
- `scripts/automation/render-direct.js` — ffmpeg 직접 렌더 (업로드용 최종 영상)
- `scripts/automation/render-subtitle.py` — PIL 자막 PNG 생성 (venv `~/youtube-co/.venv`)
  - 시간 기반 자막 교체 (TikTok/Reels 캡션 스타일)
  - 자동 줄바꿈 + fontsize 자동 축소

## CapCut Draft (편집용)
- `scripts/automation/build-capcut-from-episode.js` — CapCut PC 프로젝트 생성
- `tools/capcut-builder/src/capcut-draft-builder.js` — draft_info.json 빌더
  - 자산 자동 복사 + `com.apple.quarantine` xattr 부여
  - 자막 rich-text content (font_size 5, 하단 배치)

## CapCut Export (선택)
- `scripts/automation/export-capcut.applescript` — AppleScript 자동 export (접근성 권한 필요)

## Dependencies
- ffmpeg (libfreetype 없어도 OK — PIL로 자막 처리)
- Python 3 venv + Pillow
- macOS (CapCut PC용)

## Input
- `30_script.md`
- `assets/images/*.png`, `assets/tts/*.wav`, `assets/bgm.wav` (선택)

## Output
- `workspace/episodes/EP-*/55_render/video.mp4` (H.264 + AAC, 9:16, 30fps)
- `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/BT-EP*/`

## Budget
Monthly: $2 (로컬 렌더링, API 비용 없음)
