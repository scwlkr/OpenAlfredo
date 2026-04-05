import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { chatWithAgent, checkCronTasks, runHeartbeat } from './src/lib/dop';
import { readAmbition } from './src/lib/ambition';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const HEARTBEAT_CRON = process.env.HEARTBEAT_CRON || '0 * * * *'; // hourly by default
const HEARTBEAT_ACTIVE = (process.env.HEARTBEAT_ACTIVE || 'true').toLowerCase() !== 'false';
const AMBITION_CRON = process.env.AMBITION_CRON || '*/30 * * * *';

// Persist the latest Telegram chat ID so proactive notifications survive restarts.
const DATA_DIR = path.join(process.cwd(), 'data');
const CHAT_ID_FILE = path.join(DATA_DIR, '.telegram-chat-id');
const ALLOWLIST_FILE = path.join(DATA_DIR, '.telegram-allowlist.json');
const PAIRING_CODE_FILE = path.join(DATA_DIR, '.telegram-pairing-code');

function loadChatId(): number | null {
  try {
    const raw = fs.readFileSync(CHAT_ID_FILE, 'utf-8').trim();
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}
function saveChatId(id: number) {
  try {
    fs.mkdirSync(path.dirname(CHAT_ID_FILE), { recursive: true });
    fs.writeFileSync(CHAT_ID_FILE, String(id));
  } catch (e) {
    console.error('Could not persist chat id:', e);
  }
}

// Pairing: unpaired chats can only see a pairing prompt. The pairing code is
// generated once, persisted, and printed on every daemon startup.
function loadAllowlist(): Set<number> {
  try {
    const arr = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf-8'));
    return new Set(Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set();
  }
}
function saveAllowlist(s: Set<number>) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ALLOWLIST_FILE, JSON.stringify([...s]));
  } catch (e) {
    console.error('Could not persist allowlist:', e);
  }
}
function loadOrCreatePairingCode(): string {
  try {
    const existing = fs.readFileSync(PAIRING_CODE_FILE, 'utf-8').trim();
    if (existing) return existing;
  } catch {}
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PAIRING_CODE_FILE, code);
  } catch (e) {
    console.error('Could not persist pairing code:', e);
  }
  return code;
}

const allowlist = loadAllowlist();
const PAIRING_CODE = loadOrCreatePairingCode();

let bot: TelegramBot | null = null;
let savedChatId: number | null = loadChatId();
// Drop a stale savedChatId if it isn't paired (legacy upgrade).
if (savedChatId !== null && !allowlist.has(savedChatId)) savedChatId = null;

function isPaired(chatId: number): boolean {
  return allowlist.has(chatId);
}
function sendPairingPrompt(chatId: number) {
  bot?.sendMessage(
    chatId,
    '🔒 *Death of Prompt* requires pairing.\n\nSend: `/pair <code>`\n\nThe 6-digit code was printed to the DOP daemon console on startup.',
    { parse_mode: 'Markdown' }
  );
}

