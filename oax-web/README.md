# oax-web

This package contains the OpenAlfredo application runtime:

- Next.js 14 App Router UI
- Prisma + SQLite persistence
- shared chat engine
- Telegram daemon
- Ollama integration

## Run It

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npx vitest run
npx prisma generate
npx prisma db push
```

## Key Paths

- `src/app/` - web routes and UI
- `src/lib/oax-engine.ts` - shared chat engine
- `src/lib/oax.ts` - Telegram and heartbeat surface
- `src/lib/paths.ts` - mutable runtime paths
- `daemon.ts` - Telegram + cron daemon entrypoint
- `prisma/schema.prisma` - database schema

## Environment

Copy the template:

```bash
cp .env.example .env
```

The default SQLite database path is `file:./data/oax.db`.
