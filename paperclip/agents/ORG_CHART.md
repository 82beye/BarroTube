# BarroTube — ORG CHART

> 13명 에이전트 조직도. Paperclip 대시보드 `/org` 페이지에 운영자가 GUI로 입력할 트리 구조의 단일 진실 원천.
> 작성: 2026-04-26 / 회사 ID: `46041d31-43ca-4135-8db6-8a84ba0d22de` (BarroTube)

---

## 1. 조직 트리

```
                        ┌─────────────┐
                        │   CEO (1)   │  Executive
                        │  Opus       │  - 시리즈 기획·정책·예산
                        └──────┬──────┘
                               │ delegates
                               ▼
                        ┌─────────────────┐
                        │ Producer (2)    │  Editorial Lead
                        │ Opus            │  - S0~S12 파이프라인 지휘
                        └────────┬────────┘
                                 │ direct delegation (no sub-issues)
                ┌────────────────┼────────────────────────┬───────────────┐
                ▼                ▼                        ▼               ▼
       ┌───────────────┐  ┌─────────────┐   ┌─────────────────┐   ┌─────────────┐
       │ Editorial     │  │ Production  │   │ Quality         │   │Distribution │
       │   Department  │  │ Department  │   │  Department     │   │  Department │
       └───────┬───────┘  └──────┬──────┘   └────────┬────────┘   └──────┬──────┘
               │                 │                   │                   │
   ┌───────────┼───────┐         │           ┌───────┘                   │
   ▼           ▼       ▼         ▼           ▼                           ▼
 ┌──────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────────┐         ┌────────────────┐
 │ Mkt  │ │Strat-│ │Writer│ │Asset PM │ │QA Review-│         │ Metadata Writer│
 │Resear│ │egist │ │ (5)  │ │  (7)    │ │  er (11) │         │      (12)      │
 │ (3)  │ │ (4)  │ │ Opus │ │ Sonnet  │ │   Opus   │         │     Sonnet     │
 │Sonnet│ │ Opus │ │      │ │         │ │          │         │                │
 └──────┘ └──────┘ └──────┘ └────┬────┘ └──────────┘         └────────┬───────┘
                                 │                                    │
                ┌────────────────┼────────────────┐                   ▼
                ▼                ▼                ▼            ┌────────────┐
         ┌──────────┐    ┌─────────────┐ ┌──────────────┐      │ Publisher  │
         │ Image    │    │ Voice       │ │ CapCut       │      │   (13)     │
         │ Generator│    │ Engineer    │ │ Composer     │      │  Haiku     │
         │   (8)    │    │   (9)       │ │   (10)       │      │            │
         │  Haiku   │    │  Haiku      │ │  Sonnet      │      └────────────┘
         └──────────┘    └─────────────┘ └──────────────┘

 ┌──────────┐
 │Fact Check│  Editorial 부서 직속 (Writer 검증), Producer 보고
 │   (6)    │  Sonnet
 └──────────┘
```

---

## 2. 보고선 (Reports To)

| # | Agent | Reports To | Department |
|---|---|---|---|
| 1 | CEO | Board (운영자) | Executive |
| 2 | Producer | CEO | Editorial Lead |
| 3 | Market Researcher | Producer | Editorial |
| 4 | Strategist | Producer | Editorial |
| 5 | Writer | Producer | Editorial |
| 6 | Fact Checker | Producer | Editorial |
| 7 | Asset PM | Producer | Production Lead |
| 8 | Image Generator | Asset PM | Production |
| 9 | Voice Engineer | Asset PM | Production |
| 10 | CapCut Composer | Asset PM | Production |
| 11 | QA Reviewer | Producer | Quality |
| 12 | Metadata Writer | Producer | Distribution |
| 13 | Publisher | Producer | Distribution |

CEO는 Producer에게만 위임. 부서장(Producer/Asset PM)이 부서원에게 직접 delegation.

---

## 3. 위임 라인 (Delegation Lines)

```
S0  Brief         : CEO ─────────────────────────────► Board (Human)
S1  Ticket        : CEO ─────────────────────────────► Producer
S2  Research      : Producer ──► Market Researcher
S3  Strategy      : Producer ──► Strategist
S4  Script        : Producer ──► Writer
S5  Factcheck     : Producer ──► Fact Checker  (Writer 산출물 검증)
S6a TTS           : Producer ──► Asset PM ──► Voice Engineer
S6b Sync          : Producer ──► Asset PM ──► Voice Engineer
S6c Scene Images  : Producer ──► Asset PM ──► Image Generator
S6d Intro Card    : Producer ──► Asset PM ──► Image Generator
S6e Thumbnail     : Producer ──► Asset PM ──► Image Generator
S7  Render        : Producer ──► Asset PM ──► CapCut Composer
S7b CapCut Draft  : Producer ──► Asset PM ──► CapCut Composer
S8  QA Report     : Producer ──► QA Reviewer
S9  Metadata      : Producer ──► Metadata Writer
S9b SEO Enhance   : Producer ──► Metadata Writer
S10 Approval      : Producer ──► Board (Human only gate)
S11 Publish       : Producer ──► Publisher  (Board 승인 토큰 검증 후)
S12 Playlist      : Producer ──► Publisher  (시리즈 마지막 publish 후 자동)
```

**원칙**: Sub-issue 자동 분해 금지 (수동 모드 정책 2026-04-20). Producer는 primary issue 1개 안에서 직접 delegation, 진행 상황은 comment로 표시.

