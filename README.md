# OpenAlfredo

Local-first personal agent workspace with persistent identity, memory, tasks, a web UI, optional Telegram chat, and background follow-through.

[Documentation](docs/README.md) · [Setup](docs/setup.md) · [Architecture](docs/architecture.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Node: 20+](https://img.shields.io/badge/Node-20%2B-blue.svg)](https://nodejs.org/)

## Overview

OpenAlfredo turns one-off AI chats into an ongoing local relationship with an agent named Alfredo. It runs on your machine, uses Ollama for model access, stores state in local SQLite and Markdown files, and keeps the web UI and Telegram bot aligned through one shared chat engine.

The repository has two packages:

- Root package: the `oax` CLI wrapper in `bin/oax.js`.
- `oax-web/`: the Next.js 16 application, Prisma/SQLite runtime, Ollama integration, and Telegram daemon.

## Quick start

Prerequisites: Node.js 20+, npm, Ollama, and at least one pulled Ollama model.

```bash
ollama pull llama3
git clone https://github.com/scwlkr/OpenAlfredo.git
cd OpenAlfredo
npm install
cd oax-web && npm install && cd ..
node bin/bootstrap.js
node bin/oax.js pod
```

Open `http://localhost:3000`.

If you want the shorter `oax pod` command, run `npm link` once from the repo root.

## Documentation

Start with the [documentation map](docs/README.md). The main path is:

- [Setup](docs/setup.md) - install, bootstrap, and first run.
- [Architecture](docs/architecture.md) - components, data flow, and design decisions.
- [Operations](docs/operations.md) - pod control, sandbox profiles, logs, and database scripts.
- [API](docs/api.md) - local HTTP endpoints.
- [Testing](docs/testing.md) - test commands and conventions.
- [Telegram](docs/telegram.md) - optional Telegram pairing and commands.
- [Security](docs/security.md) - local security model and secret locations.

## Features

- Persistent agent identity through `oax-web/data/agents/default/SOUL.md`.
- Three-layer memory retrieval: SOUL, topic files, and recent transcripts.
- Local task queue in `oax-web/data/TASKS.md`.
- Workspace folders for desk notes, user files, and generated artifacts.
- AMBITION reflections for daily trajectory summaries.
- RESTLESS heartbeat for scheduled background checks and notifications.
- Continuity loop, also called Golden Goose, for theme-based follow-up artifacts.
- Web UI for chat, model selection, tasks, workspace browsing, settings, logs, and reflections.
- Optional Telegram daemon with pairing, model switching, proactive alerts, and pod controls.
- Sandboxed self-modification markers for controlled source reads and edits.
- Sandbox profiles for disposable onboarding and returning-user checks.

## Development

Most development commands run from `oax-web/`:

```bash
cd oax-web
npm run dev
npm run lint
npm test
npm run build
```

Root shortcuts:

```bash
npm test
node bin/oax.js pod status
node bin/oax.js dev start --profile onboarding --fixture blank --reset --port 3001
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution rules and [docs/operations.md](docs/operations.md) for local runtime workflows.

## Project status

OpenAlfredo is an active local-first prototype for a single operator. The supported runtime is local development on `127.0.0.1`; do not treat the current API key model as network-ready multi-user authentication. See [docs/security.md](docs/security.md) for the current boundary.

## License

MIT, see [LICENSE](LICENSE).
