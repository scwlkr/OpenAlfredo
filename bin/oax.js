#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  OAX_WEB,
  ensureWebEnvFile,
  sanitizeProfileName,
  profilePaths,
  resetProfileFixture,
  buildSandboxEnv,
  profileExists,
} = require('./profile-state');

const DATA_DIR = path.join(OAX_WEB, 'data');
const LOG_DIR = path.join(DATA_DIR, 'logs');
const PID_FILE = path.join(DATA_DIR, '.oax-pod.json');
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
function readNextDevLock() {
  try {
    return JSON.parse(fs.readFileSync(path.join(OAX_WEB, '.next', 'dev', 'lock'), 'utf-8'));
  } catch {
    return null;
  }
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
      console.log('⚠️  OAX pod is already running:');
      for (const p of alive) console.log(`   - ${p.name} (pid ${p.pid})`);
      console.log('\nUse `oax pod stop` to tear it down first.');
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
    cwd: OAX_WEB,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!web.pid) {
    console.error('❌ Failed to spawn `npm run dev` in oax-web/');
    process.exit(1);
  }
  streamProc('web', web, webLog);
  procs.push({ name: 'web', pid: web.pid, startedByUs: true, log: webLog });

  // 3. Telegram daemon
  console.log('→ Starting telegram daemon...');
  const daemonLog = path.join(LOG_DIR, 'pod-daemon.log');
  const daemon = spawn('npx', ['tsx', 'daemon.ts'], {
    cwd: OAX_WEB,
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
  console.log('OpenAlfredo pod is running.');
  console.log('   Web:    http://localhost:3000');
  console.log('   Logs:   oax-web/data/logs/pod-*.log');
  console.log('   Stop:   oax pod stop   (or Ctrl-C here)');
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
      console.log('No OAX pod is running (no pid file).');
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
        console.log('☠️  OAX pod stopped.');
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
    console.log('OAX pod: not running');
    return;
  }
  console.log(`OAX pod started ${state.startedAt}`);
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
    console.log('  (Expires 5 minutes after daemon startup)');
  } catch {
    console.log('No pairing code yet. Start the daemon first (`oax pod`) to generate one.');
  }
}

async function ensureSandboxProfile(profile, fixture, reset) {
  ensureWebEnvFile();
  const safeProfile = sanitizeProfileName(profile);
  if (reset || !profileExists(safeProfile)) {
    await resetProfileFixture(safeProfile, fixture);
  }
  return safeProfile;
}

async function startSandbox({ profile, fixture, reset, port }) {
  const safeProfile = await ensureSandboxProfile(profile, fixture, reset);
  const env = buildSandboxEnv(safeProfile, { port });
  const { dataDir, envPath } = profilePaths(safeProfile);
  const url = `http://127.0.0.1:${port}`;
  const activeDev = readNextDevLock();

  if (activeDev?.pid && isAlive(activeDev.pid)) {
    console.error('Another `next dev` server is already running for oax-web/.');
    console.error(`   PID:  ${activeDev.pid}`);
    console.error(`   URL:  ${activeDev.appUrl || `http://${activeDev.hostname || '127.0.0.1'}:${activeDev.port || 3000}`}`);
    console.error('');
    console.error('Stop that server before starting a sandbox profile from the same checkout.');
    console.error('Your personal profile is preserved; only the running dev server conflicts.');
    process.exit(1);
  }

  console.log(`Starting OAX sandbox profile "${safeProfile}"...`);
  console.log(`   Fixture: ${fixture}`);
  console.log(`   Port:    ${port}`);
  console.log(`   Data:    ${path.relative(path.join(__dirname, '..'), dataDir)}`);
  console.log(`   Env:     ${path.relative(path.join(__dirname, '..'), envPath)}`);

  const nextProcess = spawn('npm', ['run', 'dev'], {
    cwd: OAX_WEB,
    stdio: 'inherit',
    env,
  });

  setTimeout(async () => {
    console.log(`Opening sandbox at ${url} ...`);
    try {
      const { default: openBrowser } = await import('open');
      await openBrowser(url);
    } catch (err) {
      console.error('Failed to open browser: ', err);
    }
  }, 2500);

  nextProcess.on('close', (code) => process.exit(code ?? 0));
}

async function resetSandbox({ profile, fixture }) {
  const safeProfile = sanitizeProfileName(profile);
  ensureWebEnvFile();
  const { dataDir, envPath } = await resetProfileFixture(safeProfile, fixture);
  console.log(`Reset sandbox profile "${safeProfile}" with fixture "${fixture}".`);
  console.log(`   Data: ${path.relative(path.join(__dirname, '..'), dataDir)}`);
  console.log(`   Env:  ${path.relative(path.join(__dirname, '..'), envPath)}`);
}

yargs(hideBin(process.argv))
  .scriptName('oax')
  .completion('completion', 'Generate completion script for zsh/bash')
  .command('dashboard', 'Start only the web dashboard (no daemon, no ollama)', () => {}, async () => {
    console.log('Starting OAX Web Dashboard...');
    const nextProcess = spawn('npm', ['run', 'dev'], { cwd: OAX_WEB, stdio: 'inherit' });
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
    'Start/stop the full OAX system (ollama + web + telegram daemon)',
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
  .command(
    'dev <action>',
    'Start or reset a disposable web-only sandbox profile',
    (y) =>
      y
        .positional('action', {
          describe: 'start | reset',
          choices: ['start', 'reset'],
          default: 'start',
        })
        .option('profile', {
          type: 'string',
          default: 'sandbox',
          describe: 'Sandbox profile name',
        })
        .option('fixture', {
          type: 'string',
          choices: ['blank', 'seeded', 'returning'],
          default: 'blank',
          describe: 'Fixture to apply to the sandbox profile',
        })
        .option('reset', {
          type: 'boolean',
          default: false,
          describe: 'Reset the sandbox profile before starting',
        })
        .option('port', {
          type: 'number',
          default: 3001,
          describe: 'Port for the sandbox web server',
        }),
    async (argv) => {
      if (argv.action === 'reset') {
        return await resetSandbox({
          profile: argv.profile,
          fixture: argv.fixture,
        });
      }
      await startSandbox({
        profile: argv.profile,
        fixture: argv.fixture,
        reset: argv.reset,
        port: argv.port,
      });
    }
  )
  .command('pair', 'Show the current Telegram pairing code', () => {}, () => printPairingCode())
  .demandCommand(1, 'Please provide a valid command.')
  .help()
  .parse();
