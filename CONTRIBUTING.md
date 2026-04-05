# Contributing to Death of Prompt

Thanks for your interest in DOP. This is a local-first prototype, so the
contribution model stays simple: small, focused PRs with tests and docs.

## Dev setup

```bash
# Prerequisites: Node 20+, Ollama running locally
git clone https://github.com/scwlkr/DeathOfPrompt.git
cd DeathOfPrompt
npm install                  # runs bootstrap automatically
cd dop-web && npm install
cd ..
dop pod                      # → http://localhost:3000
```

The `postinstall` bootstrap copies `examples/SOUL.example.md` and
friends into `dop-web/data/`, generates a local API key, and runs
`prisma db push`. Re-run it any time with `node bin/bootstrap.js`
(idempotent) or `node bin/bootstrap.js --force` to reset.

## Running tests

```bash
cd dop-web
npx vitest              # all tests, watch mode
npx vitest run          # one-shot
npx vitest run src/lib/__tests__/ambition.test.ts   # single file
```

Tests don't require Ollama — the provider is mocked.

## Linting

```bash
cd dop-web && npm run lint
```

## Regenerating the Prisma client

After schema edits:

```bash
cd dop-web
npx prisma generate
npx prisma db push
```

## Branch naming

- `feat/<scope>-<short-desc>` — new feature
- `fix/<scope>-<short-desc>` — bug fix
- `refactor/<scope>-<short-desc>` — code health
- `docs/<short-desc>` — docs only

## Commit messages

Conventional commits:

```
feat: add [[EMAIL: …]] marker
fix: correct path traversal check in workspace.ts
refactor: centralize mutable-state paths (spec §3.1)
docs: document heartbeat log rotation
```

## Pull requests

Before opening a PR:

- [ ] Tests pass (`npx vitest run`)
- [ ] Lint clean (`npm run lint`)
- [ ] Docs updated if behavior changed
- [ ] No new owner-private paths (use `src/lib/paths.ts`)
- [ ] No `[[SELF_MOD]]` artifacts accidentally committed
- [ ] No secrets in commits (`.env`, `.dop-api-key`, etc.)

The PR template walks through this.

## Proposing a new marker

Markers are DOP's extension point. To add one:

1. Pick a name. Use `[[UPPERCASE: …]]` for single-line markers or
   `[[UPPERCASE: …]]…[[/UPPERCASE]]` for blocks.
2. Write the parser + handler in a new `src/lib/<marker>.ts`.
3. Import in `src/lib/dop-engine.ts::handleMarkers()` — parse,
   side-effect, strip.
4. Document the marker in `buildSystemPrompt()` so the model knows how
   to emit it.
5. Add tests: parser (happy path + malformed), handler (side-effect +
   idempotency), engine integration (cleaned reply shape).
6. Document in `docs/ARCHITECTURE.md` under "Extension points".

## Proposing a new memory layer

1. Extend `MemorySlice.source` union in `src/lib/memory-retrieval.ts`.
2. Add the retrieval call inside `retrieveContext()`.
3. Log via `logInfo('context_retrieved', …)`.
4. Test: retrieval hit path, miss path, error path.

## Code style

- TypeScript strict.
- Comments explain _why_, not _what_.
- Prefer named exports.
- Paths go through `src/lib/paths.ts`, not `process.cwd()` string joins.
- Keep runtime surface small — no new deps without discussion.

## Community

Be kind. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Questions

Open a discussion or an issue. Security issues go private — see
[docs/SECURITY.md](./docs/SECURITY.md).
