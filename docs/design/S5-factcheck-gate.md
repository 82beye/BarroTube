---
title: S5 Factcheck Gate — HIGH 위험 재집필 루프
status: draft
owner: produce-chain
related_rule: CLAUDE.md Critical Rule #4
created: 2026-04-21
---

# S5 Factcheck Gate Design

## Background
- **Rule (CLAUDE.md:67)**: 팩트체크 게이트: HIGH 위험 → 재집필 (최대 2회)
- **Agent spec (claude-code/.claude/agents/06-fact-checker.md)**: 이미 존재. 입력 `30_script.md` → 출력 `35_factcheck.md` with frontmatter `pass: true|false`, `high_risk_count: N`
- **현 구현 상태**: `run-episode.js:278` 에 prompt 문자열만 존재, 실제 실행/루프 없음. `produce-episode.js` 는 S4 → S6 직행으로 이 게이트를 완전히 우회.
- **Risk**: HIGH 위험 주장이 그대로 S11 퍼블리시까지 통과 — 안전 규칙 위반.

## Requirements
1. S4 Script 직후 S5 Factcheck 실행 (`35_factcheck.md` 생성)
2. frontmatter `pass === true` → 다음 단계 진행
3. `pass === false` + 재시도 횟수 < 2 → S4 Writer 재호출 (factcheck report 를 context 로 전달)
4. 2회 재집필 후에도 실패 → 체인 중단, Paperclip 이슈 `blocked`, Telegram 알림
5. 기존 `35_factcheck.md` 존재 + frontmatter pass === true → skip (`--force` 시 재생성)

## LLM Backend (Phase A 결정)

**현재 환경 제약**: `ANTHROPIC_API_KEY` 미설정. `GOOGLE_AI_API_KEY` 만 가용 (config-loader audit 2026-04-22 기준).

**Phase A 구현 전략**:
- **Primary backend**: Gemini 2.5 Pro + `google_search` tool (grounded web search)
- **Rationale**: (a) 기존 generate-script.js / generate-metadata.js 와 동일 인프라 (의존성 추가 없음), (b) Google Search grounding 이 Anthropic web_search 와 기능적으로 동등, (c) 가격 저렴 ($1.25/M input vs Sonnet $3/M)
- **Future migration (Phase D)**: `ANTHROPIC_API_KEY` 제공 시 `--backend sonnet` 플래그로 Sonnet 4.6 전환. Agent spec (06-fact-checker.md) 의 "Model: Sonnet" 기술적 권고대로 복귀.

**계약(Contract)은 backend 무관 동일**: 출력 파일 `35_factcheck.md` 의 frontmatter 스키마 (pass, high_risk_count 등) 은 agent spec 과 1:1 매칭. 호출자(produce-episode.js)는 backend 인지 없이 동작.

## Proposed Implementation

### 1) `scripts/automation/run-factcheck.js` (신규)
```
Usage: run-factcheck.js --episode <EP-ID> [--force] [--model gemini-2.5-pro]
```
- Gemini API 직접 호출 (fetch, SDK 미사용 — 기존 패턴)
- `tools: [{ googleSearch: {} }]` 로 grounding 활성화
- 실패 시 exit 1, 성공 시 exit 0 + stdout 에 JSON `{ pass, high_risk_count, total_claims, file }`

### 2) `produce-episode.js` 체인 수정
```
S4 Script
  → loop:
      S5 Factcheck (run-factcheck.js)
      parse 35_factcheck.md frontmatter
      if pass → break
      if retry < 2 → S4 Script --revise --factcheck 35_factcheck.md
      else → throw 'FactcheckFailedMaxRetries'
  → S6a TTS
```

### 3) `generate-script.js` 확장
- 새 플래그: `--revise` (기존 30_script.md 덮어쓰기), `--factcheck <path>` (revision context)
- Writer agent 프롬프트에 "이전 factcheck HIGH 항목 반영 필수" 추가

### 4) 상태/감사
- stage_history 에 `S5` entry: `{ pass, high_risk_count, retry }`
- audit log: `factcheck_pass | factcheck_fail_retry | factcheck_fail_terminal`
- Paperclip 이슈 `blocked` 전이 사유에 HIGH claim 목록 요약 포함

