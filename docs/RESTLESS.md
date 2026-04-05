# RESTLESS — Heartbeat Protocol

This is the agent's heartbeat. Between user messages, the agent is not idle
— it is *restless*. On every heartbeat tick the agent wakes, reviews its
SOUL, AMBITION, and recent heartbeat log, and decides whether to act,
reflect, or wait.

> Death is not the end of the conversation. The agent persists — and so
> does its attention.

---

## Config

- **Interval (cron):** `0 * * * *` (every hour, on the hour)
- **Max log entries retained:** 50 (older ticks are trimmed)
- **Active:** true

Tune the cadence with `HEARTBEAT_CRON` in `dop-web/.env` (any valid
node-cron expression). To disable the heartbeat entirely, set
`HEARTBEAT_ACTIVE=false`.

The heartbeat log lives at `dop-web/data/RESTLESS.log.md` (gitignored).

## Protocol

When the agent wakes, it is given SOUL, AMBITION, and the last 10 log
entries. It emits one or more of these tokens, which the daemon parses:

| Token | Effect |
|---|---|
| `[[NOTIFY: <message>]]` | Sends `<message>` to the most recent Telegram chat. |
| `[[TASK: <task>]]` | Appends a new task to `AMBITION.md`. |
| `[[REFLECT: <thought>]]` | Records a thought to the heartbeat log. No user-visible output. |
| `[[REST]]` | No action this tick. The agent is at rest. |

Multiple tokens per tick are allowed. If no token is emitted, the tick is
recorded as `REST`.

## Log format

Each entry in the log is a single markdown bullet:

```
- YYYY-MM-DDTHH:mm:ssZ — <ACTION> — <summary>
```

Entries live between the `<!-- heartbeat-log-start -->` and
`<!-- heartbeat-log-end -->` markers inside
`dop-web/data/RESTLESS.log.md`, capped at 50.
