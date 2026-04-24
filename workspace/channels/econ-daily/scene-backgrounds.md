# Scene Background Palette

> 씬의 감정·역할에 따라 배경 톤을 바꾸는 팔레트 라이브러리.
> `generate-image-gemini.js`가 script image_prompt 안의 `[palette:NAME]`
> 토큰을 감지해서 해당 팔레트 블록을 최종 prompt에 추가.
>
> 샘플 벤치마크: BarroTube 과거 성공 이미지 5장 (2026-04-24 확정).
> **캐릭터 DNA는 [`character-dna.md`](./character-dna.md) 그대로 유지**되며,
> 배경·색상·소품만 팔레트에 따라 달라짐.

---

## Palette: bullish (상승·긍정·성공 데이터)

사용 예: Hook(좋은 수치), 성장 데이터 제시, S&P500 역사 수익률

```
Deep indigo navy blue (#1E3A5F) dominant background filling about 70% of the frame. Large bold solid orange (#F4A261) rising bar chart stepping up from left to right as the central element. Multiple thick orange upward-pointing arrows scattered as accent shapes. Subtle large dark-navy silhouette patterns (dollar signs, chart outlines, mascot shadows) blended into the background as low-contrast texture. Orange accent fills about 30% visual weight against the navy base. High-contrast bold line art, flat colors, no gradients, no shading. Confident energetic mood.
```

---

## Palette: bearish (위기·하락·경고·드라마틱 reveal)

사용 예: Hook(위기 수치), 리스크 경고, 드라마틱 데이터 공개

```
Split-tone background: upper 60% deep charcoal black, lower 40% soft off-white, hard split line across middle. One bold red (#E63946) dominant shape as the focal element — either a large upward-rotating arrow or a sharply rising red trend line crossing the split. Monochrome gray secondary elements (small bar charts, stars, sparkle particles in the black upper area). Silver/gray accent on a single prop (rocket, shield, or warning sign). High drama mood — stark contrast, flat colors, no gradients, no photorealism.
```

---

## Palette: explainer (중립 설명·교육·균형)

사용 예: 정의 씬, 개념 설명, 리스크 양면 제시

```
Clean light off-white or very pale cream flat background, thin black line-art clouds scattered at the top, minimal pastel gray accent shapes. One bright accent color per scene (green #4DAA50 for upward, red #E63946 for warning) used on a single key prop. Plenty of empty whitespace. Calm, uncluttered, textbook-clear feel. Bold black line art on all elements, flat monochrome with single accent, no gradients, no shading.
```

---

## Palette: cta (행동 유도·팔로우·구독)

사용 예: Wrap scene, CTA, 시리즈 예고

```
Bright neutral light gray (#F1F1F1) flat background. One bold orange (#F4A261) glow emanating from a key call-to-action element on one side (FOLLOW button, subscribe bell, arrow pointing up). Circular orbit of small dollar signs and upward arrows in black line art flowing around the character. Warm orange halo creating focal attention. Minimal distractions elsewhere. Clean flat illustration, no gradients beyond the single glow effect.
```

---

## Palette: wealth (부·축적·성공 결과)

사용 예: 자산 축적 주제, 재산·부의 성장 스토리

```
Warm cream/beige (#FDF6E9) background. Central large pile of golden-orange coin stacks (mix of warm yellow and orange) taking about 40% of the frame. Scattered subtle gray patterns in the background (small arrows, dollar signs, tiny chart lines) at low opacity. Small stick-figure building icon ("bank") near the bottom as scale reference. Warm friendly tactile illustration mood, flat colors with clear line art, no photorealism.
```

---

## 자동 매핑 가이드 (script image_prompt에서 palette 미지정 시 fallback)

| scene role / 주제 감정 | 기본 palette |
|-----------------------|--------------|
| hook + 긍정/상승 수치 | bullish |
| hook + 위기/충격 수치 | bearish |
| intro/recap, definition, insight | explainer |
| data + 긍정 | bullish |
| data + 위기 | bearish |
| implication + 부/성공 | wealth |
| implication + 행동 변화 | cta |
| wrap + teaser | cta |
| wrap + disclaimer 전용 | explainer |

## 사용 방식 (script image_prompt 안에서)

```
image_prompt: horizontal 16:9, cartoon stick figure holding a large orange pie chart, small coin stack beside. [palette:bullish]
```

→ generate-image-gemini.js가 `[palette:bullish]` 토큰을 감지해서 해당 팔레트 블록을 
   style prefix 뒤에 append한 뒤 Gemini에 전달.
→ 토큰이 없으면 위의 자동 매핑 테이블에 따라 role 기반 fallback 선택.

## 5개 샘플 벤치마크 요약

| 샘플 | 배경 톤 | 주색 | 용도 매핑 |
|------|--------|------|----------|
| (bar chart + 돈자루) | navy | orange | **bullish** |
| (로켓 + 빨간 arrow) | black↑white↓ | red | **bearish** |
| (외줄타기 + 경고) | white | green/red | **explainer** |
| (FOLLOW 버튼) | light gray | orange glow | **cta** |
| (635조 coin pile) | cream | gold+orange | **wealth** |
