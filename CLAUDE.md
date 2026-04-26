# BarroTube — YouTube Studio Co.

## Project Overview
Claude Code CLI × Paperclip 기반 멀티 에이전트 유튜브 자동화 시스템.
한 명의 운영자가 Board 역할만 수행하면, 13개 전문 에이전트가 기획→자료조사→집필→팩트체크→자산생성(씬·인트로·썸네일)→렌더→QA→업로드→재생목록 등록까지 자동 수행.

## Architecture
- **Control Plane**: Paperclip (조직도, 티켓, 예산, 감사 로그)
- **Data Plane**: Claude Code CLI 인스턴스 + 워크스페이스 파일
- **Rendering**: CapCut PC (draft_content.json 기반)

## Directory Structure
```
~/youtube-co/
├─ paperclip/config/     — 회사/거버넌스/예산/화이트리스트 설정
├─ claude-code/.claude/agents/ — 13개 에이전트 시스템 프롬프트
├─ workspace/channels/   — 채널별 brand.md, style-guide.md, character-dna.md
├─ workspace/episodes/   — 에피소드별 산출물 (EP-YYYY-NNNN/)
│   └─ EP-YYYY-NNNN/
│       ├─ 00_brief.md           (마스터 brief, long-form)
│       ├─ series_link.json      (시리즈 멤버십, 선택)
│       ├─ shared/               (플랫폼 공통 자산, 선택)
│       └─ platforms/
│           ├─ long/             (long-3min: script/assets/intro/thumbnail/render/meta/...)
│           ├─ shorts/           (Shorts: derive-shorts로 자동 부트스트랩)
│           ├─ tiktok/           (수동 업로드 패키지: video_vertical.mp4 + caption + hashtags)
│           └─ reels/            (동일)
├─ tools/capcut-builder/ — CapCut draft JSON 빌더 CLI
├─ scripts/automation/   — 워크플로우 엔진 (paths.js 헬퍼 통해 platforms/ 경로 해석)
├─ schemas/              — JSON Schema (스크립트, 메타데이터, 자산 등)
└─ logs/                 — 감사 로그, 예산 추적
```

> **Layout v2** (platforms/) 우선, **v1 평면** (EP-NNNN 직접에 30_script.md 등) fallback.
> 모든 자동화 스크립트는 `paths.js`의 `resolvePaths(episodeDir, format)` 헬퍼를 거쳐
> v2 → v1 순으로 탐색하므로 EP-0001~0009 같은 legacy 에피소드도 그대로 작동.

## Key Commands
```bash
# 에피소드 생성
node scripts/automation/create-episode.js --channel econ-daily --topic "주제"

# 에피소드 실행 (체크포인트 재시작 지원)
node scripts/automation/run-episode.js --episode EP-2026-0001

# S4~S9 경량 체인 (S6c 씬 + S6d 인트로 + S6e 썸네일 자동 포함)
node scripts/automation/produce-episode.js --episode EP-2026-0001

# 상태 확인
node scripts/automation/episode-status.js --all

# 예산 보고서
node scripts/automation/budget-report.js

# 스케줄 설치
node scripts/automation/install-schedule.js --channel econ-daily --time "06:00"

# Audit log 불변성 + 90일 보존 (일 1회 권장)
node scripts/automation/rotate-audit-logs.js

# CapCut 빌더
node tools/capcut-builder/bin/capcut-builder.js build --script ... --assets ... --style ... --out ...

# 시리즈 브랜딩 — 인트로/썸네일/재생목록 (S6d/S6e/S12)
node scripts/automation/generate-intro.js     --episode <dir>                 # S6d 45_intro.png
node scripts/automation/generate-thumbnail.js --episode <dir> --keyword "90%" --palette bullish  # S6e 47_thumbnail.png
node scripts/automation/set-thumbnail.js      --all workspace/episodes/        # 사후 일괄 (영상 재업로드 X)
node scripts/automation/create-playlist.js    --series sp500-basic --title "..." --privacy unlisted

# OAuth 재발급 (scope 변경 / refresh_token revoke 시)
node scripts/automation/setup-youtube-oauth.js
```

## Flag Semantics (Re-run / Force)

`--force` 와 `--force-republish` 는 의미가 다름:

| Flag | Scope | Script | 의미 | 리스크 |
|------|-------|--------|------|--------|
| `--force` | S4~S9b | `produce-episode.js` | 산출물 존재 여부 무시하고 전 단계 재생성 (TTS/Image 재과금) | 💰 비용 재발생 |
| `--force-republish` | S11 | `run-episode.js` | `80_publish_result.json`에 videoId 있어도 YouTube 재업로드 | 📺 중복 공개 |

두 플래그는 교차 사용 불가(서로 다른 스크립트). 기본적으로 **양쪽 모두 idempotent** — 기본 재실행은 안전함.

## Agents (13 roles)
| File | Role | Model | Dept |
|------|------|-------|------|
| 01-ceo.md | CEO | Opus | Executive |
| 02-producer.md | Producer (PD) | Opus | Editorial |
| 03-market-researcher.md | Market Researcher | Sonnet | Editorial |
| 04-strategist.md | Strategist | Opus | Editorial |
| 05-writer.md | Writer | Opus | Editorial |
| 06-fact-checker.md | Fact Checker | Sonnet | Editorial |
| 07-asset-pm.md | Asset PM | Sonnet | Production |
| 08-image-generator.md | Image Generator | Haiku | Production |
| 09-voice-engineer.md | Voice Engineer | Haiku | Production |
| 10-capcut-composer.md | CapCut Composer | Sonnet | Production |
| 11-qa-reviewer.md | QA Reviewer | Opus | Quality |
| 12-metadata-writer.md | Metadata Writer | Sonnet | Distribution |
| 13-publisher.md | Publisher | Haiku | Distribution |

## Critical Rules
1. **Board 승인 필수**: S10(업로드 직전)은 반드시 운영자 승인 필요
2. **API 키 보안**: macOS Keychain 사용, 평문 .env 금지
3. **도메인 화이트리스트**: 허용 도메인 외 fetch 차단
4. **팩트체크 게이트**: HIGH 위험 → 재집필 (최대 2회)
5. **예산 한도**: 역할별 월간 USD 한도, 초과 시 자동 정지
6. **감사 로그**: 90일 보존, 불변(immutable), 에피소드별 export 가능
7. **OAuth scope 2종 필수**: `youtube.upload + youtube` (재생목록·썸네일 권한 포함). 단일 scope만 있으면 `playlists.insert` 403
8. **썸네일 인증 가드**: `thumbnails.set` 403은 영상 업로드 결과를 무효화하지 않음. 채널 전화 인증 회복 후 `set-thumbnail.js --all`로 사후 일괄 적용

## Episode Workflow (S0~S12)
S0 Brief → S1 Ticket → S2 Research → S3 Strategy → S4 Script → S5 Factcheck →
S6a TTS → S6b Duration Sync → S6c Scene Images → **S6d Intro Card** → **S6e Thumbnail** →
S7 Render (인트로 2초 prepend) → S7b CapCut Draft → S8 QA → S9 Metadata →
S10 Board Approval → S11 Publish (videos.insert + 썸네일 자동 감지) →
**S12 Playlist Register (시리즈 마지막 ep 후)**
