# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.


## Project Overview

OpenAlfredo (OAX) is a local-first prototype for replacing prompt-engineering with ongoing conversation with a persistent agent. It runs against a local Ollama instance and ships a web UI plus an optional Telegram daemon that share one brain. See `OAX_MVP_PLAN.md` for the design intent.

## Repository Layout

This is a two-package repo. Do not conflate them:

- `/` (root) — `oax` CLI wrapper (CommonJS, yargs) that orchestrates the whole stack. See `bin/oax.js`.
- `/oax-web` — the actual application: Next.js 14 App Router + Prisma/SQLite + Ollama. **All real work happens here.** When running npm scripts, assume cwd is `oax-web/` unless stated otherwise.

## Common Commands

All of these run from `oax-web/`:

```bash
npm run dev      # Next.js dev server on :3000
npm run build    # next build
npm run start    # next start (after build)
npm run lint     # next lint (eslint-config-next)
npx vitest       # run all tests (vitest, node environment)
npx vitest run src/lib/memory-retrieval.test.ts   # single test file
npx prisma db push           # sync schema to SQLite
npx prisma generate          # regenerate prisma client after schema edits
```

### `oax` CLI (repo root)

```bash
oax pod              # start full stack: ollama (if down) + next dev + telegram daemon
oax pod stop         # tear down the whole pod (SIGTERM process groups, then SIGKILL sweep)
oax pod status       # show alive/dead state of each pod process
oax pair             # print the current telegram pairing code
oax dashboard        # web UI only (no daemon, no ollama) — legacy convenience
oax completion       # generate zsh/bash completion script
```

```bash
# Pod restart helper (standalone, not under the oax CLI):
node bin/respawn.js              # wait → pod stop → pod start → health-check
node bin/respawn.js --dry-run    # preview without acting
```

`oax pod` streams prefixed logs (`[ollama] [web] [daemon]`) to stdout and mirrors them to `oax-web/data/logs/pod-*.log`. PID state lives at `oax-web/data/.oax-pod.json`. Ctrl-C in the foreground pod triggers the same teardown as `oax pod stop`. Ollama is only started if :11434 isn't already up, and only killed on stop if the pod launched it.

The daemon (`oax-web/daemon.ts`) requires `TELEGRAM_TOKEN` and runs the every-30-min AMBITION scan + hourly RESTLESS heartbeat. It can also be run directly: `cd oax-web && npx tsx daemon.ts`.

## Environment & External Dependencies

- **Ollama must be running locally** for chat to work. Default model is `llama3`; the UI fetches available models via `/api/models`.
- `oax-web/.env` sets `DATABASE_URL="file:./data/oax.db"` (SQLite, relative to `oax-web/`). Prisma config is in `oax-web/prisma.config.ts` and uses dotenv.
- `TELEGRAM_TOKEN` env var toggles the Telegram bot in `daemon.ts` — absence just disables the bot, does not error.

## Architecture

### Unified chat engine

Both surfaces — the web UI *and* the Telegram bot — share one engine (`src/lib/oax-engine.ts`). That engine owns session upsert, 3-layer memory retrieval, system-prompt construction, marker handling, and transcript persistence. There are two entry points:

1. **`processChat(sessionId, userMessage, model)`** — streaming. Used by `src/app/api/chat/route.ts` for the web UI. Streams tokens via `streamText` from the `ai` SDK (`ai-sdk-ollama` provider) and returns a UI message stream consumed by `@ai-sdk/react`'s `useChat` on `src/app/page.tsx`.
2. **`processChatSync(sessionId, userMessage, agentId, model)`** — non-streaming. Used by the Telegram daemon via `src/lib/oax.ts::chatWithAgent`. Calls `generateText` and returns a plain string.

Both entry points upsert a `ChatSession`, persist user + assistant `TranscriptEntry` rows to SQLite, run the same `buildSystemPrompt(context)` and `handleMarkers(sessionId, text)` helpers, and write task / file markers via `appendTask()` and `saveWorkspaceFile()`. Telegram chats use `telegram-<chatId>` as their sessionId so transcripts accumulate per-user.

### 3-layer memory system

`src/lib/memory-retrieval.ts::retrieveContext` assembles context from three layers for each chat turn (both web and Telegram):

