# RESTLESS

RESTLESS is OpenAlfredo's heartbeat protocol. Between user messages, the daemon can wake the agent, review current state, and decide whether to notify, add a task, reflect, or rest.

The protocol doc intentionally keeps the uppercase filename because `bin/profile-state.js` points generated heartbeat logs to `docs/RESTLESS.md`, and the name mirrors the runtime file `RESTLESS.log.md`.

## Configuration

Default settings:

```bash
HEARTBEAT_CRON="0 * * * *"
HEARTBEAT_ACTIVE=true
```

The heartbeat log lives at `oax-web/data/RESTLESS.log.md`.

## Inputs

Each tick reads:

- the default SOUL at `oax-web/data/agents/default/SOUL.md`;
- current `oax-web/data/AMBITION.md`;
- current `oax-web/data/TASKS.md`;
- recent heartbeat log entries;
- active themes from the continuity loop when available.

## Tokens

The model emits one or more tokens:

| Token | Effect |
|---|---|
| `[[NOTIFY: <message>]]` | Sends `<message>` to the paired Telegram chat when available. |
| `[[TASK: <task>]]` | Appends a task to `oax-web/data/TASKS.md`. |
| `[[REFLECT: <thought>]]` | Adds a thought to `oax-web/data/RESTLESS.log.md`. |
| `[[REST]]` | Records that no action was needed. |

If no token is emitted, the daemon treats the tick as rest.

## Log format

Heartbeat entries are Markdown bullets:

```text
- YYYY-MM-DDTHH:mm:ssZ - ACTION - summary
```

Entries live between the `<!-- heartbeat-log-start -->` and `<!-- heartbeat-log-end -->` markers and are capped at the most recent 50 entries.

## Related docs

- [Operations](operations.md) for daemon lifecycle.
- [Continuity loop](continuity-loop.md) for theme-based follow-up.
- [Telegram](telegram.md) for proactive notifications.
