# DevOps Guide

Operational and developer-only workflows live here so the user-facing docs can stay focused on what OpenAlfredo does, not how to manage local environments.

## Bootstrap

Fresh clone setup:

```bash
git clone https://github.com/scwlkr/OpenAlfredo.git
cd OpenAlfredo
npm install
cd oax-web && npm install && cd ..
node bin/bootstrap.js
```

`node bin/bootstrap.js` creates:

- `oax-web/data/`
- `oax-web/.env` from `oax-web/.env.example` if missing
- `oax-web/data/oax.db`
- `oax-web/data/.oax-api-key`

## Standard Runtime

Normal local runtime:

```bash
oax pod
```

This uses the personal profile rooted at `oax-web/data/`.

## Sandbox Profiles

Use sandbox profiles when you want to replay onboarding or validate seeded states without touching the personal profile.

Each sandbox profile gets:

- isolated state under `oax-web/.profiles/<name>/data`
- its own env overlay at `oax-web/.profiles/<name>/.env`
- its own SQLite database
- a stable web session id so returning-user fixtures can show transcript history

### Commands

```bash
oax dev start --profile <name> --fixture blank|seeded|returning [--reset] [--port <n>]
oax dev reset --profile <name> --fixture blank|seeded|returning
```

Defaults:

- profile: `sandbox`
- fixture: `blank`
- port: `3001`

### Fixtures

- `blank`: bootstrapped state with `SOUL.md` removed so onboarding appears
- `seeded`: bootstrapped state with a ready default SOUL
- `returning`: seeded state plus tasks, topic memory, workspace artifact, themes, and transcript history

### Examples

```bash
# Show onboarding every time
oax dev start --profile onboarding --fixture blank --reset --port 3001

# Skip onboarding with a prepared SOUL
oax dev start --profile seeded --fixture seeded --reset --port 3002

# Simulate a returning user
oax dev start --profile returning --fixture returning --reset --port 3003
```

Reset a profile without starting the web server:

```bash
oax dev reset --profile onboarding --fixture blank
```

## Important Constraint

Sandbox profiles are web-only in v1.

- They do not start the Telegram daemon.
- They do not participate in `oax pod` orchestration.
- They cannot run alongside another `next dev` process from the same `oax-web/` checkout.

If `oax pod` or another `npm run dev` is already running from this repo, `oax dev start` will fail fast with a clear message. The profile data remains untouched.

## Recommended Testing Loop

Replay first-run onboarding:

```bash
oax dev start --profile onboarding --fixture blank --reset --port 3001
```

Validate a returning-user flow:

```bash
oax dev start --profile returning --fixture returning --reset --port 3002
```

Compare both states quickly by resetting the target fixture before each run instead of wiping `oax-web/data/`.