1. **SOUL** — `oax-web/data/agents/<agentId>/SOUL.md` (always loaded if present). Written by the onboarding flow (`src/app/api/onboarding/route.ts`) on first run.
2. **Topic files** — `oax-web/data/memory/topics/*.md`, selected by naive keyword match against `oax-web/data/memory/index.json` (tags + title contains query term). Use `saveTopic()` to write both the markdown file and the index entry.
3. **Transcripts** — last 10 `TranscriptEntry` rows from SQLite for the current session (Prisma, newest-10 then reversed).

All retrievals go through `logInfo('context_retrieved', …)` in `src/lib/logger.ts`, which appends JSONL to `oax-web/data/logs/oax-<date>.jsonl`. The UI's "View System Logs" modal (`src/app/page.tsx`) polls `/api/logs` every 3s.

### Tasks + AMBITION

`src/lib/tasks.ts` owns `TASKS.md` at `oax-web/data/TASKS.md`. Tasks support optional `|when:<ISO>` and `|recur:<spec>` suffixes, and the `/api/tasks` route exposes GET/POST/PATCH/DELETE for the UI's task panel. `dueTasks()` returns tasks whose `|when:` falls inside the last 30 minutes — used by the deterministic cron check.

`src/lib/ambition.ts` owns the reflection layer at `oax-web/data/AMBITION.md`. The `/api/ambition` route exposes GET for reading the current brief and POST for regenerating it.

### Telegram + cron daemon (`src/lib/oax.ts`)

Runs out of `daemon.ts` via `tsx`. Delegates all user chat to `processChatSync`, so Telegram chats live in SQLite alongside web chats.

**Pairing mode** — all Telegram handlers are gated behind an allowlist. On first startup, a 6-digit code is generated and persisted at `oax-web/data/.telegram-pairing-code` (printed on every daemon boot). Users pair with `/pair <code>`, which adds their chat id to `oax-web/data/.telegram-allowlist.json`. Unpaired chats only see a pairing prompt — `/start`, `/status`, `/heartbeat`, `/model`, and plain messages are all refused. `/unpair` removes the current chat. Pairing persists across restarts; to rotate the code, delete the pairing-code file.

