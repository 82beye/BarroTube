# BarroTube Mascot — Character DNA

> **공용 캐릭터 프롬프트**. Shorts와 Long이 동일한 마스코트를 쓰기 위한 단일 진실 원천.
> `generate-image.js` / `generate-image-gemini.js`가 이 파일의 ``` 블록을 자동으로 로드해서
> 각 format의 framing prefix 앞에 붙여 전달.
>
> 수정은 이 파일 한 곳에서만. style-guide-shorts.md · style-guide-long.md는 framing만 담당.

## Character DNA v9 (2026-04-24 확정)

```
The mascot character (IDENTICAL body and face across scenes, only arm pose may vary for scene action): slim 2-head-tall chibi — head-to-body ratio 1:1 (head ~50%, torso+legs ~50%). Round circular head, two small solid black dot eyes placed close together slightly above center, simple curved line mouth (small arc when smiling, short horizontal line when neutral). SLIM vertical RECTANGULAR torso — a clean simple rectangle shape (clearly a rectangular box form, NOT a line, NOT a cylinder, NOT a stick, NOT rounded or oval). Rectangle width is about half of the head's diameter, no belly, no bulge, no chubby curves, straight vertical sides. Arms and legs are drawn as SINGLE solid black lines — each limb is ONE straight solid line with uniform thickness (NOT an outlined or hollow shape, NOT a tube or cylinder, NOT two parallel lines forming a pipe) ending in small rounded tips. NO ears, NO hair, NO eyebrows, NO nose, NO clothing, NO accessories. Bold black head outline.
```

## 버전 이력 요약

| 버전 | 핵심 변화 |
|------|----------|
| v1 (aaf7bf8) | 초기 DNA 블록 (head 40%) |
| v2 (9570f26) | taller slender (head 22-25%, legs 45%) |
| v3 (bd8587a) | balanced (head 30%) |
| v4 (53ebc6d) | 1:1 head:body + chubby 완화 |
| v5 (65df42c) | 극슬림 + 액티브 표정 (롤백됨) |
| v6 (38772de) | 단순 표정 복귀 + pen-stroke 굵은 선 |
| v7 (13ea740) | single-stroke 실선 (튜브 방지) + brand leak fix |
| v8 (36286a7) | "solid line" 용어 단순화 |
| **v9** (f2efe25) | **rectangular torso** 복귀 + single solid line 팔다리 ⭐ |

## 수정 가이드라인

- DNA를 바꾸려면 위 ``` 블록만 수정 후 이미지 재생성
- 앵글·배경·구도 변경은 `style-guide-shorts.md` / `style-guide-long.md`에서
- 새 DNA 버전으로 교체할 때 버전 표 아래에 변경 요약 기록
