#!/usr/bin/env node
// OAX Bootstrap — idempotent first-run initializer.
//
// Converts a fresh clone into a working local agent by:
//   1. Creating the oax-web/data/ subtree
//   2. Copying template SOUL / AMBITION / memory index from examples/
//   3. Scaffolding an empty heartbeat log
//   4. Copying .env.example -> .env (root and oax-web/) if missing
//   5. Running `prisma generate && prisma db push` if oax-web/data/oax.db is absent
//   6. Generating a 32-byte API key at oax-web/data/.oax-api-key
//
// Safe to re-run. Nothing is overwritten unless --force is passed.
//
// Usage:
//   node bin/bootstrap.js            # idempotent init
//   node bin/bootstrap.js --force    # overwrite existing templates
//   node bin/bootstrap.js --check    # report what's missing, exit 0/1
//   node bin/bootstrap.js --quiet    # no banner

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OAX_WEB = path.join(REPO_ROOT, 'oax-web');
const DATA_DIR = path.join(OAX_WEB, 'data');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const CHECK = args.includes('--check');
const QUIET = args.includes('--quiet');

function log(...a) { if (!QUIET) console.log(...a); }
function warn(...a) { console.warn(...a); }
function die(msg) { console.error('bootstrap: ' + msg); process.exit(1); }

// Sanity checks ────────────────────────────────────────────────────────────
function requireNode20() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 20) die(`Node 20+ required (got ${process.versions.node})`);
}
function requireOaxWeb() {
  if (!fs.existsSync(OAX_WEB)) die(`oax-web/ not found at ${OAX_WEB}`);
}

// Step helpers ─────────────────────────────────────────────────────────────
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyTemplate(src, dest, label) {
  if (!fs.existsSync(src)) {
    warn(`  ! template missing: ${path.relative(REPO_ROOT, src)} — skipping ${label}`);
    return false;
  }
  if (fs.existsSync(dest) && !FORCE) {
    log(`  ✓ ${label} already present at ${path.relative(REPO_ROOT, dest)}`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  log(`  → copied ${label} to ${path.relative(REPO_ROOT, dest)}`);
  return true;
}

function writeIfMissing(dest, content, label) {
  if (fs.existsSync(dest) && !FORCE) {
    log(`  ✓ ${label} already present`);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content);
  log(`  → wrote ${label}`);
  return true;
}

function stepCreateDirs() {
  log('• ensuring data subtree…');
  for (const sub of ['agents/default', 'memory/topics', 'workspace', 'logs']) {
    ensureDir(path.join(DATA_DIR, sub));
  }
  log('  ✓ data/ subtree ready');
}

function stepCopyTemplates() {
  log('• copying templates…');
  copyTemplate(
    path.join(EXAMPLES_DIR, 'SOUL.example.md'),
    path.join(DATA_DIR, 'agents', 'default', 'SOUL.md'),
    'SOUL'
  );
  copyTemplate(
    path.join(EXAMPLES_DIR, 'AMBITION.example.md'),
    path.join(DATA_DIR, 'AMBITION.md'),
    'AMBITION'
  );
  // Empty index.json so memory-retrieval starts clean.
  writeIfMissing(
    path.join(DATA_DIR, 'memory', 'index.json'),
    JSON.stringify({ version: '1.0', topics: [] }, null, 2),
    'memory index'
  );
  // Empty heartbeat log scaffold with the markers the daemon expects.
  const restlessLog =
    '# RESTLESS Heartbeat Log\n\n' +
    'Append-only log of the agent\'s heartbeat ticks. See `docs/RESTLESS.md` for\n' +
    'the protocol. Trimmed to the most recent 50 entries.\n\n' +
    '<!-- heartbeat-log-start -->\n<!-- heartbeat-log-end -->\n';
  writeIfMissing(path.join(DATA_DIR, 'RESTLESS.log.md'), restlessLog, 'heartbeat log');
}

function stepCopyEnv() {
  log('• copying .env.example → .env (if missing)…');
  const webEnvEx = path.join(OAX_WEB, '.env.example');
  const webEnv = path.join(OAX_WEB, '.env');
  if (fs.existsSync(webEnvEx) && (!fs.existsSync(webEnv) || FORCE)) {
    fs.copyFileSync(webEnvEx, webEnv);
    log('  → oax-web/.env created from template');
  } else if (fs.existsSync(webEnv)) {
    log('  ✓ oax-web/.env already present');
  } else {
    warn('  ! oax-web/.env.example not found — skipping');
  }
}

function stepPrisma() {
  log('• prisma setup…');
  const db = path.join(DATA_DIR, 'oax.db');
  if (fs.existsSync(db) && !FORCE) {
    log('  ✓ oax-web/data/oax.db already present');
    return;
  }
  try {
    execSync('npx prisma generate', { cwd: OAX_WEB, stdio: QUIET ? 'pipe' : 'inherit' });
    execSync('npx prisma db push', { cwd: OAX_WEB, stdio: QUIET ? 'pipe' : 'inherit' });
    log('  → prisma: client generated + schema pushed');
  } catch (e) {
    warn('  ! prisma setup failed — run `cd oax-web && npx prisma generate && npx prisma db push` manually');
  }
}

function stepApiKey() {
  log('• api key…');
  const keyFile = path.join(DATA_DIR, '.oax-api-key');
  if (fs.existsSync(keyFile) && !FORCE) {
    log('  ✓ api key already present');
    return;
  }
  const key = crypto.randomBytes(32).toString('hex');
  ensureDir(DATA_DIR);
  fs.writeFileSync(keyFile, key, { mode: 0o600 });
  log('  → wrote oax-web/data/.oax-api-key (0600)');
}

function printBanner() {
  if (QUIET) return;
  log('');
  log('✓ OpenAlfredo is ready.');
  log('');
  log('Next:');
  log('  1. Make sure Ollama is running:   ollama serve');
  log('  2. Pull a model:                  ollama pull llama3');
  log('  3. Start the pod:                 oax pod');
  log('');
  log('Optional (Telegram):');
  log('  4. Edit oax-web/.env and set TELEGRAM_TOKEN');
  log('  5. Restart with: oax pod');
  log('  6. Pair your phone: send /pair <code from terminal> to your bot');
  log('');
}

// --check mode: report gaps, exit 0 if complete, 1 if incomplete.
function runCheck() {
  const required = [
    path.join(DATA_DIR, 'agents', 'default', 'SOUL.md'),
    path.join(DATA_DIR, 'AMBITION.md'),
    path.join(DATA_DIR, 'memory', 'index.json'),
    path.join(DATA_DIR, 'RESTLESS.log.md'),
    path.join(DATA_DIR, '.oax-api-key'),
    path.join(DATA_DIR, 'oax.db'),
    path.join(OAX_WEB, '.env'),
  ];
  const missing = required.filter((p) => !fs.existsSync(p));
  if (missing.length === 0) {
    log('bootstrap: ✓ all state present');
    process.exit(0);
  }
  log('bootstrap: missing state — run `node bin/bootstrap.js` or `npm install`:');
  for (const m of missing) log('  - ' + path.relative(REPO_ROOT, m));
  process.exit(1);
}

// Main ─────────────────────────────────────────────────────────────────────
requireNode20();
requireOaxWeb();

if (CHECK) runCheck();

log('OAX bootstrap' + (FORCE ? ' (force)' : '') + '…');
stepCreateDirs();
stepCopyTemplates();
stepCopyEnv();
stepPrisma();
stepApiKey();
printBanner();
