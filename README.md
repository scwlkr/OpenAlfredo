<div align="center">

```
          ______
       .-"      "-.
      /            \
     |              |
     |,  .-.  .-.  ,|
     | )(_x_/  \x_)( |
     |/     /\     \|
     (_     ^^     _)
      \__|IIIIII|__/
       | \IIIIII/ |
       \          /
        `--------`
```

# ☠️ Death of Prompt

**_Kill the prompt. Keep the conversation._**

A local-first prototype for replacing one-shot prompt engineering with an ongoing, persistent conversation — a soul, an ambition, and a restless heartbeat that keeps thinking between your messages.

</div>

---

## 🩻 The Idea

Prompt engineering is dead because the frame is wrong. You should not be re-summoning an amnesiac every time you open a chat. You should be *continuing* a relationship with an agent that remembers who it is, what you want, and what it was thinking the last time you walked away.

**Death of Prompt (DOP)** is a local-first MVP built on that premise:

- 🧠 **SOUL** — the agent's identity, written once, evolved over time.
- 🎯 **AMBITION** — the agent's open tasks & goals. Checked on a cron.
- 💓 **RESTLESS** — the agent's heartbeat. Between your messages, it wakes on a timer, reviews its state, and decides whether to act, reflect, or wait.
- 📜 **Memory** — transcripts & topic files keep context lightweight and durable.

