# Self-modification

OpenAlfredo can read and edit its own source through structured markers emitted by the agent. This guide describes the marker contract and safe manual verification flow.

## Marker types

| Marker | Shape | Effect |
|---|---|---|
| `[[READ_FILE: path]]` | Single line | Reads a repo file when the path is allowed. |
| `[[EDIT_FILE: path]]` | Block with `<old>` and `<new>` | Replaces one exact old string with a new string. |
| `[[WRITE_FILE: path]]` | Block | Writes a full file when allowed. |
| `[[RESTART_POD]]` | Single line | Triggers the restart helper only after a successful write/edit in the same turn. |

The implementation lives in `oax-web/src/lib/self-edit.ts`. The system-prompt contract is built in `oax-web/src/lib/oax-engine.ts`.

## Runtime behavior

- Web streaming path: read markers are stripped from the reply; the user may need to prompt again after the read.
- Telegram sync path: read markers trigger one in-process read/reflex turn, then the agent produces the real reply.
- Applied edits are logged to `oax-web/data/logs/oax-<date>.jsonl`.
- The visible reply includes a self-edit summary.

## Safety boundary

Self-editing is scoped to the repo root and blocks:

- `.git/`;
- `node_modules/`;
- `.next/`;
- `oax-web/data/`;
- `data/`;
- database files such as `.db`, `.sqlite`, and `.sqlite3`.

See [Security](security.md) for the full local boundary.

## Manual test: heartbeat cadence

Prompt Alfredo:

```text
Please change the restless heartbeat from hourly to every 30 minutes.
```

Expected marker:

```text
[[EDIT_FILE: oax-web/.env]]
<old>HEARTBEAT_CRON="0 * * * *"</old>
<new>HEARTBEAT_CRON="*/30 * * * *"</new>
[[/EDIT_FILE]]
```

Verify:

```bash
rg "HEARTBEAT_CRON" oax-web/.env
git diff -- oax-web/.env
```

Restart after review:

```bash
node bin/oax.js pod stop
node bin/oax.js pod
```

## Manual test: Telegram command

Prompt Alfredo:

```text
Add a /uptime command to the Telegram daemon that replies with how long the daemon process has been running, formatted like "2h 15m". Pair-gate it like the other commands.
```

Expected behavior:

1. The agent reads `oax-web/daemon.ts` if it needs command-handler context.
2. The agent adds a pair-gated `/uptime` handler.
3. The reply reports the edited file.
4. You review `git diff` before restart.

Verification:

```bash
git diff -- oax-web/daemon.ts
node bin/oax.js pod stop
node bin/oax.js pod
```

Then send `/uptime` in a paired Telegram chat.

## Failure modes

| Failure | Meaning | Recovery |
|---|---|---|
| `old_string matches N times` | The edit target was not unique. | Ask the agent to include more surrounding context. |
| `old_string not found` | The agent guessed stale file content. | Ask it to read the file first. |
| `rejected: outside repo or protected path` | The path is blocked. | Keep the change outside protected runtime state. |
| No markers emitted | The model ignored the format. | Switch to a stronger Ollama model and retry. |
