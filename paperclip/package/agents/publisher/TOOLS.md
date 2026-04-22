---
name: "Publisher"
---

# Publisher — Tools

## Primary (API 자동)
- `scripts/automation/publish-youtube.js` — YouTube Data API v3 resumable upload
  - `videos.insert` (snippet + status)
  - `thumbnails.set` (선택)
  - publishAt 예약 공개 지원
  - `#Shorts` 해시태그 자동 추가 (`shortsTag: true`)
- `scripts/automation/setup-youtube-oauth.js` — OAuth 2.0 loopback refresh_token 발급 (1회성)

## Distribution Package
- `scripts/automation/build-distribution.js` — 3 플랫폼 패키지 생성
  - `distribution/youtube/` (caption, hashtags, thumbnail)
  - `distribution/tiktok/` (caption, hashtags, **checklist.md**)
  - `distribution/reels/` (caption, hashtags, **checklist.md**)

## Approval Gate (Human only)
- `scripts/automation/approve-episode.js` — S10 승인 토큰 발행
  - selfcert 없음 — 운영자가 직접 실행해야 함

## Pipeline Integration
- `scripts/automation/run-episode.js` S11 단계에서 자동 호출 체인:
  1. `build-distribution.js`
  2. `publish-youtube.js` (private/public 메타 기반)
  3. `notify('episode_complete', ...)` — Telegram 알림

## Secrets
- `YOUTUBE_OAUTH_CLIENT_ID` / `YOUTUBE_OAUTH_CLIENT_SECRET` / `YOUTUBE_OAUTH_REFRESH_TOKEN`
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`

## Input
- `55_render/video.mp4`
- `70_publish_meta.json`
- `75_board_approval.json` (필수)
- (선택) `assets/thumbnail.jpg`

## Output
- `80_publish_result.json` (YouTube videoId, URL, TikTok/Reels package paths)
- Telegram 메시지 (episode_complete)

## Budget
Monthly: $10 (YouTube API 비용)

## Manual Upload Targets
- **TikTok**: Content Posting API 상업용 승인 대기 — 현재 checklist.md로 수동 업로드
- **Instagram Reels**: Graph API 설정 대기 — 현재 checklist.md로 수동 업로드
