# Paperclip Config — Dual-Line 운영 (v1.1)

> 2026-04-22: `econ-daily` 채널에 **Shorts + Long-form 3분 시리즈** 듀얼 라인 도입.
> 기존 단일 Shorts 파이프라인에 시리즈·페르소나·파생 포맷 개념을 추가한 구성 확장 문서.

---

## 변경 요약

| 파일 | 상태 | 변경 내용 |
|------|------|----------|
| `series.json` | **신규** | 시리즈 정의 (`sp500-basic` 등록). curriculum.md 경로·KPI·cadence 포함 |
| `personas.json` | **신규** | `barro-teacher`(롱폼) / `barro-alert`(Shorts) 이중 페르소나. 위반 시 WARNING only |
| `formats.json` | **신규** | `shorts`(60s) / `long-3min`(180s) + 파생 정책 + 채널 스케줄 매핑 |
| `governance.json` | v1.0 → **v1.1** | `batch_approval_allowed`, `S12_derive_shorts`, `persona_validation(warning)`, `series_rules`, `format_rules` 추가 |
| `budget-policy.json` | v1.0 → **v1.1** | `format_profiles`, `derivation_policy`, `channel_budget_summary` 추가 |
| `company.json` | 변경 없음 | 단, `defaults.target_video_length_seconds=480`은 format에서 override됨 |

---

## 운영자 결정 사항 (Decision Log)

2026-04-22 Board 결정:

1. **7-1. Paperclip 설치**: 완료 (이전 메모리의 "미설치" 기록은 outdated — 메모리 업데이트됨)
2. **7-2. 승인 정책**: **매번 개별 승인** 유지. 단 **batch approval 허용** — 여러 에피소드를 체크리스트로 확인 후 한 번의 액션으로 일괄 승인 가능. 자동 통과 아님.
3. **7-3. Persona 충돌 검증**: **WARNING only** — forbidden_patterns 매칭 시 차단하지 않고 경고만 발행. Producer가 최종 판단.

---

## 핵심 개념

### 1. Dual-Line (이중 라인)
단일 채널 `econ-daily` 안에서 **두 개의 독립적인 발행 흐름**:
```
📱 Shorts Line  — 매일 발행 (월·수·금·토 신규 + 화·목·일 파생)
🎬 Long-form Line — 주 3회 (화/목/일 19시)
```
시청자 입장에선 같은 채널의 "두 코너" — 인트로 카드(`📚 Barro 경제수업` / `🚨 BarroAlert`)로 구분.

### 2. Series (시리즈)
롱폼은 **5편 단위 시리즈**로 발행. 시청자 여정 `WHAT → WHY → HOW → RISK → WHEN` 학습 아크 내장.
첫 시리즈: `sp500-basic` (S&P500 입문 5편).

### 3. Persona (페르소나)
```
barro-teacher → Long-form  → 친근·신뢰, 오렌지 #F4A261, calm BGM
barro-alert   → Shorts     → 경고·긴장, 빨강 #E63946, tense BGM
```
validation_mode = **warning_only** — 금기 표현 감지해도 차단 안 함, 경고 로그만.

### 4. Derivation (파생)
롱폼 1편 발행 +3시간 → 파생 Shorts 1편 **자동 생성**. 톤 리라이트(teacher→alert), 자산 재활용으로 비용 약 83% 절감 (편당 9달러 → 1.5달러).

---

## 파이프라인 흐름 (S0~S12)

```
S0 Brief → S1 Ticket
              ├─ format 분기
              │
              ├─[shorts]     S4(5씬·60s) → S5 → S6(5장) → S7 → S8(60±2s)
              │              → S9(#Shorts) → S10 Board → S11 Publish
              │              (S2·S3 skip)
              │
              └─[long-3min]  S2(series ctx) → S3 → S4(7씬·180s·teacher)
                             → S5(엄격) → S6(7장) → S7 → S8(180±10s)
                             → S9 → S10 Board(일괄승인 가능) → S11 Publish
                             ↓
                             S12 Derive Shorts (auto, +3h)
                             → parent_ticket 상속, persona: alert 전환
                             → 별도 티켓 생성 → shorts 파이프라인 재진입 (S4~S11)
```

