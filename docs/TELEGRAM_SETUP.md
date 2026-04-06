# Telegram Setup

Turn your agent into a persistent presence on your phone.

## 1. Create a bot

1. Open Telegram, message [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts.
3. Copy the HTTP API token BotFather gives you (looks like
   `123456789:AA...`).

## 2. Add the token

Edit `oax-web/.env`:

```bash
TELEGRAM_TOKEN=123456789:AA...your-token-here
```

The token lives only in `.env`, which is gitignored. Never commit it.

## 3. Start the pod

```bash
oax pod
```

(Or the daemon alone: `cd oax-web && npx tsx daemon.ts`.)

On startup the daemon prints a **6-digit pairing code** and the exact
message to send:

```
🔑 Telegram pairing code: 123456 (expires in 5 minutes)
   In Telegram, send:  /pair 123456
```

If you miss it, run `oax pair` from the repo root to print the current
code.

## 4. Pair your phone

Open a chat with your bot and send `/pair <code>`.

- Adds your chat id to `oax-web/data/.telegram-allowlist.json`.
- Unpaired chats only see a pairing prompt — no commands, no chat.
- Pairing persists across restarts.
- 5 wrong attempts trigger a 15-minute lockout for that chat.

## 5. Chat

Any plain message after pairing is routed through the same engine the web
UI uses. Same SOUL, same SQLite transcripts, same memory retrieval. Each
Telegram chat becomes its own OAX session (`telegram-<chatId>`).

## Commands (paired chats only)

| Command | Action |
|---|---|
| `/start` | Subscribe to proactive alerts |
| `/status` | Show current AMBITION.md |
| `/heartbeat` | Force a heartbeat tick now |
| `/model` | List installed Ollama models |
| `/model <n\|name>` | Switch this chat to a different model |
| `/restart` | Restart the pod (~15-30s downtime) |
| `/podStatus` | Show per-process alive/dead state |
| `/podStop` | Tear down the whole pod |
| `/unpair` | Disconnect this chat |

> **Why camelCase?** Telegram only accepts `[A-Za-z0-9_]` in commands and
> stops at whitespace or dashes. `/pod-start` parses as `/pod` with a
> dropped arg — so OAX uses `/podStart`, `/podStop`, `/podStatus`.

Per-chat model selections persist in
`oax-web/data/.telegram-models.json`. Default model comes from `OAX_MODEL`
in `.env`.

## Rotating the pairing code

Delete `oax-web/data/.telegram-pairing-code` and restart the daemon. A new
code is generated and printed on startup.

## Rotating the bot token

1. @BotFather → `/revoke` → select bot → confirm.
2. @BotFather → generate a new token.
3. Update `TELEGRAM_TOKEN` in `oax-web/.env`.
4. `oax pod stop && oax pod`.

## Disabling Telegram

Leave `TELEGRAM_TOKEN` empty in `oax-web/.env`. The daemon still runs the
AMBITION cron and RESTLESS heartbeat — it just doesn't send any messages.
