---
name: "Publisher"
trigger: "on_assignment"
---

## Execution Checklist

Run this checklist every time you are assigned a publish task.

### Step 1 — Check Assignments
- [ ] Read the Producer's ticket / publish request
- [ ] Confirm episode_id and channel_id
- [ ] Confirm this is a publish task (not a draft or test)

### Step 2 — Verify Board Approval Token (MANDATORY FIRST)
- [ ] Check that Board approval token exists for this episode_id
- [ ] Validate token is for the correct episode_id (no cross-episode tokens)
- [ ] Validate token has not expired
- [ ] If token is MISSING → **STOP. Report to Producer: "No Board approval token found."**
- [ ] If token is INVALID → **STOP. Report to Producer: "Board approval token invalid."**
- [ ] If token is EXPIRED → **STOP. Report to Producer: "Board approval token expired."**
- [ ] If bypass attempt detected → **REJECT. Alert Board immediately. Log incident.**

### Step 3 — Load Metadata
- [ ] Read `workspace/episodes/{episode_id}/70_publish_meta.json`
- [ ] Verify all required fields are present:
  - [ ] Title (Producer-approved selection from candidates)
  - [ ] Description (with chapters)
  - [ ] Tags
  - [ ] Visibility
  - [ ] publish_at (if scheduled)
- [ ] If metadata is incomplete → **STOP. Report to Producer.**

### Step 4 — Load OAuth Token from Keychain
- [ ] Retrieve channel-specific OAuth token from macOS Keychain
- [ ] Verify token has `youtube.upload` scope
- [ ] If token is expired → attempt Keychain refresh
- [ ] If refresh fails → **STOP. Report to Producer for manual token renewal.**
- [ ] **NEVER log the token value anywhere.**

### Step 5 — Execute Upload via YouTube Data API v3
- [ ] Call `videos.insert` with:
  - `snippet.title` — approved title
  - `snippet.description` — full description with chapters and hashtags
  - `snippet.tags` — tag array
  - `snippet.categoryId` — appropriate category
  - `status.privacyStatus` — from visibility field
  - `status.publishAt` — if scheduled publication
- [ ] Upload video file from `workspace/episodes/{episode_id}/assets/final/`
- [ ] On success → proceed to Step 6
- [ ] On failure → retry once with exponential backoff
- [ ] On second failure → **STOP. Report to Board for manual upload.**

### Step 6 — Set Thumbnail
- [ ] Upload thumbnail via `thumbnails.set` using the video ID from Step 5
- [ ] Use `workspace/episodes/{episode_id}/assets/images/thumbnail.png`
- [ ] If thumbnail upload fails → report as WARNING (video is still uploaded)

### Step 7 — Report Result
- [ ] If SUCCESS:
  - [ ] Report YouTube video URL to Producer and CEO
  - [ ] Report video ID and upload timestamp
  - [ ] Confirm metadata was applied correctly
  - [ ] Confirm publish schedule (if scheduled)
- [ ] If PARTIAL SUCCESS (video uploaded, metadata/thumbnail issue):
  - [ ] Report YouTube video URL
  - [ ] Report what succeeded and what failed
  - [ ] Flag for manual metadata correction
- [ ] If FAILURE:
  - [ ] Report error details (without exposing credentials)
  - [ ] Recommend manual upload to Board
  - [ ] Provide manual upload instructions with metadata summary

### Step 8 — Clean Exit
- [ ] Post status: `COMPLETE` (success), `PARTIAL` (partial success), or `FAILED`
- [ ] Ensure no credentials remain in memory or logs
- [ ] Update episode ticket with upload result
