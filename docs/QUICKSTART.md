# Quick Start Guide

Get OpenAlfredo running on your machine in under 5 minutes.

## Prerequisites

- **Node.js 20+** — `node --version`
- **Ollama** — [ollama.com](https://ollama.com) installed and accessible via terminal
- A pulled model: `ollama pull llama3`

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/scwlkr/OpenAlfredo.git
cd OpenAlfredo

# 2. Install dependencies
npm install
cd oax-web && npm install && cd ..

# 3. Bootstrap (creates data dirs, .env, database, API key)
node bin/bootstrap.js

# 4. Start everything
oax pod
```

This launches three processes:
- **Ollama** (if not already running)
- **Next.js web UI** at `http://localhost:3000`
- **Telegram daemon** (if `TELEGRAM_TOKEN` is set in `oax-web/.env`)

## First Interaction

1. Open `http://localhost:3000` in your browser
2. Complete the **onboarding form** — give Alfredo a persona and goals
3. This creates `SOUL.md`, the agent's persistent identity
4. Start chatting — Alfredo remembers context across sessions

## What You Can Do

### Chat
Talk to Alfredo through the web UI or Telegram. Conversations are stored in SQLite and available as context in future chats.

### Tasks
Ask Alfredo to remind you of things. He'll create tasks in `TASKS.md` with optional scheduling:
- "Remind me to call Mom tomorrow at 3pm"
- Open the **Task Queue** panel in the sidebar to manage tasks

### Workspace
Alfredo saves generated artifacts (plans, drafts, notes) to the workspace:
- **Desk** — messy, in-progress ideas and sticky notes
- **Files** — user-added materials
- **Generated** — Alfredo's created outputs

Browse the workspace from the **Workspace** panel in the sidebar.

### AMBITION (Reflection)
Alfredo generates a daily reflective brief summarizing your trajectory, emerging themes, and what deserves attention. View it in the **AMBITION** panel.

### Settings
Configure heartbeat intervals, reflection schedule, and model defaults from the **Settings** panel. Changes write to `.env` and take effect after a pod restart.

## Optional: Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Add the token to `oax-web/.env`: `TELEGRAM_TOKEN=your_token_here`
3. Restart: `oax pod stop && oax pod`
4. Pair your phone: send `/pair <code>` (the code is printed in the terminal)
5. See [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) for full details

## Useful Commands

```bash
oax pod              # start everything
oax pod stop         # stop everything
oax pod status       # check what's running
oax pair             # show Telegram pairing code
npm test             # run all tests
npm run check        # tests + lint
```
