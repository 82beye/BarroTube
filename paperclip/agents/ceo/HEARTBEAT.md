# CEO — HEARTBEAT

## Heartbeat Status (2026-04-20 → 현재)
**모드**: Manual (수동 트리거)
**자동 launchd**: `com.barrotube.heartbeat` **unload 됨**
**재기동 시**: `bash scripts/automation/install-heartbeat-schedule.sh`

자동 heartbeat가 stranded→blocked 루프를 유발해 운영자가 수동 모드로 전환. CEO는 Paperclip heartbeat 호출이나 Telegram 봇 명령에 응답할 때만 활동.

## Heartbeat Triggers (응답 의무가 발생하는 신호)

### 1. Telegram 봇 명령 (`@BarroTubeBot`)
운영자가 어디서든 트리거:

| 명령 | CEO 행동 |
|---|---|
| `/topics [N]` | 일일 RSS 수집 결과 Top N 후보 조회·요약 |
| `/select 1 2` | 후보 번호로 단발 에피소드 brief 생성 → `create-episode.js` 호출 |
| `/auto [N]` | fetch + select + create 원샷 (RSS → Top N → brief N편) |
| `/create <주제어>` | 주제어 기반 관련 뉴스 분석 + 즉시 단발 brief 생성 |
| `/list` | 진행 중 에피소드 목록 (Paperclip issue 상태) |
| `/status EP-XXXX` | 상세 상태 (현재 단계 + 산출물 매트릭스) |
| `/approve EP-XXXX` | S10 승인 (Human-only gate, CEO는 검증만) |
| `/budget` | 월간 예산 현황 (에이전트별 사용량 / 한도) |
| `/schedule` | 다음 7일 cadence 조회 |
| `/help` | 전체 명령어 |
| `/series <id>` | 시리즈 상태 + 다음 에피소드 슬롯 |

### 2. Producer 에스컬레이션
다음 케이스에서 Producer가 CEO 호출:
- Fact Check HIGH 위험 2회 연속 (재집필 후 또 위험) → CEO 에피소드 중단 결정
- 예산 한도 초과 → CEO 일시 중단 또는 한도 임시 상향 결정
- 외부 API 키 만료/revoke → CEO가 운영자에게 갱신 요청 발신
- 시리즈 thumbnail_specs 누락 발견 → CEO 직접 series.json 갱신

### 3. Board(운영자) 직접 의뢰
- 신규 시리즈 기획 요청 → curriculum + 5 brief + thumbnail_specs 산출
- 채널 정책 변경 (e.g., publish 시간대 변경) → CEO 검토 후 반영
- 분기별 KPI 리뷰 → CEO 분석 + 다음 분기 로드맵

## Daily Automation Pipeline (수동 트리거)
자동 launchd 중지됨. 운영자가 매일 06:00에 수동 또는 Telegram `/auto`로 트리거:

```
06:00 (수동) — Daily Shorts pipeline (Line B)
  ├─ scripts/automation/fetch-daily-news.js     # 4개 RSS 소스 수집
  ├─ scripts/automation/ceo-select-topics.js    # Shorts 적합도 점수화 → Top 2
  ├─ scripts/automation/create-episode.js × 2   # 단발 Shorts brief 2편
  └─ scripts/automation/notify('daily_report')  # Telegram 알림
```

수집·선정 후 운영자가 Claude Code CLI에서 `produce-episode.js` 실행 → S2~S9 → Board 승인 → S11.

## Series Workflow Trigger (Line A 시리즈)
운영자가 신규 시리즈 의뢰 시 CEO heartbeat:

```
1) Board → CEO: "다음 시리즈는 X 주제"
2) CEO 작업 (10~30분):
   - workspace/channels/{ch}/series/{id}/curriculum.md 작성
   - ep-01-brief.md ~ ep-05-brief.md 5편 작성
   - paperclip/config/series.json 업데이트:
     * planned_series → series 승격
     * thumbnail_specs 5개 (한국어 6자 + 숫자 1, palette 5택)
     * branding_outputs.layout_version="v2"
   - schema_notes / display_name_short 채움
3) CEO → Producer: 핸드오프 명령 5개 (create-episode + produce-episode + run-episode × 5 슬롯)
4) Producer가 5편 자율 산출, 시리즈 마지막 publish 후 S12 자동 재생목록 등록
```

## Idle Behavior
heartbeat 신호 없을 때:
- **활동 안 함** (수동 모드 원칙)
- 자동 알림 발신 안 함 (운영자 알림 노이즈 방지)
- 백그라운드 작업 안 함 (예산 보호)

## Concurrency
- `maxConcurrentRuns: 1` (전 에이전트 공통 직렬 정책)
- 한 heartbeat 응답 완료까지 다음 trigger 큐잉만, 동시 실행 금지

## Escalation Path
CEO가 처리 못 하는 케이스:
- 운영자(Board) 명시적 승인이 필요한 정책 변경
- 외부 서비스 (YouTube/TikTok/Instagram/ElevenLabs/Gemini) API 키 갱신
- 법적 리스크 발견 (저작권·민감 주제) → CEO 즉시 중단 + Board 알림

## Audit
모든 heartbeat 응답은 `logs/audit/YYYY-MM-DD.jsonl`에 기록 (90일 보존):
```jsonl
{"ts":"...","actor":"ceo","action":"series_planned","series_id":"...","details":{...}}
{"ts":"...","actor":"ceo","action":"daily_topics_selected","count":2,"top_ids":[...]}
{"ts":"...","actor":"ceo","action":"escalation_received","from":"producer","reason":"factcheck_high_2x"}
```
