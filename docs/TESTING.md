# Testing Guide

This document covers how to run, write, and organize tests for OpenAlfredo.

## Running Tests

All test commands run from the `oax-web/` directory (or from root where noted):

```bash
# Single-pass run (CI-like)
cd oax-web && npx vitest run

# Watch mode (re-runs on file change — best for development)
cd oax-web && npx vitest

# With coverage report
cd oax-web && npx vitest run --coverage

# Single test file
cd oax-web && npx vitest run src/lib/__tests__/tasks.test.ts

# From the repo root (delegates to oax-web)
npm test

# Tests + lint in one pass
npm run check
```

## Test Organization

All test files live in `oax-web/src/lib/__tests__/`:

| File | What it tests |
|------|--------------|
| `tasks.test.ts` | Task CRUD, marker parsing, `dueTasks()` cron logic, `/api/tasks` route |
| `ambition-reflection.test.ts` | Reflection prompt construction, `generateReflection()`, AMBITION.md writing |
| `workspace.test.ts` | File saves (with subdir routing), sticky notes, listing, path traversal protection |
| `chat-api.test.ts` | Web chat streaming, model switching, marker handling (TASK, SAVE_FILE) |
| `onboarding.test.ts` | SOUL.md creation, existence check, `/api/onboarding` route |
| `memory-retrieval.test.ts` | 3-layer memory: SOUL, transcripts, topic keyword matching |
| `self-edit.test.ts` | READ/EDIT/WRITE markers, path sandboxing, security |
| `telegram-daemon.test.ts` | Telegram delegation to shared engine, `checkCronTasks()` |
| `logger.test.ts` | JSONL log writing |
| `models-api.test.ts` | `/api/models` Ollama model listing |
| `transcripts-api.test.ts` | `/api/transcripts` search |

## Writing Tests

### Conventions

1. **Mock Ollama** — Tests never hit a running Ollama instance. Use `vi.mock('ollama', ...)` or `vi.mock('ai', ...)` to stub LLM calls.

2. **File backup/restore** — Tests that modify state files (TASKS.md, AMBITION.md, workspace) must save the original in `beforeAll` and restore in `afterAll`/`afterEach`:

   ```ts
   let original: string;
   beforeAll(() => {
     original = fs.existsSync(PATH) ? fs.readFileSync(PATH, 'utf-8') : '';
   });
   afterAll(() => {
     fs.writeFileSync(PATH, original);
   });
   ```

3. **API route tests** — Import the handler directly and construct `Request` objects:

   ```ts
   import { GET, POST } from '../../app/api/tasks/route';

   const res = await POST(new Request('http://local/api/tasks', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ task: 'buy milk' }),
   }));
   expect(res.status).toBe(200);
   ```

4. **Test markers** — Use a random marker prefix to isolate test data from real data:

   ```ts
   const MARKER = 'test-' + Math.random().toString(36).slice(2, 8);
   ```

5. **Cleanup created files** — Track files created during tests and remove them in `afterEach`:

   ```ts
   const written: string[] = [];
   afterEach(() => {
     for (const p of written.splice(0)) {
       if (fs.existsSync(p)) fs.unlinkSync(p);
     }
   });
   ```

### Adding a new test

1. Create `oax-web/src/lib/__tests__/<module>.test.ts`
2. Import from `vitest` and the module under test
3. Mock external dependencies (Ollama, Prisma) as needed
4. Follow the conventions above
5. Run `npx vitest run` to verify

## Coverage

Coverage reports are generated with `npx vitest run --coverage` (uses `@vitest/coverage-v8`).

**Targets:**
- `src/lib/*.ts` — 80%+
- `src/app/api/**/route.ts` — 70%+
- New modules must ship with tests

The coverage report is printed to stdout (`text` reporter) and also written as `lcov` for tool integration.

## No Live Dependencies Required

Tests are designed to run without:
- A running Ollama instance
- A Telegram bot token
- An active database (Prisma is mocked where needed)

This means you can run `npm test` on any machine with Node 20+ after `npm install`.
