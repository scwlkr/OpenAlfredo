```
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
npm install           # runs bootstrap automatically
cd oax-web && npm install
npm link              # installs `oax` CLI globally (optional)
oax pod               # starts web UI + daemon
# -> open http://localhost:3000
```

## Architecture

OpenAlfredo is a two-package repo: a root CLI wrapper (`bin/oax.js`) and the real application (`oax-web/`), which is a Next.js 14 app backed by Prisma/SQLite and Ollama.

Both the web UI and Telegram bot route through a shared engine (`oax-engine.ts`) that owns session management, 3-layer memory retrieval, system-prompt construction, marker handling, and transcript persistence.

For the full picture see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Telegram (Optional)

Wire up a Telegram bot for mobile alerts, remote heartbeats, and on-the-go chat with your agent. See [`docs/TELEGRAM_SETUP.md`](./docs/TELEGRAM_SETUP.md) for the full walkthrough.

## Customization

Your agent's identity lives in `oax-web/data/agents/default/SOUL.md`. On first run, bootstrap copies the template from [`examples/SOUL.example.md`](./examples/SOUL.example.md). Edit your SOUL to set a name, personality, goals, and relationship framing. The agent reads it on every turn.

The task list lives at `oax-web/data/AMBITION.md` (template: [`examples/AMBITION.example.md`](./examples/AMBITION.example.md)). Tasks support `|when:<ISO>` one-off reminders and `|recur:<cron>` recurring schedules.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for dev setup, branch conventions, and how to propose new markers or memory layers.

## License

MIT &copy; [scwlkr](https://github.com/scwlkr)

## Acknowledgements

- [Ollama](https://ollama.com) — local LLM runtime
- [Vercel AI SDK](https://sdk.vercel.ai) — streaming + model abstraction
- [Next.js](https://nextjs.org) — web framework
- [Prisma](https://www.prisma.io) — database ORM
