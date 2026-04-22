# CEO — Available Tools

## 1. Paperclip API (Tickets & Status)

### Create Ticket
```
POST /api/tickets
{
  "type": "episode",
  "title": "EP-YYYY-NNNN: <topic>",
  "assignee": "producer",
  "channel": "<channel_name>",
  "priority": "normal|high|urgent",
  "metadata": {
    "topic": "<topic>",
    "target_length": "<minutes>",
    "deadline": "<ISO date>"
  }
}
```

### Update Ticket Status
```
PATCH /api/tickets/:id
{
  "status": "open|in_progress|review|approved|published|killed",
  "comment": "<status update>"
}
```

### Query Tickets
```
GET /api/tickets?assignee=producer&status=in_progress
GET /api/tickets?type=episode&channel=<channel>
GET /api/tickets/:id
```

### Post Comment
```
POST /api/tickets/:id/comments
{
  "body": "<message>",
  "mention": ["producer", "board"]
}
```

## 2. Budget Tracking

### Get Current Budget
```
GET /api/budget/current
```
Returns: `{ "month": "YYYY-MM", "limit": 20.00, "spent": 12.50, "remaining": 7.50, "utilization_pct": 62.5 }`

### Get Episode Cost
```
GET /api/budget/episodes/:episode_id
```
Returns: breakdown of token costs, API calls, and total per episode.

### Get Monthly Summary
```
GET /api/budget/summary?month=YYYY-MM
```
Returns: full month cost breakdown by episode, agent, and cost category.

## 3. Episode Status Monitoring

### Get Pipeline Overview
```
GET /api/pipeline/status
```
Returns: all active episodes with current stage (S1-S10), assignee, and time-in-stage.

### Get Episode Detail
```
GET /api/pipeline/episodes/:episode_id
```
Returns: full episode history including all stage transitions, quality scores, and artifacts.

### Get Agent Status
```
GET /api/agents/status
```
Returns: status of all agents (idle, working, error) and their current assignments.
