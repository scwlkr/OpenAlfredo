# OpenAlfredo Launch Readiness Checklist

> Reviewed 2026-04-08 against the current repo state.
> This replaces the older checklist that was written against a previous OA snapshot.

## Verification Snapshot

### Commands run

- `cd oax-web && npm test` -> passes (`104 passed`)
- `cd oax-web && npm run lint` -> fails
- `cd oax-web && npm run build` -> passes, but with Next.js 16 warnings

### Important interpretation

- The old "`restart.ts` breaks build" issue is no longer current. The production build succeeds.
- The old ambition/task round-trip test failure is no longer current. The full test suite is green.
- The main hard blocker today is lint/CI hygiene, not build correctness.

---

## Legacy Items That No Longer Apply

### Retired: Build broken via `restart.ts`

`oax-web/src/lib/restart.ts` now hides Node-only imports behind runtime `eval('require')`, and `npm run build` completes successfully.

### Retired: Ambition append test failure

The old failing test no longer reproduces. `npm test` currently passes end-to-end.

### Retired: Missing `.env.example`

`oax-web/.env.example` already exists and covers the main runtime knobs.

### Retired: `next lint` directory/config bug

Lint is still failing, but not because `next lint` is misconfigured. The repo now runs `eslint .`, and the failures are real code issues plus generated artifacts being linted.

### Retired: "single-page app" as a launch defect

The app is still a single route, but the UI has already been split into focused components under `oax-web/src/components/`. This is not a launch-readiness problem by itself.

### Retired: `gh` CLI missing

That was a machine-local tooling gap, not a product launch issue.

---

## Current Launch Issues

### Issue #1: Lint / CI Is Red

**Severity:** Critical — current quality gate is failing

**What is happening now**

`npm run lint` fails on current source files and also lints generated coverage assets.

**Observed failures**

- `oax-web/src/components/ReflectionPanel.tsx` — `react-hooks/set-state-in-effect`
- `oax-web/src/components/ReflectionPanel.tsx` — `react/no-unescaped-entities`
- `oax-web/src/components/SettingsPanel.tsx` — `react-hooks/set-state-in-effect`
- `oax-web/src/components/TasksModal.tsx` — `react-hooks/purity` (`Date.now()` during render)
- `oax-web/src/components/WorkspacePanel.tsx` — `react-hooks/set-state-in-effect`
- `oax-web/coverage/lcov-report/*.js` — generated files are being linted

### Checklist

- [ ] Exclude generated coverage output from linting in flat ESLint config
- [ ] Refactor `ReflectionPanel`, `SettingsPanel`, and `WorkspacePanel` to satisfy current React hook rules
- [ ] Remove the impure render-time `Date.now()` call from `TasksModal`
- [ ] Fix the unescaped quotes in `ReflectionPanel`
- [ ] Run `cd oax-web && npm run lint` and confirm exit code `0`
- [ ] Re-run `cd oax-web && npm test && npm run build`

---

### Issue #2: Next.js 16 Migration Warnings Are Real

**Severity:** High — build passes, but the app is carrying migration debt

**Observed during `npm run build`**

- Next.js warns that `src/middleware.ts` uses a deprecated file convention and should move to `proxy`
- Next.js warns that workspace root inference is ambiguous because both repo root and `oax-web/` have lockfiles
- Turbopack warns that tracing from `next.config.mjs` -> `src/lib/paths.ts` -> `src/app/api/onboarding/route.ts` may be pulling in more of the project than intended

### Checklist

- [ ] Replace `oax-web/src/middleware.ts` with the current Next.js 16 `proxy` convention
- [ ] Set `turbopack.root` in `oax-web/next.config.mjs`
- [ ] Reduce or explicitly annotate the dynamic path tracing coming from `src/lib/paths.ts`
- [ ] Re-run `cd oax-web && npm run build` and confirm warnings are either removed or consciously accepted

---

### Issue #3: Settings Writes Are Not Validated

**Severity:** High — user-editable config can create invalid runtime state

**Files**

- `oax-web/src/app/api/settings/route.ts`
- `oax-web/daemon.ts`

**Why it matters**

The settings UI allows free-text cron edits. The API writes those strings directly into `.env`, and the daemon later passes them straight into `cron.schedule(...)`. There is no validation step in the API and no defensive startup handling in the daemon.

That means a bad cron string can turn "save settings" into "next daemon boot fails or behaves unpredictably."

### Checklist

- [ ] Validate cron expressions in `/api/settings` before writing them
- [ ] Add daemon-side startup guards so one bad env value does not crash scheduling
- [ ] Return actionable validation errors to the UI instead of silently writing bad config
- [ ] Decide whether settings should be rejected atomically when any one field is invalid
- [ ] Add tests covering invalid cron input

---

### Issue #4: Architecture Drift Between Tasks, AMBITION, and Docs

