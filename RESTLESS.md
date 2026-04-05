# RESTLESS

This is the agent's heartbeat. Between user messages, the agent is not idle — it is *restless*. On every heartbeat tick the agent wakes, reviews its SOUL, AMBITION, and recent context, and decides whether to act, reflect, or wait.

> Death is not the end of the conversation. The agent persists — and so does its attention.

---

## Config

- **Interval (cron):** `0 * * * *` (every hour, on the hour)
- **Max log entries retained:** 50 (older ticks are trimmed from the log below)
- **Active:** true

To change the cadence, set `HEARTBEAT_CRON` in `dop-web/.env` (any valid node-cron expression). To disable the heartbeat entirely, set `HEARTBEAT_ACTIVE=false`.

## Heartbeat Protocol

When the agent wakes, it is given SOUL, AMBITION, the memory index, and the last log entries below. It then produces **one** of these actions, wrapped in tokens the daemon parses:

| Token | Effect |
|---|---|
| `[[NOTIFY: <message>]]` | Sends `<message>` to the most recent Telegram chat. |
| `[[TASK: <task>]]` | Appends a new task to `AMBITION.md`. |
| `[[REFLECT: <thought>]]` | Records a thought to the heartbeat log below. No user-visible output. |
| `[[REST]]` | No action this tick. The agent is at rest. |

Multiple tokens per tick are allowed. If no token is emitted, the tick is recorded as `REST`.

## Heartbeat Log

Each entry: `- YYYY-MM-DDTHH:mm:ssZ — <ACTION> — <summary>`

<!-- heartbeat-log-start -->
<!-- heartbeat-log-end -->
