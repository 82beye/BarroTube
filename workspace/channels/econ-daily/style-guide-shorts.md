# Style Guide — econ-daily **Shorts Line** (60s)

> **Dual-Line v1.1 (2026-04-22)** — 이 문서는 `format=shorts` 전용 스타일 가이드입니다.
> 롱폼 3분 시리즈는 [`style-guide-long.md`](./style-guide-long.md)를 참조하세요.
> 페르소나: [`persona/barro-alert.md`](./persona/barro-alert.md) (경고·긴장 톤)
> 채널 공통 브랜드: [`brand.md`](./brand.md)
> Paperclip format 정의: `paperclip/config/formats.json`의 `shorts` 항목

## Distribution Format
**Primary: Shorts-first 멀티 플랫폼 배포 (YouTube Shorts / TikTok / Instagram Reels)**
**60초 엄수** (±2초). 발행 주기: **매일 1편** (월·수·금·토 신규 + 화·목·일 롱폼 파생본).

## Video Specifications (Shorts 60s)
- **Resolution**: 1080x1920 (9:16 세로)
- **Frame Rate**: 30fps
- **Total Length**: **60초 엄수** (허용 오차 ±2초)
- **Scene Count**: 5씬 (각 10~14초)
- **Hook**: 0~3초 내 시청자 멈춤 장치 (질문/충격 수치/긴장 비주얼)
- **CTA**: 55~60초 구간에 "더 알고 싶으면 팔로우" 류 2초 내 짧게

### 60초 스크립트 분배 가이드
| 씬 | 길이 | 역할 |
|----|------|------|
| 1 | 10s | Hook — 질문/수치로 훅, 170자 이내 |
| 2 | 14s | Context — 핵심 데이터 1개 제시 |
| 3 | 12s | Insight — 그래서 무슨 의미인가 |
| 4 | 14s | Implication — 한국/독자에게 미치는 영향 |
| 5 | 10s | Wrap + CTA — 결론 + 팔로우 유도 |

### 문장 설계 제약
- 씬당 1~2문장, **문장당 25~35자** (한국어 TTS 4~5초)
- 숫자는 구어체로 읽히게: "4.4조 달러" → "사조사천억 달러" 주석
- 영문 약어는 풀어 쓰기 (IMF → 국제통화기금)

## Image Generation Style (Shorts — Stick-figure Cartoon)
### Style Prefix — Framing only (Character DNA는 [`character-dna.md`](./character-dna.md)에서 자동 prepend)

Shorts는 **와이드 앵글 베이스** — 캐릭터 작게, 배경 넉넉. Long은 이 기준에서 살짝 확대만.
아래 ``` 블록이 character-dna.md의 DNA 블록 바로 뒤에 이어붙어 최종 prompt 구성.
```
WIDE-ANGLE framing: the full body of the character is always visible, character positioned slightly upper-center and occupying only about 30-35% of the frame height — plenty of breathing room around and above the character, generous space for background props (small arrows, coin stacks, stars, simple charts). Scene style: simple cartoon, flat monochrome with strong warm orange (#F4A261) accent on ONE key prop only, cream or dark flat background. No gradients, no shading, no photorealism. Absolutely no text, letters, words, or labels anywhere. 9:16 vertical aspect ratio, subject centered, NOT zoomed in — camera pulled back to show the character with lots of surrounding space.
```

> **Mascot DNA v9** (Shorts · Long 완전 동일, 2026-04-24 몸통 직사각형 복귀):
> `head : body = 1:1 · slim RECTANGULAR torso (머리 지름 1/2 폭) · 팔다리 single solid line · dot eyes + simple curve mouth · no brand text`
> → v8 stick-like 몸통 → 명확한 rectangle로 교체. 팔다리는 single solid line 유지.

### 금지 요소
- 실제 인물 사진 (일러스트만 허용)
- 브랜드 로고/상표 포함
- 텍스트 오버레이 (자막으로 대체)
- 과도한 장식/클러터

## Typography
### 자막 (Subtitle)
- **Font Family**: Pretendard
- **Font Size**: 48px
- **Font Weight**: Bold
- **Color**: #FFFFFF
- **Stroke**: 2px #000000
- **Position**: bottom_center
- **Margin Bottom**: 80px
- **Max Lines**: 2
- **Characters Per Line**: ≤ 20자

### 강조 자막 (Emphasis)
- **Font Size**: 56px
- **Color**: #F4A261 (Warm Orange)
- **Animation**: scale_in (0.3s)

### 제목 카드
- **Font Family**: Pretendard
- **Font Size**: 72px
- **Font Weight**: ExtraBold
- **Color**: #FFFFFF

## TTS Voice Profile
```yaml
provider: elevenlabs
voice_id: "4JJwo477JUAx3HV0T7n7"
voice_name: "Yohan Koo - Encouraging, Clear and Airy"
settings:
  stability: 0.5
  similarity_boost: 0.75
  style: 0.3
  speed: 1.05
output_format: "mp3_44100_128"
language: "ko"
```

## BGM Guidelines
- **Mood Mapping**:
  | BGM Mood Tag | 설명 | 볼륨 |
  |-------------|------|------|
  | tense_intro | 긴장감 있는 인트로 | 25% |
  | calm_explain | 차분한 설명 구간 | 12% |
  | dramatic_reveal | 드라마틱한 반전/공개 | 20% |
  | hopeful_outro | 희망적 마무리 | 18% |
  | neutral_bg | 중립적 배경음 | 10% |
  | upbeat_energy | 활기찬 에너지 | 20% |

- **Source**: YouTube Audio Library, Pixabay (CC License)
- **BGM은 절대로 나레이션을 방해하지 않는다**

## Color Coding (차트/인포그래픽)
| 의미 | 색상 | Hex |
|------|------|-----|
| 상승/긍정 | 빨간색 | #E63946 |
| 하락/부정 | 파란색 | #457B9D |
| 중립/기준 | 회색 | #A8DADC |
| 강조/핵심 | 오렌지 | #F4A261 |
| 배경 | 네이비 | #1E3A5F |

## Thumbnail / Cover (Shorts)
- **YouTube Shorts**: Cover 자동 추출 (3번 씬 시작 프레임 권장)
- **TikTok**: 업로드 시 직접 지정 (자동 추출 지양)
- **Reels**: 커버 프레임 1080x1920 또는 1080x1080 정사각
- **Must Include**: 핵심 키워드(2~4단어), 감정 전달 비주얼
- **Font**: Pretendard ExtraBold, 120px+ (썸네일 분리 생성 시)