Everything runs locally against [Ollama](https://ollama.com). Nothing leaves your machine unless you wire it to Telegram.

---

## 🪦 Current State

| Surface | Status |
|---|---|
| Web chat UI (Next.js + SQLite) | ✅ working |
| 3-layer memory retrieval (SOUL / topics / transcripts) | ✅ working |
| Onboarding flow (writes first SOUL) | ✅ working |
| AMBITION cron reminder check | ✅ working |
| **RESTLESS heartbeat loop** | ✅ **new** |
| **Telegram bot integration** | ✅ **new** |
| System logs modal (JSONL, live-polled) | ✅ working |

The web UI and the Telegram daemon share one engine (`src/lib/dop-engine.ts`) — same SOUL, same SQLite sessions, same 3-layer memory, same `[[TASK]]` / `[[SAVE_FILE]]` marker handling. See `CLAUDE.md` for the full architecture.

---

## ⚰️ Requirements

- **Node.js 20+**
- **[Ollama](https://ollama.com)** running locally with at least one model pulled (default: `llama3`)
- **(Optional)** A Telegram bot token if you want proactive alerts on your phone

```bash
# Make sure Ollama is running and has llama3
ollama pull llama3
ollama serve
```

---

## 🔮 Setup

```bash
# 1. Install dependencies
git clone https://github.com/scwlkr/DeathOfPrompt.git
cd DeathOfPrompt
npm install
cd dop-web && npm install

# 2. Configure environment
cp .env.example .env
# (edit .env — at minimum, leave DATABASE_URL; add TELEGRAM_TOKEN if using the bot)

# 3. Initialize the database
npx prisma db push
npx prisma generate

# 4. Launch the full stack (ollama + web + telegram daemon)
cd ..
node bin/dop.js pod         # → http://localhost:3000
```

One command spins up Ollama (if it isn't already running), the Next.js dashboard, and the Telegram daemon. Ctrl-C tears it all down. From another terminal you can also run `node bin/dop.js pod stop` / `pod status`.

If you only want the web UI (no daemon, no Ollama management):

```bash
node bin/dop.js dashboard
```

On first load you'll walk through the onboarding flow — this writes your agent's initial `SOUL.md`.

---

## 👻 The Restless Daemon

The daemon is a separate long-running process. It powers **both** the Telegram bot and the `RESTLESS.md` heartbeat. `dop pod` starts it for you, but you can also run it standalone:

```bash
# from dop-web/
npx tsx daemon.ts
```

You should see:

```
💀 Starting Telegram Bot...
⏰ Starting AMBITION cron (*/30 * * * *)
💓 Starting RESTLESS heartbeat (0 * * * *)
☠️  DOP Daemon is alive. The agent is restless.
```

### What the heartbeat does

Every tick (hourly by default), the agent wakes up — no user input — and is handed:

- its `SOUL.md`
- its open `AMBITION.md` tasks
- the last 10 heartbeat entries from `RESTLESS.md`

It then emits one of:

| Token | Effect |
|---|---|
| `[[NOTIFY: …]]` | Sends a proactive Telegram message |
| `[[TASK: …]]` | Appends a new task to `AMBITION.md` |
| `[[REFLECT: …]]` | Writes a private thought to the heartbeat log |
| `[[REST]]` | Stays silent this tick |

All heartbeat events are logged to the bottom of `RESTLESS.md` (capped at 50 entries). Tune the cadence via `HEARTBEAT_CRON` in `.env`, or set `HEARTBEAT_ACTIVE=false` to silence the heart.

---

## 📡 Telegram Setup

Turn your agent into a persistent presence on your phone.

### 1. Create a bot

1. Open Telegram, message **[@BotFather](https://t.me/BotFather)**.
2. Send `/newbot`, follow the prompts, and copy the HTTP API token it gives you.

### 2. Add the token

In `dop-web/.env`:

```bash
TELEGRAM_TOKEN=123456789:AA...your-token-here
```

### 3. Start the pod (or just the daemon)

```bash
node bin/dop.js pod          # starts everything
# or, daemon only:
cd dop-web && npx tsx daemon.ts
```

On startup the daemon prints a 6-digit **pairing code** and the exact message to send:

```
🔑 Telegram pairing code: 563672
   In Telegram, send:  /pair 563672
```

If you miss it, run `node bin/dop.js pair` from the repo root.

### 4. Pair your phone

Open a chat with your bot and send `/pair <code>`. That adds your chat to the allowlist (`dop-web/data/.telegram-allowlist.json`). Unpaired chats get a pairing prompt and nothing else — no commands, no chat. Pairing persists across restarts. To rotate the code, delete `dop-web/data/.telegram-pairing-code` and restart the daemon.

### Bot commands (paired chats only)

| Command | Action |
|---|---|
| `/pair <code>` | Pair this chat (only command unpaired chats can use) |
| `/unpair` | Disconnect this chat from the agent |
| `/start` | Confirm subscription + show help |
| `/status` | Show current AMBITION.md contents |
| `/heartbeat` | Force a heartbeat tick now and show the result |
| *(any other text)* | Converse with the agent |

---

## 🕸️ Layout

```
/                  ← thin CLI wrapper (bin/dop.js), SOUL/AMBITION/RESTLESS live here
├── SOUL.md        ← agent identity
├── AMBITION.md    ← open tasks / goals
├── RESTLESS.md    ← heartbeat config + log
├── memory/        ← unused pre-unification stub (safe to delete)
└── dop-web/       ← the actual Next.js app
    ├── daemon.ts  ← Telegram bot + cron workers
    ├── prisma/    ← SQLite schema
    ├── data/      ← web-path memory + logs + sqlite db
    └── src/
        ├── app/   ← Next.js routes (/api/chat, /api/onboarding, /api/logs, …)
        └── lib/   ← dop-engine (shared brain), memory-retrieval, logger, dop (Telegram/heartbeat)
```

---

## 🧪 Dev Commands

From the **repo root** (`dop` CLI):

```bash
node bin/dop.js pod          # start ollama + web + daemon
node bin/dop.js pod stop     # tear down the whole pod
node bin/dop.js pod status   # per-process alive/dead state
node bin/dop.js pair         # print current Telegram pairing code
node bin/dop.js dashboard    # web UI only (legacy)
```

From `dop-web/`:

```bash
npm run dev             # Next dev server
npm run build           # production build
npm run lint            # eslint
npx vitest              # run tests
npx vitest run src/lib/memory-retrieval.test.ts   # single test
npx prisma db push      # sync schema to SQLite
npx prisma generate     # regen client after schema edit
npx tsx daemon.ts       # Telegram + heartbeat daemon (standalone)
```

---

## 📿 Design Notes

- `DOP_MVP_PLAN.md` — the original MVP spec
- `DOP_IDEAS_FROM_CODEX.md` — exploratory ideas
- `CLAUDE.md` — architecture reference for Claude Code (and humans)

---

<div align="center">

_The prompt is dead. Long live the conversation._

☠️

</div>