**Severity:** Medium — the codebase is internally inconsistent in a way that will confuse future edits

**Examples**

- `oax-web/src/lib/oax-engine.ts` still tells the model that `[[TASK: ...]]` markers are appended to `AMBITION.md`
- Actual task persistence now goes to `TASKS.md` via `appendTask()`
- Root docs and package docs still describe `oax-web` as "Next.js 14" even though the package is on Next.js `16.2.2`
- Several comments and doc paths still reflect the older task/reflection split
- docs/OAX_MVP_PLAN.md should always be the ultimate authority on program architecture

### Checklist

- [ ] Update the system prompt in `oax-web/src/lib/oax-engine.ts` so task markers describe `TASKS.md`, not `AMBITION.md`
- [ ] Audit comments and test descriptions that still describe the pre-migration behavior
- [ ] Update `README.md`, `oax-web/README.md`, and `docs/ARCHITECTURE.md` to reflect Next.js 16 and the current data model
- [ ] Re-check any user-facing docs that describe AMBITION vs TASKS ownership

---

### Issue #5: No Error Boundary / Recovery Screen

**Severity:** Medium — a client-side crash still degrades to a poor failure mode

**Current state**

`oax-web/src/app/` has no `error.tsx` or `global-error.tsx`.

### Checklist

- [ ] Add `oax-web/src/app/error.tsx` for route-level recovery
- [ ] Decide whether `global-error.tsx` is also needed
- [ ] Show a clear reload/recovery message instead of a broken blank surface
- [ ] Verify the fallback with an intentional throw in a client component

---

### Issue #6: Launch Scope and Security Boundary Need To Be Explicit

**Severity:** Medium for any broader release; Low if kept strictly local-first

**Current state**

- The API auth model is still a localhost bootstrap key served through `/api/auth/key`
- The browser stores it on `window.__OAX_API_KEY`
- There is still no rate limiting layer on the API routes

This is acceptable for a single-user local tool. It is not a network-exposed auth model.

### Checklist

- [ ] State explicitly in the docs that the supported launch scope is local-first / single-user unless stronger auth is added
- [ ] Document that the current API key mechanism is a local guard, not multi-user auth
- [ ] Decide whether rate limiting is out-of-scope for local launch or should be added now
- [ ] File a follow-up if network exposure is planned

---

### Issue #7: Telegram Pairing Behavior No Longer Matches the Older Persistence Story

**Severity:** Low to Medium — user-facing behavior and docs are drifting apart

**Files**

- `oax-web/daemon.ts`
- `docs/TELEGRAM_SETUP.md`
- `docs/SECURITY.md`

**Why it matters**

Existing paired chats do continue to work across restarts because the allowlist persists. Users do not need to re-pair every time.

The real mismatch is narrower: `oax-web/daemon.ts` currently generates a fresh pairing code on boot and enforces a five-minute expiry for future `/pair` attempts, while some repo guidance still describes the pairing code itself as durable until manual rotation.

### Checklist

- [ ] Clarify in docs that allowlist pairing persists across restarts, but the pairing code for new chats is currently ephemeral
- [ ] Decide whether pairing codes should be ephemeral-per-boot or persisted until rotated
- [ ] Align daemon behavior, setup docs, and operational docs to one model
- [ ] Make sure recovery/rotation instructions match the actual code path

---

### Issue #8: Model Fallback UX Is Still Fake

**Severity:** Low — UX issue, not a launch blocker

**File:** `oax-web/src/app/page.tsx`

**Current behavior**

If `/api/models` fails, the UI falls back to `['llama3', 'mistral', 'phi3']` even though those models may not be installed.

### Checklist

- [ ] Replace fake fallback options with a clear "Ollama unavailable" state
- [ ] If a fallback list is kept, make it derive from a documented default rather than static guesses
- [ ] Verify the UX with Ollama stopped

---

## Launch Decision Matrix

| Item | Blocking? | Status |
|---|---|---|
| #1 Lint / CI red | YES | [ ] |
| #2 Next.js 16 migration warnings | Probably | [ ] |
| #3 Settings validation gap | YES | [ ] |
| #4 Architecture / docs drift | No, but should fix | [ ] |
| #5 Missing error boundary | No, but worth fixing | [ ] |
| #6 Scope/security boundary docs | YES for any non-local launch | [ ] |
| #7 Telegram pairing drift | No | [ ] |
| #8 Model fallback UX | No | [ ] |

---

## Recommended Near-Term Order

1. Fix lint failures and stop linting generated coverage output.
2. Add settings validation so the configuration surface cannot corrupt runtime behavior.
3. Clean up the Next.js 16 warnings (`proxy`, `turbopack.root`, tracing).
4. Reconcile docs and system-prompt drift around `TASKS.md` vs `AMBITION.md`.
5. Add error boundaries and polish the model-failure UX.
