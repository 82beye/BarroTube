---
title: Budget Ceiling Enforcement — 역할별 월간 한도 자동 정지
status: draft
owner: produce-chain
related_rule: CLAUDE.md Critical Rule #5
created: 2026-04-21
---

# Budget Enforcement Design

## Background
- **Rule (CLAUDE.md:68)**: 역할별 월간 USD 한도, 초과 시 자동 정지
- **Policy (paperclip/config/budget-policy.json)**: 이미 완전히 정의됨 — 11개 역할별 limit + on_limit action + notify targets
- **Reporter (scripts/automation/budget-report.js)**: 이미 존재. `logs/budget/usage-YYYY-MM.json` 읽어서 출력.
- **현 구현 상태**: 🚨 usage 파일이 **아무데서도 쓰여지지 않음**. `logs/budget/` 디렉토리조차 없음. 즉 reporter 는 항상 0원을 보고함 — 거버넌스 설계가 사실상 무효.
- **Risk**: ElevenLabs/Gemini 호출이 cap 없이 무한 가능. 운영자 감시 실패 시 예상 외 과금.

## Requirements
1. 각 에이전트/API 호출 전 **사전 체크** (`checkBudget(role, estCost)`) — 한도 초과 시 throw
2. 호출 후 **실측 기록** (`recordUsage(role, actualCost, tracking)`) — 원자적(atomic) append
3. `on_limit` 액션 분기:
   - `pause_new_episodes` → 신규 에피소드 생성 차단
   - `pause_episode` → 현재 에피소드 즉시 중단, Paperclip `blocked`
   - `defer_next_episode` → 다음 배치부터 skip (오늘 진행은 완주 허용)
   - `fallback_manual_upload` → S11 수동 전환
4. 80% 도달 시 Telegram 경고 (기존 alert_threshold_pct 활용)
5. 월 경계(UTC 1일 00:00)에 usage reset

## Proposed Implementation

### 1) `scripts/automation/budget.js` (신규 — 공용 모듈)
```js
export function checkBudget(role, estimatedUsd = 0)
  // throw BudgetExceededError(role, used, limit, onLimit)
  // return { used, limit, pct }

export function recordUsage(role, actualUsd, tracking = {})
  // append to logs/budget/usage-YYYY-MM.json atomically
  // trigger 80% alert once per month per role

export function getUsage(role, month = current)
export function getPolicy()
```

파일 포맷: `logs/budget/usage-2026-04.json`
```json
{
  "writer": {
    "total_usd": 12.34,
    "calls": 18,
    "llm_tokens": 143200,
    "last_updated": "...",
    "episodes": ["EP-2026-0007", ...]
  },
  ...
}
```

### 2) 호출 지점 연결
각 generator 스크립트가 checkBudget + recordUsage 를 호출:

| Script | Role | Cost Source |
|--------|------|-------------|
| `generate-script.js` | writer | Gemini API response usage |
| `generate-tts.js` | voice-engineer | ElevenLabs char count × rate |
| `generate-image-gemini.js` | image-generator | Gemini API response usage |
| `generate-qa-report.js` | qa-reviewer | Sonnet usage |
| `generate-metadata.js` | metadata-writer | Gemini usage |
| `publish-youtube.js` | publisher | YouTube API (거의 무료이나 quota count) |
| `run-factcheck.js` (신규) | fact-checker | Sonnet + web_search |

### 3) `produce-episode.js` 통합
`runTracked()` 진입부에 `checkBudget(stageToRole[stageId])` 추가. `BudgetExceededError` 캐치 시:
- stage_history `failed` + `reason: budget_exceeded`
- Paperclip `blocked` + comment 에 사용량/한도 포함
- Telegram 알림

### 4) 비용 측정 방식
- **Gemini**: response.usageMetadata 의 prompt/completion 토큰 × 가격표 상수
- **ElevenLabs**: request 전에 character count × per-char 요율
- **Claude Code CLI**: CLI는 자체 token accounting 없음 → wrapper 로 추정치 사용 (일간 평균 교정)

가격 상수는 `paperclip/config/pricing.json` 신설 — 모델 버전 갱신 시 정책만 수정.

### 5) Atomic Write
동시 에피소드 실행 시 race 방지:
- `logs/budget/usage-{month}.json.lock` 파일 O_CREAT|O_EXCL flock
- 실패 시 50ms sleep × 최대 10회 재시도
- Node 내장 `fs.promises.open('ax')` 사용

## Edge Cases
- `usage-*.json` 파일 없음/파손 → `{}` 로 초기화 (감사 로그에 `usage_file_reset` 기록)
- 월 경계를 걸친 긴 렌더링 → stage 시작 시점의 month 기준으로 결제 (recordUsage 인자 `startedAtMonth`)
- `on_limit: pause_new_episodes` 인 CEO 역할이 과소비 → create-episode.js 가 checkBudget('ceo') 먼저
- **월 경계 race** (23:59:45 checkBudget → 00:00:15 recordUsage): check 시점 month 를 명시적으로 전달하여 두 작업이 동일 파일 타깃. 테스트 케이스 필수.
- **동시 에피소드** (EP-A 와 EP-B 가 같은 role 소비): flock + 재시도 10회, 10회 모두 실패 시 stage `failed: budget_lock_timeout` — audit log 에 lock contention 기록.

## Cost/Effort
- **Dev**: 5~8h (공용 모듈 + 7개 generator 통합 + 테스트)
- **Runtime overhead**: 호출당 ~5ms (JSON read/write + flock)
- **운영 효과**: 월 예산 $690 (11 roles 합계) 초과 자동 차단 — 품질 사고 방지

## Rollout
- Phase A: `budget.js` + atomic write + `pricing.json` — 단위 테스트
- Phase B: writer/voice-engineer/image-generator 3개 가장 비싼 호출에 우선 적용
- Phase C: 나머지 역할 확대 + produce-episode.js 게이팅
- Phase D: Telegram 80% alert + daily 09:00 report 연결

## Open Questions
1. **🚨 BLOCKER: Claude Code CLI token accounting**. writer / qa-reviewer / fact-checker 는 모두 CLI 호출로, 이 값이 추정치로만 잡히면 Rule #5 "자동 정지" 가 공허해짐. Phase A 착수 **전에** 다음 중 택일 확정 필수:
   - (a) Paperclip integration hook 으로 CLI 호출 결과의 usage 메타를 자동 수집
   - (b) CLI stderr/log parse 로 token 수 추출 (포맷 안정성 리스크)
   - (c) 시간당 평균 campaign + 주간 교정 (정확도 ±30% 수용)
2. 월중 가격 인상 시 소급 적용 여부? — 비권장. 가격 변경 시점부터 적용이 회계 단순화
3. CEO-level override (예산 초과해도 강제 진행) 필요? — 현재는 미지원, Board 승인 명시 시점에 별도 설계
4. **미매핑 4개 role 근거**: ceo/producer/strategist/capcut-composer 는 현재 produce-episode.js 체인에서 직접 호출되지 않아 Phase C 로 이월. run-episode.js 통합 시 동시 매핑 권장.
