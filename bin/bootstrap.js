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
const {
  REPO_ROOT,
  OAX_WEB,
  BASE_DATA_DIR: DATA_DIR,
  ensureWebEnvFile,
  createDataScaffold,
  ensureDatabase,
} = require('./profile-state');

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

function stepCopyEnv() {
  log('• copying .env.example → .env (if missing)…');
  if (ensureWebEnvFile({ force: FORCE })) {
    log('  → oax-web/.env created from template');
  } else if (fs.existsSync(path.join(OAX_WEB, '.env'))) {
    log('  ✓ oax-web/.env already present');
  } else {
    warn('  ! oax-web/.env.example not found — skipping');
  }
}

function stepPrisma() {
  log('• prisma setup…');
  if (fs.existsSync(path.join(DATA_DIR, 'oax.db')) && !FORCE) {
    log('  ✓ oax-web/data/oax.db already present');
    return;
  }
  try {
    ensureDatabase({
      dataDir: DATA_DIR,
      databaseUrl: 'file:./data/oax.db',
      force: FORCE,
      generate: true,
      quiet: QUIET,
    });
    log('  → prisma: client generated + schema pushed');
  } catch (e) {
    warn('  ! prisma setup failed — run `cd oax-web && npx prisma generate && npx prisma db push` manually');
  }
}

function stepDataScaffold() {
  log('• ensuring data subtree…');
  createDataScaffold(DATA_DIR, { force: FORCE });
  log('  ✓ data/ subtree ready');
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
    path.join(DATA_DIR, 'TASKS.md'),
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
stepDataScaffold();
stepCopyEnv();
stepPrisma();
printBanner();
