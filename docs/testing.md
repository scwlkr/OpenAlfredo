# Testing

OpenAlfredo tests live in `oax-web/src/lib/__tests__/` and run with Vitest.

## Commands

From `oax-web/`:

```bash
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run build
```

From the repo root:

```bash
npm test
```

Run a single file:

```bash
cd oax-web
npx vitest run src/lib/__tests__/tasks.test.ts
```

## Test files

| File | Coverage |
|---|---|
| `ambition-reflection.test.ts` | Reflection prompt construction and AMBITION writes. |
| `chat-api.test.ts` | Web chat route, streaming, model switching, and marker handling. |
| `chat-failure.test.ts` | Chat failure classification and structured error payloads. |
| `golden-goose.test.ts` | Continuity loop integration behavior. |
| `inference.test.ts` | Theme extraction, merging, and follow-up inference. |
| `logger.test.ts` | JSONL log writing. |
| `memory-retrieval.test.ts` | SOUL, topic files, and transcript memory retrieval. |
| `models-api.test.ts` | `/api/models` behavior. |
| `onboarding.test.ts` | SOUL creation and onboarding checks. |
| `runtime-settings.test.ts` | Runtime setting sanitation and validation. |
| `sandbox-onboarding-route.test.ts` | Onboarding route behavior under sandbox state. |
| `sandbox-profiles.test.ts` | Sandbox fixture creation and profile isolation. |
| `self-edit.test.ts` | Self-edit marker parsing and path sandboxing. |
| `settings-route.test.ts` | `/api/settings` validation and writes. |
| `tasks.test.ts` | Task parsing, CRUD behavior, and due-task logic. |
| `telegram-daemon.test.ts` | Telegram delegation and cron task checks. |
| `transcripts-api.test.ts` | Transcript search. |
| `workspace.test.ts` | Workspace writes, listing, and path protection. |

## Conventions

- Mock Ollama, AI SDK calls, and Telegram where tests need model or network behavior.
- Back up and restore runtime files touched by a test.
- Track generated files and remove them in `afterEach`.
- Use random marker prefixes for state written into `TASKS.md`, workspace files, or transcripts.
- Test API routes by importing route handlers directly and constructing `Request` objects.

## Coverage

Coverage uses `@vitest/coverage-v8`:

```bash
cd oax-web
npm run test:coverage
```

Coverage output is generated under `oax-web/coverage/` and should not be committed.

## CI

CI runs on Node 22 and performs:

1. root `npm ci`;
2. `oax-web` `npm ci`;
3. `npm run db:generate`;
4. `npm run db:push`;
5. `npm run lint`;
6. `npx vitest run`;
7. `npx next build`.

See [CI debugging runbook](runbooks/ci-debugging.md) when a GitHub Actions run fails.
