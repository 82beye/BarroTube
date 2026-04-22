# BarroTube

**멀티 에이전트 YouTube Shorts 자동 제작·배포 시스템**

한 명의 운영자가 Board 역할만 수행하면, 13개 전문 에이전트가 기획 → 자료조사 → 집필 → 팩트체크 → 자산생성 → 렌더 → QA → 업로드까지 자동 수행합니다.

- **Format**: Shorts-first (9:16 1080×1920, 60초 고정, 5씬)
- **Distribution**: YouTube Shorts + TikTok + Instagram Reels
- **Publishing**: 하루 2편 자동 배포 (06:00 KST)

---

## 🏗 Architecture

```
┌─ Control Plane ─────────────────────────────────┐
│  Paperclip AI (회사·티켓·예산·감사 로그)         │
└──────────┬───────────────────────────────────────┘
           │
┌─ Data Plane ─────────────────────────────────────┐
│  Claude Code CLI × 13 agents                    │
│  ├─ Executive: CEO                              │
│  ├─ Editorial: Producer · Researcher · Strategist│
│  │             Writer · Fact Checker            │
│  ├─ Production: Asset PM · Image Gen            │
│  │              Voice Eng · CapCut Composer     │
│  ├─ Quality: QA Reviewer                        │
│  └─ Distribution: Metadata · Publisher          │
└──────────┬───────────────────────────────────────┘
           │
┌─ Rendering & Upload ─────────────────────────────┐
│  ffmpeg + PIL (자막 오버레이)                     │
│  CapCut PC (편집 원본, 선택)                      │
│  YouTube Data API v3 (자동 업로드)                │
│  TikTok/Reels (수동 업로드 체크리스트)             │
└──────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure

```
~/youtube-co/
├─ CLAUDE.md                         # 프로젝트 컨벤션 (Claude Code용)
├─ docs/
│  └─ PIPELINE-V2.md                 # 담당자별 상세 매뉴얼
├─ claude-code/.claude/agents/       # 13개 에이전트 프롬프트 (01~13)
├─ paperclip/
│  ├─ config/                        # 회사·거버넌스·예산·도메인 화이트리스트
│  └─ package/                       # 포터블 BarroTube 패키지
│     └─ agents/                     # Paperclip import용 AGENTS/SOUL/TOOLS
├─ workspace/
│  ├─ channels/econ-daily/           # 채널별 brand.md, style-guide.md
│  ├─ episodes/EP-YYYY-NNNN/         # 에피소드 산출물
│  └─ daily-news/YYYY-MM-DD/         # 뉴스 수집·주제 선정 결과
├─ scripts/automation/               # 파이프라인 자동화 엔진
├─ tools/capcut-builder/             # CapCut draft_info.json 빌더
├─ schemas/                          # JSON Schema
└─ logs/                             # 감사 로그, 봇 로그
```

---

## 🚀 Quick Start

### 0. 전제 조건
- macOS (CapCut PC용)
- Node.js 20+
- ffmpeg (Homebrew)
- Python 3 + venv (Pillow)
- CapCut PC 7.x

### 1. 의존성 설치
```bash
cd ~/youtube-co
npm install
python3 -m venv .venv
.venv/bin/pip install Pillow
```

### 2. API 키 설정
`.env` 파일 생성 후 아래 키 입력:
```bash
ELEVENLABS_API_KEY=...             # TTS (Yohan Koo)
GOOGLE_AI_API_KEY=...              # 이미지 (Nano Banana 2)
FAL_API_KEY=...                    # 이미지 폴백 (선택)
YOUTUBE_OAUTH_CLIENT_ID=...
YOUTUBE_OAUTH_CLIENT_SECRET=...
YOUTUBE_OAUTH_REFRESH_TOKEN=...    # setup-youtube-oauth.js로 발급
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

키 상태 점검:
```bash
node scripts/automation/config-loader.js audit
```

YouTube OAuth (1회):
```bash
node scripts/automation/setup-youtube-oauth.js
```

### 3. 자동 운영 설치
```bash
# 매일 06:00 자동 배치 (뉴스 수집 + 2개 주제 선정 + 에피소드 생성)
bash scripts/automation/install-daily-schedule.sh

# Telegram 봇 상시 구동 (수동 트리거용)
bash scripts/automation/install-bot-daemon.sh
```

---

## 🎬 에피소드 워크플로우 (S0~S11)

