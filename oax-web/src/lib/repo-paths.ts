import path from 'node:path';
import { DATA_ROOT, WEB_ROOT, toPosixPath } from './paths';

function resolveRepoRoot(): string {
  // Repo-root access is intentional for the local-first daemon and self-edit
  // flow. Keep this out of Turbopack's static tracing so App Routes that only
  // need `oax-web/data/` paths do not drag the whole repo into their NFT list.
  return path.resolve(/* turbopackIgnore: true */ WEB_ROOT, '..');
}

export const REPO_ROOT = resolveRepoRoot();
export const DATA_ROOT_REPO_REL = toPosixPath(
  path.relative(/* turbopackIgnore: true */ REPO_ROOT, DATA_ROOT)
);

// Legacy fallbacks — the pre-migration owner still has AMBITION.md / RESTLESS.md
// at the repo root. readAmbition() prefers the DATA_ROOT copy but falls back to
// these if only the legacy file exists, so the owner's existing state keeps
// working through a migration window.
export const LEGACY_AMBITION_PATH = path.join(
  /* turbopackIgnore: true */ REPO_ROOT,
  'AMBITION.md'
);
export const LEGACY_RESTLESS_PATH = path.join(
  /* turbopackIgnore: true */ REPO_ROOT,
  'RESTLESS.md'
);
