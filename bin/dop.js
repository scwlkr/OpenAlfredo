#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DOP_WEB = path.join(__dirname, '..', 'dop-web');
const DATA_DIR = path.join(DOP_WEB, 'data');
const LOG_DIR = path.join(DATA_DIR, 'logs');
const PID_FILE = path.join(DATA_DIR, '.dop-pod.json');
const OLLAMA_URL = 'http://localhost:11434/api/tags';

function isAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// Kill a detached process's whole group (npm/npx spawn children we also need
// to reap). Falls back to killing the leader if the group kill fails.
function killTree(pid, signal = 'SIGTERM') {
  if (!isAlive(pid)) return;
  try { process.kill(-pid, signal); return; } catch {}
  try { process.kill(pid, signal); } catch {}
}

async function checkOllama() {
  try {
    const res = await fetch(OLLAMA_URL, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch { return false; }
}

async function waitForOllama(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkOllama()) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function readPodState() {
  try { return JSON.parse(fs.readFileSync(PID_FILE, 'utf-8')); }
  catch { return null; }
}
function writePodState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PID_FILE, JSON.stringify(state, null, 2));
}
function clearPodState() {
  try { fs.unlinkSync(PID_FILE); } catch {}
}

function streamProc(name, proc, logPath) {
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const prefix = `[${name}] `;
  const onChunk = (chunk) => {
    const text = chunk.toString();
    logStream.write(text);
    process.stdout.write(text.split('\n').map((l, i, arr) =>
      i === arr.length - 1 && l === '' ? '' : prefix + l
    ).join('\n'));
  };
  proc.stdout?.on('data', onChunk);
  proc.stderr?.on('data', onChunk);
}

