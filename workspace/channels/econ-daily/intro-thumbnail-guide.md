# Intro & Thumbnail Strategy Guide

> **인트로 카드 + 썸네일 전략 문서**. 시리즈 운영 시 YouTube 시청 정착률(인트로)과
> 클릭률(썸네일)을 직접 끌어올리는 두 요소를 파이프라인에 편입시키기 위한 단일 진실 원천.
>
> 작성: 2026-04-25, v1.0

---

## 1. 목적과 역할 분리

| 요소 | 시점 | 시청자 동선 | 목적 |
|------|------|-----------|------|
| **썸네일** | 영상 재생 **전** | YouTube 피드·검색·추천에서 **클릭 결정** | CTR 최대화 |
| **인트로 카드** | 영상 시작 0~2초 | 재생 직후 **계속 볼지 이탈할지** | 시리즈 브랜딩 + 정착률 |

두 요소는 **보완적**이지만 **디자인 원칙이 다름**:

- **썸네일**: 스크롤 중 0.5초 안에 판독 → **큰 수치/키워드 텍스트 필수**
- **인트로 카드**: 이미 재생 중 → **시리즈 정체성 각인**, 텍스트는 소량

---

## 2. 공통 원칙 (시리즈 일관성)

두 요소 모두 다음을 준수:

1. **캐릭터 DNA v9 그대로 사용** — 인트로/썸네일용 별도 캐릭터 X
   - `character-dna.md`의 DNA 블록이 prompt 앞에 자동 prepend됨
2. **오렌지 `#F4A261` 주색** 유지
3. **크림 / 네이비 / 다크 배경** 중 용도에 맞게 선택
4. **No 실사 / No 그라데이션** (단 썸네일 강조 글자 그림자/outline 허용)

## 3. 예외: 텍스트 허용

일반 씬 이미지는 **"No text"** 원칙이지만, 인트로·썸네일만 예외 적용:

| 요소 | 텍스트 허용 범위 |
|------|-----------------|
| 인트로 카드 | 시리즈 배지 1줄 (예: `S&P500 입문 1/5`) + 채널 배지 작게 |
| 썸네일 | **큰 키워드 1~3단어** + 작은 시리즈 배지 |

사유: 썸네일은 텍스트가 없으면 기능 불능, 인트로는 브랜드 식별자 필요.

---

## 4. 인트로 카드 스펙

### 4.1. 레이아웃
```
┌──────────────────────────────┐
│                              │
│   [캐릭터]    📚 Barro       │
│              경제수업        │
│              ─────────       │
│              S&P500 입문     │
│              [1/5]           │
│                              │
└──────────────────────────────┘
```

### 4.2. 구성 요소
- **캐릭터**: DNA 마스코트 (손 들기·인사 포즈 권장)
- **배지 블록** (우측 2/3 영역):
  - `📚 Barro 경제수업` (로고 역할, 상단)
  - 구분선 (얇은 오렌지 라인)
  - 시리즈명 `S&P500 입문` (미디엄)
  - 에피소드 번호 `[1/5]` (작게, 오렌지 컬러)
- **배경**: 플랫 크림 (`#FFF8EC`)
- **오렌지 액센트**: 구분선 + 번호 + 캐릭터 주변 작은 별 1~2개

### 4.3. 사양
| 항목 | Shorts | Long |
|------|:---:|:---:|
| 해상도 | 1080×1920 (9:16) | 1920×1080 (16:9) |
| 길이 | 2.0초 (정지 이미지) | 2.0초 (정지 이미지) |
| 오디오 | 무음 (기존 씬 1 narration은 2초 뒤 시작) | 동일 |
| 파일명 | `45_intro.png` | `45_intro.png` |

### 4.4. 생성 방식
`generate-intro.js`가 script frontmatter의 `series_id`·`series_episode`·`series_total` 정보를 읽어 Gemini에 다음 prompt 전달:

```
[character-dna block]

[framing block (shorts or long)]

INTRO CARD SPECIAL: this is a brand intro card, not a regular scene.
Layout: mascot character on the LEFT side (waving or greeting pose).
On the RIGHT side, a clean stacked text block:
  • top line: "📚 Barro 경제수업" (medium weight, black)
  • thin horizontal orange (#F4A261) divider line below it
  • middle line: "{SERIES_NAME}" (slightly larger)
  • bottom line: "[{N}/{M}]" (small, orange color)
Flat cream (#FFF8EC) background. Two small orange stars beside the character.
Text MUST be clearly legible, Korean-friendly sans-serif.
Keep the exact layout minimal and balanced.
```

---

## 5. 썸네일 스펙

### 5.1. 레이아웃 (Long 16:9 기준)
```
┌────────────────────────────────┐
│ S&P500 입문 1/5  (작게, 좌상)  │
│                                │
│   [캐릭터]     워런 버핏       │  ← 큰 키워드
│               90%              │  ← 충격 수치 (오렌지)
│                                │
│  (작게, 하단) 3분이면 충분     │
└────────────────────────────────┘
```

