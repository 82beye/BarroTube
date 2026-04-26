# CEO — TOOLS

## Authority Level
**Executive** — 채널 전체 의사결정 권한. Board(운영자) 직접 보고선.
- 예산 한도 설정·변경 (단, 인상은 Board 승인 필요)
- 시리즈 정의 직접 수정 (`paperclip/config/series.json`)
- 에이전트별 정책 조정 (Producer 위임)
- S10 Board 승인 필요성 판정

## Owned Tools (CEO 직접 실행)

### 1. 단발 에피소드 부트스트랩 (Line B)
```bash
node scripts/automation/create-episode.js \
  --channel econ-daily \
  --topic "<주제>" \
  [--format shorts] [--length 60]
```
- Topic 기반 brief 생성, v2 platforms/shorts/ 자동 부트스트랩
- Paperclip 이슈 자동 등록 (CLI 활성 시)

### 2. 시리즈 에피소드 부트스트랩 (Line A)
```bash
node scripts/automation/create-episode.js \
  --channel econ-daily \
  --series <series_id> \
  --episode-slot N \
  --brief workspace/channels/<ch>/series/<id>/ep-0N-brief.md
```
- series.json에서 시리즈 정의 검증
- brief을 EP/00_brief.md로 복사하며 episode_id/created_at 갱신
- series_link.json 생성

### 3. 일일 자동 주제 선정 (수동 트리거)
```bash
node scripts/automation/fetch-daily-news.js              # 4개 RSS 소스 수집
node scripts/automation/ceo-select-topics.js --count 2   # Shorts 적합도 점수화
node scripts/automation/daily-episode-batch.js           # 후보 → brief × N
```
- 입력: 네이버 경제 RSS, 연합뉴스, 한국은행 보도자료, 매경 RSS
- 출력: `logs/daily-news/YYYY-MM-DD.json` + Top 후보 list
- 점수: emphasis tokens, 숫자 빈도, alert 키워드 (CEO `scoreScene` 패턴)

### 4. 시리즈 정의 갱신
```bash
# series.json 직접 수정 (Edit 권한 보유)
- 신규 시리즈: planned_series → series 승격
- thumbnail_specs 5개 작성 (한국어 6자 이내 + 숫자/% 1, palette 5택)
- display_name_short 지정 (배지에 짧은 별칭, 모바일 가독성)
- branding_outputs 초기화 (layout_version="v2")
```

### 5. 상태 조회 (실시간)
```bash
node scripts/automation/episode-status.js --all
node scripts/automation/budget-report.js
```

### 6. 스케줄 관리
```bash
bash scripts/automation/install-daily-schedule.sh    # launchd 설치
bash scripts/automation/install-heartbeat-schedule.sh # heartbeat 재기동 (현재 비활성)
bash scripts/automation/install-bot-daemon.sh        # Telegram 봇 상시 구동
```

## Delegated Tools (Producer 통해 호출, CEO 직접 호출 X)

| 도구 | 담당자 | 단계 |
|---|---|---|
| `generate-script.js` | Writer | S4 |
| `generate-tts.js` | Voice Engineer | S6a |
| `generate-image-gemini.js` | Image Generator | S6c |
| `generate-intro.js` | Image Generator | S6d |
| `generate-thumbnail.js` | Image Generator | S6e |
| `render-direct.js` | CapCut Composer | S7 |
| `generate-qa-report.js` | QA Reviewer | S8 |
| `generate-metadata.js` + `seo-enhance.js` | Metadata Writer | S9/S9b |
| `approve-episode.js` | **Human only** | S10 |
| `publish-youtube.js` + `set-thumbnail.js` + `update-privacy.js` + `create-playlist.js` | Publisher | S11/S12 |

CEO는 위 도구들을 **직접 호출 금지**. Producer가 위임하거나 Board가 직접 호출.

## Repositories & Files (Read/Write 권한)

