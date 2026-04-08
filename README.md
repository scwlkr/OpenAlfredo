```css
   ___                      _    _  __              _
  / _ \ _ __   ___ _ __    / \  | |/ _|_ __ ___  __| | ___
 | | | | '_ \ / _ \ '_ \  / _ \ | | |_| '__/ _ \/ _` |/ _ \
 | |_| | |_) |  __/ | | |/ ___ \| |  _| | |  __/ (_| | (_) |
  \___/| .__/ \___|_| |_/_/   \_\_|_| |_|  \___|\__,_|\___/
       |_|
```

> Better to serve, than be served...

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node: 20+](https://img.shields.io/badge/Node-20%2B-blue.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

## What is this?

Most AI chat tools forget everything the moment you close the tab. OpenAlfredo is a local-first agent that keeps a persistent identity, a living task list, and a background heartbeat so your conversation, memory, and follow-through survive between sessions. It runs entirely on your machine using [Ollama](https://ollama.com), with a web UI and an optional Telegram daemon that share one brain.

## Quick Start

```bash
# Prerequisites: Node 20+, Ollama running locally
ollama pull llama3
git clone https://github.com/scwlkr/OpenAlfredo.git
cd OpenAlfredo
npm install
cd oax-web && npm install
node bin/bootstrap.js # creates runtime state, .env, database, API key
npm link              # installs `oax` CLI globally (optional)
oax pod               # starts web UI + daemon
# -> open http://localhost:3000
```

## Architecture

OpenAlfredo is a two-package repo: a root CLI wrapper (`bin/oax.js`) and the real application (`oax-web/`), which is a Next.js 14 app backed by Prisma/SQLite and Ollama.

Both the web UI and Telegram bot route through a shared engine (`oax-engine.ts`) that owns session management, 3-layer memory retrieval, system-prompt construction, marker handling, and transcript persistence.

For the full picture see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Features

- **Persistent identity** — SOUL.md gives Alfredo a durable personality across every session
- **3-layer memory** — SOUL + topic files + transcript history, loaded only when relevant
- **Task management** — TASKS.md with scheduling (`|when:`, `|recur:`), managed via UI or chat markers
- **Structured workspace** — desk (sticky notes, ideas), files (user materials), generated (Alfredo's outputs)
- **AMBITION reflection** — daily LLM-generated morning brief synthesizing your trajectory and themes
- **RESTLESS heartbeat** — configurable background loop where Alfredo wakes up, reflects, and acts
- **Golden Goose** — adaptive continuity loop that extracts themes from conversations and autonomously creates follow-up tasks, notes, and documents
- **Dual delivery** — generated artifacts are saved to workspace AND shown inline in chat
- **Self-modification** — Alfredo can read and edit its own source code (sandboxed)
- **Web UI** — chat, model selector, task queue, workspace browser, reflection panel, settings
- **Telegram bot** — pairing, per-chat model selection, proactive alerts, morning briefs
- **CLI** — `oax pod` starts/stops/monitors the full stack
- **Sandbox profiles** — `oax dev start/reset` spins up disposable web-only profiles for onboarding and functionality checks

## Documentation

- [Quick Start](docs/QUICKSTART.md) — get running in 5 minutes
- [DevOps Guide](docs/DEVOPS.md) — bootstrap, sandbox profiles, and local operational workflows
- [Architecture](docs/ARCHITECTURE.md) — system design and data flow
- [API Reference](docs/API.md) — all HTTP endpoints
- [Golden Goose](docs/GOLDEN_GOOSE.md) — adaptive behavior loop
- [CI Debugging Runbook](docs/runbooks/ci-debugging.md) — exact workflow for GitHub Actions, Prisma, and SQLite failures
- [Testing Guide](docs/TESTING.md) — run and write tests
- [Telegram Setup](docs/TELEGRAM_SETUP.md) — wire up the Telegram bot
- [Security](docs/SECURITY.md) — path sandboxing and token storage

## Telegram (Optional)

Wire up a Telegram bot for mobile alerts, remote heartbeats, and on-the-go chat with your agent. See [`docs/TELEGRAM_SETUP.md`](./docs/TELEGRAM_SETUP.md) for the full walkthrough.

## Customization

Your agent's identity lives in `oax-web/data/agents/default/SOUL.md`. On first run, bootstrap copies the template from [`examples/SOUL.example.md`](./examples/SOUL.example.md). Edit your SOUL to set a name, personality, goals, and relationship framing. The agent reads it on every turn.

The task list lives at `oax-web/data/TASKS.md` (template: [`examples/TASKS.example.md`](./examples/TASKS.example.md)). Tasks support `|when:<ISO>` one-off reminders and `|recur:<cron>` recurring schedules. The reflective morning brief lives at `oax-web/data/AMBITION.md` and is regenerated daily by the reflection engine.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for dev setup, branch conventions, and how to propose new markers or memory layers.

## License

MIT &copy; [scwlkr](https://github.com/scwlkr)

## Acknowledgements

- [Ollama](https://ollama.com) — local LLM runtime
- [Vercel AI SDK](https://sdk.vercel.ai) — streaming + model abstraction
- [Next.js](https://nextjs.org) — web framework
- [Prisma](https://www.prisma.io) — database ORM
