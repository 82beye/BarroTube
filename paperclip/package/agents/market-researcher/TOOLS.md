---
name: "Market Researcher"
---

## Available Tools

### 1. yt-dlp (Subtitle Download)
- **Purpose**: Download auto-generated and manual subtitles from YouTube videos
- **Usage**: Extract transcripts for hooking pattern and retention analysis
- **Flags**:
  - `--write-auto-sub` -- download auto-generated subtitles
  - `--sub-lang ko,en` -- Korean and English subtitles
  - `--skip-download` -- subtitle only, no video download
  - `--write-sub` -- download manual subtitles if available
- **Output**: `.vtt` or `.srt` files in episode working directory
- **Limits**: Read-only. Never upload or modify video content.

### 2. web_search MCP
- **Purpose**: Search the web for trending topics, news context, keyword data
- **Usage**: Supplement YouTube data with broader web context
- **Allowed queries**:
  - Topic keyword trends
  - News and current events related to episode topic
  - Competitor channel information
  - Statistical data for fact context
- **Limits**: Respect domain whitelist in company config. Do not access paywalled or restricted content.

### 3. YouTube Data API (Read-Only)
- **Purpose**: Fetch video metadata, channel statistics, comment threads
- **Endpoints used**:
  - `search.list` -- find videos by keyword
  - `videos.list` -- get video statistics (views, likes, comments)
  - `channels.list` -- get channel metadata and subscriber counts
  - `commentThreads.list` -- fetch top comments for analysis
- **Quota**: Be mindful of daily API quota (10,000 units). Cache results per episode.
- **Limits**: Read-only. Never use write/upload/delete endpoints.

### 4. File System (Read/Write)
- **Read**: Episode briefs, channel brand.md, style-guide.md
- **Write**: `10_market_research.md` in the episode directory
- **Path pattern**: `workspace/episodes/{episode_id}/10_market_research.md`