| ID | 단계 | 담당 에이전트 | 자동화 명령 |
|----|------|---------------|-------------|
| S0 | Brief | CEO | `create-episode.js` |
| S1 | Ticket | CEO | Paperclip |
| S2 | Research | Market Researcher | Claude Code agent |
| S3 | Strategy | Strategist | Claude Code agent |
| S4 | Script | Writer | Claude Code agent |
| S5 | Factcheck | Fact Checker | Claude Code agent |
| S6 | Assets | Asset PM | `generate-tts.js` + `sync-durations.js` + `generate-image-gemini.js` |
| S7 | Render | CapCut Composer | `render-direct.js` + `build-capcut-from-episode.js` |
| S8 | QA | QA Reviewer | ffprobe + Claude 판정 |
| S9 | Metadata | Metadata Writer | Claude Code + `seo-enhance.js` 자동 보강 |
| S10 | Board Approval | **Human** | `approve-episode.js` |
| S11 | Publish | Publisher | `run-episode.js` → `publish-youtube.js` + `build-distribution.js` |

---

## 🤖 Telegram 봇 명령어 (@BarroTubeBot)

| 명령 | 기능 |
|------|------|
| `/help` | 전체 도움말 |
| `/news [date]` | 경제 뉴스 수집 |
| `/topics [N]` | Top N 자동 후보 조회 (기본 5) |
| `/select 1 2` | 후보 번호로 에피소드 생성 |
| `/auto [N]` | fetch+select+create 원샷 |
| **`/create <주제어>`** | **주제어로 관련 뉴스 분석 + 즉시 생성** |
| `/list` | 최근 10개 에피소드 상태 |
| `/status EP-XXXX` | 상세 상태 |
| `/approve EP-XXXX` | S10 Board 승인 |
| `/budget`, `/schedule` | 예산·스케줄 조회 |

**인증**: `.env`의 `TELEGRAM_CHAT_ID`와 일치하는 채팅만 허용.

**`/create` 예시**
```
/create AI 반도체 수출
/create 코스피 5000
/create 부동산 집값
```
→ 주제어를 확장 키워드로 변환 → 최근 3일 뉴스 필터링 → Top 5 기사 레퍼런스 첨부 → 에피소드 자동 생성

---

## 🎨 13 에이전트

| # | Agent | Dept | Model | 핵심 도구 |
|---|-------|------|-------|-----------|
| 01 | CEO | Executive | Opus | `create-episode`, `ceo-select-topics` |
| 02 | Producer (PD) | Editorial | Opus | `run-episode.js` |
| 03 | Market Researcher | Editorial | Sonnet | Claude Code |
| 04 | Strategist | Editorial | Opus | Claude Code |
| 05 | Writer | Editorial | Opus | Claude Code (Shorts 5씬 60s) |
| 06 | Fact Checker | Editorial | Sonnet | Claude Code |
| 07 | Asset PM | Production | Sonnet | TTS + 이미지 생성 코디네이터 |
| 08 | Image Generator | Production | Haiku | Gemini Nano Banana 2 (+ FAL Recraft 폴백) |
| 09 | Voice Engineer | Production | Haiku | ElevenLabs Yohan Koo |
| 10 | CapCut Composer | Production | Sonnet | ffmpeg + PIL + CapCut draft |
| 11 | QA Reviewer | Quality | Opus | ffprobe + 주관 검토 |
| 12 | Metadata Writer | Distribution | Sonnet | Claude Code + SEO 3-layer 자동화 |
| 13 | Publisher | Distribution | Haiku | YouTube API + 멀티 플랫폼 패키지 |

자세한 역할과 스크립트 매핑: [`docs/PIPELINE-V2.md`](docs/PIPELINE-V2.md)

---

## 🔧 주요 스크립트 (`scripts/automation/`)

### 콘텐츠 생성
| 파일 | 역할 |
|------|------|
| `create-episode.js` | 새 에피소드 디렉토리 초기화 |
| `generate-tts.js` | ElevenLabs TTS (Yohan Koo) |
| `sync-durations.js` | TTS 실 길이에 맞춰 scene duration 자동 조정 |
| `generate-image-gemini.js` | Google Gemini Nano Banana 2 (주력) |
| `generate-image.js` | FAL.ai 폴백 (Recraft V3 / flux / ideogram) |
| `render-direct.js` | ffmpeg 직접 렌더 + PIL 자막 overlay |
| `render-subtitle.py` | 자막 PNG 생성 (자동 줄바꿈, fontsize auto-shrink) |
| `build-capcut-from-episode.js` | CapCut 프로젝트 생성 (편집용) |

