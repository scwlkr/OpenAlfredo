# Security

OpenAlfredo is a local-first, single-operator prototype. The supported runtime is local development on `127.0.0.1`, not a network-exposed multi-user service.

## Secret locations

| Secret or private state | Location | Rotate by |
|---|---|---|
| Local API key | `oax-web/data/.oax-api-key` | Delete the file and restart or rerun bootstrap. |
| Telegram bot token | `oax-web/.env` | Revoke through @BotFather, write the new token, restart. |
| Telegram pairing code | `oax-web/data/.telegram-pairing-code` | Restart the daemon; the code is overwritten on startup and expires after five minutes. |
| Telegram allowlist | `oax-web/data/.telegram-allowlist.json` | Use `/unpair`, or edit while the daemon is stopped. |
| Telegram chat id | `oax-web/data/.telegram-chat-id` | Unpair or remove the file while the daemon is stopped. |
| Telegram model map | `oax-web/data/.telegram-models.json` | Change with `/model`, or edit while the daemon is stopped. |

These files must not be committed. `.gitignore` excludes `oax-web/data/`, `oax-web/.profiles/`, and `.env` files except `.env.example`.

## Local API key

The web UI uses a local API key stored at `oax-web/data/.oax-api-key`. This key is a local guard for the browser and local API routes. It is not a replacement for real multi-user authentication.

Rotate it with:

```bash
rm oax-web/data/.oax-api-key
node bin/oax.js pod stop
node bin/oax.js pod
```

Bootstrap regenerates the key with file mode `0600`.

## Telegram token

Rotate the bot token through @BotFather:

1. Send `/revoke`.
2. Select the bot.
3. Generate the new token.
4. Update `TELEGRAM_TOKEN` in `oax-web/.env`.
5. Restart the pod.

## Pairing protection

Telegram pairing uses:

- a six-digit code printed on daemon startup;
- a five-minute expiration window for that code;
- a persisted allowlist for already paired chats;
- a 15-minute lockout after five failed attempts for one chat id.

Pairing codes are for new chats only. Existing allowlisted chats survive restarts.

## Self-modification blocklist

The agent can read and edit source through markers, but `oax-web/src/lib/self-edit.ts` restricts paths.

Blocked path segments:

- `.git/`
- `node_modules/`
- `.next/`

Blocked prefixes:

- `oax-web/data/`
- `data/`

Blocked extensions:

- `.db`
- `.db-journal`
- `.sqlite`
- `.sqlite3`

The code index also keeps `oax-web/.env` out of the model-visible file list.

## Process exposure

- Ollama is expected on `localhost:11434`.
- Next dev is started with `next dev --hostname 127.0.0.1`.
- Telegram polling runs only when `TELEGRAM_TOKEN` is configured.
- OpenAlfredo has no telemetry, analytics, or crash reporting.

## Responsible disclosure

Do not open a public issue for a security problem. Email [shane.caleb.walker@gmail.com](mailto:shane.caleb.walker@gmail.com) with:

- a description of the issue;
- reproduction steps;
- expected impact.

Expect an initial response within 7 days and a fix or mitigation plan within 90 days. See [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
