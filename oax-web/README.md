# oax-web

`oax-web` contains the OpenAlfredo application runtime:

- Next.js 16 App Router UI.
- API routes for chat, onboarding, tasks, workspace, settings, logs, models, and transcripts.
- Prisma and SQLite persistence.
- Shared chat engine.
- Ollama integration.
- Optional Telegram daemon.

## Run

From this package:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For the full local stack, start from the repo root:

```bash
node bin/oax.js pod
```

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
npm run test:watch
npm run test:coverage
npm run db:generate
npm run db:push
```

## Key paths

- `src/app/` - web routes, API routes, and app shell.
- `src/components/` - UI components.
- `src/lib/oax-engine.ts` - shared chat engine.
- `src/lib/oax.ts` - Telegram and background-loop helpers.
- `src/lib/paths.ts` - mutable runtime path constants.
- `src/lib/runtime-settings.ts` - runtime setting defaults and validation.
- `daemon.ts` - Telegram and cron daemon entry point.
- `prisma/schema.prisma` - database schema.
- `scripts/prisma-runtime-db.mjs` - runtime-database Prisma wrapper.

## Environment

Copy the template when bootstrap has not already done it:

```bash
cp .env.example .env
```

OpenAlfredo stores SQLite state in `oax-web/data/oax.db` by default. You usually do not need to set `DATABASE_URL`; the app runtime and `db:*` scripts pin Prisma to that database. If you override it, use an absolute SQLite URL.

See [../docs/README.md](../docs/README.md) for the full documentation map.
