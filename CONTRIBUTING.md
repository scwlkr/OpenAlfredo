# Contributing to OpenAlfredo

OpenAlfredo is a local-first prototype. Keep contributions small, focused, tested, and documented.

## Setup

```bash
git clone https://github.com/scwlkr/OpenAlfredo.git
cd OpenAlfredo
npm install
cd oax-web && npm install && cd ..
node bin/bootstrap.js
node bin/oax.js pod
```

Open `http://localhost:3000`.

Run `npm link` from the repo root only if you want to use `oax` instead of `node bin/oax.js`.

## Tests and checks

```bash
cd oax-web
npm test
npm run lint
npm run build
```

Root shortcut:

```bash
npm test
```

Tests mock model and Telegram behavior unless a test explicitly documents otherwise.

## Database

After schema changes, use the repo-owned scripts:

```bash
cd oax-web
npm run db:generate
npm run db:push
```

Do not rely on raw Prisma commands unless you pass an explicit absolute `DATABASE_URL`.

## Branch naming

- `feat/<scope>-<short-desc>` for features.
- `fix/<scope>-<short-desc>` for bug fixes.
- `refactor/<scope>-<short-desc>` for code health.
- `docs/<short-desc>` for documentation-only changes.

## Commit messages

Use conventional commits:

```text
feat: add [[EMAIL]] marker
fix: correct workspace path traversal check
refactor: centralize mutable-state paths
docs: document heartbeat log rotation
```

## Pull request checklist

Before opening a PR:

- [ ] Tests pass.
- [ ] Lint passes.
- [ ] Build passes when behavior or package boundaries changed.
- [ ] Docs are updated when behavior changed.
- [ ] Runtime paths use `oax-web/src/lib/paths.ts`.
- [ ] No `.env`, API keys, databases, logs, or private runtime state are committed.
- [ ] No accidental self-edit artifacts are committed.

## Extension points

Add a marker by writing a parser/handler under `oax-web/src/lib/`, importing it in `oax-web/src/lib/oax-engine.ts`, documenting it in the system prompt, adding tests, and updating [Architecture](docs/architecture.md).

Add a memory layer by extending `MemorySlice.source`, adding retrieval in `retrieveContext()`, logging with `logInfo('context_retrieved', ...)`, and testing hit, miss, and error paths.

## Documentation

Use [docs/README.md](docs/README.md) as the documentation map, [docs/glossary.md](docs/glossary.md) for terminology, and [docs/style-guide.md](docs/style-guide.md) for documentation rules.

## Community and security

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Report security issues privately; see [docs/security.md](docs/security.md).