async function startPod() {
  const existing = readPodState();
  if (existing) {
    const alive = existing.procs.filter(p => isAlive(p.pid));
    if (alive.length > 0) {
      console.log('⚠️  DOP pod is already running:');
      for (const p of alive) console.log(`   - ${p.name} (pid ${p.pid})`);
      console.log('\nUse `dop pod stop` to tear it down first.');
      process.exit(1);
    }
    // Stale state file — clean up.
    clearPodState();
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const procs = [];

  // 1. Ollama
  const ollamaAlreadyUp = await checkOllama();
  if (ollamaAlreadyUp) {
    console.log('✓ Ollama already running on :11434');
  } else {
    console.log('→ Starting ollama serve...');
    const ollamaLog = path.join(LOG_DIR, 'pod-ollama.log');
    const p = spawn('ollama', ['serve'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (!p.pid) {
      console.error('❌ Failed to spawn `ollama serve`. Is Ollama installed? https://ollama.com');
      process.exit(1);
    }
    streamProc('ollama', p, ollamaLog);
    procs.push({ name: 'ollama', pid: p.pid, startedByUs: true, log: ollamaLog });
    const up = await waitForOllama();
    if (!up) {
      console.warn('⚠️  Ollama did not respond within 20s — continuing anyway.');
    } else {
      console.log('✓ Ollama is up on :11434');
    }
  }

  // 2. Next dev (web dashboard)
  console.log('→ Starting web dashboard...');
  const webLog = path.join(LOG_DIR, 'pod-web.log');
  const web = spawn('npm', ['run', 'dev'], {
    cwd: DOP_WEB,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!web.pid) {
    console.error('❌ Failed to spawn `npm run dev` in dop-web/');
    process.exit(1);
  }
  streamProc('web', web, webLog);
  procs.push({ name: 'web', pid: web.pid, startedByUs: true, log: webLog });

  // 3. Telegram daemon
  console.log('→ Starting telegram daemon...');
  const daemonLog = path.join(LOG_DIR, 'pod-daemon.log');
  const daemon = spawn('npx', ['tsx', 'daemon.ts'], {
    cwd: DOP_WEB,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!daemon.pid) {
    console.error('❌ Failed to spawn `npx tsx daemon.ts`');
    process.exit(1);
  }
  streamProc('daemon', daemon, daemonLog);
  procs.push({ name: 'daemon', pid: daemon.pid, startedByUs: true, log: daemonLog });

  writePodState({ procs, startedAt: new Date().toISOString() });

  console.log('');
  console.log('☠️  DOP pod is alive.');
  console.log('   Web:    http://localhost:3000');
  console.log('   Logs:   dop-web/data/logs/pod-*.log');
  console.log('   Stop:   dop pod stop   (or Ctrl-C here)');
  console.log('');

  // Foreground streaming: stay alive until Ctrl-C, then tear down.
  const teardown = async (signal) => {
    console.log(`\n→ Caught ${signal}. Tearing down pod...`);
    await stopPod();
    process.exit(0);
  };
  process.on('SIGINT', () => teardown('SIGINT'));
  process.on('SIGTERM', () => teardown('SIGTERM'));

  // Keep the parent from exiting immediately.
  setInterval(() => {
    // If all children died on us, bail out.
    const state = readPodState();
    if (!state) return;
    const anyAlive = state.procs.some(p => isAlive(p.pid));
    if (!anyAlive) {
      console.log('\n⚠️  All pod processes have exited. Cleaning up.');
      clearPodState();
      process.exit(1);
    }
  }, 2000).unref();
}

function stopPod() {
  return new Promise((resolve) => {
    const state = readPodState();
    if (!state) {
      console.log('No DOP pod is running (no pid file).');
      resolve();
      return;
    }
    for (const p of state.procs) {
      if (!isAlive(p.pid)) {
        console.log(`✓ ${p.name} (pid ${p.pid}) already stopped`);
        continue;
      }
      killTree(p.pid, 'SIGTERM');
      console.log(`✓ Stopped ${p.name} (pid ${p.pid})`);
    }
    // Give them a beat, then SIGKILL anything still alive.
    const deadline = Date.now() + 3000;
    const sweep = () => {
      const stillAlive = state.procs.filter(p => isAlive(p.pid));
      if (stillAlive.length === 0 || Date.now() > deadline) {
        for (const p of stillAlive) {
          killTree(p.pid, 'SIGKILL');
          console.log(`☠️  Force-killed ${p.name} (pid ${p.pid})`);
        }
        clearPodState();
        console.log('☠️  DOP pod stopped.');
        resolve();
        return;
      }
      setTimeout(sweep, 250);
    };
    sweep();
  });
}

function podStatus() {
  const state = readPodState();
  if (!state) {
    console.log('DOP pod: not running');
    return;
  }
  console.log(`DOP pod started ${state.startedAt}`);
  for (const p of state.procs) {
    const alive = isAlive(p.pid) ? 'alive ' : 'dead  ';
    console.log(`  [${alive}] ${p.name.padEnd(8)} pid=${p.pid}  log=${p.log}`);
  }
}

function printPairingCode() {
  const codeFile = path.join(DATA_DIR, '.telegram-pairing-code');
  try {
    const code = fs.readFileSync(codeFile, 'utf-8').trim();
    console.log('Telegram pairing code: ' + code);
    console.log('In Telegram, send:     /pair ' + code);
  } catch {
    console.log('No pairing code yet. Start the daemon first (`dop pod`) to generate one.');
  }
}

yargs(hideBin(process.argv))
  .scriptName('dop')
  .completion('completion', 'Generate completion script for zsh/bash')
  .command('dashboard', 'Start only the web dashboard (no daemon, no ollama)', () => {}, async () => {
    console.log('Starting DOP Web Dashboard...');
    const nextProcess = spawn('npm', ['run', 'dev'], { cwd: DOP_WEB, stdio: 'inherit' });
    setTimeout(async () => {
      console.log('Opening dashboard at http://localhost:3000 ...');
      try {
        const { default: openBrowser } = await import('open');
        await openBrowser('http://localhost:3000');
      } catch (err) {
        console.error('Failed to open browser: ', err);
      }
    }, 2500);
    nextProcess.on('close', (code) => process.exit(code));
  })
  .command(
    'pod [action]',
    'Start/stop the full DOP system (ollama + web + telegram daemon)',
    (y) => y.positional('action', {
      describe: 'start | stop | status',
      choices: ['start', 'stop', 'status'],
      default: 'start',
    }),
    async (argv) => {
      if (argv.action === 'stop') return await stopPod();
      if (argv.action === 'status') return podStatus();
      await startPod();
    }
  )
  .command('pair', 'Show the current Telegram pairing code', () => {}, () => printPairingCode())
  .demandCommand(1, 'Please provide a valid command.')
  .help()
  .parse();
