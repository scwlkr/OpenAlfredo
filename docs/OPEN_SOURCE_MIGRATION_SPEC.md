# Death of Prompt — Open Source Migration Spec

> Authoritative technical spec for converting the DOP prototype from a single-user local project into a public open-source repository with a clean first-run experience.
>
> **Audience**: implementing agents (and the humans reviewing them).
> **Goal**: a fresh `git clone` → `npm install` → `dop pod` flow produces a working local agent **with zero leaked owner state, zero personal identifiers, and zero surprises.**

---

## 0. Executive Summary

DOP today is a single-user prototype: the owner's SOUL, chat transcripts, heartbeat logs, Telegram allowlist, API keys, and SQLite database all live inside the working tree. A naive `git clone` would give a contributor the owner's identity, conversations, and (were it committed) their bot token.

This spec describes the minimal, surgical changes required to ship DOP publicly **without rewriting its architecture**. The runtime code stays the same. What changes is:

1. **Where mutable state lives** (moved to ignored paths only).
2. **What the repo contains** (templates, not live data).
3. **What happens on first run** (an idempotent bootstrap that creates the owner's private state from templates).
4. **What a contributor sees** (documentation, license, contribution flow, code of conduct).

Nothing destructive. All existing paths keep working for the current owner via a one-time migration script.

---

## 1. Threat Model & Leakage Audit

The following owner-private artifacts currently exist inside the tracked or tracked-adjacent tree. Each row states the current location, the risk, and the target state.

| # | Artifact | Current path | Risk | Target state |
|---|----------|--------------|------|--------------|
| 1 | Agent identity | `dop-web/data/agents/default/SOUL.md` | Contains owner's name, beliefs, personal relationship framing | Ignored dir. Template `SOUL.example.md` ships instead. Bootstrap copies on first run. |
| 2 | Stub SOUL at root | `SOUL.md` | Leftover from pre-unification | **Delete**. Documented as removed. |
| 3 | Heartbeat log | `RESTLESS.md` (repo root) | Contains live LLM reflections referencing owner by name | Split: protocol/config → `docs/RESTLESS.md` (tracked, static). Log body → `data/RESTLESS.log.md` (ignored). |
| 4 | Ambition list | `AMBITION.md` (repo root) | Tracked; contains owner's personal tasks ("laundry", etc.) | Move to `dop-web/data/AMBITION.md` (ignored). Ship `AMBITION.example.md` template. |
| 5 | SQLite DB | `dop-web/data/dop.db` | All chat transcripts | Already under `dop-web/data/` (ignored). **Verify**. |
| 6 | API key | `dop-web/data/.dop-api-key` | Auth secret | Already ignored. **Verify never committed** (history audit). |
| 7 | Telegram bot token | `dop-web/.env` | Live secret | `.env` is ignored. Ship `.env.example`. **Rotate current token.** |
| 8 | Telegram pairing code | `dop-web/data/.telegram-pairing-code` | Medium-sensitivity | Already ignored. |
| 9 | Telegram allowlist | `dop-web/data/.telegram-allowlist.json` | Contains owner's Telegram chat id | Already ignored. |
| 10 | Telegram chat id / models | `dop-web/data/.telegram-chat-id`, `.telegram-models.json` | Personal state | Already ignored. |
| 11 | Keeper pairing code | `dop-web/data/.keeper-pairing-code` | Dead code path | Delete (keeper is deprecated per CLAUDE.md). |
| 12 | Topic memory | `dop-web/data/memory/topics/*.md`, `index.json` | Personal notes | Already under ignored dir. Ship an empty template in `dop-web/data.example/`. |
| 13 | Transcripts (legacy) | `memory/transcripts/` (repo root) | Stale pre-unification stubs | **Delete** entire root `memory/` dir. |
| 14 | Logs | `dop-web/data/logs/*.jsonl`, `*.log` | Contains prompts and behavior | Already under ignored dir. |
| 15 | Workspace files | `dop-web/data/workspace/` | Agent-written artifacts | Already under ignored dir. |
| 16 | Pod state | `dop-web/data/.dop-pod.json` | Process PIDs | Already ignored. |
| 17 | BRAND.md | `BRAND.md` | Contains phrase "Serve scwlkr" referencing owner | Scrub owner references, keep as public brand doc. |
| 18 | Owner GitHub slug | `package.json`, `README.md` | Hardcoded `scwlkr/DeathOfPrompt` | Acceptable for public repo (that IS the owner). Confirm slug is intentional. |
| 19 | CLAUDE.md | Repo root | Currently tracked; references owner file paths but no secrets | Keep tracked (it IS the architecture doc). Gitignore entry is stale and should be removed. |
| 20 | `.claude/settings.local.json` | `.claude/` | Owner's local Claude Code permissions | Add `.claude/settings.local.json` to `.gitignore`. Keep directory. |
| 21 | `dev.db`, `test-ai.mjs`, `test-db.ts`, `test-usechat.js` | `dop-web/` | Dev scratch files | Audit for secrets, move to `dop-web/scripts/` or delete. |

**Action items this audit produces**: rows 1–4, 11, 13, 17, 19, 20, 21 require code/filesystem changes. Rows 5–10, 12, 14–16, 18 require **verification only**.

---

## 2. Target Repository Layout

```
DeathOfPrompt/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   └── feature_request.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
│       └── ci.yml                      # lint + test on push/PR
├── .gitignore                          # rewritten (see §5)
├── .env.example                        # root stub (points to dop-web/.env.example)
├── bin/
│   ├── dop.js                          # unchanged
│   ├── respawn.js                      # unchanged
│   └── bootstrap.js                    # NEW: first-run state initializer (see §4)
├── docs/
│   ├── ARCHITECTURE.md                 # extracted from CLAUDE.md (public-facing)
│   ├── RESTLESS.md                     # protocol/config doc (no log body)
│   ├── SELF_MOD_TEST_PROMPTS.md        # unchanged
│   ├── TELEGRAM_SETUP.md               # NEW: how to wire a bot
│   ├── SECURITY.md                     # threat model, secret handling, auth
│   └── OPEN_SOURCE_MIGRATION_SPEC.md   # this document
├── examples/
│   ├── SOUL.example.md                 # template agent identity
│   ├── AMBITION.example.md             # template ambition with 1-2 sample tasks
│   └── topics/
│       └── welcome.example.md          # one example topic memory file
├── dop-web/
│   ├── .env.example                    # all env vars, no real secrets
│   ├── data/                           # ENTIRELY gitignored
│   │   └── .gitkeep                    # the dir itself is tracked, contents are not
│   ├── src/
│   ├── prisma/
│   ├── daemon.ts
│   ├── package.json
│   └── ... (unchanged)
├── AMBITION.example.md                 # SYMLINK or duplicate of examples/AMBITION.example.md for visibility at root
├── BRAND.md                            # scrubbed of owner-specific references
├── CLAUDE.md                           # kept; gitignore entry removed
├── CODE_OF_CONDUCT.md                  # NEW: Contributor Covenant 2.1
├── CONTRIBUTING.md                     # NEW: how to contribute + dev setup
├── DOP_MVP_PLAN.md                     # unchanged (design intent)
├── DOP_IDEAS_FROM_CODEX.md             # keep if exists
├── LICENSE                             # unchanged (audit current license)
├── README.md                           # rewritten quick-start (see §7)
└── package.json                        # fields populated (see §6)
```

### Files being **deleted**
- `SOUL.md` (root) — stale stub
- `memory/` (root) — stale stubs, entire directory
- `RESTLESS.md` (root) — replaced by `docs/RESTLESS.md` + runtime `data/RESTLESS.log.md`
- `AMBITION.md` (root) — replaced by `examples/AMBITION.example.md` + runtime `dop-web/data/AMBITION.md`
- `dop-web/data/.keeper-pairing-code` — deprecated
- Any `dev.db`, `test-*.mjs`, `test-*.ts`, `test-*.js` ad-hoc scratch in `dop-web/` root that isn't wired to `vitest`

---

## 3. Code Path Changes (Minimal & Surgical)

The goal is to keep the runtime architecture identical. Only file-location constants change.

### 3.1 `src/lib/ambition.ts`

Current: reads/writes `AMBITION.md` at repo root.

Change: resolve via a helper that defaults to `${REPO_ROOT}/dop-web/data/AMBITION.md`. Add a fallback for the owner's current file at repo root so their existing state keeps working through migration.

```ts
// src/lib/paths.ts  (NEW — single source of truth)
import path from 'node:path';
import fs from 'node:fs';

export const REPO_ROOT = path.resolve(__dirname, '../../..');
export const DATA_ROOT = path.join(REPO_ROOT, 'dop-web', 'data');

export const AMBITION_PATH = path.join(DATA_ROOT, 'AMBITION.md');
export const RESTLESS_LOG_PATH = path.join(DATA_ROOT, 'RESTLESS.log.md');
export const AGENTS_DIR = path.join(DATA_ROOT, 'agents');
export const MEMORY_DIR = path.join(DATA_ROOT, 'memory');
export const WORKSPACE_DIR = path.join(DATA_ROOT, 'workspace');
export const LOGS_DIR = path.join(DATA_ROOT, 'logs');
```

All current string literals that point to `AMBITION.md`, `RESTLESS.md`, `data/agents/…` should be replaced with imports from `src/lib/paths.ts`.

**Files to audit & update**:
- `dop-web/src/lib/ambition.ts`
- `dop-web/src/lib/dop.ts` (heartbeat log writer, SOUL reader)
- `dop-web/src/lib/dop-engine.ts` (SOUL reader, workspace writer)
- `dop-web/src/lib/memory-retrieval.ts` (SOUL, topics, index)
- `dop-web/src/lib/logger.ts` (JSONL log dir)
- `dop-web/src/lib/self-edit.ts` (REPO_ROOT, block-list — already correct, just reuse constant)
- `dop-web/daemon.ts` (SOUL path for heartbeat)
- `bin/dop.js` (pod state file, log mirror)
- `bin/respawn.js` (respawn log, pod state file)

### 3.2 `RESTLESS.md` split

`docs/RESTLESS.md` = the static protocol/config documentation (current lines 1–32).
`dop-web/data/RESTLESS.log.md` = append-only heartbeat log (ignored, created by bootstrap from a 0-entry template).

Update `runHeartbeat()` in `src/lib/dop.ts` to read config from `docs/RESTLESS.md` (optional; env vars still win) and append to `data/RESTLESS.log.md`.

### 3.3 `self-edit.ts` blocklist

Audit `REPO_ROOT` resolution and the blocked-paths list. Ensure `dop-web/data/`, `data/`, `.env`, `.git/`, `node_modules/`, `.next/` all remain blocked. No functional change expected — just verify after the path refactor.

---

## 4. Bootstrap Flow (`bin/bootstrap.js`)

Purpose: idempotent first-run initializer that converts a fresh clone into a working local agent.

### 4.1 Contract
- **Pre-condition**: fresh clone OR existing install. Must be safe to re-run.
- **Post-condition**: `dop-web/data/` is populated with owner-private state. No existing files are overwritten unless `--force` is passed.
- **Idempotency**: each step checks "does this file already exist? if yes, skip." No errors if run twice.

### 4.2 Steps (in order)

1. **Sanity checks**: Node ≥ 20, `dop-web/` present, repo root detected.
2. **Create `dop-web/data/` subtree** if missing:
   - `agents/default/`
   - `memory/topics/`
   - `workspace/`
   - `logs/`
3. **Copy templates if missing**:
   - `examples/SOUL.example.md` → `dop-web/data/agents/default/SOUL.md`
   - `examples/AMBITION.example.md` → `dop-web/data/AMBITION.md`
   - Empty heartbeat log → `dop-web/data/RESTLESS.log.md`
   - `{}` → `dop-web/data/memory/index.json`
4. **Copy `.env.example` → `.env`** if missing (both root and `dop-web/`).
5. **Prisma setup**: `cd dop-web && npx prisma generate && npx prisma db push` (wrapped with existence check on `dop-web/data/dop.db`).
6. **Generate API key**: if `dop-web/data/.dop-api-key` is missing, write a 32-byte `crypto.randomBytes` hex string. Set file mode `0600`.
7. **Print next-steps banner**:
   ```
   ✓ DOP is ready.

   Next:
     1. Make sure Ollama is running:   ollama serve
     2. Pull a model:                  ollama pull llama3
     3. Start the pod:                 dop pod

   Optional (Telegram):
     4. Edit dop-web/.env and set TELEGRAM_TOKEN
     5. Restart with: dop pod
     6. Pair your phone: send /pair <code from terminal> to your bot
   ```

### 4.3 Wiring

- `npm install` in `dop-web/` triggers a `postinstall` hook that runs `node ../bin/bootstrap.js`.
- `dop pod` in `bin/dop.js` runs `bootstrap.js --check` first; if state is incomplete, prompts user to run `npm install` or `dop init`.
- New command: `dop init` → alias for `node bin/bootstrap.js --force`.

---

## 5. `.gitignore` (Replacement)

Replace current `.gitignore` with:

```gitignore
# ───── Environment & secrets ─────
**/.env
**/.env.local
**/.env.*.local
!**/.env.example

# ───── Runtime state (private to each user) ─────
dop-web/data/
!dop-web/data/.gitkeep

# Root-level legacy state (pre-migration fallback)
/AMBITION.md
/RESTLESS.md
/SOUL.md
/memory/
/data/

# ───── Build outputs ─────
**/node_modules/
**/.next/
**/dist/
**/build/
**/*.tsbuildinfo

# ───── Databases ─────
**/*.db
**/*.db-journal
**/*.sqlite
**/*.sqlite-*

# ───── Logs ─────
**/logs/
**/*.log
**/*.jsonl

# ───── OS & editor ─────
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp

# ───── Claude Code local config ─────
.claude/settings.local.json
```

**Removed** entries from current `.gitignore`:
- `CLAUDE.md` (it IS the architecture doc — should be tracked)
- `dop-web/data/.dop-api-key` (covered by broader `dop-web/data/` rule)

---

## 6. `package.json` Cleanup

Root `package.json` needs public-ready fields:

```json
{
  "name": "deathofprompt",
  "version": "0.1.0",
  "description": "Local-first persistent-agent prototype. Kill the prompt. Keep the conversation.",
  "main": "bin/dop.js",
  "bin": { "dop": "./bin/dop.js" },
  "scripts": {
    "bootstrap": "node bin/bootstrap.js",
    "init": "node bin/bootstrap.js --force",
    "postinstall": "node bin/bootstrap.js --check || true"
  },
  "repository": { "type": "git", "url": "git+https://github.com/scwlkr/DeathOfPrompt.git" },
  "bugs": { "url": "https://github.com/scwlkr/DeathOfPrompt/issues" },
  "homepage": "https://github.com/scwlkr/DeathOfPrompt#readme",
  "keywords": ["ollama", "local-first", "agent", "llm", "persistent-memory", "telegram-bot"],
  "author": "shanecwalker <shane.caleb.walker@gmail.com>",
  "license": "MIT",
  "type": "commonjs",
  "engines": { "node": ">=20" },
  "dependencies": {
    "open": "^11.0.0",
    "yargs": "^18.0.0"
  }
}
```

**Confirm**: the `LICENSE` file's text matches the `"license"` field. Current `package.json` says `"ISC"`; verify the existing `LICENSE` file and either update the field or replace the file. MIT is recommended for maximum adoption.

`dop-web/package.json`: audit for scratch test files referenced in `scripts`. Keep `vitest`, `next`, `prisma`. Remove any dev-only script that points to `test-ai.mjs` or similar.

---

## 7. README Rewrite (Public-Facing)

Current README reads as a personal journal. Rewrite to Divio's "tutorial + reference" structure. Keep the ASCII skull art — it's on-brand.

**Required sections** (in order):

1. **Hero** — ASCII art, tagline, 3 badges (license, Node version, PRs welcome).
2. **What is this?** — 3 sentences. The problem (amnesiac prompts), the thesis (persistent relationship), the shape (local, Ollama, web + Telegram).
3. **Demo** — animated GIF or screenshot of the web UI. Link to short video if available.
4. **Quick Start** (≤ 6 commands, under 2 minutes):
   ```bash
   # Prerequisites: Node 20+, Ollama running locally
   ollama pull llama3
   git clone https://github.com/scwlkr/DeathOfPrompt.git
   cd DeathOfPrompt
   npm install           # runs bootstrap automatically
   cd dop-web && npm install
   npm link              # installs `dop` CLI globally (optional)
   dop pod               # starts web UI + daemon
   # → open http://localhost:3000
   ```
5. **Architecture (one paragraph + link)** → `docs/ARCHITECTURE.md`.
6. **Telegram setup (optional)** → `docs/TELEGRAM_SETUP.md`.
7. **Customization** — pointing to `examples/SOUL.example.md` and how to write your agent's identity.
8. **Contributing** → `CONTRIBUTING.md`.
9. **License** — MIT © scwlkr.
10. **Acknowledgements** — Ollama, AI SDK, Next.js, Prisma.

**Remove** from current README: the "Current State" table (move to `ARCHITECTURE.md`), the long architecture prose (move to `ARCHITECTURE.md`), any references to owner-specific paths.

---

## 8. New Docs (Deliverables)

### 8.1 `docs/ARCHITECTURE.md`
Public version of `CLAUDE.md`. Same content, but:
- Framed for contributors, not Claude.
- Diagrams (Mermaid) for: (a) request flow web → engine → Ollama, (b) 3-layer memory retrieval, (c) daemon cron loops, (d) pod process tree.
- Explicit section on extension points: adding a new marker, adding a new retrieval layer, swapping the LLM provider.

### 8.2 `docs/TELEGRAM_SETUP.md`
Walkthrough: @BotFather → token → `.env` → `dop pod` → `/pair` → first message. Include screenshots. Explain pairing-code rotation.

### 8.3 `docs/SECURITY.md`
- Where secrets live (`dop-web/.env`, `dop-web/data/.dop-api-key`).
- How to rotate the API key (delete file, restart).
- How to rotate the Telegram token (BotFather → revoke → new token → `.env` → restart).
- Self-modification blocklist (`.git/`, `node_modules/`, `.next/`, `data/`, `.env`, `.db`).
- Responsible disclosure: email + 90-day window.
- Link to `CODE_OF_CONDUCT.md`.

### 8.4 `CONTRIBUTING.md`
- Dev setup (same as README Quick Start + `npm run lint`, `npx vitest`).
- Branch naming, conventional commits, PR template.
- Code style (ESLint, Prettier config — add if missing).
- How to run tests.
- How to regenerate Prisma client.
- How to propose a new marker or memory layer.

### 8.5 `CODE_OF_CONDUCT.md`
Drop-in Contributor Covenant 2.1. Enforcement email = owner's.

### 8.6 `.github/ISSUE_TEMPLATE/bug_report.yml`
Form-style issue template: reproduction steps, expected, actual, Ollama version, Node version, OS, model used, log excerpt.

### 8.7 `.github/ISSUE_TEMPLATE/feature_request.yml`
Form: problem, proposal, alternatives, marker/engine impact.

### 8.8 `.github/PULL_REQUEST_TEMPLATE.md`
Checklist: tests pass, docs updated, no new owner-private paths, no `[[SELF_MOD]]` artifacts committed.

### 8.9 `.github/workflows/ci.yml`
On push/PR to `main`: checkout → setup Node 20 → `npm ci` in root and `dop-web/` → `npm run lint` → `npx vitest run` → `next build` (dop-web). No Ollama required (mock the provider in tests; confirm existing tests already do this).

---

## 9. Template Content

### 9.1 `examples/SOUL.example.md`

```markdown
# SOUL of default

## Persona
- **Name:** (name your agent)
- **Creature:** AI assistant with memory and intent
- **Vibe:** Helpful, direct, curious
- **Emoji:** 🤖

## Goals
What is this agent for? Write 2–4 bullets.
- Example: Help me stay on top of my reading list
- Example: Draft replies to low-stakes messages

## Relationship
Describe your side of the relationship in one paragraph. The agent reads this on every turn.

## Style
How should it talk? (concise, playful, academic, terse…)
```

No identifying information. No religious framing. No "Serve X" phrasing.

### 9.2 `examples/AMBITION.example.md`

```markdown
## Tasks
- [ ] example recurring reminder |recur:0 9 * * *
- [ ] one-off example task |when:2026-12-31T17:00:00Z
```

### 9.3 `examples/topics/welcome.example.md`

```markdown
---
title: Welcome
tags: [meta, welcome]
---

This is an example topic memory. The agent retrieves these by keyword match
against the `tags` field and the title. Delete or edit freely — or write your
first real topic alongside it.
```

### 9.4 `dop-web/.env.example`

```dotenv
# ───── Database (SQLite, relative to dop-web/) ─────
DATABASE_URL="file:./data/dop.db"

# ───── Telegram bot (optional — leave empty to disable) ─────
# Get a token from @BotFather. See docs/TELEGRAM_SETUP.md.
TELEGRAM_TOKEN=

# ───── RESTLESS heartbeat ─────
HEARTBEAT_CRON="0 * * * *"
HEARTBEAT_ACTIVE=true

# ───── AMBITION task-check cron ─────
AMBITION_CRON="*/30 * * * *"

# ───── Default Ollama model ─────
DOP_MODEL="llama3"
```

---

## 10. BRAND.md Scrub

Search-and-replace in `BRAND.md`:
- `Serve scwlkr` → `Serve its one user`
- Any reference to specific owner beliefs, name, or relationship → genericize.
- Keep the tagline "Kill the prompt. Keep the conversation."
- Keep the brand voice, palette, and design tokens.

---

## 11. Migration Script (One-Time, for the Owner)

`bin/migrate-to-public.js` (ephemeral, delete after use):

```js
// Pseudocode
// 1. Move AMBITION.md     → dop-web/data/AMBITION.md
// 2. Move RESTLESS.md log → dop-web/data/RESTLESS.log.md (extract log body only)
// 3. Copy docs/RESTLESS.md template (protocol-only) to repo
// 4. Delete root SOUL.md, root memory/, root data/ (after confirming no unique content)
// 5. Delete dop-web/data/.keeper-pairing-code
// 6. Write new .gitignore
// 7. git rm --cached for any now-ignored file that was previously tracked
// 8. Print summary of what moved & what got removed from tracking
```

Must be run **before** the first public commit. After successful migration and a clean `git status`, delete the script itself.

---

## 12. Git History Audit

Before pushing public, run:

```bash
# Search history for common secret patterns
git log --all -S "TELEGRAM_TOKEN=" --oneline
git log --all -S "AAGLUOp" --oneline  # partial live token
git log --all -p -- dop-web/.env 2>/dev/null
git log --all -p -- dop-web/data/.dop-api-key 2>/dev/null
git log --all -p -- dop-web/data/dop.db 2>/dev/null
```

If any hit surfaces a secret: use `git filter-repo` (not `filter-branch`) to scrub, force-push to a fresh repo, and rotate the exposed secret. **Verified in this session: no TELEGRAM_TOKEN value is present in git history.** Still rotate the token — it was surfaced in chat context.

---

## 13. Release Checklist

Run in order. Do not skip.

- [ ] §11 migration script executed, verified, deleted.
- [ ] `.gitignore` replaced per §5.
- [ ] All code paths use `src/lib/paths.ts` constants (§3.1).
- [ ] `bin/bootstrap.js` exists, idempotent, and tested on a fresh clone in a scratch dir.
- [ ] `npm install` from clean clone produces a working `dop pod`.
- [ ] `examples/` directory populated (§9).
- [ ] `docs/ARCHITECTURE.md`, `docs/TELEGRAM_SETUP.md`, `docs/SECURITY.md` written.
- [ ] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates written.
- [ ] `README.md` rewritten per §7.
- [ ] `BRAND.md` scrubbed.
- [ ] `package.json` fields populated (§6).
- [ ] `LICENSE` matches `package.json` license field.
- [ ] GitHub Actions CI green on a test PR.
- [ ] `git log --all` audit run (§12). Telegram token rotated.
- [ ] Vitest passes on clean clone: `cd dop-web && npx vitest run`.
- [ ] `next build` passes on clean clone.
- [ ] Self-modification blocklist verified (`data/`, `.env`, `.git/`, `node_modules/`, `.next/`, `.db`).
- [ ] `dop pod` → web UI loads → onboarding completes → first chat works → `[[TASK: …]]` appends to `dop-web/data/AMBITION.md` → heartbeat tick logs to `dop-web/data/RESTLESS.log.md`.
- [ ] **Repo set to public** on GitHub.

---

## 14. Out of Scope (Explicitly Deferred)

- Docker / devcontainer support
- Multi-agent (multiple `agents/<id>/`) UI
- Hosted demo / public instance
- Telemetry, analytics, or opt-in usage pings
- Package publishing to npm (the `dop` CLI stays repo-local)
- i18n
- Alternative LLM providers (OpenAI, Anthropic, etc.) — Ollama-only for v0.1

---

## 15. Agent Execution Guide

If handing this spec to implementing agents, suggested task decomposition:

1. **Audit Agent** → verify §1 leakage table against current HEAD, produce a diff of what's already correct vs. still leaking.
2. **Paths Refactor Agent** → implement §3.1 (`src/lib/paths.ts` + update all consumers). Run tests.
3. **Bootstrap Agent** → implement `bin/bootstrap.js` per §4. Test idempotency on a scratch clone.
4. **Templates Agent** → write `examples/` files per §9, write `docs/ARCHITECTURE.md`, `docs/TELEGRAM_SETUP.md`, `docs/SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates.
5. **README Agent** → rewrite `README.md` per §7, scrub `BRAND.md` per §10.
6. **CI Agent** → write `.github/workflows/ci.yml`, verify green on a test branch.
7. **Migration Agent** → implement and run §11 migration script, then delete it.
8. **Release Agent** → walk §13 checklist, open the first public PR against a throwaway branch to validate the contributor flow end-to-end.

Each agent should work on a feature branch, produce one focused PR, and reference the corresponding section of this spec.

---

**End of spec.**
