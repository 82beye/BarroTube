# YouTube Studio Co. (BarroTube)

## What's Inside

> This is an [Agent Company](https://agentcompanies.io) package from [Paperclip](https://paperclip.ing)

| Content | Count |
|---------|-------|
| Agents | 13 |

### Organization Chart

```
Board (운영자, 인간)
└─ CEO Agent
   ├─ Editorial Dept.
   │  ├─ Producer (PD) ← 메인 오케스트레이터
   │  ├─ Market Researcher
   │  ├─ Strategist
   │  ├─ Writer
   │  └─ Fact Checker
   ├─ Production Dept.
   │  ├─ Asset PM
   │  ├─ Image Generator
   │  ├─ Voice Engineer
   │  └─ CapCut Composer
   ├─ Quality Dept.
   │  └─ QA Reviewer
   └─ Distribution Dept.
      ├─ Metadata Writer
      └─ Publisher
```

### Agents

| Agent | Role | Model | Reports To |
|-------|------|-------|------------|
| CEO | ceo | Opus 4.6 | Board |
| Producer | producer | Opus 4.6 | CEO |
| Market Researcher | researcher | Sonnet 4.6 | Producer |
| Strategist | strategist | Opus 4.6 | Producer |
| Writer | writer | Opus 4.6 | Producer |
| Fact Checker | fact-checker | Sonnet 4.6 | Producer |
| Asset PM | asset-manager | Sonnet 4.6 | Producer |
| Image Generator | image-artist | Haiku 4.5 | Asset PM |
| Voice Engineer | voice-engineer | Haiku 4.5 | Asset PM |
| CapCut Composer | video-composer | Sonnet 4.6 | Producer |
| QA Reviewer | qa-reviewer | Opus 4.6 | Producer |
| Metadata Writer | metadata-writer | Sonnet 4.6 | Producer |
| Publisher | publisher | Haiku 4.5 | Producer |

### Episode Workflow (S0~S11)

S0 Brief → S1 Ticket → S2 Research → S3 Strategy → S4 Script → S5 Factcheck → S6 Assets → S7 CapCut → S8 QA → S9 Metadata → S10 Board Approval → S11 Publish

## Getting Started

```bash
npx paperclipai company import ./paperclip/package --api-base http://127.0.0.1:3100
```

---
Exported from [Paperclip](https://paperclip.ing) — BarroTube YouTube Studio Co.
