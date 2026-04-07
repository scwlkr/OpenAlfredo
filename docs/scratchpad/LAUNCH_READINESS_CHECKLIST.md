# OpenAlfredo Launch Readiness Checklist

> Generated 2026-04-07 by Reality Checker assessment.
> Work through each item sequentially. Check the box when the fix is verified.

---

## Issue #1: Build Is Broken

**Severity:** Critical — blocks all deployment
**File:** `oax-web/src/lib/restart.ts:12`
**Root cause:** `restart.ts` calls `spawn('node', [respawnBin, ...])` at the module level import chain. Next.js tries to bundle this for the edge/browser and fails to resolve the dynamic path `path.resolve(process.cwd(), '..', 'bin', 'respawn.js')`.

**Import chain:** `restart.ts` -> `oax-engine.ts` -> `api/chat/route.ts`

### Checklist

- [ ] Isolate `triggerPodRestart` behind a dynamic `import()` or lazy `require()` so Next.js doesn't try to statically resolve `child_process` and the path during build
- [ ] Alternatively, mark `restart.ts` exports as server-only (e.g., `import 'server-only'` at top) and ensure the chat route is not bundled for the edge runtime
- [ ] Run `npm run build` from `oax-web/` and confirm it completes with exit code 0
- [ ] Confirm `npm run start` serves the app on `:3000` after a successful build
- [ ] Confirm the dev server (`npm run dev`) still works after the fix

---

## Issue #2: Failing Test — Ambition Task Round-Trip

**Severity:** High — core feature regression
**File:** `oax-web/src/lib/__tests__/ambition.test.ts:68`
**Root cause:** `listTasks()` returns 1 task instead of 3 after three sequential `appendTask()` calls. Likely the `readAmbition()` -> `resolveReadPath()` fallback is reading from a stale file, or the `## Tasks` header insertion in `appendTask()` is clobbering prior entries.

### Checklist