**Per-chat model selection** — `/model` lists installed Ollama models (from `ollama.list()`, same source as the web UI's `/api/models`). `/model <n|name>` sets the chat's model, persisted to `oax-web/data/.telegram-models.json`. Falls back to `OAX_MODEL` env var (then `llama3`). The same env var is the default for the web `processChat` and the heartbeat's direct `ollama.generate` call.

Owns two cron workers:

- **AMBITION cron** (`*/30 * * * *` default) — `checkCronTasks()` calls `tasks.dueTasks()` deterministically (no LLM) and sends due items to the subscribed Telegram chat.
- **RESTLESS heartbeat** (`0 * * * *` default) — `runHeartbeat()` wakes the agent between user messages. Reads the canonical SOUL (`oax-web/data/agents/default/SOUL.md`) + current AMBITION + current TASKS + last 10 heartbeat log entries, and asks the LLM to emit `[[NOTIFY]]` / `[[TASK]]` / `[[REFLECT]]` / `[[REST]]` tokens. Logs each tick to `oax-web/data/RESTLESS.log.md` (capped at 50 entries). New tasks are appended via the shared `appendTask()`.

**Daemon bot commands** (all paired-gated via `isPaired()` except `/pair`):

| Command | Handler | Notes |
|---|---|---|
| `/pair <code>` | adds chat to allowlist | only cmd an unpaired chat can use |
| `/unpair` | removes chat from allowlist | |
| `/start` | subscribe to proactive alerts | persists `savedChatId` |
| `/status` | prints AMBITION + TASKS | markdown-fenced |
| `/heartbeat` | forces `runHeartbeat()` | shows NOTIFY/TASK/REFLECT tokens |
| `/model` / `/model <n\|name>` | list or switch Ollama model | persists in `.telegram-models.json` |
| `/restart` | calls `triggerPodRestart()` | detached respawn helper + daemon exits |
| `/podStatus` | spawns `oax pod status` | returns per-process state |
| `/podStop` | spawns detached `oax pod stop` | kills this daemon — manual local restart required |

Telegram commands only accept `[A-Za-z0-9_]` and terminate at whitespace or dashes — hence camelCase. All regexes use the `/i` flag so `/podstop` also matches. `bin/keeper.js` exists but is deprecated — the token-collision caveat (one `TELEGRAM_TOKEN`, two `polling: true` clients = 409 conflict) made it unusable. Use the restart flow instead.

### Pod restart flow (`bin/respawn.js` + `src/lib/restart.ts`)

Detached helper that performs a full pod restart: wait N seconds → `oax pod stop` → `oax pod` (detached, stdio to `data/logs/pod-respawn.log`) → poll `http://localhost:3000` for up to M seconds → append outcome to `data/logs/respawn.log`. Two-stage health check (processes alive → web server responding) so it doesn't false-positive on a crashing Next boot.

Invoked from two places:
1. **Manual:** `/restart` Telegram command → `triggerPodRestart()` → spawns respawn detached → daemon exits via `oax pod stop` SIGTERM.
2. **Automatic:** when the engine's `handleMarkers()` detects `[[RESTART_POD]]` in the agent's reply AND at least one `EDIT_FILE`/`WRITE_FILE` succeeded in the same turn. The `anyEditOk` gate prevents restart loops from failed edits.

Flags: `--delay=N` (default 3s, breather before `pod stop`), `--timeout=N` (default 60s, health-check window), `--dry-run`, `--help`.

### Self-modification (`src/lib/self-edit.ts`)

The agent can read and mutate its own source via three markers in its replies. Scoped to `REPO_ROOT` (= `process.cwd() + '/..'` from the oax-web-rooted daemon/engine). Blocked paths: `.git/`, `node_modules/`, `.next/` at any depth; `oax-web/data/` and `data/` as prefixes; `.db`/`.sqlite*` extensions.

| Marker | Shape | Parsed by |
|---|---|---|
| `[[READ_FILE: path]]` | single line | `parseSelfEdits` + `resolveReadMarkers` (1-round reflex on sync path) |
| `[[EDIT_FILE: path]]\n<old>…</old>\n<new>…</new>\n[[/EDIT_FILE]]` | block, old must match exactly once | `applySelfEdit` |
| `[[WRITE_FILE: path]]\n…\n[[/WRITE_FILE]]` | block, full overwrite | `applySelfEdit` |

`buildSystemPrompt` injects a compact repo file index (via `buildCodeIndex()`) so the model knows what files exist without needing to READ first. On the **Telegram path** (`processChatSync`), if the model emits `READ_FILE` in turn 1, `resolveReadMarkers` satisfies them in-process and a second `generateText` call produces the real answer. On the **web streaming path** (`processChat`), there's no reflex loop — READ markers appear stripped in the reply, and the user re-prompts. Applied edits are logged via `logInfo('self_edit_applied' | 'self_edit_failed', …)` and summarized in the visible reply with a restart reminder. Test prompts live in `docs/SELF_MOD_TEST_PROMPTS.md`.

### Prisma / database

Schema: `oax-web/prisma/schema.prisma` — SQLite, two models: `ChatSession` and `TranscriptEntry`. Prisma client is a singleton (`src/lib/db.ts`) to avoid connection exhaustion in Next.js dev hot-reload. The topic index lives in `data/memory/index.json` on disk, not in the DB.

### Session flow (web)

`src/app/page.tsx` generates a fresh `sessionId` (UUID) on mount after confirming `/api/onboarding?agentId=default` reports the SOUL exists. It passes `{sessionId, model}` in the request body via `DefaultChatTransport`. `processChat` auto-creates the `ChatSession` row on first message if it doesn't exist — so client-side UUIDs are trusted.

## Other Notes

- `package.json` at the repo root declares `"type": "commonjs"`; `oax-web/` is an ES module / Next.js project. Don't copy tooling config between them.
- Repo-root `SOUL.md` and `memory/` are leftover stubs from the pre-unification Telegram surface. Nothing reads them anymore — the canonical SOUL is `oax-web/data/agents/default/SOUL.md` and the canonical memory lives in `oax-web/data/memory/`. The heartbeat log now lives at `oax-web/data/RESTLESS.log.md`, with a repo-root `RESTLESS.md` fallback only for legacy installs.
- Runtime state now lives under `oax-web/data/`, including `TASKS.md` and `AMBITION.md`. If you move them, update the single-source-of-truth paths in `src/lib/paths.ts`.
