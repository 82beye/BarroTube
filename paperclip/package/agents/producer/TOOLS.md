# Producer (PD) — Available Tools

## 1. Paperclip API (Create & Update Tickets)

### Create Child Ticket (Stage Ticket)
```
POST /api/tickets
{
  "type": "stage",
  "parent_id": "<episode_ticket_id>",
  "stage": "S2|S3|S4|S5|S6|S7|S8|S9",
  "title": "EP-YYYY-NNNN S3: Script Writing",
  "assignee": "<agent_name>",
  "priority": "normal|high|urgent",
  "acceptance_criteria": [
    "Script length: 1200-1500 words",
    "Must include hook, body, CTA",
    "Voice: casual, informative"
  ],
  "inputs": {
    "research_output": "<S2 output path or data>",
    "channel_voice_guide": "<path>",
    "target_length_minutes": 10
  }
}
```

### Update Ticket
```
PATCH /api/tickets/:id
{
  "status": "open|in_progress|review|revision|passed|failed|escalated",
  "comment": "<review feedback or status note>",
  "quality_score": 85,
  "rewrite_count": 1
}
```

### Query Tickets
```
GET /api/tickets?parent_id=<episode_id>&status=review
GET /api/tickets?assignee=<agent>&status=in_progress
GET /api/tickets/:id
GET /api/tickets/:id/history
```

### Post Review Comment
```
POST /api/tickets/:id/comments
{
  "type": "review|feedback|escalation",
  "body": "<detailed feedback>",
  "verdict": "pass|fail|escalate",
  "action_items": [
    "Fix claim in paragraph 3 — source not found",
    "Shorten intro from 23s to under 15s"
  ]
}
```

## 2. File System (Episode Directory)

### Read Episode Files
```
READ $EPISODES_DIR/EP-YYYY-NNNN/
READ $EPISODES_DIR/EP-YYYY-NNNN/s3-script/script.md
READ $EPISODES_DIR/EP-YYYY-NNNN/s4-factcheck/report.json
READ $EPISODES_DIR/EP-YYYY-NNNN/s5-voice/audio-meta.json
READ $EPISODES_DIR/EP-YYYY-NNNN/s9-qa/qa-report.json
```

### Write Episode Files
```
WRITE $EPISODES_DIR/EP-YYYY-NNNN/episode-brief.json
WRITE $EPISODES_DIR/EP-YYYY-NNNN/production-log.md
WRITE $EPISODES_DIR/EP-YYYY-NNNN/completion-report.json
```

### Episode Directory Structure
```
EP-YYYY-NNNN/
├── episode-brief.json       # CEO's original brief
├── production-log.md        # Running log of all stage transitions
├── s2-research/             # Market Researcher output
├── s3-script/               # Writer output
├── s4-factcheck/            # Fact Checker output
├── s5-voice/                # Voice Engineer output
├── s6-images/               # Image Generator output
├── s7-video/                # CapCut Composer output
├── s8-metadata/             # Metadata Writer output
├── s9-qa/                   # QA Reviewer output
└── completion-report.json   # Final report for CEO
```

## 3. Schema Validation

### Validate Stage Output
```
POST /api/validate
{
  "schema": "s3-script|s4-factcheck|s5-voice|s6-images|s7-video|s8-metadata|s9-qa",
  "data": { ... }
}
```
Returns: `{ "valid": true|false, "errors": [...] }`

Use this before accepting any stage output to ensure it conforms to the expected schema. Common schemas:

- **s3-script**: `{ "title", "hook", "body[]", "outro", "cta", "word_count", "estimated_duration_sec" }`
- **s4-factcheck**: `{ "claims[]": { "text", "verdict", "source", "confidence" }, "overall_pass": bool }`
- **s5-voice**: `{ "audio_file", "duration_sec", "voice_id", "sample_rate" }`
- **s6-images**: `{ "scenes[]": { "id", "file", "prompt", "style" }, "thumbnails[]" }`
- **s8-metadata**: `{ "title", "description", "tags[]", "category", "language", "thumbnail" }`
- **s9-qa**: `{ "score": 0-100, "pass": bool, "issues[]": { "stage", "severity", "detail" } }`
