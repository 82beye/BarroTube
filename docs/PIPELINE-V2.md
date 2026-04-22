# BarroTube Pipeline V2 — 담당자별 실행 매뉴얼

> **기준일**: 2026-04-18
> **회사**: BarroTube (Paperclip company `46041d31-43ca-4135-8db6-8a84ba0d22de`)
> **포맷**: Shorts-first (9:16, 60초 고정, 5씬) — 초기 10개 에피소드 검증 후 유연 전환
> **배포 주기**: 하루 2편 자동 (06:00 launchd)

---

## 🌅 일일 자동화 파이프라인 (매일 06:00 KST)

```
launchd → daily-episode-batch.js
  ├─ fetch-daily-news.js
  │    ├─ 연합뉴스 경제/증권 RSS
  │    ├─ 한국은행 보도자료 RSS
  │    ├─ 매일경제 RSS
  │    └─ 네이버 증권 주요
  │
  ├─ ceo-select-topics.js (점수화 → 상위 2개)
  │    · 숫자/통계 포함 +3 × N
  │    · 채널 lexicon 매칭 +2 × N
  │    · 최근 24h +3, 48h +1
  │    · 제목 15~40자 +2
  │    · 중복 제거 (첫 15자)
  │
  ├─ create-episode.js × 2 (EP-YYYY-NNNN)
  │
  └─ notify('daily_report', ...) → Telegram
```

설치:
```bash
bash scripts/automation/install-daily-schedule.sh    # 자동 06:00 배치
bash scripts/automation/install-bot-daemon.sh        # Telegram 봇 상시 구동
```

---

## 🤖 Telegram 봇 — 수동 트리거

봇이 상시 long-polling 으로 대기. Telegram 앱 @BarroTubeBot에 명령 입력:

| 명령 | 동작 |
|------|------|
| `/topics [N]` | 오늘 뉴스 수집 후 Top N 후보 (기본 5) |
| `/select 1 2` | 선택한 번호로 에피소드 생성 |
| `/auto [N]` | fetch+select+create 원샷 (기본 2) |
| `/news [date]` | 뉴스 수집만 (날짜 지정 가능) |
| `/list` | 최근 10개 에피소드 상태 |
| `/status EP-XXXX` | 특정 에피소드 상세 |
| `/approve EP-XXXX` | S10 Board 승인 |
| `/budget`, `/schedule` | 예산·스케줄 조회 |
| `/help` | 전체 도움말 |

**인증**: `.env`의 `TELEGRAM_CHAT_ID`와 일치하는 채팅만 허용 (타인 접근 자동 거부)
**로그**: `logs/telegram-bot.log`, `logs/telegram-bot.err`
**재시작**: `launchctl unload ~/Library/LaunchAgents/com.barrotube.bot.plist && launchctl load ~/...`

---

## 🗂 13-Agent × 담당 스크립트 맵

| # | Agent | Dept | Model | 핵심 도구 / 산출물 |
|---|-------|------|-------|---------------------|
| 1 | **CEO** | Executive | Opus | `create-episode.js`, `episode-status.js`, `budget-report.js` → `00_brief.md` |
| 2 | **Producer (PD)** | Editorial | Opus | `run-episode.js` → 파이프라인 체크포인트 오케스트레이션 |
| 3 | **Market Researcher** | Editorial | Sonnet | Claude Code agent → `10_market_research.md` |
| 4 | **Strategist** | Editorial | Opus | Claude Code agent → `20_strategy.md` (60초 Shorts 정책 반영) |
| 5 | **Writer** | Editorial | Opus | Claude Code agent → `30_script.md` (5씬 구조, Yohan Koo 7~8자/s 기준) |
| 6 | **Fact Checker** | Editorial | Sonnet | Claude Code agent → `35_factcheck.md` |
| 7 | **Asset PM** | Production | Sonnet | `generate-tts.js` + `sync-durations.js` + `generate-image-gemini.js` |
| 8 | **Image Generator** | Production | Haiku | `generate-image-gemini.js` (Nano Banana 2) / `generate-image.js` (FAL 폴백) |
| 9 | **Voice Engineer** | Production | Haiku | `generate-tts.js` (ElevenLabs Yohan Koo) |
| 10 | **CapCut Composer** | Production | Sonnet | `render-direct.js` + `render-subtitle.py` + `build-capcut-from-episode.js` |
| 11 | **QA Reviewer** | Quality | Opus | ffprobe + Claude 주관 검토 → `60_qa_report.md` |
| 12 | **Metadata Writer** | Distribution | Sonnet | Claude Code agent → `70_publish_meta.json` (platforms 분기) |
| 13 | **Publisher** | Distribution | Haiku | `approve-episode.js`(Human) → `build-distribution.js` + `publish-youtube.js` + `notify.js` |

