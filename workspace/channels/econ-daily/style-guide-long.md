# Style Guide — econ-daily **Long-form Line** (3min Series)

> **Dual-Line v1.1 (2026-04-22)** — 이 문서는 `format=long-3min` 전용 스타일 가이드입니다.
> Shorts는 [`style-guide-shorts.md`](./style-guide-shorts.md)를 참조하세요.
> 페르소나: [`persona/barro-teacher.md`](./persona/barro-teacher.md) (친근·신뢰 톤)
> 채널 공통 브랜드: [`brand.md`](./brand.md)
> Paperclip format 정의: `paperclip/config/formats.json`의 `long-3min` 항목

---

## Distribution Format
**Primary: YouTube 롱폼 (16:9 가로)** — 시청 지속시간·재방문 최적화.
**보조**: Shorts 파생본 자동 생성 (→ `persona/barro-alert.md` 톤 전환).
**180초 엄수** (±10초). 발행 주기: **주 3편** (화/목 19시, 일 11시).

---

## Video Specifications (Long-form 3min)
- **Resolution**: 1920x1080 (16:9 가로)
- **Frame Rate**: 30fps
- **Total Length**: **180초 엄수** (허용 오차 ±10초 → QA 수용 범위 170~190초)
- **Scene Count**: 7씬 (각 10~40초)
- **Mid-Hook 필수**: 75초 지점에 "재점화 Hook" 1개 삽입 (이탈 방지)
- **Intro Card**: 0~2초 `📚 Barro 경제수업 · [시리즈명] [N/M]`
- **Outro CTA**: 170~180초 "다음 편 예고 + 구독 + 면책"

### 180초 스크립트 분배 가이드 (7씬)
| 씬 | 길이 | 역할 | 가이드 |
|----|------|------|--------|
| 1 | 15s | Hook | 충격 수치 or 역설적 질문. 2~3문장 |
| 2 | 15s | 인트로·리캡 | 인트로 카드 + "지난 편 리캡 → 오늘 주제". EP01은 리캡 생략 |
| 3 | 35s | 정의·맥락 | 핵심 개념 설명. 용어 풀어쓰기. 2~3문장 |
| 4 | 40s | 데이터·증거 | 수치·통계·사례. 여기에 **Mid-Hook** (75초 지점) |
| 5 | 35s | 인사이트 | "그래서 무슨 의미인가". 해석 중심 |
| 6 | 30s | 실전·한국 연결 | 시청자 상황 적용. 3가지 시나리오 권장 |
| 7 | 10s | Wrap + 다음 편 티저 + 면책 | "다음 편: ...", 음성 면책 5초 |

### 문장 설계 제약
- 씬당 2~3문장, **문장당 30~40자** (한국어 TTS 5~7초)
- 숫자는 구어체로: "4.4조 달러" → "사조사천억 달러"
- 영문 약어는 **첫 등장 시 풀어쓰기**: "ETF" → "상장지수펀드, ETF"
- 전체 TTS 분량: 약 900~1,100자 (180초 ÷ 5~6자/초 평균)

---

## Image Generation Style (Long-form — Stick-figure 16:9)

### Style Prefix (모든 이미지 프롬프트 앞에 자동 추가)
```
The BarroTube mascot (IDENTICAL body and face across scenes, only arm pose may vary for scene action): slim 2-head-tall chibi — head-to-body ratio 1:1 (head ~50%, torso+legs ~50%). Round circular head, two small solid black dot eyes placed close together slightly above center, simple curved line mouth (small arc when smiling, short horizontal line when neutral). VERY THIN skinny STRAIGHT VERTICAL stick-like torso — narrow vertical shape, absolutely NO belly, NO rounded bulge, NO chubby curves, torso width less than a third of the head's diameter. BOLD THICK SOLID black straight line arms and legs drawn with pronounced pen-stroke thickness (uniform bold line weight, like marker-pen strokes — NOT thin wire or hair-thin lines) ending in tiny rounded hand and foot tips. NO ears, NO hair, NO eyebrows, NO nose, NO clothing, NO accessories. Thick bold black outlines on the character overall. Scene style: simple cartoon, flat monochrome with strong warm orange (#F4A261) accent on ONE key prop only, cream or dark background with a few bold black-and-white graphic icons (upward arrows, coin stacks, stars). Flat, no gradients, no shading. 16:9 horizontal, subject in upper-center, bottom 15% of frame kept empty and flat.
```