if (TELEGRAM_TOKEN) {
  console.log('💀 Starting Telegram Bot...');
  console.log('');
  console.log('🔑 Telegram pairing code: ' + PAIRING_CODE);
  console.log('   In Telegram, send:  /pair ' + PAIRING_CODE);
  console.log('   Paired chats: ' + (allowlist.size || 'none yet'));
  console.log('');
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  bot.onText(/^\/pair\s+(\S+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const code = match?.[1]?.trim();
    if (code === PAIRING_CODE) {
      allowlist.add(chatId);
      saveAllowlist(allowlist);
      savedChatId = chatId;
      saveChatId(chatId);
      bot?.sendMessage(
        chatId,
        '✅ *Paired.* Death of Prompt is now listening to this chat.\n\nCommands:\n/status — show current ambitions\n/heartbeat — force a heartbeat tick\n/unpair — disconnect this chat',
        { parse_mode: 'Markdown' }
      );
      console.log(`✅ Paired new chat id=${chatId} (total paired: ${allowlist.size})`);
    } else {
      bot?.sendMessage(chatId, '❌ Invalid pairing code.');
    }
  });

  bot.onText(/^\/unpair\b/, (msg) => {
    const chatId = msg.chat.id;
    if (allowlist.delete(chatId)) {
      saveAllowlist(allowlist);
      if (savedChatId === chatId) savedChatId = null;
      bot?.sendMessage(chatId, '👋 Unpaired. This chat will no longer receive alerts.');
      console.log(`👋 Unpaired chat id=${chatId}`);
    } else {
      bot?.sendMessage(chatId, '(this chat was not paired)');
    }
  });

  bot.onText(/^\/start\b/, (msg) => {
    const chatId = msg.chat.id;
    if (!isPaired(chatId)) return sendPairingPrompt(chatId);
    savedChatId = chatId;
    saveChatId(chatId);
    bot?.sendMessage(
      chatId,
      '💀 *Death of Prompt* is listening.\n\nYou are subscribed to proactive alerts.\n\nCommands:\n/status — show current ambitions & last heartbeat\n/heartbeat — force a heartbeat tick now\n/unpair — disconnect this chat',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/^\/status\b/, (msg) => {
    if (!isPaired(msg.chat.id)) return sendPairingPrompt(msg.chat.id);
    const ambition = readAmbition() || '(no AMBITION.md)';
    bot?.sendMessage(msg.chat.id, '```\n' + ambition.slice(0, 3500) + '\n```', {
      parse_mode: 'Markdown',
    });
  });

  bot.onText(/^\/heartbeat\b/, async (msg) => {
    if (!isPaired(msg.chat.id)) return sendPairingPrompt(msg.chat.id);
    bot?.sendChatAction(msg.chat.id, 'typing');
    const r = await runHeartbeat();
    const summary = r.rested
      ? '💤 (rested)'
      : [
          ...r.notifications.map((n) => `🔔 ${n}`),
          ...r.tasksAdded.map((t) => `📝 task: ${t}`),
          ...r.reflections.map((x) => `💭 ${x}`),
        ].join('\n');
    bot?.sendMessage(msg.chat.id, summary || '(empty)');
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text) return;
    // Commands are handled by dedicated onText handlers above (including
    // /pair, which is the only one an unpaired chat can successfully use).
    if (msg.text.startsWith('/')) return;

    if (!isPaired(chatId)) return sendPairingPrompt(chatId);

    savedChatId = chatId;
    saveChatId(chatId);
    bot?.sendChatAction(chatId, 'typing');
    const reply = await chatWithAgent(msg.text, chatId);
    bot?.sendMessage(chatId, reply);
  });
} else {
  console.log(
    '⚠️  No TELEGRAM_TOKEN provided. Telegram bot is disabled.\n' +
      '   Set TELEGRAM_TOKEN in dop-web/.env to enable.'
  );
}

// AMBITION task-check cron (deterministic reminders)
console.log(`⏰ Starting AMBITION cron (${AMBITION_CRON})`);
cron.schedule(AMBITION_CRON, async () => {
  const notification = await checkCronTasks();
  if (notification) {
    console.log('AMBITION notification:', notification);
    if (bot && savedChatId) {
      bot.sendMessage(savedChatId, `🔔 *Proactive Alert:*\n${notification}`, {
        parse_mode: 'Markdown',
      });
    }
  }
});

// RESTLESS heartbeat cron (exploratory, self-initiated)
if (HEARTBEAT_ACTIVE) {
  console.log(`💓 Starting RESTLESS heartbeat (${HEARTBEAT_CRON})`);
  cron.schedule(HEARTBEAT_CRON, async () => {
    const result = await runHeartbeat();
    if (result.rested) {
      console.log('💤 heartbeat: rest');
      return;
    }
    console.log(
      `💓 heartbeat: notify=${result.notifications.length} task=${result.tasksAdded.length} reflect=${result.reflections.length}`
    );
    if (bot && savedChatId) {
      for (const n of result.notifications) {
        bot.sendMessage(savedChatId, `💭 ${n}`);
      }
    }
  });
} else {
  console.log('💤 RESTLESS heartbeat disabled (HEARTBEAT_ACTIVE=false)');
}

console.log('☠️  DOP Daemon is alive. The agent is restless.');
