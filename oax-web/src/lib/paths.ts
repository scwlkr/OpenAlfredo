// Single source of truth for every mutable-state path OAX touches.
//
// All runtime state lives under `oax-web/data/` — which is gitignored, so
// each user's SOUL, transcripts, ambitions, heartbeat log, workspace files,
// and logs are private to their machine. Consumers import from here instead
// of hard-coding string literals, so the layout can move without a
// codebase-wide grep.
//
// Resolution assumes the daemon / Next.js app is launched from `oax-web/`
// (which is always the case in practice).
import path from 'node:path';

// `oax-web/` at runtime.
export const WEB_ROOT = process.cwd();

function resolveRuntimePath(rawValue: string | undefined, fallback: string): string {
  if (!rawValue) return fallback;
  return path.isAbsolute(rawValue)
    ? rawValue
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), rawValue);
}

export function toPosixPath(input: string): string {
  return input.split(path.sep).join('/');
}

// All owner-private state lives under this dir — gitignored wholesale.
export const DEFAULT_DATA_ROOT = path.join(process.cwd(), 'data');
export const DATA_ROOT = resolveRuntimePath(process.env.OAX_DATA_ROOT, DEFAULT_DATA_ROOT);
export const RUNTIME_ENV_PATH = resolveRuntimePath(
  process.env.OAX_RUNTIME_ENV_PATH,
  path.join(process.cwd(), '.env')
);
export const ACTIVE_PROFILE = process.env.OAX_PROFILE || '';

// Individual state locations.
export const AMBITION_PATH = path.join(DATA_ROOT, 'AMBITION.md');
export const TASKS_PATH = path.join(DATA_ROOT, 'TASKS.md');
export const RESTLESS_LOG_PATH = path.join(DATA_ROOT, 'RESTLESS.log.md');
export const AGENTS_DIR = path.join(DATA_ROOT, 'agents');
export const MEMORY_DIR = path.join(DATA_ROOT, 'memory');
export const MEMORY_INDEX_FILE = path.join(MEMORY_DIR, 'index.json');
export const TOPICS_DIR = path.join(MEMORY_DIR, 'topics');
export const WORKSPACE_DIR = path.join(DATA_ROOT, 'workspace');
export const WORKSPACE_DESK_DIR = path.join(WORKSPACE_DIR, 'desk');
export const WORKSPACE_FILES_DIR = path.join(WORKSPACE_DIR, 'files');
export const WORKSPACE_GENERATED_DIR = path.join(WORKSPACE_DIR, 'generated');
export const LOGS_DIR = path.join(DATA_ROOT, 'logs');
export const API_KEY_FILE = path.join(DATA_ROOT, '.oax-api-key');

// Theme persistence for the continuity loop (Golden Goose).
export const THEMES_FILE = path.join(DATA_ROOT, 'themes.json');

// Default agent id for the single-user prototype.
export const DEFAULT_AGENT_ID = 'default';
export const DEFAULT_SOUL_PATH = path.join(AGENTS_DIR, DEFAULT_AGENT_ID, 'SOUL.md');

export function databaseUrlForDataRoot(dataRoot: string = DATA_ROOT): string {
  return `file:${toPosixPath(path.join(dataRoot, 'oax.db'))}`;
}

export function resolveDataPath(...segments: string[]): string {
  return path.join(DATA_ROOT, ...segments);
}

export function resolveTopicSourcePath(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const withoutLegacyPrefix = normalized.startsWith('data/')
    ? normalized.slice('data/'.length)
    : normalized;
  return path.join(DATA_ROOT, withoutLegacyPrefix);
}
