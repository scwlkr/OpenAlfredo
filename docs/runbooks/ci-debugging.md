# CI Debugging Runbook

Use this when GitHub Actions fails, especially if the failure involves Vitest, Prisma, or SQLite.

## Why This Exists

A real CI incident on April 8, 2026 looked like "random failing tests" but had three separate causes:

- `/api/chat` and `/api/onboarding` had been deleted while the app and tests still depended on them.
- Prisma CLI and Prisma runtime were not using the same SQLite file when `DATABASE_URL` was relative.
- A local `oax-web/data/themes.json` file leaked into tests and changed expectations outside CI.

The lesson was simple: do not guess from symptoms. Pin down the exact failing run, exact pushed commit, and exact database file each process is touching.

## Current Repo Contract

- The runtime database is `oax-web/data/oax.db`.
- Use `npm run db:generate` and `npm run db:push` from `oax-web/`.
- Do not rely on `npx prisma generate` or `npx prisma db push` directly for this repo unless you also pass an explicit absolute `DATABASE_URL`.
- Do not rely on `oax-web/prisma/data/oax.db`. It is not the runtime database.
- CI is defined in `.github/workflows/ci.yml` and runs on every push to `main` and every PR targeting `main`.

## Debugging Method

1. Start from the exact failing run.

```bash
gh auth status
gh run view <run-id> --log
```

2. Read the actual failing lines. Do not infer from the summary UI.

```bash
gh run view <run-id> --log | rg "Cannot find module|P2021|does not exist|DATABASE_URL"
```

3. Verify the pushed commit contents, not your current dirty worktree.

```bash
git show <sha> --name-status
git ls-tree -r --name-only <sha> -- oax-web/src/app/api
```

4. Reproduce in a clean checkout.

```bash
git worktree add --detach /tmp/oax-ci HEAD
cd /tmp/oax-ci
npm ci
cd oax-web
npm ci
npm run db:generate
npm run db:push
npm run lint
npx vitest run
npm run build
```

5. If the issue smells database-related, inspect the actual attached SQLite file from runtime.

```bash
cd oax-web
npx tsx <<'EOF'
const dbModule = await import('./src/lib/db.ts');
const prisma = (dbModule.default ?? dbModule).prisma;
const rows = await prisma.$queryRawUnsafe('PRAGMA database_list;');
for (const row of rows) console.log(`${row.seq}|${row.name}|${row.file}`);
await prisma.$disconnect();
EOF
```

6. If local tests fail unexpectedly, check for leaked owner-private state under `oax-web/data/`.

Files worth checking first:

- `oax-web/data/themes.json`
- `oax-web/data/AMBITION.md`
- `oax-web/data/TASKS.md`
- `oax-web/data/logs/`

## Fast Failure Map

- `Cannot find module '../../app/api/chat/route'`
  Likely the route was deleted or renamed while tests and UI still import it.

- `Cannot find module '../../app/api/onboarding/route'`
  Same pattern as above.

- `The table main.ChatSession does not exist`
  Prisma is pointing at the wrong SQLite file or the runtime DB schema was never pushed.

- Local passes, CI fails
  Usually means one of:
  - your worktree is ahead of the pushed commit
  - tests are reading local private state
  - Prisma CLI and runtime are using different DB paths

## Rules That Prevent Repeat Incidents

- Keep API routes and tests in sync during refactors.
- Use the repo-owned `db:*` scripts for Prisma operations.
- Prefer absolute SQLite URLs for overrides.
- Verify both in the active workspace and in a clean worktree before declaring CI fixed.