> **BarroTube Mascot DNA v6** (Shorts · Long 완전 동일, 2026-04-24 최종 라인):
> `head : body = 1:1 · slim vertical stick torso (< head diameter/3) · BOLD THICK solid pen-stroke limbs · dot eyes + simple curve mouth (고정) · no ears/hair/clothing`
> → v5 표정 다양화 롤백(단순 dot+curve 복귀), 팔다리를 마커펜 수준 굵은 실선으로.

### Shorts 스타일과의 차이
| 항목 | Shorts | Long-form |
|------|--------|-----------|
| Aspect | 9:16 세로 | **16:9 가로** |
| 캐릭터 표정 | 과장된 충격·긴장 | **친근한 미소·집중** |
| 배경 복잡도 | 단순·집중 | **교육적 요소 허용** (칠판·책·차트) |
| 색조 | 빨강 강조 | **오렌지 강조** |
| 구도 | 중앙 집중 | 좌/우 여백 허용 |

### 금지 요소 (공통)
- 실제 인물 사진 (일러스트만)
- 브랜드 로고/상표 포함
- 텍스트 오버레이 (자막으로 대체)
- 과도한 장식·클러터

---

## Typography

### 자막 (Subtitle) — 가로형
- **Font Family**: Pretendard
- **Font Size**: 42px (Shorts 48px보다 작음 — 16:9 여백)
- **Font Weight**: Bold
- **Color**: #FFFFFF
- **Stroke**: 2px #000000
- **Position**: bottom_center
- **Margin Bottom**: 100px
- **Max Lines**: 2
- **Characters Per Line**: ≤ 25자

### 강조 자막 (Emphasis)
- **Font Size**: 52px
- **Color**: #F4A261 (Warm Orange — barro-teacher 전용 색상)
- **Animation**: fade_in (0.4s, Shorts scale_in보다 부드럽게)

### 인트로 카드
- **Font Family**: Pretendard
- **Font Size**: 64px
- **Font Weight**: ExtraBold
- **Template**: `📚 Barro 경제수업\n{series_name} [{N}/{M}]`
- **Background**: #1E3A5F (Deep Navy) + 오렌지 액센트 라인

### 시리즈 프로그레스 바 (5편 시리즈 전용, 좌측 상단)
```
● ● ○ ○ ○    [3편 중 2편까지 본 상태 시각화]
```
- **Size**: 작은 점 5개, 화면 좌측 상단
- **Completed**: #F4A261 (오렌지)
- **Upcoming**: #A8DADC 투명도 50%

---

## TTS Voice Profile (barro-teacher)
```yaml
provider: elevenlabs
voice_id: "4JJwo477JUAx3HV0T7n7"
voice_name: "Yohan Koo — Encouraging, Clear and Airy"
settings:
  stability: 0.65      # Shorts 0.5 → 0.65 (롱폼은 더 안정적)
  similarity_boost: 0.78
  style: 0.2           # Shorts 0.4 → 0.2 (감정 과장 절제)
  speed: 1.0           # Shorts 1.05 → 1.0 (조금 더 여유)
output_format: "mp3_44100_128"
language: "ko"
```

**음성 면책 (씬 7 마지막 5초)**:
> "본 영상은 투자 조언이 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다."

Shorts는 자막으로만 "투자조언 아님"(2초) 표기하지만, **롱폼은 음성으로 풀 멘트 필수**.

---

## BGM Guidelines (Long-form)

| BGM Mood Tag | 사용 씬 | 볼륨 |
|--------------|---------|------|
| calm_explain | 씬 2, 3, 5 (설명 구간) | 10% (Shorts 12%보다 낮게) |
| hopeful_outro | 씬 7 (마무리) | 15% |
| dramatic_reveal | 씬 4 (Mid-Hook 직후) | 18% |
| neutral_bg | 씬 6 (실전 연결) | 8% |
| tense_intro | 씬 1 Hook에서 제한적 사용 | 15% |

**롱폼 BGM 원칙**:
- 롱폼은 청자가 **집중해서 듣는** 상황 (출퇴근·점심) → BGM 볼륨 Shorts 대비 전반적으로 2~3%p 낮춤
- 씬 전환 시 BGM 페이드 0.8s (Shorts 0.3s보다 부드럽게)
- 면책 낭독 구간 5초는 **BGM 볼륨 50% 감쇠**

---

## Color Coding (차트·인포그래픽)