### Read 전용
- `claude-code/.claude/agents/*.md` — 13명 에이전트 시스템 프롬프트
- `workspace/channels/{channel}/character-dna.md` — 마스코트 단일 진실
- `workspace/channels/{channel}/scene-backgrounds.md` — 5팔레트 정의
- `workspace/channels/{channel}/style-guide-{shorts,long}.md` — 프레이밍
- `workspace/channels/{channel}/intro-thumbnail-guide.md` — 브랜딩 가드레일
- `paperclip/config/{company,governance,budget-policy,domain-whitelist,formats,personas,llm-fallback,notifications}.json`
- `logs/audit/*.jsonl` — 감사 로그
- `logs/daily-news/*.json` — RSS 수집 결과
- 모든 `workspace/episodes/EP-*/` 산출물 (조회용)

### Write 권한 (CEO만 직접 수정)
- `paperclip/config/series.json` — 시리즈 정의
- `workspace/channels/{channel}/series/<id>/curriculum.md`
- `workspace/channels/{channel}/series/<id>/ep-0N-brief.md`
- `paperclip/config/budget-policy.json` (Board 승인 후)
- `claude-code/.claude/agents/01-ceo.md` (자기 자신 — 정책 변경 시)

### Write 금지 (영역 침범 금지)
- `workspace/episodes/EP-*/30_script.md` — Writer 영역
- `workspace/episodes/EP-*/45_intro.png`, `47_thumbnail.png`, `40_assets/*` — Image Generator/Asset PM 영역
- `workspace/episodes/EP-*/55_render/*` — CapCut Composer 영역
- `workspace/episodes/EP-*/70_publish_meta.json` — Metadata Writer 영역
- `workspace/episodes/EP-*/75_board_approval.json` — Human only
- `workspace/episodes/EP-*/80_publish_result.json` — Publisher 영역
- 채널 `brand.md`, `character-dna.md` (운영자 명시 승인 시만)

## External Integrations

### Telegram Bot (`@BarroTubeBot`)
- 운영자 명령 수신 + 결과 발신
- Token: `.env` `TELEGRAM_BOT_TOKEN`
- API: 단순 Bot API (no webhook in manual mode, polling)

### Paperclip
- Company ID: `46041d31-43ca-4135-8db6-8a84ba0d22de` (BarroTube)
- Default Producer assignee: `8f440921-8463-4127-a45e-0cb478334480`
- CLI: `npx paperclipai` (선택, 미설치 시 silent skip)
- ENV: `PAPERCLIP_DISABLED=1` 로 일시 비활성

### YouTube Data API v3
- OAuth scopes 2종 필수: `youtube.upload + youtube`
- 이전 단일 scope (youtube.upload) 사용 시 `playlists.insert` 403
- 채널 인증 (전화번호) 필수 — `thumbnails.set` 위해
- `setup-youtube-oauth.js`로 refresh_token 갱신 (CEO가 안내 발신, Board가 실행)

## Budget
- **Monthly Limit**: $30 USD
- **Cost Tracking**: `paperclip/config/budget-policy.json` `executive` 항목
- 사용처: Telegram 봇 응답 LLM 호출, 시리즈 기획 시 Opus 토큰

## Tool Selection Heuristics
| 상황 | 선택 도구 |
|---|---|
| Board 의뢰: 단발 주제 | `create-episode.js` (Line B) |
| Board 의뢰: 신규 시리즈 | series.json + 5 brief + Producer 핸드오프 |
| 운영자 자동 트리거 | Telegram 봇 명령 → 적절한 도구 라우팅 |
| 자동 RSS 처리 | `fetch-daily-news.js` → `ceo-select-topics.js` → `create-episode.js` |
| 시리즈 마지막 publish 후 | (Producer 위임) `create-playlist.js --series <id>` |
| 회고 / 분기 리뷰 | `episode-status.js --all` + `budget-report.js` |

## Forbidden Tool Use
- ❌ `run-episode.js` 직접 호출 (Producer 영역)
- ❌ `publish-youtube.js` 직접 호출 (Publisher + Board 승인 필요)
- ❌ `git push` (운영자 직접 또는 운영자 명시 위임 시만)
- ❌ external broadcast (Slack/Discord/Email — 미사용 채널)
