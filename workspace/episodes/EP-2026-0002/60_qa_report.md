# QA Report — EP-2026-0002

## Overview
- **Episode**: Hello World Shorts — 코스피 5000 시대
- **Render**: `55_render/video.mp4` (60.02s, 1080x1920, H.264, AAC)
- **Assets**: 5 images (placeholder, 1080x1920 단색) + 5 TTS (ElevenLabs mp3→wav)

## Checks
| Item | Result | Notes |
|------|--------|-------|
| Duration ±2s | ✅ 60.02s | |
| Aspect ratio 9:16 | ✅ 1080x1920 | |
| Audio 44.1kHz mono | ✅ AAC 44100Hz mono | |
| Scene count 5 | ✅ 5 scenes | |
| TTS intelligibility | ⚠ 샘플 재생 미실시 | 수동 확인 필요 |
| Subtitle coverage | ⚠ 자막 없음 | CapCut 프로젝트에서 오버레이 처리 |
| Image quality | ⚠ 플레이스홀더 단색 | FAL 결제 이슈 해결 후 교체 |
| BGM | ❌ 미포함 | 선택사항, 추후 추가 |

## Known Issues
1. FAL AI 결제수단 미등록으로 실 이미지 생성 불가 → 단색 플레이스홀더 사용
2. ffmpeg 8.1 (Homebrew) 빌드에 libfreetype 누락 → drawtext 사용 불가, 자막은 CapCut에서만 구현
3. BGM 미포함

## Hello World 검증 목적
실제 콘텐츠 품질보다 **파이프라인 E2E 검증**이 목표:
- ElevenLabs TTS API 호출 ✅
- ffmpeg 비디오 조립 ✅
- CapCut 프로젝트 생성 ✅
- YouTube OAuth 설정 ✅
- 남은 검증: YouTube 실 업로드 + 배포 패키지 생성