---

## 4. 부서 정의

### Executive (1)
**책임**: 채널 전략, 시리즈 기획, 예산 총괄
- CEO

### Editorial (4 + 1 검증)
**책임**: 콘텐츠 기획·집필 (S2~S5)
- Producer (Lead)
- Market Researcher
- Strategist
- Writer
- Fact Checker (검증 게이트)

### Production (3 + 1 PM)
**책임**: 자산 생성·렌더 (S6~S7b)
- Asset PM (Lead)
- Image Generator (씬·인트로·썸네일 3종)
- Voice Engineer
- CapCut Composer

### Quality (1)
**책임**: 영상 사양 검수 (S8)
- QA Reviewer

### Distribution (2)
**책임**: 메타데이터·배포 (S9~S12)
- Metadata Writer
- Publisher

---

## 5. Paperclip GUI 입력 단계 (운영자 작업)

http://127.0.0.1:3100/YOU/org 페이지에서 ORG CHART 빌드:

### Step 1 — Root: CEO 추가
1. ORG CHART 빈 화면에서 **"Add root node"** 또는 **`+`** 클릭
2. Agent 선택: **CEO**
3. Department 라벨: `Executive`
4. 저장

### Step 2 — Producer를 CEO 아래로
1. CEO 노드 클릭 → **"Add child"**
2. Agent: **Producer**
3. Department: `Editorial Lead`

### Step 3 — Editorial 부서 (Producer 아래)
Producer 노드에 4명 child 추가:
- Market Researcher (Editorial)
- Strategist (Editorial)
- Writer (Editorial)
- Fact Checker (Editorial)

### Step 4 — Production 부서
Producer 노드에 Asset PM 추가 (Lead) → Asset PM 노드에 3명:
- Image Generator (Production)
- Voice Engineer (Production)
- CapCut Composer (Production)

### Step 5 — Quality
Producer 노드에 QA Reviewer 추가 (Quality)

### Step 6 — Distribution
Producer 노드에 2명 추가:
- Metadata Writer (Distribution)
- Publisher (Distribution)

### Step 7 — 검증
- 13개 노드 표시 확인 (CEO 1 + Producer 1 + Editorial 4 + Production 3 + Quality 1 + Distribution 2 = 12, +Asset PM 1 = 13)
- 트리 leaf 노드: Market Researcher, Strategist, Writer, Fact Checker, Image Generator, Voice Engineer, CapCut Composer, QA Reviewer, Metadata Writer, Publisher (10개)
- 중간 노드: Producer (1), Asset PM (1)
- Root: CEO (1)

---

## 6. 동시성 / 직렬 정책

모든 노드: `maxConcurrentRuns: 1`

직렬 처리:
- 한 EP가 S11 publish 완료 → 다음 EP 픽업
- Producer는 동시에 1개 EP만 지휘
- Asset PM도 동시에 1개 EP만 자산 조율

병렬 허용 (서로 다른 EP 간):
- Image Generator가 EP-A의 S6c 작업 중일 때 다른 인스턴스가 EP-B 작업 못 함 (직렬 정책)

---

## 7. Escalation Path

```
Editorial 이슈
  Writer/Researcher/Strategist/Fact Checker
  ──► Producer
  ──► CEO (Producer 판단 외 케이스)
  ──► Board (CEO 판단 외 케이스: 정책 변경, 법적 리스크)

Production 이슈
  Image Generator/Voice Engineer/CapCut Composer
  ──► Asset PM
  ──► Producer
  ──► CEO

Quality 이슈
  QA Reviewer ──► Producer ──► CEO

Distribution 이슈
  Metadata Writer/Publisher ──► Producer ──► CEO
```

특수 케이스:
- **OAuth 만료** (Publisher) → CEO → Board (운영자가 `setup-youtube-oauth.js` 실행)
- **Fact Check HIGH 2회 연속** → CEO 에피소드 중단 결정
- **예산 100% 초과** → 자동 일시 중단 + CEO 승인 요구

---

## 8. KPI 매핑 (부서별)

| 부서 | KPI |
|---|---|
| Executive (CEO) | 시리즈 KPI, 채널 구독자, 월간 예산 준수율 |
| Editorial | Fact check pass rate, narration 100% target_seconds 정확도 |
| Production | 자산 누락 0건, 렌더 duration ≠ TTS sum 0건 |
| Quality | QA verdict PASS/FAIL ratio, 영상 사양 회귀 0건 |
| Distribution | YouTube CTR, Shorts 시청 인계율, 재생목록 등록 자동 성공률 |

---

## 9. Audit
모든 위임·승인 이벤트는 `logs/audit/YYYY-MM-DD.jsonl` 90일 보존.

```jsonl
{"ts":"...","actor":"ceo","action":"delegated","to":"producer","ep":"EP-2026-0020"}
{"ts":"...","actor":"producer","action":"delegated","to":"writer","stage":"S4","ep":"EP-2026-0020"}
{"ts":"...","actor":"asset-pm","action":"delegated","to":"image-generator","stage":"S6c","ep":"EP-2026-0020"}
```

---

> 운영자가 위 7단계로 GUI에 입력하면 13명 ORG CHART 완성. CEO 추가 → ORG CHART 정의 → 다음 시리즈는 진짜로 CEO가 직접 위임 가능 상태.