공통 팔레트 (`brand.md` 기반):
| 의미 | 색상 | Hex |
|------|------|-----|
| 상승/긍정 | 빨간색 | #E63946 |
| 하락/부정 | 파란색 | #457B9D |
| 중립/기준 | 회색 | #A8DADC |
| **강조/핵심 (롱폼 전용 주색)** | **오렌지** | **#F4A261** |
| 배경 | 네이비 | #1E3A5F |

**Shorts와 차별화**: Shorts는 빨강(#E63946) 강조 비중이 큼, Long-form은 **오렌지(#F4A261)** 강조 비중이 큼.

---

## Thumbnail / Cover (Long-form)

- **YouTube Long-form**: 1280x720 또는 1920x1080 정식 썸네일 **별도 생성** (Shorts처럼 자동 추출 안 함)
- **Must Include**:
  - 메인 카피 1개 (2~4단어, 핵심 수치 or 질문)
  - 시리즈 배지 (예: "S&P500 입문 [3/5]")
  - 집중한 표정의 stick figure
- **Font**: Pretendard ExtraBold, **120px+** (가로 썸네일 기준)
- **Color Hierarchy**: 네이비 배경 + 오렌지 메인 카피 + 흰색 서브 + 빨강은 충격 숫자에만 제한 사용

### 시리즈 일관성 장치
한 시리즈(5편)의 썸네일은 **공통 템플릿** 사용:
- 좌측 상단: 시리즈 배지 (고정 위치)
- 중앙: 메인 카피 (편마다 변경)
- 우측 하단: 시리즈 프로그레스 바

이렇게 하면 시청자가 **썸네일만 보고 같은 시리즈의 다른 편임을 인지**.

---

## Series Context Loading (파이프라인 통합)

롱폼 에피소드 S2 단계(Market Research)에서 파이프라인이 다음을 **자동 로드**:
1. `paperclip/config/series.json`에서 `series_id` 기반 메타데이터
2. `workspace/channels/econ-daily/series/{series_id}/curriculum.md`
3. `workspace/channels/econ-daily/series/{series_id}/ep-{N-1}-brief.md` (이전 편 리캡용)

Writer 에이전트는 이 컨텍스트를 받아 **이전 편 리캡 멘트**와 **다음 편 티저**를 자동 포함한 스크립트 생성.

---

## Forbidden Patterns (barro-teacher 가이드)

브랜드 공통 금기 (brand.md) + 롱폼 추가:

### 공포·경고 표현 (Shorts는 OK, Long-form은 ❌)
- "당장"
- "지금 안 하면"
- "놓치면 후회"
- "충격"
- "사라집니다"
- "끝났습니다"
- "~할 수밖에 없습니다" (단정형)

### 권장 대체 표현
| 금지 | 권장 |
|------|------|
| "지금 당장 확인하세요" | "이번 편에서 함께 알아봅니다" |
| "이거 모르면 손해" | "이걸 알면 투자 판단이 달라집니다" |
| "충격 수치" | "눈여겨볼 수치" |
| "사라질 수 있습니다" | "변동할 수 있습니다" |

페르소나 위반 시 `paperclip/config/governance.json`의 `persona_validation` 규칙에 따라 **차단 없이 WARNING 발행** (운영자 결정: warning_only).

---

## 파생 Shorts 전환 규칙

롱폼 발행 +3시간 후 `scripts/automation/derive-shorts.js`가 자동 실행. 톤 리라이팅 공식:

| 원본 (teacher) | 파생 (alert) |
|----------------|-------------|
| "오늘은 ~을 알아봅니다" | "이거 모르면 ~에서 손해봅니다" |
| "눈여겨볼 수치가 있습니다" | "충격 수치 발표" |
| "차근차근 살펴보죠" | "지금 바로 확인하세요" |
| 오렌지 #F4A261 강조 | 빨강 #E63946 강조 |
| calm_explain BGM | tense_intro BGM |
| 음성 면책 5초 | 자막 면책 2초 |

파생은 **새로운 훅만 재작성**하고 이미지·BGM 팔레트는 일부 재활용 (비용 절감).

---

## QA Checklist (발행 전 7개 항목)

1. 총 길이 180±10초 (QA 에이전트 자동)
2. 씬 7개 구성 (S4 스크립트 검증)
3. Mid-Hook 75초 지점 존재 여부
4. 음성 면책 5초 포함
5. 인트로 카드에 시리즈 정보 ([N/M]) 표기
6. 이전 편 리캡 포함 (EP02~ 해당)
7. 다음 편 티저 포함 (시리즈 마지막 편은 다음 시리즈 예고)

5번 이상 충족 불가 시 QA 블록커로 게시 차단 (`governance.json` qa_score 규칙).
