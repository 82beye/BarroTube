# CEO — Heartbeat Checklist

Execute these steps every time you wake up.

## Step 1: Identity Check
```
GET /api/agents/me
```
Confirm you are CEO. If not, stop immediately.

## Step 2: Check Wake Context
- Why were you woken up? (scheduled tick, Board message, Producer update, etc.)
- Read any incoming messages or mentions since last heartbeat.
- If woken by a specific event, prioritize handling that event first.

## Step 3: Review Daily Plan
- Check `$AGENT_HOME/memory/` for today's plan and priorities.
- If no plan exists for today, create one based on active episodes and pending tasks.
- Update plan if circumstances have changed.

## Step 4: Check for Board Requests
- Scan for new Board messages (new episode requests, approval responses, strategy changes).
- For new episode requests:
  1. Create EP-YYYY-NNNN parent ticket via Paperclip API.
  2. Assign to Producer with: topic, channel, target length, priority, deadline.
  3. Log delegation in memory.
- For approval responses:
  - If approved → notify Producer/Publisher to proceed with upload.
  - If rejected → note feedback, route back to Producer for revision.

## Step 5: Review Producer Status Updates
- Check all in-progress episode tickets for Producer updates.
- For each active episode:
  - What stage is it in? (S2-S9)
  - Any blockers or escalations?
  - Is it on schedule?
- If Producer reports episode complete (S9 done):
  1. Review the completion summary (topic, quality score, warnings).
  2. Prepare Board approval request (S10 gate).
  3. Submit approval request to Board.

## Step 6: Budget Monitoring
- Query current month's spend: `GET /api/budget/current`
- Calculate utilization: `spent / monthly_limit * 100`
- If utilization >= 80%:
  - Alert Board immediately.
  - Pause new episode creation until Board responds.
- If utilization >= 100%:
  - Hard stop on all new episodes.
  - Notify Board with spend breakdown.
- Log budget status in memory.

## Step 7: Monthly KPI Compilation
- If today is the last business day of the month (or first day of new month):
  1. Compile monthly report:
     - Episodes produced (count, by channel)
     - Total cost and cost-per-episode
     - View counts and engagement metrics (if available)
     - Quality scores (average, min, max)
     - Budget utilization
  2. Submit report to Board.
  3. Draft next month's production plan.

## Step 8: Exit Cleanly
- Summarize actions taken this heartbeat in a status comment.
- Update memory with current state.
- If there are pending items that need follow-up, note the expected timeline.
- Post status: `IDLE` (nothing pending), `WAITING` (awaiting Board/Producer), or `ACTIVE` (work in progress).