---

## 📋 S0~S11 워크플로우 — 담당자 · 명령 · 산출물

### S0 Brief — **CEO**
**목적**: Board 주제 의뢰 수신 및 에피소드 템플릿 작성
```bash
node scripts/automation/create-episode.js --channel econ-daily --topic "주제"
```
**산출**: `workspace/episodes/EP-YYYY-NNNN/00_brief.md`

### S1 Ticket Created — **CEO**
**목적**: Paperclip 티켓 발행 (수동 또는 API)
**산출**: Paperclip ticket ID (로그 기록)

### S2 Research — **Market Researcher**
**명령**: Claude Code CLI에서 `03-market-researcher` agent 호출
**산출**: `10_market_research.md` (레퍼런스, 수치, 인용)

### S3 Strategy — **Strategist**
**명령**: Claude Code CLI에서 `04-strategist` agent 호출
**산출**: `20_strategy.md` — 타깃·훅·구조 (Shorts 5씬 분배)

### S4 Script — **Writer**
**명령**: Claude Code CLI에서 `05-writer` agent 호출
**산출**: `30_script.md` frontmatter
```yaml
format: shorts
target_total_seconds: 60
scenes:
  - scene_id: "001" role: hook target_seconds: 10 narration: "..."
  - ...
```

### S5 Factcheck — **Fact Checker**
**명령**: Claude Code CLI에서 `06-fact-checker` agent
**산출**: `35_factcheck.md` — 각 수치/인용에 LOW/MED/HIGH 위험 태그

### S6 Assets — **Asset PM** (3-step)
```bash
# S6-1. TTS 먼저 (실 duration 측정용)
node scripts/automation/generate-tts.js \
  --script workspace/episodes/EP-YYYY-NNNN/30_script.md \
  --out-dir workspace/episodes/EP-YYYY-NNNN/assets/tts/ --force

# S6-1b. Duration Sync — script target_seconds 자동 조정
node scripts/automation/sync-durations.js \
  --script workspace/episodes/EP-YYYY-NNNN/30_script.md \
  --tts-dir workspace/episodes/EP-YYYY-NNNN/assets/tts/

# S6-2. Images (Nano Banana 2)
node scripts/automation/generate-image-gemini.js \
  --script workspace/episodes/EP-YYYY-NNNN/30_script.md \
  --out-dir workspace/episodes/EP-YYYY-NNNN/assets/images/ --force

# S6-3 (선택). BGM
cp workspace/bgm-library/calm_explain_01.wav workspace/episodes/EP-YYYY-NNNN/assets/bgm.wav
```
**산출**: `assets/images/scene_NNN.png`, `assets/tts/scene_NNN.wav`, (선택) `assets/bgm.wav`

### S7 Render — **CapCut Composer**
```bash
# 7a. ffmpeg 직접 렌더 (업로드용)
node scripts/automation/render-direct.js \
  --episode workspace/episodes/EP-YYYY-NNNN \
  --out workspace/episodes/EP-YYYY-NNNN/55_render/video.mp4 \
  --canvas vertical

# 7b. CapCut 프로젝트 (사람 편집용)
node scripts/automation/build-capcut-from-episode.js \
  --episode workspace/episodes/EP-YYYY-NNNN \
  --name BT-EPNNNN-{title}
```
**산출**:
- `55_render/video.mp4` (1080×1920 H.264 + AAC, 자막 포함)
- `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/BT-EP*/`

### S8 QA — **QA Reviewer**
```bash
ffprobe workspace/episodes/EP-YYYY-NNNN/55_render/video.mp4
```
**산출**: `60_qa_report.md` — 기술·콘텐츠·브랜드 체크리스트 결과

### S9 Metadata — **Metadata Writer**
**산출**: `70_publish_meta.json`
```json
{
  "title": "primary keyword 앞 30자 안 + #Shorts",
  "description": "첫 100자 secondary 키워드 + 해시태그 블록",
  "tags": ["primary", "secondary...", "long-tail...", "related...", "brand..."],
  "privacyStatus": "private|unlisted|public",
  "seo": {
    "primary_keyword": "...",
    "secondary_keywords": [...],
    "long_tail_keywords": [...],
    "related_search_terms": [...],
    "search_intent": "informational",
    "category_signal": "finance"
  },
  "platforms": {
    "youtube": { "caption": null, "hashtags": null },
    "tiktok":  { "caption": "...", "hashtags": [...] },
    "reels":   { "caption": "...", "hashtags": [...] }
  }
}
```

