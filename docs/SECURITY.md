# Security

DOP is a local-first single-user prototype. This document describes where
secrets live, how to rotate them, what the self-modification blocklist
covers, and how to report vulnerabilities.

## Where secrets live

| Secret | Location | Rotate by |
|---|---|---|
| API key (web API auth) | `dop-web/data/.dop-api-key` (mode 0600, gitignored) | delete file, restart — auto-regenerates |
| Telegram bot token | `dop-web/.env` (gitignored) | @BotFather revoke + new token + restart |
| Telegram pairing code | `dop-web/data/.telegram-pairing-code` (gitignored) | delete file, restart daemon |
| Telegram allowlist | `dop-web/data/.telegram-allowlist.json` (gitignored) | edit file or `/unpair` |

Nothing listed above should ever be committed. `.gitignore` blocks
`dop-web/data/` and all `.env` files (except `.env.example`).

## Rotating the API key

```bash
rm dop-web/data/.dop-api-key
dop pod stop && dop pod   # regenerates on next boot
```

A new 32-byte hex key is written with mode 0600.

## Rotating the Telegram token

1. In Telegram, message @BotFather.
2. `/revoke` → select bot → confirm.
3. Receive new token.
4. Edit `dop-web/.env`: `TELEGRAM_TOKEN=<new>`.
5. `dop pod stop && dop pod`.

## Self-modification blocklist

The agent can read and edit its own source code via `[[READ_FILE]]`,
`[[EDIT_FILE]]`, and `[[WRITE_FILE]]` markers — scoped to the repo root
and subject to a hard blocklist.

**Blocked at any depth** (path segment match):

- `.git/`
- `node_modules/`
- `.next/`

**Blocked as path prefixes**:

- `dop-web/data/` (all runtime state)
- `data/` (legacy repo-root state)

**Blocked by extension**:

- `.db`, `.db-journal`
- `.sqlite`, `.sqlite3`

**Implicitly blocked** (not in the code index, so the agent doesn't know to
try):

- `dop-web/.env` (live secrets)
- Anything outside `REPO_ROOT`

Blocklist logic: `dop-web/src/lib/self-edit.ts::resolveInsideRepo()`.
Tests: `dop-web/src/lib/__tests__/self-edit.test.ts`.

## Pairing rate limit

Telegram pairing allows **5 failed `/pair` attempts** per chat id before a
**15-minute lockout**. Successful pairing clears the counter. This prevents
brute-forcing the 6-digit code across restarts.

## Process isolation

- Ollama runs on `localhost:11434` only.
- Next dev server binds to `127.0.0.1:3000` only.
- Nothing phones home. DOP has no telemetry, analytics, or crash
  reporting.

## Responsible disclosure

Found a security issue? **Do not open a public issue.** Email
[shane.caleb.walker@gmail.com](mailto:shane.caleb.walker@gmail.com) with:

- a description of the issue,
- reproduction steps,
- an assessment of impact.

Expect an initial response within 7 days and a fix or mitigation plan
within 90 days. See also [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
