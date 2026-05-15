# API

OpenAlfredo's HTTP API is served by the local Next.js app at `http://localhost:3000`. The web UI injects the local Bearer token automatically.

The current API is intended for the local web UI, not as a public network API.

## Authentication

The local API key is stored at `oax-web/data/.oax-api-key`. The browser can fetch it from `/api/auth/key` on localhost.

## Chat

### `POST /api/chat`

Streams a chat response through the shared engine.

Body:

```json
{
  "sessionId": "uuid",
  "model": "llama3",
  "messages": [{ "role": "user", "content": "hello" }]
}
```

The route also accepts a plain `text` or `content` field. The response is a UI message stream.

## Onboarding

### `GET /api/onboarding?agentId=default`

Checks whether the agent SOUL exists.

```json
{ "exists": true }
```

### `POST /api/onboarding`

Creates `oax-web/data/agents/<agentId>/SOUL.md`.

```json
{
  "agentId": "default",
  "persona": "...",
  "goals": "..."
}
```

## Models

### `GET /api/models`

Lists installed Ollama models.

```json
{
  "models": [{ "name": "llama3", "size": 4700000000 }]
}
```

## Tasks

### `GET /api/tasks`

Lists tasks from `oax-web/data/TASKS.md`. Add `?due=1` to return only currently due tasks.

```json
{
  "tasks": [
    {
      "text": "call Mom",
      "done": false,
      "whenISO": "2026-04-10T15:00:00Z",
      "recur": null,
      "raw": "call Mom |when:2026-04-10T15:00:00Z"
    }
  ]
}
```

### `POST /api/tasks`

Appends a task.

```json
{ "task": "call Mom |when:2026-04-10T15:00:00Z" }
```

### `PATCH /api/tasks`

Toggles task completion.

```json
{ "raw": "call Mom |when:2026-04-10T15:00:00Z", "done": true }
```

### `DELETE /api/tasks`

Removes a task.

```json
{ "raw": "call Mom |when:2026-04-10T15:00:00Z" }
```

## AMBITION

### `GET /api/ambition`

Returns the current reflection.

```json
{ "reflection": "# AMBITION\n\n_No reflection yet._" }
```

### `POST /api/ambition`

Regenerates the reflection through the model.

```json
{ "reflection": "...", "generatedAt": "2026-04-07T12:00:00Z" }
```

## Workspace

### `GET /api/workspace?subdir=desk`

Lists files in `desk`, `files`, or `generated`.

### `GET /api/workspace?subdir=desk&file=ideas.md`

Reads one workspace file.

### `POST /api/workspace`

Creates a sticky note or workspace file.

Sticky note:

```json
{ "sticky": true, "title": "workout ideas", "content": "Try morning runs" }
```

File:

```json
{ "subdir": "files", "name": "notes.md", "content": "# My Notes\n..." }
```

## Settings

### `GET /api/settings`

Returns sanitized runtime settings plus any ignored invalid values.

```json
{
  "settings": {
    "HEARTBEAT_CRON": "0 * * * *",
    "HEARTBEAT_ACTIVE": "true",
    "AMBITION_CRON": "*/30 * * * *",
    "REFLECTION_CRON": "0 7 * * *",
    "REFLECTION_ACTIVE": "true",
    "CONTINUITY_CRON": "0 10,16 * * *",
    "CONTINUITY_ACTIVE": "true",
    "OAX_MODEL": "llama3"
  },
  "issues": []
}
```

### `POST /api/settings`

Validates and writes selected settings to the active runtime `.env` file. A pod restart is required before daemon schedule changes take effect.

```json
{ "settings": { "HEARTBEAT_CRON": "*/15 * * * *" } }
```

Invalid settings return `400` with `SETTINGS_VALIDATION_FAILED`.

## Logs

### `GET /api/logs`

Returns today's app event log entries, newest first.

## Transcripts

### `GET /api/transcripts?q=workout`

Searches transcript entries by keyword.

## Local API key

### `GET /api/auth/key`

Returns the localhost API key used by the web UI.

```json
{ "key": "hex-string" }
```