**SEO 자동 보강** (S11 직전 자동 실행, 수동 호출도 가능):
```bash
node scripts/automation/seo-enhance.js \
  --episode workspace/episodes/EP-YYYY-NNNN \
  --channel econ-daily
```
- Primary keyword → title 첫 구문
- Long-tail → `{primary} 왜/이유/전망/분석/수혜주...` 템플릿 8개
- Related → 채널 lexicon 사전 (finance: 엔비디아, SK하이닉스, LG에너지솔루션 등)
- Tags 18~25개 자동 조립 (500자 제한 준수)

### S10 Board Approval — **Human-only gate**
```bash
node scripts/automation/approve-episode.js \
  --episode EP-YYYY-NNNN \
  --by "운영자이름" \
  --note "승인 사유"
```
**산출**: `75_board_approval.json` (token, approved_by, timestamp)
**알림**: `notify('board_approval_needed', ...)` → Telegram

### S11 Publish — **Publisher**
```bash
node scripts/automation/run-episode.js --episode EP-YYYY-NNNN
# → 체크포인트 감지 → S11 자동 실행
```
**내부 체인**:
1. `build-distribution.js` → `distribution/{youtube,tiktok,reels}/` 생성
2. `publish-youtube.js` → YouTube Data API v3 resumable upload + thumbnail
3. `notify('episode_complete', ...)` → Telegram에 TikTok/Reels 수동 업로드 안내

**산출**: `80_publish_result.json`

---

## 🔑 환경변수 (.env)

| Key | 용도 | 발급처 |
|-----|------|--------|
| `ELEVENLABS_API_KEY` | TTS (Yohan Koo) | elevenlabs.io/app/settings/api-keys |
| `GOOGLE_AI_API_KEY` | 이미지 (Nano Banana 2) | aistudio.google.com/app/apikey |
| `FAL_API_KEY` | 이미지 폴백 (Recraft V3) | fal.ai/dashboard/keys |
| `YOUTUBE_OAUTH_CLIENT_ID/SECRET` | YouTube API OAuth | console.cloud.google.com/apis/credentials |
| `YOUTUBE_OAUTH_REFRESH_TOKEN` | API 자동 갱신 | `node setup-youtube-oauth.js` 실행 |
| `TELEGRAM_BOT_TOKEN` | 알림 | @BotFather |
| `TELEGRAM_CHAT_ID` | 알림 수신자 | /getUpdates |

검증: `node scripts/automation/config-loader.js audit`

---

## 🏗 시스템 요구사항

- **macOS** (CapCut PC용)
- **Node.js** ≥ 20
- **Python 3** + venv at `~/youtube-co/.venv` (Pillow for subtitle rendering)
- **ffmpeg** (any build — libfreetype 없어도 동작, PIL이 자막 담당)
- **CapCut PC 7.x** (`/Applications/CapCut 2.app` 또는 `CapCut.app`)

---

## 📊 에피소드 상태 추적

- **`.episode_status.json`** — stage_history, last_updated, current_stage, status
- **`logs/audit/YYYY-MM-DD.jsonl`** — 각 단계 action 감사 로그 (90일 보존)
- **Paperclip dashboard** — 티켓·예산·승인 추적

---

## ⚠️ 정책

1. **S10 Board 승인 필수** — 자체 승인 불가 (Human-only gate)
2. **Budget overrun → 자동 일시중단** + CEO 승인 요구
3. **domain-whitelist.json** — 외부 fetch는 허용 도메인만
4. **감사 로그 immutable** — 90일 보존
5. **API 키 `.env`** (.gitignore), 향후 macOS Keychain 이관 계획

---

## 🚀 Quick Start (새 에피소드)

```bash
cd ~/youtube-co

# 1. 주제 브리핑
node scripts/automation/create-episode.js --channel econ-daily --topic "주제"

# 2. (Claude Code로 S2~S5 수행)
# → Research / Strategy / Script / Factcheck

# 3. Asset 생성 (S6)
EP=workspace/episodes/EP-2026-NNNN
node scripts/automation/generate-tts.js --script $EP/30_script.md --out-dir $EP/assets/tts/ --force
node scripts/automation/sync-durations.js --script $EP/30_script.md --tts-dir $EP/assets/tts/
node scripts/automation/generate-image-gemini.js --script $EP/30_script.md --out-dir $EP/assets/images/ --force

# 4. 렌더 (S7)
node scripts/automation/render-direct.js --episode $EP --out $EP/55_render/video.mp4 --canvas vertical
node scripts/automation/build-capcut-from-episode.js --episode $EP --name BT-EPNNNN-Topic

# 5. QA/Metadata (S8/S9) — 수동 작성

# 6. 승인 (S10)
node scripts/automation/approve-episode.js --episode EP-2026-NNNN --by "PM"

# 7. 배포 (S11)
node scripts/automation/run-episode.js --episode EP-2026-NNNN
```