## Edge Cases
- factcheck agent 자체 실패 (network, budget 등): 재시도 하지 않고 `blocked`
- `--force` 와 factcheck pass 된 기존 리포트: 사용자 의도 존중, 재생성
- 재집필 후 script 가 transient 변경 (scene 수 변경) → TTS/Image 도 `--force` 로 재생성 필요

## Cost Impact (에피소드 1건 기준 예상)
- factcheck 1회: $0.3~0.5 (Sonnet + web_search 5~10콜)
- 재집필 최대 2회 시: S4 writer 3회 × $0.2 + factcheck 3회 × $0.4 ≈ $1.8 최악 시나리오
- 기존 체인 대비 +$1.2 / 에피소드. 월 30편이면 +$36, 전체 예산 영향 <5%

## Rollout
- **Phase A (완료, 2026-04-22)**: run-factcheck.js 독립 구현 + 수동 호출 검증 (EP-2026-0007 실측)
  - ✅ 파이프라인 동작 (contract: pass/high_risk_count/med/low 추출 가능)
  - ✅ 캐시 스킵 로직 동작 (기존 `35_factcheck.md` 존재 시 `--force` 없으면 frontmatter 파싱 후 조기 종료)
  - ⚠ **비결정성 발견**: 동일 script 2회 연속 실행 시 HIGH 개수가 0 → 4 로 크게 변동. Gemini 가 `tools:[{googleSearch:{}}]` 요청에도 불구하고 **실제 google_search 를 호출하지 않음** (`groundingChunks=0`, `webSearchQueries=0`). 원인 추정: 시스템 프롬프트의 "Output MUST be JSON" 이 tool use 와 충돌하여 모델이 tool 스킵 후 내부 지식으로 응답. evidence 필드의 인용은 학습 데이터 기반이며 실시간 검증이 아님.
  - ✅ 이 문제를 frontmatter `grounded: true|false` + markdown 경고 블록으로 노출 (caller 가 읽고 판단 가능).
  - 🚨 **Phase B 블로커**: 현 상태로는 품질 게이트로 사용 불가. 동일 입력에 대해 게이트 결정이 run 마다 바뀌면 재실행 루프가 무한 발산.
- **Phase B (현재 블록)**: produce-episode.js 루프 통합. **진입 전 grounding 강제 이슈 해결 필수**. 3가지 옵션:
  - (B-1) Tool 강제 활성: system prompt 2단 분리 — 1차 텍스트 + google_search (강제), 2차 JSON 구조화 (tool 미사용). 2 call / claim 비용 상승.
  - (B-2) Gemini dynamic retrieval threshold 튜닝 (`googleSearchRetrieval.dynamicRetrievalConfig.dynamicThreshold=0`).
  - (B-3) Sonnet 4.6 전환 (ANTHROPIC_API_KEY 신규 발급 필요). Anthropic web_search tool 은 forced 모드 지원.
- **Phase C**: `SKIP_FACTCHECK=1` 환경변수로 일시 우회 가능 상태에서 점진 적용
- **Phase D**: 환경변수 제거, 게이트 필수화. Sonnet 전환 옵션 추가 (`--backend sonnet`).

## Open Questions
1. Writer 재집필 시 전체 script 재작성 vs HIGH scene 만 revise? — 전체 재작성이 일관성 안전, scene-only 가 cost 효율. 초기에는 전체 재작성 권장.
2. 재집필 2회 실패 시 자동으로 Board 알림? `blocked` + Telegram alert 권장.
3. **Budget 설계와의 호출 경계**: `checkBudget('fact-checker')` 는 S5 루프 **진입 시 1회** vs **재시도 시마다**? 재시도마다 호출이 Rule #5 취지(실제 비용 추적)에 부합하나 실패 반복 시 빠르게 한도 소진. 권장: 재시도마다 호출, 한도 도달 시 loop 내에서 즉시 `blocked`.
4. **Chain 이원화 정리**: `workflow-engine.js:25` 에도 S5 정의가 존재하나 `produce-episode.js` 는 호출하지 않음. 이 설계는 produce-episode.js 만 수정. workflow-engine.js 통합 vs 유지 결정 필요 (별도 RFC 권장).
5. **`--factcheck <path>` 주입 방식**: Writer 프롬프트에 (a) 전체 markdown 첨부, (b) HIGH 항목만 추출 주입 중 택일. Phase A 착수 전 고정 — 권장 (b) HIGH+MED 추출 주입(토큰 절감 + 수정 초점 명확).
