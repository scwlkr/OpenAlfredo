# CI debugging runbook

Use this when GitHub Actions fails, especially when the failure involves Vitest, Prisma, SQLite, or missing API routes.

## Why this exists

A prior CI incident looked like random failing tests but had separate causes:

- API routes were removed while tests and UI imports still depended on them.
- Prisma CLI and Prisma runtime used different SQLite files when `DATABASE_URL` was relative.
- Local private state under `oax-web/data/` changed test expectations outside CI.

The rule is simple: start from the exact failing run, exact pushed commit, and exact database file.

## Current repo contract

- Runtime database: `oax-web/data/oax.db`.
- Prisma setup commands: `npm run db:generate` and `npm run db:push` from `oax-web/`.
- Do not rely on raw `npx prisma generate` or `npx prisma db push` unless you pass an explicit absolute `DATABASE_URL`.
- Do not rely on `oax-web/prisma/data/oax.db`; it is not the runtime database.
- CI is `.github/workflows/ci.yml` and runs on pushes to `main` and pull requests targeting `main`.

## Debugging method

1. Start from the exact failing run.

   ```bash
   gh auth status
   gh run view <run-id> --log
   ```

2. Search the actual failing lines.

   ```bash
   gh run view <run-id> --log | rg "Cannot find module|P2021|does not exist|DATABASE_URL"
   ```

3. Verify the pushed commit contents.

   ```bash
   git show <sha> --name-status
   git ls-tree -r --name-only <sha> -- oax-web/src/app/api
   ```

4. Reproduce in a clean worktree.

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

5. Inspect the runtime SQLite file if the failure smells database-related.

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

6. Check for leaked local state if local tests fail unexpectedly.

   ```bash
   rg --files oax-web/data
   ```

   Start with:

   - `oax-web/data/themes.json`;
   - `oax-web/data/AMBITION.md`;
   - `oax-web/data/TASKS.md`;
   - `oax-web/data/logs/`.

## Fast failure map

| Failure | Likely cause |
|---|---|
| `Cannot find module '../../app/api/chat/route'` | Route was deleted or renamed while tests/UI still import it. |
| `Cannot find module '../../app/api/onboarding/route'` | Same route/test mismatch pattern. |
| `The table main.ChatSession does not exist` | Prisma is pointing at the wrong SQLite file or schema was not pushed. |
| Local passes, CI fails | Current worktree differs from pushed commit, tests read private local state, or Prisma paths differ. |

## Prevention rules

- Keep API routes and tests in sync during refactors.
- Use the repo-owned `db:*` scripts for Prisma operations.
- Prefer absolute SQLite URLs for overrides.
- Verify both the active workspace and a clean worktree before declaring CI fixed.
