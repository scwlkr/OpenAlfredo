# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Death of Prompt (DOP) is a local-first prototype for replacing prompt-engineering with ongoing conversation with a persistent agent. It runs against a local Ollama instance and ships a web UI plus an optional Telegram daemon. See `DOP_MVP_PLAN.md` and `DOP_IDEAS_FROM_CODEX.md` for the design intent.

## Repository Layout

This is a two-package repo. Do not conflate them:

- `/` (root) — thin `dop` CLI wrapper (CommonJS, yargs) whose only real command is `dop dashboard`, which `cd`s into `dop-web` and runs `npm run dev`. See `bin/dop.js`.
- `/dop-web` — the actual application: Next.js 14 App Router + Prisma/SQLite + Ollama. **All real work happens here.** When running npm scripts, assume cwd is `dop-web/` unless stated otherwise.

## Common Commands

All of these run from `dop-web/`:

```bash
npm run dev      # Next.js dev server on :3000
npm run build    # next build
npm run start    # next start (after build)
npm run lint     # next lint (eslint-config-next)
npx vitest       # run all tests (vitest, node environment)
npx vitest run src/lib/memory-retrieval.test.ts   # single test file
npx prisma migrate dev       # apply/create migrations against dev.db
npx prisma generate          # regenerate prisma client after schema edits
```

From the repo root you can also launch the UI via `node bin/dop.js dashboard` (spawns `npm run dev` in `dop-web/` and opens the browser).

The optional Telegram + cron daemon is `dop-web/daemon.ts` (run with `npx tsx daemon.ts`). It needs `TELEGRAM_TOKEN` set and a running Ollama; it also schedules the every-30-minute AMBITION.md check.

## Environment & External Dependencies

- **Ollama must be running locally** for chat to work. Default model is `llama3`; the UI fetches available models via `/api/models`.
- `dop-web/.env` sets `DATABASE_URL="file:./data/dop.db"` (SQLite, relative to `dop-web/`). Prisma config is in `dop-web/prisma.config.ts` and uses dotenv.
- `TELEGRAM_TOKEN` env var toggles the Telegram bot in `daemon.ts` — absence just disables the bot, does not error.

## Architecture

### Two parallel chat implementations — be careful which one you touch

There are currently **two** chat code paths that both talk to Ollama. They are not unified yet:

1. **Web chat (primary)** — `dop-web/src/app/api/chat/route.ts` → `src/lib/dop-engine.ts::processChat` → `streamText` from the `ai` SDK with `ai-sdk-ollama`. Persists to SQLite via Prisma (`ChatSession`, `TranscriptEntry`). Returns a UI message stream consumed by `@ai-sdk/react`'s `useChat` on `src/app/page.tsx`.
2. **Telegram / cron chat (legacy, file-backed)** — `dop-web/src/lib/dop.ts::chatWithAgent` uses the `ollama` package directly, reads `SOUL.md`/`AMBITION.md`/`memory/index.md` from the **repo root** (via `path.join(process.cwd(), '..')`), and appends transcripts to `memory/transcripts/*.txt`. It also parses `[[TASK: ...]]` tokens out of replies and appends them to `AMBITION.md`. Only `daemon.ts` uses this path.

When fixing web chat bugs, edit `dop-engine.ts` + `memory-retrieval.ts`. Don't "fix" `dop.ts` to match — it's a separate surface used by the Telegram daemon.

### 3-layer memory system (web path)

`src/lib/memory-retrieval.ts::retrieveContext` assembles context from three layers for each chat turn:

1. **SOUL** — `dop-web/data/agents/<agentId>/SOUL.md` (always loaded if present). Written by the onboarding flow (`src/app/api/onboarding/route.ts`) on first run.
2. **Topic files** — `dop-web/data/memory/topics/*.md`, selected by naive keyword match against `dop-web/data/memory/index.json` (tags + title contains query term). Use `saveTopic()` to write both the markdown file and the index entry.
3. **Transcripts** — last 10 `TranscriptEntry` rows from SQLite for the current session (Prisma, newest-10 then reversed).

All retrievals go through `logInfo('context_retrieved', …)` in `src/lib/logger.ts`, which appends JSONL to `dop-web/data/logs/dop-<date>.jsonl`. The UI's "View System Logs" modal (`src/app/page.tsx`) polls `/api/logs` every 3s.

### Prisma / database

Schema: `dop-web/prisma/schema.prisma` — SQLite, three models: `ChatSession`, `TranscriptEntry`, `MemoryIndexEntry` (currently unused by code; topic index lives in `data/memory/index.json` on disk instead). Prisma client is a singleton (`src/lib/db.ts`) to avoid connection exhaustion in Next.js dev hot-reload.

### Session flow (web)

`src/app/page.tsx` generates a fresh `sessionId` (UUID) on mount after confirming `/api/onboarding?agentId=default` reports the SOUL exists. It passes `{sessionId, model}` in the request body via `DefaultChatTransport`. `processChat` auto-creates the `ChatSession` row on first message if it doesn't exist — so client-side UUIDs are trusted.

## Other Notes

- Agent name/identity, ambitions, and memory index at repo root (`SOUL.md`, `AMBITION.md`, `memory/`) are the **legacy/Telegram** stores. The web path uses `dop-web/data/` instead. These will eventually be unified; until then, know which you're touching.
- `package.json` at the repo root declares `"type": "commonjs"`; `dop-web/` is an ES module / Next.js project. Don't copy tooling config between them.