- [ ] Run `npx vitest run src/lib/__tests__/ambition.test.ts` in isolation and read the full output
- [ ] Add a `console.log(fs.readFileSync(AMBITION_PATH, 'utf-8'))` after the three `appendTask()` calls to see the actual file state
- [ ] Confirm `appendTask` appends below `## Tasks` without overwriting previous lines — inspect the `readAmbition()` -> `resolveReadPath()` -> `CANONICAL_AMBITION_PATH` vs `LEGACY_AMBITION_PATH` fallback logic for the test environment
- [ ] Fix the root cause (likely a path resolution issue in the test's `beforeEach` setup vs what `resolveReadPath()` returns)
- [ ] Run the full test suite: `npx vitest run` — confirm 58/58 pass, 0 failures

---

## Issue #3: Telegram Token On Disk

**Severity:** Medium — secret management hygiene
**File:** `oax-web/.env`
**Reality correction:** `.env` is in `.gitignore` and was never committed to git history. The token exists only on your local disk. This is standard for local dev. The concern is limited to: if the repo goes public with an accidental `.env` inclusion, or if the disk is shared.

### Checklist

- [ ] Confirm `.env` is in `oax-web/.gitignore` (it is — line 30)
- [ ] Run `git log --all --oneline -- oax-web/.env` and confirm empty output (no history)
- [ ] Create `oax-web/.env.example` (if it doesn't already exist) with placeholder values and no real secrets
- [ ] Add a note to the README: "Copy `.env.example` to `.env` and fill in your values. Never commit `.env`."
- [ ] Consider whether the token should be rotated anyway as a precaution (if this repo was ever public with the file present)

---

## Issue #4: NPM Vulnerabilities (2 Critical, 1 High)

**Severity:** High — known CVEs in dependencies
**Packages:** `vite` (3 CVEs: path traversal, `server.fs.deny` bypass, WebSocket arbitrary file read), `tough-cookie` (prototype pollution)

### Checklist

- [ ] Run `npm audit` from `oax-web/` to get the current state
- [ ] Run `npm audit fix` to resolve non-breaking fixes (should handle `vite`)
- [ ] If `tough-cookie` requires `--force`, evaluate whether `node-telegram-bot-api@0.67.0` is compatible — check the changelog for breaking changes
- [ ] If the breaking upgrade is safe, run `npm audit fix --force`
- [ ] Run `npm audit` again — confirm 0 critical, 0 high vulnerabilities
- [ ] Run `npx vitest run` to confirm tests still pass after dependency updates
- [ ] Run `npm run build` to confirm build still succeeds

---

## Issue #5: No Deployment Story

**Severity:** High — no path from dev to production
**Context:** OpenAlfredo requires a local Ollama instance and uses SQLite on disk. There is no Dockerfile, no Vercel config, no deploy script.

### Checklist

- [ ] Decide the launch scope: **local-only tool** (users clone + run) vs. **hosted service**
- [ ] If local-only: add a clear "Installation" section to the README with prerequisites (Node 22+, Ollama installed, models pulled)
- [ ] If local-only: add a one-command bootstrap script (e.g., `oax setup` that checks Ollama, runs `npm install`, runs `prisma db push`, copies `.env.example`)
- [ ] If hosted: create a `Dockerfile` with Ollama sidecar or document the external Ollama requirement
- [ ] If hosted: address SQLite persistence (volume mount or migrate to PostgreSQL/Turso)
- [ ] Document the deployment path chosen in a `docs/DEPLOYMENT.md` or in the README under "## Deployment"

---

## Issue #6: Lint Is Broken

**Severity:** Medium — CI pipeline will fail
**Command:** `npx next lint` from `oax-web/` returns `Invalid project directory provided`
**Root cause:** ESLint 9 flat config or `next lint` misconfiguration after the recent ESLint upgrade (commit `cc4ef71`).

### Checklist

- [ ] Check if `oax-web/eslint.config.mjs` (or `.js`) exists and is valid ESLint 9 flat config
- [ ] If missing, create a minimal flat config: `import { dirname } from 'path'; ... export default [{ ... }]`
- [ ] Run `npx next lint` and confirm it exits cleanly (warnings are OK, errors are not)
- [ ] Run the full CI equivalent locally: `npm run lint && npx vitest run && npm run build`
- [ ] Verify the `.github/workflows/ci.yml` lint step will pass with this config

---

## Issue #7: API Key Auth Model

**Severity:** Low for local-only launch; High if ever network-exposed
**Files:** `oax-web/src/lib/auth.ts`, `oax-web/src/app/page.tsx:40-44`
**How it works:** A random 256-bit key is generated on first run, written to `data/.oax-api-key` (mode 0600), served to the browser via `/api/auth/key`, and sent as a Bearer token on every subsequent request.

### Checklist

- [ ] If launching as local-only: document this is single-user localhost auth and why it exists (prevents accidental cross-origin requests, not multi-tenant security)
- [ ] Add a comment or doc note: "The API key is a single-user local guard. It is not a substitute for authentication in a multi-user or network-exposed deployment."
- [ ] Confirm `data/.oax-api-key` has mode `0600` (owner-only read/write) — it does via `auth.ts:26`
- [ ] If the app will ever be network-accessible: design a proper auth flow (session cookies, OAuth, or similar) — file a tracking issue
- [ ] Remove the `(window as any).__OAX_API_KEY` global in favor of a React context or cookie — file a tracking issue for future cleanup

---

## Issue #8: Self-Modification — FEATURE, NOT A BUG

**Severity:** N/A — this is a core design feature
**Files:** `oax-web/src/lib/self-edit.ts`, `oax-web/src/lib/oax-engine.ts`
**What it does:** The agent can read, surgically edit, or fully rewrite its own source code via `[[READ_FILE]]`, `[[EDIT_FILE]]`, and `[[WRITE_FILE]]` markers in its replies. Paths are sandboxed to the repo root with explicit blocklists (`.git/`, `node_modules/`, `.next/`, `data/`, `.db` files).

### Checklist — Document as a Feature

- [ ] Write a `docs/SELF_MODIFICATION.md` explaining the feature, its purpose, and its safety boundaries
- [ ] Document the three marker types with examples (READ, EDIT, WRITE)
- [ ] Document the sandbox rules: what paths are allowed, what paths are blocked, and why
- [ ] Document the `anyEditOk` gate on `[[RESTART_POD]]` (prevents restart loops from failed edits)
- [ ] Document the logging: all edits are logged via `logInfo('self_edit_applied' | 'self_edit_failed', ...)`
- [ ] Add a "Power User Warning" section: this feature gives the agent real filesystem write access — users should review edits in git diff before committing
- [ ] Add the self-modification feature to the README under a "## Features" or "## How It Works" section
- [ ] Reference `docs/scratchpad/SELF_MOD_TEST_PROMPTS.md` for testing the feature

---

## Issue #9: `gh` CLI Not Installed

**Severity:** Low — local tooling gap, not a product issue
**Context:** The `gh` CLI is not installed on this machine, so CI run history couldn't be verified during assessment.

### Checklist

- [ ] Install `gh`: `brew install gh` and authenticate with `gh auth login`
- [ ] Run `gh run list --limit 5` to check if CI has ever passed on `main`
- [ ] If CI is failing: fix the issues (lint config, build error) and push a green build
- [ ] If CI has never run: push to `main` or open a PR to trigger the workflow
- [ ] Confirm the GitHub Actions workflow (`.github/workflows/ci.yml`) passes: lint, test, build

---

## Issue #10: Single-Page Application

**Severity:** Low — design choice, not a defect
**Context:** The entire UI lives in `src/app/page.tsx` (532 lines). There's one page with modals for logs and tasks.

### Checklist

- [ ] Decide if this is intentional for MVP (likely yes — chat + sidebar + modals is a complete interface)
- [ ] If launching as-is: no action needed, but document that the UI is a single-surface chat interface
- [ ] If expanding later: file tracking issues for additional routes (e.g., `/settings`, `/agents`, `/history`)
- [ ] Consider extracting the Task Queue modal and Runtime Logs modal into separate components for maintainability — not blocking for launch

---

## Issue #11: Window Global for API Key

**Severity:** Low — cosmetic / code quality
**File:** `oax-web/src/app/page.tsx:18-22`
**What it does:** `(window as any).__OAX_API_KEY` is set on bootstrap and read by `authFetch()`.

### Checklist

- [ ] Acknowledge this works for a single-page local app — not blocking for launch
- [ ] File a cleanup issue: migrate to React context, a cookie, or `next-auth` session when multi-user is needed
- [ ] No immediate action required

---

## Issue #12: Hardcoded Fallback Models vs. Env Default

**Severity:** Low — UX inconsistency
**Files:** `oax-web/src/app/page.tsx:54` (fallback: `['llama3', 'mistral', 'phi3']`), `oax-web/.env` (default: `gemma4:26b`)
**What happens:** If Ollama is unreachable, the dropdown shows llama3/mistral/phi3 — none of which may be installed. The env default `gemma4:26b` isn't in the fallback list.

### Checklist

- [ ] Change the fallback list in `page.tsx` to match a reasonable default or read from an env-exposed config
- [ ] Alternatively, show an error state when Ollama is unreachable instead of showing fake model options
- [ ] Confirm the dropdown works when Ollama is running (it fetches real models from `/api/models`)
- [ ] Test the fallback path: stop Ollama, reload the page, confirm the UX is reasonable

---

## Issue #13: No React Error Boundary

**Severity:** Medium — a single JS error crashes the entire UI
**File:** `oax-web/src/app/page.tsx` (no error boundary wrapping)

### Checklist

- [ ] Add a top-level error boundary component wrapping the chat interface
- [ ] The error boundary should show a "Something went wrong — reload" message, not a white screen
- [ ] Next.js 14+ supports `error.tsx` convention — create `src/app/error.tsx` as the global fallback
- [ ] Test by temporarily throwing in a component — confirm the error boundary catches it
- [ ] Optionally add `src/app/global-error.tsx` for root layout errors

---

## Issue #14: No Rate Limiting on API Routes

**Severity:** Low for local-only; High if network-exposed
**Files:** All routes under `src/app/api/` — `chat/`, `ambition/`, `logs/`, `models/`, `onboarding/`, `transcripts/`, `auth/`

### Checklist

- [ ] If launching as local-only: document that rate limiting is not needed for single-user localhost
- [ ] If the app will be network-accessible: add middleware-level rate limiting (e.g., `next-rate-limit` or a custom in-memory counter)
- [ ] At minimum, the `/api/chat` route should have basic protection — each call hits Ollama and can saturate GPU/CPU
- [ ] File a tracking issue for rate limiting if not implementing now

---

## Issue #15: Minimal Prisma Schema

**Severity:** Low — appropriate for current scope
**File:** `oax-web/prisma/schema.prisma`
**Models:** `ChatSession` (id, agentId, model, timestamps, messages) and `TranscriptEntry` (id, sessionId, role, content, searchTags, timestamp)

### Checklist

- [ ] Confirm the schema supports all current features (it does — chat sessions + transcript storage)
- [ ] If multi-agent support is planned: the `agentId` field on `ChatSession` already supports it — no schema change needed
- [ ] If user accounts are planned: file a tracking issue for a `User` model and session auth
- [ ] Run `npx prisma db push` and confirm the schema syncs without errors
- [ ] No immediate action required — the schema is right-sized for the current feature set

---

## Launch Decision Matrix

| Item | Blocking? | Effort | Status |
|------|-----------|--------|--------|
| #1 Build broken | YES | 1-2 hrs | [ ] |
| #2 Failing test | YES | 1 hr | [ ] |
| #3 Token hygiene | NO (gitignored) | 30 min | [ ] |
| #4 NPM vulns | YES | 30 min | [ ] |
| #5 Deployment story | YES | 2-4 hrs | [ ] |
| #6 Lint broken | YES (CI fails) | 1 hr | [ ] |
| #7 Auth model | NO (local-only) | doc only | [ ] |
| #8 Self-modification | NO (feature) | doc only | [ ] |
| #9 `gh` CLI | NO | 10 min | [ ] |
| #10 Single page | NO | none | [ ] |
| #11 Window global | NO | none | [ ] |
| #12 Fallback models | NO | 30 min | [ ] |
| #13 Error boundary | YES | 1 hr | [ ] |
| #14 Rate limiting | NO (local-only) | none | [ ] |
| #15 Schema size | NO | none | [ ] |

**Minimum for launch:** Fix #1, #2, #4, #5, #6, #13. Document #8.
**Estimated time to unblock:** 1-2 days focused work.
