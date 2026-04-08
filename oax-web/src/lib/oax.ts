// Telegram + heartbeat surface. Delegates to the shared engine (`oax-engine.ts`
// + `memory-retrieval.ts` + `ambition.ts`) so the Telegram bot and the web UI
// share one brain: same SOUL, same SQLite transcripts, same 3-layer memory,
// same [[TASK]] / [[SAVE_FILE]] marker handling.
import fs from 'fs';
import path from 'path';
import ollama from 'ollama';
import { processChatSync } from './oax-engine';
import { readAmbition } from './ambition';
import { readTasks, dueTasks, appendTask } from './tasks';
import {
  DEFAULT_AGENT_ID,
  DEFAULT_SOUL_PATH as SOUL_PATH,
  RESTLESS_LOG_PATH,
  LEGACY_RESTLESS_PATH,
  THEMES_FILE,
} from './paths';

// Heartbeat log lives under oax-web/data/ (gitignored). If only the legacy
// repo-root RESTLESS.md exists (pre-migration owner), read from it but always
// write to the canonical path.
const RESTLESS_PATH = fs.existsSync(RESTLESS_LOG_PATH)
  ? RESTLESS_LOG_PATH
  : fs.existsSync(LEGACY_RESTLESS_PATH)
    ? LEGACY_RESTLESS_PATH
    : RESTLESS_LOG_PATH;
const RESTLESS_WRITE_PATH = RESTLESS_LOG_PATH;

const HEARTBEAT_LOG_START = '<!-- heartbeat-log-start -->';
const HEARTBEAT_LOG_END = '<!-- heartbeat-log-end -->';
const MAX_HEARTBEAT_ENTRIES = 50;

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// Each Telegram chat becomes its own long-lived OAX session so transcripts
// accumulate per-user. `telegram-global` is used when no chatId is available.
export async function chatWithAgent(
  message: string,
  chatId?: number | string,
  model?: string
): Promise<string> {
  const sessionId = chatId ? `telegram-${chatId}` : 'telegram-global';
  try {
    return await processChatSync(sessionId, message, DEFAULT_AGENT_ID, model);
  } catch (err: any) {
    console.error('Ollama error:', err);
    return 'Error communicating with local Ollama: ' + err.message;
  }
}

const DEFAULT_LOG_SCAFFOLD =
  '# RESTLESS Heartbeat Log\n\n' +
  'Append-only log of the agent\'s heartbeat ticks. See `docs/RESTLESS.md` for\n' +
  'the protocol. Trimmed to the most recent 50 entries.\n\n' +
  `${HEARTBEAT_LOG_START}\n${HEARTBEAT_LOG_END}\n`;

function appendHeartbeatLog(entries: string[]) {
  if (entries.length === 0) return;
  // Read from whichever log exists (legacy or canonical), but always WRITE
  // to the canonical data/ location.
  let content = readFileSafe(RESTLESS_PATH);
  if (!content.includes(HEARTBEAT_LOG_START)) {
    // Bootstrap the scaffold on first write.
    content = DEFAULT_LOG_SCAFFOLD;
  }
  const before = content.split(HEARTBEAT_LOG_START)[0];
  const after = content.split(HEARTBEAT_LOG_END)[1] ?? '';
  const existing = content
    .split(HEARTBEAT_LOG_START)[1]
    .split(HEARTBEAT_LOG_END)[0]
    .split('\n')
    .filter((l) => l.trim().startsWith('- '));
  const combined = [...existing, ...entries].slice(-MAX_HEARTBEAT_ENTRIES);
  const rebuilt =
    before +
    HEARTBEAT_LOG_START +
    '\n' +
    combined.join('\n') +
    '\n' +
    HEARTBEAT_LOG_END +
    after;
  fs.mkdirSync(path.dirname(RESTLESS_WRITE_PATH), { recursive: true });
  fs.writeFileSync(RESTLESS_WRITE_PATH, rebuilt);
}

function parseTokens(text: string, tag: string): string[] {
  const re = new RegExp(`\\[\\[${tag}:\\s*([\\s\\S]+?)\\]\\]`, 'g');
  const out: string[] = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim());
  return out;
}

export interface HeartbeatResult {
  notifications: string[];
  tasksAdded: string[];
  reflections: string[];
  rested: boolean;
  raw: string;
}

