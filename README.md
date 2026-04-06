# OpenAlfredo

> Open memory. Ongoing conversation.

OpenAlfredo is a local-first agent workspace for people who are tired of starting from zero every time they open a chat. It keeps a persistent identity, a living task list, and a background heartbeat so conversation, memory, and follow-through stay connected.

## Why This Exists

Most AI chat workflows are still optimized for disposable sessions. You reopen the tool, restate context, rebuild momentum, and lose continuity again the next time you step away.

OpenAlfredo is built around a different model:

- `SOUL.md` keeps the agent's identity stable.
- `AMBITION.md` keeps active work visible.
- `RESTLESS.log.md` lets the agent wake up on a schedule and act deliberately.
- SQLite transcripts and topic files keep memory local and durable.

Everything runs against your local [Ollama](https://ollama.com) instance. Nothing leaves your machine unless you explicitly wire up Telegram.

## Current Shape

| Surface | Status |
|---|---|
| Web chat UI (Next.js + SQLite) | working |
| Shared engine for web + Telegram | working |
| 3-layer memory retrieval | working |
| Onboarding flow | working |
| AMBITION reminder scan | working |
| RESTLESS heartbeat loop | working |
| Live system logs modal | working |

The web UI and Telegram daemon both route through `oax-web/src/lib/oax-engine.ts`, so memory retrieval, task markers, transcript persistence, and restart behavior stay consistent across both surfaces.

## Requirements

- Node.js 20+
- Ollama installed locally
- At least one Ollama model pulled, such as `llama3`
- Optional: a Telegram bot token for phone alerts

```bash
ollama pull llama3
ollama serve
```

## Quick Start

```bash
git clone https://github.com/scwlkr/OpenAlfredo.git
cd OpenAlfredo
npm install
npm link

cd oax-web
npm install
cd ..

oax pod
```

After startup:

- Web UI: `http://localhost:3000`
- Full pod stop: `oax pod stop`
- Pod status: `oax pod status`
- Pairing code: `oax pair`

If you do not want to expose the CLI globally, use `node bin/oax.js <command>` instead.

## Environment

Copy the runtime template:

```bash
cp oax-web/.env.example oax-web/.env
```

Important variables:

- `DATABASE_URL="file:./data/oax.db"`
- `OAX_MODEL="llama3"`
- `TELEGRAM_TOKEN=` to enable the Telegram bot
- `HEARTBEAT_CRON` and `AMBITION_CRON` to tune background cadence

## Core Commands

```bash
oax pod
oax pod stop
oax pod status
oax pair
oax dashboard
oax completion
```

Inside `oax-web/`:

```bash
npm run dev
npm run build
npm run start
npm run lint
npx vitest run
npx prisma generate
npx prisma db push
```

## Telegram

The Telegram daemon is optional, but it is part of the default pod. Once `TELEGRAM_TOKEN` is set:

```bash
oax pod
oax pair
```

Then in Telegram:

```text
/pair <code>
```

Paired chats can:

- inspect current ambitions with `/status`
- force a heartbeat with `/heartbeat`
- switch Ollama models with `/model`
- restart the pod with `/restart`

See [`docs/TELEGRAM_SETUP.md`](./docs/TELEGRAM_SETUP.md) for the full flow.

## Repository Layout

```text
/
|- bin/oax.js        # CLI wrapper
|- oax-web/          # Next.js app, Prisma, daemon, shared engine
|- docs/             # architecture, security, Telegram, rename checklist
|- BRAND.md          # brand system for OpenAlfredo
`- OAX_MVP_PLAN.md   # original MVP direction, renamed to match the new identity
```

## Rename Work

This repository has been fully renamed to the OpenAlfredo identity system.

The canonical mapping is now:

- product name: `OpenAlfredo`
- technical abbreviation: `OAX`
- terminal command: `oax`
- app package directory: `oax-web`

The execution checklist for that migration lives in [`docs/OPENALFREDO_RENAME_CHECKLIST.md`](./docs/OPENALFREDO_RENAME_CHECKLIST.md).

## Docs

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/SECURITY.md`](./docs/SECURITY.md)
- [`docs/TELEGRAM_SETUP.md`](./docs/TELEGRAM_SETUP.md)
- [`docs/SELF_MOD_TEST_PROMPTS.md`](./docs/SELF_MOD_TEST_PROMPTS.md)
- [`BRAND.md`](./BRAND.md)
- [`OAX_MVP_PLAN.md`](./OAX_MVP_PLAN.md)

## License

ISC
