import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');

function toPosixPath(input) {
  return input.split(path.sep).join('/');
}

function defaultDatabaseUrl() {
  return `file:${toPosixPath(path.join(webRoot, 'data', 'oax.db'))}`;
}

function normalizeDatabaseUrl(rawValue) {
  if (!rawValue) return defaultDatabaseUrl();
  if (!rawValue.startsWith('file:')) return rawValue;

  const body = rawValue.slice('file:'.length);
  const queryIndex = body.indexOf('?');
  const dbPath = queryIndex === -1 ? body : body.slice(0, queryIndex);
  const suffix = queryIndex === -1 ? '' : body.slice(queryIndex);

  if (!dbPath || dbPath === ':memory:') return rawValue;
  if (path.isAbsolute(dbPath)) return `file:${toPosixPath(dbPath)}${suffix}`;

  return `file:${toPosixPath(path.resolve(webRoot, dbPath))}${suffix}`;
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

if (databaseUrl.startsWith('file:')) {
  const dbPath = databaseUrl.slice('file:'.length).split('?')[0];
  if (dbPath && dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
}

const prismaBin = path.join(webRoot, 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [prismaBin, ...process.argv.slice(2)], {
  cwd: webRoot,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
  },
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
