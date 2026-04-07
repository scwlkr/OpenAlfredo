# Self-Modification Test Prompts

The agent can now modify its own source code via three markers:
`[[READ_FILE]]`, `[[EDIT_FILE]]`, `[[WRITE_FILE]]`. See
`oax-web/src/lib/self-edit.ts` for the implementation, and the
**SELF-MODIFICATION** block in `buildSystemPrompt()` for the exact contract
the agent sees.

After the agent makes changes, you need to restart the pod for them to take
effect:

```bash
oax pod stop && oax pod
```

Self-edits show up in the visible reply as a `Self-edits applied:` block,
and every edit is logged via `logInfo('self_edit_applied', ...)` to
`oax-web/data/logs/oax-<date>.jsonl`. Use `git diff` to review before
restarting.

---

## Test 1 — Light: change the heartbeat cadence

**Prompt (say this to the agent in the web UI or Telegram):**

> Please change the restless heartbeat from hourly to every 30 minutes.

**Expected behavior:**

1. Agent knows from the repo index that `HEARTBEAT_CRON` lives in
   `oax-web/.env`.
2. It emits:
   ```
   [[EDIT_FILE: oax-web/.env]]
   <old>HEARTBEAT_CRON="0 * * * *"</old>
   <new>HEARTBEAT_CRON="*/30 * * * *"</new>
   [[/EDIT_FILE]]
   ```
3. Reply shows `✅ edited oax-web/.env` and a restart reminder.

**Verify:**

```bash
grep HEARTBEAT_CRON oax-web/.env
# HEARTBEAT_CRON="*/30 * * * *"
```

**Revert:**

```bash
git checkout oax-web/.env
```

---

## Test 2 — Heavier: add a new Telegram command

**Prompt:**

> Add a /uptime command to the Telegram daemon that replies with how long the
> daemon process has been running, formatted like "2h 15m". Pair-gate it like
> the other commands.

**Expected behavior:**

1. Agent may emit `[[READ_FILE: oax-web/daemon.ts]]` to see the existing
   command-handler patterns. On the Telegram path this triggers the read-
   reflex loop automatically; on the web UI you'll need to say "yes, read
   it and apply the edit" in a follow-up turn.
2. Agent records the daemon start time near the top of the file and adds a
   `bot.onText(/^\/uptime\b/, ...)` handler with `isPaired()` gate, using
   `process.uptime()` or a `Date.now() - startedAt` delta.
3. Reply shows `✅ edited oax-web/daemon.ts` (or possibly two edits if it
   splits the state var + the handler into separate edits).

**Verify:**

```bash
git diff oax-web/daemon.ts          # see the inserted handler
oax pod stop && oax pod              # restart
# In Telegram: /uptime  →  should show something like "0h 1m"
```

**Revert:**

```bash
git checkout oax-web/daemon.ts
```

---

## Failure modes to watch for

- **`old_string matches N× in …`** — the agent picked a non-unique snippet.
  Re-prompt: "The old_string wasn't unique — add a few more lines of
  context around it and try again."
- **`old_string not found in …`** — the agent guessed the current contents.
  Re-prompt: "Please READ_FILE first, then edit based on the actual
  contents."
- **`rejected: … is outside repo or in a protected path`** — the agent
  tried to touch `.git`, `node_modules`, `data/`, or a `.db` file.
  Intentional; self-edit won't let it corrupt the DB or git history.
- **Model ignores markers entirely** — some smaller Ollama models don't
  follow formatting reliably. Try `/model` in Telegram to switch to a
  larger model (`llama3`, `qwen2.5-coder`, etc.) and re-prompt.