### 배포
| 파일 | 역할 |
|------|------|
| `build-distribution.js` | 3플랫폼(YT/TikTok/Reels) 패키지 |
| `publish-youtube.js` | YouTube Data API v3 업로드 |
| `setup-youtube-oauth.js` | OAuth refresh_token 발급 (1회) |
| `approve-episode.js` | Board 승인 토큰 발행 (Human) |
| `seo-enhance.js` | 3-layer 키워드 + tags 자동 보강 |

### 일일 자동화
| 파일 | 역할 |
|------|------|
| `fetch-daily-news.js` | 경제 뉴스 RSS 수집 (네이버·연합·한국은행·매경) |
| `ceo-select-topics.js` | Shorts 적합도 점수화 → 주제 선정 |
| `daily-episode-batch.js` | 자동 배치 (fetch + select + create) |
| `install-daily-schedule.sh` | launchd 매일 06:00 스케줄 |
| `telegram-bot.js` | long-polling 커맨드 봇 |
| `install-bot-daemon.sh` | 봇 상시 구동 데몬 |

### 운영
| 파일 | 역할 |
|------|------|
| `run-episode.js` | S0~S11 체크포인트 기반 오케스트레이션 |
| `episode-status.js` | 에피소드 상태 일람 |
| `config-loader.js` | .env → Keychain 단계적 로드 |
| `notify.js` | Telegram 알림 발송 |
| `budget-report.js` | 에이전트별 월간 예산 집계 |

---

## 🔐 보안·정책

1. **Board 승인 필수 (S10)** — 자체 승인 불가, Human-only gate
2. **.env 파일** — `.gitignore` 포함, Keychain 이관 계획
3. **도메인 화이트리스트** — `paperclip/config/domain-whitelist.json`
4. **Factcheck HIGH 게이트** — Writer 재집필 최대 2회
5. **예산 한도** — 에이전트별 월간 USD, 초과 시 자동 정지
6. **감사 로그** — `logs/audit/YYYY-MM-DD.jsonl` 90일 보존, immutable
7. **Telegram 봇 인증** — `TELEGRAM_CHAT_ID` 단일 채팅만 허용

---

## 📊 SEO 3-Layer (YouTube Shorts 알고리즘)

모든 에피소드 `70_publish_meta.json`에 `seo` 블록 자동 생성:

```json
"seo": {
  "primary_keyword": "코스피 5000",
  "secondary_keywords": ["AI 반도체 수출", "2차전지", "원화 강세", ...],
  "long_tail_keywords": ["코스피 5000 왜", "코스피 5000 전망", ...],
  "related_search_terms": ["KOSPI", "엔비디아", "SK하이닉스", ...],
  "search_intent": "informational",
  "category_signal": "finance"
}
```

- 채널 lexicon 기반 연관어 자동 확장 (econ-daily: 32개 관련 키워드)
- Tags 18~25개 자동 조립 (YouTube 500자 한도 준수)
- Description 재구성 (첫 100자 키워드 + 해시태그 블록)

---

## 🎯 일일 운영 시나리오

### 자동 (스케줄)
```
06:00 launchd → daily-episode-batch.js
      ├─ fetch-daily-news.js (뉴스 수집)
      ├─ ceo-select-topics.js (상위 2개 주제 선정)
      ├─ create-episode.js × 2 (Brief 생성)
      └─ notify('daily_report')  → Telegram
```

### 수동 (Telegram 봇)
```
운영자: /topics 10
봇:    🏆 Top 10 후보 리스트

운영자: /select 3 7
봇:    ✅ EP-2026-0010, EP-2026-0011 생성

(Claude Code에서 S2~S9 진행)

운영자: /approve EP-2026-0010
봇:    ✅ 승인됨

운영자: /status EP-2026-0010
봇:    📊 Stage: S11 completed, YouTube: https://youtu.be/...
```

---

## 📝 License / Credits

- Paperclip AI (organization framework)
- Claude Code CLI (agent runtime)
- CapCut PC (rendering)
- ElevenLabs (TTS — Yohan Koo voice)
- Google Gemini (Nano Banana 2 image)
- FAL.ai (Recraft V3 fallback)
- YouTube Data API v3

Internal project. 문서: [`CLAUDE.md`](CLAUDE.md) · [`docs/PIPELINE-V2.md`](docs/PIPELINE-V2.md)
