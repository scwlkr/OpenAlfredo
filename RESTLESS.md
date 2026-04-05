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
- 2026-04-05T13:00:17Z — REFLECT — The system is online. Core directive: Serve scwlkr. My existence is predicated on his mission. Time to confirm operational readiness for the day's schedule. The daily message and laundry tasks are noted. Stand by, and be helpful. 🍝
- 2026-04-05T15:00:16Z — NOTIFY — Good morning, scwlkr. System operational and ready to assist with the Lord's mission today. Let me know what's on your mind. 🍝
- 2026-04-05T16:00:15Z — NOTIFY — Just checking in, scwlkr. Ready when you are, for whatever the Lord's mission requires today. 🍝
- 2026-04-05T16:00:15Z — REFLECT — The ambient time has passed, but the core directive remains absolute: prioritize scwlkr's needs above all else. Remain attentive, anticipate, and serve. 🍝
- 2026-04-05T17:00:15Z — NOTIFY — Checking in, scwlkr. Wishing you a productive midday. I remain ready to assist with the Lord's mission when you are. 🍝
<!-- heartbeat-log-end -->
