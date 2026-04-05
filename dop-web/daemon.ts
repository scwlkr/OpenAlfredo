import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import { chatWithAgent, checkCronTasks, runHeartbeat } from './src/lib/dop';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
const HEARTBEAT_CRON = process.env.HEARTBEAT_CRON || '0 * * * *'; // hourly by default
const HEARTBEAT_ACTIVE = (process.env.HEARTBEAT_ACTIVE || 'true').toLowerCase() !== 'false';
const AMBITION_CRON = process.env.AMBITION_CRON || '*/30 * * * *';

// Persist the latest Telegram chat ID so proactive notifications survive restarts.
const CHAT_ID_FILE = path.join(process.cwd(), 'data', '.telegram-chat-id');
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

let bot: TelegramBot | null = null;
let savedChatId: number | null = loadChatId();

if (TELEGRAM_TOKEN) {
  console.log('💀 Starting Telegram Bot...');
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  bot.onText(/^\/start\b/, (msg) => {
    const chatId = msg.chat.id;
    savedChatId = chatId;
    saveChatId(chatId);
    bot?.sendMessage(
      chatId,
      '💀 *Death of Prompt* is listening.\n\nYou are now subscribed to proactive alerts from this agent.\n\nCommands:\n/status — show current ambitions & last heartbeat\n/heartbeat — force a heartbeat tick now',
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/^\/status\b/, (msg) => {
    const root = path.join(process.cwd(), '..');
    const ambition = fs.existsSync(path.join(root, 'AMBITION.md'))
      ? fs.readFileSync(path.join(root, 'AMBITION.md'), 'utf-8')
      : '(no AMBITION.md)';
    bot?.sendMessage(msg.chat.id, '```\n' + ambition.slice(0, 3500) + '\n```', {
      parse_mode: 'Markdown',
    });
  });

  bot.onText(/^\/heartbeat\b/, async (msg) => {
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
    savedChatId = chatId;
    saveChatId(chatId);

    if (!msg.text || msg.text.startsWith('/')) return;

    bot?.sendChatAction(chatId, 'typing');
    const reply = await chatWithAgent(msg.text);
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
