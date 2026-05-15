# Setup

Use this guide to install OpenAlfredo, create local runtime state, and start the web UI.

## Prerequisites

- Node.js 20+.
- npm.
- Ollama installed and available in the terminal.
- At least one pulled model, for example `llama3`.

```bash
ollama pull llama3
```

## Install

```bash
git clone https://github.com/scwlkr/OpenAlfredo.git
cd OpenAlfredo
npm install
cd oax-web && npm install && cd ..
```

## Bootstrap local state

```bash
node bin/bootstrap.js
```

Bootstrap creates:

- `oax-web/.env` from `oax-web/.env.example` when missing.
- `oax-web/data/`.
- `oax-web/data/agents/default/SOUL.md`.
- `oax-web/data/AMBITION.md`.
- `oax-web/data/TASKS.md`.
- `oax-web/data/RESTLESS.log.md`.
- `oax-web/data/oax.db`.
- `oax-web/data/.oax-api-key`.

The command is idempotent. Use `node bin/bootstrap.js --check` to verify required state exists.

## Start OpenAlfredo

```bash
node bin/oax.js pod
```

This starts:

- Ollama, when nothing is already listening on `localhost:11434`.
- Next.js web UI at `http://localhost:3000`.
- Telegram daemon, with Telegram disabled unless `TELEGRAM_TOKEN` is set.

Open `http://localhost:3000`.

## Optional CLI link

Run this once if you want `oax` available as a command:

```bash
npm link
oax pod status
```

Without linking, use `node bin/oax.js ...`.

## First use

The default profile uses `oax-web/data/agents/default/SOUL.md`. Edit that file or complete onboarding in the web UI to define Alfredo's identity.

Chat history is stored in SQLite. Tasks, AMBITION, workspace files, logs, and topic memory are stored under `oax-web/data/`.

## Optional Telegram

1. Create a Telegram bot with [@BotFather](https://t.me/BotFather).
2. Add the token to `oax-web/.env`:

   ```bash
   TELEGRAM_TOKEN=your-token-here
   ```

3. Restart the pod:

   ```bash
   node bin/oax.js pod stop
   node bin/oax.js pod
   ```

4. Pair the chat with `/pair <code>`. The daemon prints the code on startup.

See [Telegram](telegram.md) for the full workflow.

## Useful commands

```bash
node bin/oax.js pod              # start the full local pod
node bin/oax.js pod stop         # stop the pod
node bin/oax.js pod status       # show process status
node bin/oax.js pair             # show the current Telegram pairing code
npm test                         # run the root test shortcut
cd oax-web && npm run lint       # run lint from the app package
cd oax-web && npm run build      # build the app package
```
