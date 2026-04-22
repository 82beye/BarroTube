---
name: "Metadata Writer"
---

# Metadata Writer — Tools

## Primary
- Claude Code agent (룰 기반 작성) → `70_publish_meta.json`

## SEO Automation
- `scripts/automation/seo-enhance.js` — 키워드 3-layer 자동 보강
  - Primary keyword 추출 (title 분석 + emphasis_tokens)
  - Secondary keywords (script emphasis tokens)
  - Long-tail keywords (템플릿 조합)
  - Related search terms (채널 lexicon 기반)
  - Tags 18~25개 조립 (YouTube 500자 제한 준수)
  - Description SEO 구조 재작성 (첫 100자 키워드 + 해시태그 블록)

## Execution
```bash
node scripts/automation/seo-enhance.js \
  --episode workspace/episodes/EP-YYYY-NNNN \
  --channel econ-daily
```

## Channel Lexicon
`seo-enhance.js` 내부 `CHANNEL_LEXICON`에 주제별 연관어 사전 유지:
- econ-daily: finance domain (코스피, AI 반도체, 2차전지, 바이오, 원화, 금리, 부동산, AI)

## Auto-Integration
- `run-episode.js` S11 단계에서 `seo` 필드 누락 시 **자동 실행**
- 기존 메타 override 안 함 (description이 200자 이하일 때만 재구성)

## Input
- `30_script.md` (emphasis_tokens, narration)
- 기존 `70_publish_meta.json` (선택, title 추출)
- 채널 lexicon (스크립트 내장)

## Output
- `70_publish_meta.json` — seo, tags, description 업데이트

## Budget
Monthly: $3 (LLM 호출 거의 없음, 룰 기반)
