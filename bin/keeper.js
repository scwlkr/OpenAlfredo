#!/usr/bin/env node
// OAX Keeper — a tiny standalone Telegram bot that lives OUTSIDE the pod.
// Its only job is to start, stop, and status-check the OAX pod remotely.
// Run it once from a persistent location (nohup, launchd, tmux) so it
// survives `oax pod stop` and can bring the pod back up on command.
//
// Commands (paired chats only):
//   /keepPair <code>    — pair this chat
//   /keepUnpair         — disconnect this chat
//   /podStart           — `oax pod` (detached)
//   /podStop            — `oax pod stop`
//   /podStatus          — `oax pod status`
//
// Telegram commands stop at whitespace/dashes so camelCase is mandatory —
// `/keep-pair` gets parsed as `/keep` and loses the argument.
//
// The keeper has its own pairing code and allowlist, separate from the
// daemon's. State lives in oax-web/data/.keeper-*.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'oax-web', 'data');
const PAIRING_FILE = path.join(DATA_DIR, '.keeper-pairing-code');
const ALLOWLIST_FILE = path.join(DATA_DIR, '.keeper-allowlist.json');
const OAX_BIN = path.join(__dirname, 'oax.js');

// Read TELEGRAM_TOKEN from oax-web/.env so the keeper reuses the same bot.
function loadEnvToken() {
  if (process.env.TELEGRAM_TOKEN) return process.env.TELEGRAM_TOKEN;
  try {
    const env = fs.readFileSync(path.join(REPO_ROOT, 'oax-web', '.env'), 'utf-8');
    const m = env.match(/^TELEGRAM_TOKEN\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return '';
}

const TELEGRAM_TOKEN = loadEnvToken();
if (!TELEGRAM_TOKEN) {
  console.error('❌ No TELEGRAM_TOKEN found (checked env + oax-web/.env).');
  process.exit(1);
}

// node-telegram-bot-api lives in oax-web/node_modules — require from there.
const TelegramBot = require(path.join(REPO_ROOT, 'oax-web', 'node_modules', 'node-telegram-bot-api'));

function loadAllowlist() {
  try {
    const arr = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf-8'));
    return new Set(Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : []);
  } catch { return new Set(); }
}
function saveAllowlist(s) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ALLOWLIST_FILE, JSON.stringify([...s]), { mode: 0o600 });
}
function loadOrCreateCode() {
  // Use CSPRNG instead of Math.random
  const code = crypto.randomInt(100000, 999999).toString();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PAIRING_FILE, code, { mode: 0o600 });
  return code;
}
const KEEPER_CODE_GENERATED_AT = Date.now();
const KEEPER_CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Brute-force protection
const keeperAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkKeeperRateLimit(id) {
  const entry = keeperAttempts.get(id);
  if (entry && entry.lockedUntil > Date.now()) return false;
  return true;
}
function recordKeeperFailure(id) {
  const entry = keeperAttempts.get(id) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  keeperAttempts.set(id, entry);
}
function clearKeeperAttempts(id) {
  keeperAttempts.delete(id);
}

const allowlist = loadAllowlist();
const PAIRING_CODE = loadOrCreateCode();

console.log('🛡️  OAX Keeper starting.');
console.log('   Pairing code: ' + PAIRING_CODE);
console.log('   In Telegram: /keepPair ' + PAIRING_CODE);
console.log('   Paired chats: ' + (allowlist.size || 'none yet'));

// IMPORTANT: keeper uses getUpdates with a separate offset. When the main
// daemon is ALSO polling, both bots will fight over updates from the same
// token. For a single-bot-token setup, recommend running the keeper with
// HEARTBEAT_ACTIVE=false in a dedicated bot OR accept that only one of the
// two processes will reliably receive each message. In practice: keep the
// keeper up when the pod is DOWN; it'll naturally have the token to itself.
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const isPaired = (id) => allowlist.has(id);
const needPair = (id) => bot.sendMessage(id, '🔒 Send `/keepPair <code>` — see the keeper console.', { parse_mode: 'Markdown' });

bot.onText(/^\/keepPair\s+(\S+)/i, (msg, m) => {
  const id = msg.chat.id;

  // Brute-force protection
  if (!checkKeeperRateLimit(id)) {
    bot.sendMessage(id, '🔒 Too many failed pairing attempts. Try again later.');
    return;
  }

  if (m[1].trim() === PAIRING_CODE) {
    // Check expiry
    if (Date.now() - KEEPER_CODE_GENERATED_AT > KEEPER_CODE_EXPIRY_MS) {
      bot.sendMessage(id, '❌ Pairing code has expired. Restart the keeper to generate a new one.');
      return;
    }
    allowlist.add(id);
    saveAllowlist(allowlist);
    clearKeeperAttempts(id);
    bot.sendMessage(id, '✅ Keeper paired.\n\nCommands:\n/podStart\n/podStop\n/podStatus\n/keepUnpair');
    console.log(`✅ keeper paired chat ${id}`);
  } else {
    recordKeeperFailure(id);
    bot.sendMessage(id, '❌ Invalid pairing code.');
  }
});

bot.onText(/^\/keepUnpair\b/i, (msg) => {
  const id = msg.chat.id;
  if (allowlist.delete(id)) {
    saveAllowlist(allowlist);
    bot.sendMessage(id, '👋 Keeper unpaired.');
  } else {
    bot.sendMessage(id, '(not paired)');
  }
});

function runDop(args, onDone) {
  execFile('node', [OAX_BIN, ...args], { cwd: REPO_ROOT }, (err, stdout, stderr) => {
    onDone((stdout || '') + (stderr || '') + (err ? `\n[exit ${err.code}]` : ''));
  });
}

bot.onText(/^\/podStart\b/i, (msg) => {
  const id = msg.chat.id;
  if (!isPaired(id)) return needPair(id);
  bot.sendMessage(id, '🚀 Starting pod...');
  // Start the pod detached so it runs independently of the keeper. Logs
  // still land in oax-web/data/logs/pod-*.log.
  const p = spawn('node', [OAX_BIN, 'pod'], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: 'ignore',
  });
  p.unref();
  setTimeout(() => {
    runDop(['pod', 'status'], (out) =>
      bot.sendMessage(id, '```\n' + (out || '(no output)') + '\n```', { parse_mode: 'Markdown' })
    );
  }, 3000);
});

bot.onText(/^\/podStop\b/i, (msg) => {
  const id = msg.chat.id;
  if (!isPaired(id)) return needPair(id);
  bot.sendMessage(id, '🛑 Stopping pod...');
  runDop(['pod', 'stop'], (out) =>
    bot.sendMessage(id, '```\n' + (out || '(no output)') + '\n```', { parse_mode: 'Markdown' })
  );
});

bot.onText(/^\/podStatus\b/i, (msg) => {
  const id = msg.chat.id;
  if (!isPaired(id)) return needPair(id);
  runDop(['pod', 'status'], (out) =>
    bot.sendMessage(id, '```\n' + (out || '(no output)') + '\n```', { parse_mode: 'Markdown' })
  );
});

console.log('🛡️  Keeper is alive, waiting on Telegram.');