### 5.2. 구성 요소
- **캐릭터**: DNA 마스코트, 포즈는 주제 감정에 맞게 (놀람·환호·가리키기 등)
- **메인 카피**: 1~2단어 키워드 + 숫자 1개 (강렬한 후킹)
  - 워런 버핏 `90%`
  - 100년 `10%`
  - 1500원 환율 `1억`
  - 적립식 vs `일시불`
- **보조 카피**: 시리즈 배지 (좌상단 작게) + 태그라인 (하단 작게)
- **배경 팔레트**: 에피소드 감정에 따라 `scene-backgrounds.md`의 팔레트 재사용
  - bullish navy / bearish black / wealth cream 등

### 5.3. 사양
| 항목 | Shorts 썸네일 | Long 썸네일 |
|------|:---:|:---:|
| 해상도 | 1080×1920 (9:16) | 1280×720 (16:9, YouTube 표준) |
| 파일명 | `47_thumbnail.png` | 동일 |
| 업로드 | YouTube Data API `thumbnails.set` 자동 호출 | 동일 |
| 재업로드 | 썸네일만 교체 가능 (영상 재업로드 불필요) | 동일 |

### 5.4. 텍스트 규칙 (중요)
- **큰 키워드**: Pretendard ExtraBold, 그림자 또는 흰색 outline 필수 (가독성)
- **오렌지 하이라이트**: 숫자/퍼센트에 집중
- **폰트 크기**: 메인 카피는 프레임 높이의 **20% 이상**
- **배경 대비**: 키워드는 항상 배경과 대비되는 색 (네이비 배경 → 흰/오렌지, 크림 → 짙은 네이비/블랙)

### 5.5. 생성 방식
`generate-thumbnail.js`가 script frontmatter + 에피소드 `00_brief.md`의 `topic` + 시리즈 `curriculum.md`에서 핵심 수치 추출 후 Gemini prompt:

```
[character-dna block]

[framing block - but larger character, about 40-50% of frame height]

THUMBNAIL SPECIAL: this is a YouTube thumbnail for {SERIES_NAME} [{N}/{M}].
Main hook: "{MAIN_KEYWORD}" with "{NUMBER}" (the number in bold warm
orange #F4A261, keyword in black, BOTH huge and legible).
Small top-left badge: "{SERIES_SHORT} {N}/{M}" (tiny, clean sans-serif).
Small bottom tagline: "{BRAND_TAGLINE}" (e.g., "3분이면 충분한 경제").
Character posed expressively to match the emotion (surprised for shock,
confident for bullish, thoughtful for complex topics).
Background: use the episode's palette (bullish navy / bearish split /
wealth cream / etc).
Text MUST be extra-large and readable at YouTube feed thumbnail size,
with white outline or drop shadow for contrast.
```

---

## 6. 에피소드별 썸네일 메인 카피 (시리즈 ep-*-brief.md 참조)

파이프라인이 자동 추출하는 수치 우선순위:

| 에피소드 | 메인 키워드 | 메인 숫자 | 감정 → 팔레트 |
|----------|------------|-----------|-------------|
| 1/5 WHAT | 워런 버핏 | **90%** | bullish |
| 2/5 WHY | 100년 | **10%** | bullish |
| 3/5 HOW | 수수료 | **0.03%** | explainer |
| 4/5 RISK | 환율 | **1500원** | bearish |
| 5/5 WHEN | 30년 | **시뮬레이션** | wealth |

## 7. 파이프라인 흐름

```
Script (30_script.md)
   │
   ├─ [NEW] generate-intro.js    → 45_intro.png
   ├─ [NEW] generate-thumbnail.js → 47_thumbnail.png
   ├─ generate-image.js          → 40_assets/images/*.png (기존)
   ├─ generate-tts.js            → 40_assets/tts/*.wav   (기존)
   │
   ├─ render-direct.js [MOD]     → 55_render/video.mp4
   │     (intro.png를 앞 2초 prepend)
   │
   └─ publish-youtube.js [MOD]   → YouTube upload + thumbnails.set
         (메타 업로드 직후 47_thumbnail.png를 API로 교체)
```

## 8. 소급 적용 전략 (기존 5편)

1. **썸네일만 먼저** — YouTube API `thumbnails.set`으로 영상 재업로드 없이 교체 → CTR 즉시 개선
2. **인트로 통합 후 재업로드** — 새 videoId 생성, 구버전 private 유지 or 수동 삭제
3. 5편 모두 단일 pass로 가능 (약 20분)

## 9. 디자인 가드레일

- 인트로 카드는 **5편 시리즈 전편 동일 레이아웃** — 번호 [1/5]~[5/5]만 변경
- 썸네일은 **에피소드별 수치·키워드·팔레트 변주** — 하지만 좌상단 시리즈 배지 + 하단 태그라인은 고정
- 썸네일 메인 카피는 **한국어 2~5글자 + 숫자** 조합 권장 (모바일 피드 기준)
- 한 번 확정된 썸네일/인트로 디자인은 **시리즈 완결 전까지 변경 금지** (시리즈 정체성 유지)

---

> 다음 단계: `generate-intro.js` 및 `generate-thumbnail.js` 구현 → Step 2로 이어감.
