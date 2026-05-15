# Operations

This guide covers local runtime operations for OpenAlfredo.

## Bootstrap

Run bootstrap from the repo root:

```bash
node bin/bootstrap.js
```

Useful modes:

```bash
node bin/bootstrap.js --check
node bin/bootstrap.js --force
node bin/bootstrap.js --quiet
```

`--force` overwrites scaffolded runtime templates and should not be used casually on a personal profile.

## Pod lifecycle

Start the full local pod:

```bash
node bin/oax.js pod
```

Check status:

```bash
node bin/oax.js pod status
```

Stop everything:

```bash
node bin/oax.js pod stop
```

The pod tracks process state in `oax-web/data/.oax-pod.json` and writes prefixed logs under `oax-web/data/logs/`.

## Pod processes

`oax pod` manages three processes:

| Process | Started from | Notes |
|---|---|---|
| Ollama | `ollama serve` | Started only when `localhost:11434` is not already up. |
| Web UI | `cd oax-web && npm run dev` | Next.js dev server bound to `127.0.0.1`. |
| Daemon | `cd oax-web && npx tsx daemon.ts` | Telegram plus background loops. |

Ollama is stopped only when the pod started it.

## Restart helper

The detached restart helper performs a stop, start, and web health check:

```bash
node bin/respawn.js
node bin/respawn.js --dry-run
node bin/respawn.js --delay=3 --timeout=60
```

The Telegram `/restart` command uses the same helper.

## Sandbox profiles

Sandbox profiles are disposable web-only profiles for onboarding and returning-user checks. They do not start Telegram and do not participate in `oax pod`.

Start a profile:

```bash
node bin/oax.js dev start --profile onboarding --fixture blank --reset --port 3001
```

Reset without starting:

```bash
node bin/oax.js dev reset --profile returning --fixture returning
```

Fixtures:

| Fixture | Purpose |
|---|---|
| `blank` | Removes SOUL so onboarding appears. |
| `seeded` | Provides a ready default SOUL. |
| `returning` | Adds tasks, memory, workspace artifacts, themes, and transcript history. |

Sandbox data lives under `oax-web/.profiles/<name>/`.

## Environment

The app environment lives in `oax-web/.env`. The root `.env.example` only points readers to `oax-web/.env.example`.

Common runtime settings:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Optional absolute SQLite override. Leave unset for default local state. |
| `TELEGRAM_TOKEN` | Enables Telegram when set. |
| `HEARTBEAT_CRON` / `HEARTBEAT_ACTIVE` | Controls the RESTLESS heartbeat. |
| `AMBITION_CRON` | Controls deterministic task scans. |
| `REFLECTION_CRON` / `REFLECTION_ACTIVE` | Controls AMBITION reflection generation. |
| `CONTINUITY_CRON` / `CONTINUITY_ACTIVE` | Controls the continuity loop. |
| `OAX_MODEL` | Default Ollama model. |

Settings written through the web UI are validated before writing to `.env`. Invalid runtime environment values are ignored with daemon warnings and replaced by defaults in sanitized settings.

## Database

The default database is `oax-web/data/oax.db`.

Use the repo scripts:

```bash
cd oax-web
npm run db:generate
npm run db:push
```

Do not run raw Prisma commands for this repo unless you pass an explicit absolute `DATABASE_URL`.

## Logs

Important log locations:

| Log | Path |
|---|---|
| Pod logs | `oax-web/data/logs/pod-*.log` |
| App event logs | `oax-web/data/logs/oax-<date>.jsonl` |
| Respawn outcomes | `oax-web/data/logs/respawn.log` |
| Heartbeat log | `oax-web/data/RESTLESS.log.md` |

The web UI logs modal reads from `/api/logs`.
