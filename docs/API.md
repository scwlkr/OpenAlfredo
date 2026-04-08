# API Reference

All endpoints are served by the Next.js app at `http://localhost:3000`. Requests require a Bearer token (auto-injected by the web UI).

## POST /api/chat

Stream a chat message to Alfredo.

**Body:**
```json
{ "sessionId": "uuid", "model": "llama3" }
```
Plus standard `ai-sdk` message format in the request stream.

**Response:** Server-sent event stream (UI message stream).

## GET /api/onboarding?agentId=default

Check if SOUL.md exists for the agent.

**Response:**
```json
{ "exists": true }
```

## POST /api/onboarding

Create the agent's SOUL.md.

**Body:**
```json
{ "agentId": "default", "persona": "...", "goals": "..." }
```

## GET /api/models

List installed Ollama models.

**Response:**
```json
{ "models": [{ "name": "llama3", "size": 4700000000 }] }
```

## GET /api/tasks

List all tasks from TASKS.md. Add `?due=1` for only currently due tasks.

**Response:**
```json
{
  "tasks": [
    { "text": "buy milk", "done": false, "whenISO": "2026-04-10T09:00:00Z", "recur": null, "raw": "buy milk |when:2026-04-10T09:00:00Z" }
  ]
}
```

## POST /api/tasks

Append a task to TASKS.md.

**Body:**
```json
{ "task": "call Mom |when:2026-04-10T15:00:00Z" }
```

## PATCH /api/tasks

Toggle task completion.

**Body:**
```json
{ "raw": "call Mom |when:2026-04-10T15:00:00Z", "done": true }
```

## DELETE /api/tasks

Remove a task.

**Body:**
```json
{ "raw": "call Mom |when:2026-04-10T15:00:00Z" }
```

## GET /api/ambition

Get the current AMBITION reflection.

**Response:**
```json
{ "reflection": "# AMBITION\n\n_Generated: 2026-04-07T07:00:00Z_\n\nGood morning..." }
```

## POST /api/ambition

Trigger on-demand reflection regeneration (calls LLM).

**Response:**
```json
{ "reflection": "...", "generatedAt": "2026-04-07T12:00:00Z" }
```

## GET /api/workspace?subdir=desk

List files in a workspace subdirectory. Valid subdirs: `desk`, `files`, `generated`.

**Response:**
```json
{
  "files": [
    { "name": "ideas.md", "size": 256, "modified": "2026-04-07T10:00:00Z", "subdir": "desk", "type": "sticky" }
  ]
}
```

## GET /api/workspace?subdir=desk&file=ideas.md

Read a specific workspace file.

**Response:**
```json
{ "name": "ideas.md", "subdir": "desk", "content": "---\ntype: sticky\n---\n\nMy ideas..." }
```

## POST /api/workspace

Create a file or sticky note in the workspace.

**Sticky note:**
```json
{ "sticky": true, "title": "workout ideas", "content": "Try morning runs" }
```

**File:**
```json
{ "subdir": "files", "name": "notes.md", "content": "# My Notes\n..." }
```

## GET /api/settings

Get current system settings (from .env).

**Response:**
```json
{
  "settings": {
    "HEARTBEAT_CRON": "0 * * * *",
    "HEARTBEAT_ACTIVE": "true",
    "REFLECTION_CRON": "0 7 * * *",
    "REFLECTION_ACTIVE": "true",
    "AMBITION_CRON": "*/30 * * * *",
    "OAX_MODEL": "llama3"
  }
}
```

## POST /api/settings

Update system settings. Writes to `.env` file. Requires pod restart to take effect.

**Body:**
```json
{ "settings": { "HEARTBEAT_CRON": "*/15 * * * *", "REFLECTION_ACTIVE": "false" } }
```

## GET /api/logs

Get today's event log entries (newest first).

**Response:**
```json
{
  "logs": [
    { "timestamp": "2026-04-07T10:00:00Z", "level": "INFO", "event": "task_appended", "data": {} }
  ]
}
```

## GET /api/transcripts?q=workout

Search transcript entries by keyword.

**Response:**
```json
{
  "results": [
    { "id": "uuid", "sessionId": "...", "role": "user", "content": "create a workout plan", "createdAt": "..." }
  ]
}
```

## GET /api/auth/key

Get the API key for Bearer auth (localhost only).

**Response:**
```json
{ "key": "hex-string" }
```
