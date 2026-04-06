// Single source of truth for every mutable-state path OAX touches.
//
// All runtime state lives under `oax-web/data/` — which is gitignored, so
// each user's SOUL, transcripts, ambitions, heartbeat log, workspace files,
// and logs are private to their machine. Consumers import from here instead
// of hard-coding string literals, so the layout can move without a
// codebase-wide grep.
//
// Resolution assumes the daemon / Next.js app is launched from `oax-web/`
// (which is always the case in practice). REPO_ROOT is one level up.
import path from 'node:path';

// `oax-web/` at runtime.
export const WEB_ROOT = process.cwd();
// Repo root (one above oax-web/).
export const REPO_ROOT = path.resolve(WEB_ROOT, '..');

// All owner-private state lives under this dir — gitignored wholesale.
export const DATA_ROOT = path.join(WEB_ROOT, 'data');

// Individual state locations.
export const AMBITION_PATH = path.join(DATA_ROOT, 'AMBITION.md');
export const RESTLESS_LOG_PATH = path.join(DATA_ROOT, 'RESTLESS.log.md');
export const AGENTS_DIR = path.join(DATA_ROOT, 'agents');
export const MEMORY_DIR = path.join(DATA_ROOT, 'memory');
export const MEMORY_INDEX_FILE = path.join(MEMORY_DIR, 'index.json');
export const TOPICS_DIR = path.join(MEMORY_DIR, 'topics');
export const WORKSPACE_DIR = path.join(DATA_ROOT, 'workspace');
export const LOGS_DIR = path.join(DATA_ROOT, 'logs');
export const API_KEY_FILE = path.join(DATA_ROOT, '.oax-api-key');

// Legacy fallbacks — the pre-migration owner still has AMBITION.md / RESTLESS.md
// at the repo root. readAmbition() prefers the DATA_ROOT copy but falls back to
// these if only the legacy file exists, so the owner's existing state keeps
// working through a migration window.
export const LEGACY_AMBITION_PATH = path.join(REPO_ROOT, 'AMBITION.md');
export const LEGACY_RESTLESS_PATH = path.join(REPO_ROOT, 'RESTLESS.md');

// Default agent id for the single-user prototype.
export const DEFAULT_AGENT_ID = 'default';
export const DEFAULT_SOUL_PATH = path.join(AGENTS_DIR, DEFAULT_AGENT_ID, 'SOUL.md');