// Self-initiated tick: agent wakes up between user messages, reviews its SOUL
// + AMBITION, and decides to NOTIFY / TASK / REFLECT / REST. Reads the
// canonical SOUL the web onboarding flow wrote; writes new tasks via the same
// `appendTask` the web chat uses.
export async function runHeartbeat(): Promise<HeartbeatResult> {
  const soul = readFileSafe(SOUL_PATH);
  const ambition = readAmbition();
  const tasks = readTasks();
  const restless = readFileSafe(RESTLESS_PATH);

  // Load active themes so heartbeat decisions are theme-aware
  let themeSummary = '';
  try {
    if (fs.existsSync(THEMES_FILE)) {
      const data = JSON.parse(fs.readFileSync(THEMES_FILE, 'utf-8'));
      const active = (data.themes || [])
        .filter((t: any) => t.strength >= 0.3)
        .sort((a: any, b: any) => b.strength - a.strength)
        .slice(0, 5);
      if (active.length > 0) {
        themeSummary = active.map((t: any) => `- ${t.tag} (${t.strength.toFixed(2)})`).join('\n');
      }
    }
  } catch {}

  const logTail = restless.includes(HEARTBEAT_LOG_START)
    ? restless
        .split(HEARTBEAT_LOG_START)[1]
        .split(HEARTBEAT_LOG_END)[0]
        .split('\n')
        .filter((l) => l.trim().startsWith('- '))
        .slice(-10)
        .join('\n')
    : '';

  const systemPrompt = `You are a persistent agent waking up on a heartbeat tick. No user has spoken to you — you are alone with your own thoughts, your purpose, and your goals.

SOUL (your identity):
${soul}

AMBITION (your reflection / morning brief):
${ambition || '(no reflection yet)'}

TASKS (your open task list):
${tasks || '(no tasks yet)'}

ACTIVE USER THEMES (from continuity loop):
${themeSummary || '(no tracked themes yet)'}

RECENT HEARTBEATS (your own recent thoughts):
${logTail || '(none yet — this is your first heartbeat)'}

Current Time: ${new Date().toLocaleString()}

Decide: is there anything you should do right now? Options:
- [[NOTIFY: <short message>]] — proactively message the user (use sparingly; only if timely/relevant).
- [[TASK: <task>]] — add a new task to the task list.
- [[REFLECT: <thought>]] — record a private thought. No user output.
- [[REST]] — nothing to do. Stay restless but silent.

Emit one or more of these tokens. Do not explain. Do not chat. Be concise.`;

  let raw = '';
  try {
    const response = await ollama.generate({
      model: process.env.OAX_MODEL || 'llama3',
      prompt: systemPrompt,
    });
    raw = response.response;
  } catch (err: any) {
    console.error('Heartbeat ollama error:', err);
    return { notifications: [], tasksAdded: [], reflections: [], rested: true, raw: '' };
  }

  const notifications = parseTokens(raw, 'NOTIFY');
  const taskTokens = parseTokens(raw, 'TASK');
  const reflections = parseTokens(raw, 'REFLECT');
  const rested =
    notifications.length === 0 && taskTokens.length === 0 && reflections.length === 0;

  for (const t of taskTokens) appendTask(t);

  const ts = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const logEntries: string[] = [];
  if (rested) {
    logEntries.push(`- ${ts} — REST — (no action)`);
  } else {
    for (const n of notifications) logEntries.push(`- ${ts} — NOTIFY — ${n.replace(/\n/g, ' ')}`);
    for (const t of taskTokens) logEntries.push(`- ${ts} — TASK — ${t.replace(/\n/g, ' ')}`);
    for (const r of reflections) logEntries.push(`- ${ts} — REFLECT — ${r.replace(/\n/g, ' ')}`);
  }
  appendHeartbeatLog(logEntries);

  return { notifications, tasksAdded: taskTokens, reflections, rested, raw };
}

// Deterministic AMBITION scan — no LLM call. Returns one NOTIFY string listing
// every task whose |when:<ISO> falls inside the last 30 minutes, or null if
// nothing is due. Uses the shared `ambition.ts::dueTasks()` so web and daemon
// agree on which tasks are due.
export async function checkCronTasks(): Promise<string | null> {
  const due = dueTasks();
  if (due.length === 0) return null;
  const lines = due.map((t) => `• ${t.text}`);
  return `You have ${due.length} task${due.length === 1 ? '' : 's'} due:\n${lines.join('\n')}`;
}
