# Telegram

OpenAlfredo can run an optional Telegram daemon for mobile chat, proactive alerts, model switching, and pod controls.

Telegram is disabled unless `TELEGRAM_TOKEN` is set in `oax-web/.env`.

## Create a bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts.
3. Copy the HTTP API token.

## Configure the token

Edit `oax-web/.env`:

```bash
TELEGRAM_TOKEN=your-token-here
```

Never commit the token. `.env` files are gitignored.

## Start the daemon

Start the full pod:

```bash
node bin/oax.js pod
```

Or run the daemon directly:

```bash
cd oax-web
npx tsx daemon.ts
```

On startup, the daemon prints a 6-digit pairing code:

```text
Telegram pairing code: 123456
In Telegram, send: /pair 123456
```

The current code expires five minutes after daemon startup.

## Pair a chat

Send this to the Telegram bot:

```text
/pair <code>
```

Pairing adds the chat id to `oax-web/data/.telegram-allowlist.json`. The allowlist persists across restarts, so already paired chats do not need to pair again.

Unpaired chats only receive the pairing prompt. Five failed pairing attempts lock that chat out for 15 minutes.

## Commands

Paired chats can use:

| Command | Action |
|---|---|
| `/start` | Subscribe this chat to proactive alerts. |
| `/status` | Show current AMBITION and TASKS content. |
| `/heartbeat` | Force a RESTLESS heartbeat tick. |
| `/model` | List installed Ollama models. |
| `/model <n\|name>` | Switch this chat to a specific model. |
| `/restart` | Restart the pod through the respawn helper. |
| `/podStatus` | Show pod process status. |
| `/podStop` | Tear down the pod, including the daemon. |
| `/unpair` | Remove this chat from the allowlist. |

Telegram commands use camelCase because Telegram command names accept letters, numbers, and underscores, and stop at whitespace or dashes.

## Model selection

Per-chat model choices are stored in `oax-web/data/.telegram-models.json`. If a chat has no override, the daemon uses `OAX_MODEL` from `oax-web/.env`.

## Rotate pairing access

To rotate the pairing code for new chats, restart the daemon. The daemon writes the latest code to `oax-web/data/.telegram-pairing-code`.

To remove an existing chat, use `/unpair` or edit `oax-web/data/.telegram-allowlist.json` while the daemon is stopped.

## Rotate the bot token

1. In Telegram, ask @BotFather to revoke the token.
2. Generate a new token.
3. Update `TELEGRAM_TOKEN` in `oax-web/.env`.
4. Restart the pod:

   ```bash
   node bin/oax.js pod stop
   node bin/oax.js pod
   ```

## Disable Telegram

Leave `TELEGRAM_TOKEN` empty. The daemon still runs local background loops, but it does not poll Telegram or send Telegram notifications.