---

## 적용 체크리스트 (Apply Checklist)

새 config를 실제로 적용하려면:

- [ ] **1. 파이프라인 코드 수정** (별도 작업 — 2번/3번 단계에서 처리 예정)
  - [ ] `scripts/automation/generate-script.js` — `format`에 따라 프롬프트 분기
  - [ ] `scripts/automation/generate-qa-report.js` — duration target 분기
  - [ ] `scripts/automation/create-series.js` **신규** — series.json 읽어 에피소드 일괄 생성
  - [ ] `scripts/automation/derive-shorts.js` **신규** — 파생 Shorts 생성기
- [ ] **2. 채널 스타일 가이드 분리** (상세 설계 2번 단계)
  - [ ] `workspace/channels/econ-daily/style-guide.md` → `style-guide-shorts.md` 이름 변경
  - [ ] `workspace/channels/econ-daily/style-guide-long.md` 신규
- [ ] **3. 시리즈 브리프 등록** ✅ 완료 (상세 설계 1번 단계에서 처리됨)
  - [x] `workspace/channels/econ-daily/series/sp500-basic/curriculum.md`
  - [x] `workspace/channels/econ-daily/series/sp500-basic/ep-01~05-brief.md`
- [ ] **4. 첫 실행 dry-run**
  - [ ] `node scripts/automation/create-series.js --series sp500-basic --dry-run`
  - [ ] 생성될 에피소드 ID 확인, budget 추정치 확인
- [ ] **5. Board 첫 승인** (sp500-basic 5편 일괄)
  - [ ] batch_approval_allowed=true 활용 → 5편 체크리스트 확인 후 한 번에 승인

---

## Paperclip 참조 매트릭스

| 상황 | 참조할 파일 |
|------|------------|
| 새 시리즈 기획 | `series.json` → 시리즈 등록, `personas.json` → 페르소나 선택 |
| 에피소드 생성 시 포맷 결정 | `formats.json` |
| 승인 게이트 실행 | `governance.json` → approval_gates |
| 비용 예측·한도 확인 | `budget-policy.json` → format_profiles, derivation_policy |
| 페르소나 위반 경고 처리 | `governance.json` → persona_validation |
| 파생 Shorts 자동 생성 | `governance.json` → S12_derive_shorts, `formats.json` → derivation_policy |
| 시리즈 완주율 모니터링 | `series.json` → kpi |

---

## 마이그레이션 노트 (기존 → v1.1)

기존 `workspace/channels/econ-daily/` 디렉토리의 에피소드(EP-2026-0001~0009)는:
- 모두 **format=shorts, persona=barro-alert** 로 소급 태깅 (파이프라인 자동 또는 수동 마이그레이션)
- 이미 발행된 Shorts는 재처리 없이 메타만 추가

기존 `style-guide.md`는 v1.1 적용 시 `style-guide-shorts.md`로 이름 변경만. 내용 변경 없음.

---

## 롤백 가이드

문제 발생 시 v1.0으로 롤백:
```bash
git log --oneline paperclip/config/governance.json | head -5
git checkout <v1.0 commit> -- paperclip/config/{governance,budget-policy}.json
rm paperclip/config/{series,personas,formats}.json
rm paperclip/config/README-dual-line.md
```
신규 3개 파일(series/personas/formats)은 참조 없이는 무시되므로 삭제만으로도 효과적 롤백.

---

## 다음 문서

- 채널 스타일 가이드: `workspace/channels/econ-daily/style-guide-long.md` (작성 예정)
- 페르소나 상세: `workspace/channels/econ-daily/persona/barro-teacher.md`, `barro-alert.md` (작성 예정)
- 파이프라인 코드: `scripts/automation/create-series.js`, `derive-shorts.js` (작성 예정)
