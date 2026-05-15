# Glossary

This glossary defines the canonical language used throughout OpenAlfredo documentation.

## Terms

### OpenAlfredo

**Use:** OpenAlfredo
**Avoid:** OA, the app, the project when the product name is clearer
**Meaning:** The local-first personal agent workspace as a whole.
**Use when:** Referring to the product, repo, or local system.
**Do not use when:** Referring only to the CLI, the web package, or the agent persona.

### OAX

**Use:** OAX
**Avoid:** OpenAlfredo CLI, Open Alfredo X, OA
**Meaning:** The technical shorthand used in package names, commands, logs, and internal surfaces.
**Use when:** Referring to technical identifiers such as the `oax` command or OAX pod.
**Do not use when:** Writing the first product mention in user-facing prose.

### `oax`

**Use:** `oax`
**Avoid:** `openalfredo`, `alfredo`
**Meaning:** The CLI command exposed by the root package.
**Use when:** Documenting commands such as `oax pod` or `oax dev start`.
**Do not use when:** Referring to the web application package.

### `oax-web`

**Use:** `oax-web`
**Avoid:** dashboard package, frontend package
**Meaning:** The Next.js 16 application package that contains the web UI, API routes, Prisma/SQLite runtime, Ollama integration, and Telegram daemon.
**Use when:** Documenting package-local commands, paths, or runtime code.
**Do not use when:** Referring to the root CLI package.

### Agent

**Use:** agent
**Avoid:** chatbot, bot when discussing intelligence or memory
**Meaning:** The persistent assistant identity that uses memory, tasks, reflections, and workspace context.
**Use when:** Describing Alfredo as a local persistent assistant.
**Do not use when:** Referring specifically to the Telegram Bot API integration.

### Alfredo

**Use:** Alfredo
**Avoid:** default bot, generic assistant
**Meaning:** The default agent identity created by onboarding.
**Use when:** Describing the default personal agent experience.
**Do not use when:** Discussing package names, process names, or generic extension points.

### SOUL

**Use:** SOUL
**Avoid:** persona file, system prompt file
**Meaning:** The durable agent identity stored at `oax-web/data/agents/<agentId>/SOUL.md`.
**Use when:** Referring to persistent identity, goals, and style.
**Do not use when:** Referring to topic memory or transcripts.

### Memory

**Use:** memory
**Avoid:** context dump, notes pile
**Meaning:** Retrieved context used by the chat engine. It includes SOUL, selected topic files, and recent transcripts.
**Use when:** Describing context retrieval.
**Do not use when:** Describing files the user or agent actively works on; use workspace.

### Topic file

**Use:** topic file
**Avoid:** memory note, doc fragment
**Meaning:** A Markdown memory file under `oax-web/data/memory/topics/`, selected through `oax-web/data/memory/index.json`.
**Use when:** Documenting the second memory layer.
**Do not use when:** Referring to workspace files.

### Transcript

**Use:** transcript
**Avoid:** chat log when discussing persisted chat context
**Meaning:** A persisted `TranscriptEntry` row in SQLite.
**Use when:** Describing recent conversation retrieval or transcript search.
**Do not use when:** Referring to daemon logs or heartbeat logs.

### Workspace

**Use:** workspace
**Avoid:** memory, file dump
**Meaning:** The active working area under `oax-web/data/workspace/`.
**Use when:** Referring to files the user or agent can browse and modify.
**Do not use when:** Describing retrieved context.

### Desk

**Use:** desk
**Avoid:** scratchpad in active docs
**Meaning:** The workspace area for active, messy notes under `workspace/desk/`.
**Use when:** Describing sticky notes and in-progress thinking.
**Do not use when:** Describing deprecated planning docs.

### Task

**Use:** task
**Avoid:** ambition item, reminder when the item is persisted in `TASKS.md`
**Meaning:** A line item in `oax-web/data/TASKS.md`, optionally scheduled with `|when:` or `|recur:`.
**Use when:** Describing reminders and follow-through items.
**Do not use when:** Referring to AMBITION reflections.

### AMBITION

**Use:** AMBITION
**Avoid:** task list, backlog
**Meaning:** The reflective brief stored at `oax-web/data/AMBITION.md`.
**Use when:** Describing daily synthesis and trajectory reflection.
**Do not use when:** Referring to scheduled tasks or task persistence.

### RESTLESS heartbeat

**Use:** RESTLESS heartbeat
**Avoid:** cron bot, background tasker
**Meaning:** The scheduled loop that reads current state, asks the model what to do, and handles `[[NOTIFY]]`, `[[TASK]]`, `[[REFLECT]]`, and `[[REST]]`.
**Use when:** Describing the heartbeat protocol.
**Do not use when:** Referring to the deterministic task scan.

### Continuity loop

**Use:** continuity loop
**Avoid:** Golden Goose as the only term
**Meaning:** The theme-based follow-up system that extracts themes and creates tasks, stickies, or generated files.
**Use when:** Writing user-manual docs.
**Do not use when:** Referring to code/tests that intentionally use the Golden Goose nickname.

### Golden Goose

**Use:** Golden Goose after defining it as the continuity loop nickname
**Avoid:** using Golden Goose without explanation
**Meaning:** The project nickname for the continuity loop.
**Use when:** Linking to legacy code, tests, or feature language that already uses the name.
**Do not use when:** A new reader needs the concept first; use continuity loop.

### Telegram daemon

**Use:** Telegram daemon
**Avoid:** Telegram bot when discussing the local process
**Meaning:** The `daemon.ts` process that owns Telegram polling plus scheduled background loops.
**Use when:** Documenting runtime operations.
**Do not use when:** Referring only to the Telegram account created through BotFather.

### Pod

**Use:** pod
**Avoid:** server, stack when a command manages the three local processes
**Meaning:** The local process group started by `oax pod`: Ollama if needed, Next dev, and the Telegram daemon.
**Use when:** Documenting start, stop, status, and restart operations.
**Do not use when:** Referring to deployment infrastructure.

### Sandbox profile

**Use:** sandbox profile
**Avoid:** test profile, fake user
**Meaning:** An isolated web-only runtime state under `oax-web/.profiles/<name>/`.
**Use when:** Documenting disposable onboarding or returning-user checks.
**Do not use when:** Referring to the personal profile under `oax-web/data/`.

### Marker

**Use:** marker
**Avoid:** command when the model emits it in text
**Meaning:** A structured token such as `[[TASK: ...]]` or `[[EDIT_FILE: ...]]` parsed by the engine.
**Use when:** Describing model-to-system side effects.
**Do not use when:** Documenting CLI or Telegram commands.
