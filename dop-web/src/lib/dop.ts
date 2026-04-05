// Telegram + heartbeat surface. Delegates to the shared engine (`dop-engine.ts`
// + `memory-retrieval.ts` + `ambition.ts`) so the Telegram bot and the web UI
// share one brain: same SOUL, same SQLite transcripts, same 3-layer memory,
// same [[TASK]] / [[SAVE_FILE]] marker handling.
import fs from 'fs';
import path from 'path';
import ollama from 'ollama';
import { processChatSync } from './dop-engine';
import { readAmbition, dueTasks, appendTask } from './ambition';

// Canonical paths — SOUL lives inside dop-web/data/ (the web path's store),
// so the Telegram agent reads the SAME persona the onboarding flow wrote.
// RESTLESS stays at the repo root; it's the daemon's private heartbeat log.
const WEB_ROOT = process.cwd(); // dop-web/ when the daemon is launched from there
const REPO_ROOT = path.join(WEB_ROOT, '..');
const DEFAULT_AGENT_ID = 'default';
const SOUL_PATH = path.join(WEB_ROOT, 'data', 'agents', DEFAULT_AGENT_ID, 'SOUL.md');
const RESTLESS_PATH = path.join(REPO_ROOT, 'RESTLESS.md');

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

// Each Telegram chat becomes its own long-lived DOP session so transcripts
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

function appendHeartbeatLog(entries: string[]) {
  if (entries.length === 0) return;
  const content = readFileSafe(RESTLESS_PATH);
  if (!content.includes(HEARTBEAT_LOG_START)) return; // don't corrupt missing markers
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
  fs.writeFileSync(RESTLESS_PATH, rebuilt);
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
  const restless = readFileSafe(RESTLESS_PATH);

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

AMBITION (your open tasks):
${ambition}

RECENT HEARTBEATS (your own recent thoughts):
${logTail || '(none yet — this is your first heartbeat)'}

Current Time: ${new Date().toLocaleString()}

Decide: is there anything you should do right now? Options:
- [[NOTIFY: <short message>]] — proactively message the user (use sparingly; only if timely/relevant).
- [[TASK: <task>]] — add a new task to AMBITION.
- [[REFLECT: <thought>]] — record a private thought. No user output.
- [[REST]] — nothing to do. Stay restless but silent.

Emit one or more of these tokens. Do not explain. Do not chat. Be concise.`;

  let raw = '';
  try {
    const response = await ollama.generate({
      model: process.env.DOP_MODEL || 'llama3',
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
