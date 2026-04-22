# Asset PM -- Available Tools

## 1. Paperclip API (Ticket Management)

Primary tool for creating and monitoring child tickets.

### Create Child Ticket
```
POST /api/tickets
{
  "parent_id": "TICKET-XXX",
  "assignee": "image-generator" | "voice-engineer",
  "type": "asset-generation",
  "payload": { ... }
}
```

### Query Tickets
```
GET /api/tickets?parent={parent_id}
GET /api/tickets?assignee=asset-pm&status=open
```

### Update Ticket Status
```
PATCH /api/tickets/{ticket_id}
{
  "status": "complete" | "blocked" | "failed",
  "comment": "..."
}
```

## 2. File System (Read/Write)

### Read Operations
- Read script: `workspace/episodes/{episode_id}/30_script.md`
- Read style guide: `workspace/channels/{channel_id}/style-guide.md`
- Check file existence and metadata in `40_assets/` directory tree

### Write Operations
- Write manifest: `workspace/episodes/{episode_id}/40_assets/asset_manifest.json`
- Write tracking state to `$AGENT_HOME/memory/`

### Directory Structure (Output)
```
workspace/episodes/{episode_id}/40_assets/
  images/
    scene_001.png
    scene_002.png
    ...
  tts/
    scene_001.wav
    scene_002.wav
    ...
  bgm/
    selected.mp3
  asset_manifest.json
```

## Tool Boundaries
- You do NOT have access to image generation APIs (delegate to Image Generator).
- You do NOT have access to TTS APIs (delegate to Voice Engineer).
- You do NOT have access to publishing or upload APIs.
