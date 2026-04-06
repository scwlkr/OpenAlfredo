#!/usr/bin/env node
// OAX Respawn — detached helper that restarts the pod.
//
// Invoked by the daemon (or any engine path) when the agent self-edits code
// and needs a restart for changes to take effect. MUST be spawned detached
// so it outlives the daemon's process group when `oax pod stop` kills it.
//
// Sequence:
//   1. Wait 3s (let the daemon's farewell message send + process exit cleanly)
//   2. `oax pod stop`  (SIGTERM+SIGKILL sweep, ~3s of its own)
//   3. `oax pod`       (detached — ollama + next + daemon come back up)
//   4. Poll PID file up to 60s to confirm pod is alive
//   5. Append outcome to oax-web/data/logs/respawn.log
//
// Usage:  node bin/respawn.js [--delay=3] [--timeout=60]

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const OAX_BIN = path.join(__dirname, 'oax.js');
const PID_FILE = path.join(REPO_ROOT, 'oax-web', 'data', '.oax-pod.json');
const LOG_FILE = path.join(REPO_ROOT, 'oax-web', 'data', 'logs', 'respawn.log');

const args = process.argv.slice(2);
const KNOWN_FLAGS = ['--delay=', '--timeout=', '--dry-run', '--help', '-h'];
const unknown = args.filter((a) => !KNOWN_FLAGS.some((f) => a === f || a.startsWith(f)));
const askedForHelp = args.includes('--help') || args.includes('-h');
if (unknown.length > 0 || askedForHelp) {
  if (unknown.length > 0) console.error('Unknown flag(s): ' + unknown.join(' '));
  console.log('Usage: node bin/respawn.js [--delay=3] [--timeout=60] [--dry-run]');
  console.log('  --delay=N    seconds to wait before killing the pod (default 3)');
  console.log('  --timeout=N  seconds to wait for pod to come back (default 60)');
  console.log('  --dry-run    print the sequence without actually restarting');
  process.exit(unknown.length > 0 ? 1 : 0);
}
const DELAY_S = Number((args.find((a) => a.startsWith('--delay=')) || '').split('=')[1]) || 3;
const TIMEOUT_S =
  Number((args.find((a) => a.startsWith('--timeout=')) || '').split('=')[1]) || 60;
const DRY_RUN = args.includes('--dry-run');

function ts() {
  return new Date().toISOString();
}
function log(line) {
  const entry = `[${ts()}] ${line}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, entry);
  } catch {}
  process.stdout.write(entry);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runDop(args) {
  return new Promise((resolve) => {
    const child = spawn('node', [OAX_BIN, ...args], { cwd: REPO_ROOT });
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('close', (code) => resolve({ code, out }));
  });
}

async function httpOk(url, timeoutMs = 1000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok || res.status === 404; // 404 is fine — means Next is serving
  } catch {
    return false;
  }
}

async function waitForPodHealthy() {
  const deadline = Date.now() + TIMEOUT_S * 1000;
  let procsAlive = false;
  let webReady = false;
  while (Date.now() < deadline) {
    // Stage 1: processes exist (PID file written, pids live)
    if (!procsAlive) {
      try {
        const state = JSON.parse(fs.readFileSync(PID_FILE, 'utf-8'));
        const names = state.procs.filter((p) => isAlive(p.pid)).map((p) => p.name);
        if (names.includes('web') && names.includes('daemon')) {
          procsAlive = true;
          log(`respawn: procs alive — [${names.join(', ')}], now waiting for web to serve`);
        }
      } catch {}
    }
    // Stage 2: web server actually responds
    if (procsAlive && !webReady) {
      if (await httpOk('http://localhost:3000')) {
        webReady = true;
        return { ok: true };
      }
    }
    await sleep(1000);
  }
  return { ok: false, procsAlive, webReady };
}

(async () => {
  log(`respawn: starting (delay=${DELAY_S}s timeout=${TIMEOUT_S}s${DRY_RUN ? ' DRY-RUN' : ''})`);
  if (DRY_RUN) {
    log('respawn: dry-run — would wait, stop pod, start pod, health-check');
    process.exit(0);
  }
  await sleep(DELAY_S * 1000);

  log('respawn: calling `oax pod stop`');
  const stop = await runDop(['pod', 'stop']);
  log(`respawn: pod stop exit=${stop.code}`);

  // Small breather so ports release cleanly.
  await sleep(1000);

  log('respawn: spawning `oax pod` (detached)');
  const podLog = path.join(REPO_ROOT, 'oax-web', 'data', 'logs', 'pod-respawn.log');
  fs.mkdirSync(path.dirname(podLog), { recursive: true });
  const podOut = fs.openSync(podLog, 'a');
  const pod = spawn('node', [OAX_BIN, 'pod'], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ['ignore', podOut, podOut],
  });
  pod.unref();

  const health = await waitForPodHealthy();
  if (health.ok) {
    log('respawn: pod healthy — web is serving on :3000');
    process.exit(0);
  } else {
    log(
      `respawn: FAILED within ${TIMEOUT_S}s — procsAlive=${health.procsAlive} webReady=${health.webReady}`
    );
    log(`respawn: check ${podLog} for pod startup output`);
    process.exit(1);
  }
})();
