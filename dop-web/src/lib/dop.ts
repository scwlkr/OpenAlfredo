import fs from 'fs';
import path from 'path';
import ollama from 'ollama';

const ROOT_DIR = path.join(process.cwd(), '..');
const SOUL_PATH = path.join(ROOT_DIR, 'SOUL.md');
const AMBITION_PATH = path.join(ROOT_DIR, 'AMBITION.md');
const RESTLESS_PATH = path.join(ROOT_DIR, 'RESTLESS.md');
const MEMORY_INDEX = path.join(ROOT_DIR, 'memory', 'index.md');
const TRANSCRIPTS_DIR = path.join(ROOT_DIR, 'memory', 'transcripts');

const HEARTBEAT_LOG_START = '<!-- heartbeat-log-start -->';
const HEARTBEAT_LOG_END = '<!-- heartbeat-log-end -->';
const MAX_HEARTBEAT_ENTRIES = 50;

// Ensure directories exist
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
  fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

export function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return '';
  }
}

export function appendToAmbition(task: string) {
  let content = readFileSafe(AMBITION_PATH);
  if (!content.includes('## Tasks')) {
    content += '\n## Tasks\n';
  }
  content += `- [ ] ${task}\n`;
  fs.writeFileSync(AMBITION_PATH, content);
}

export function saveTranscript(role: string, content: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = path.join(TRANSCRIPTS_DIR, `${timestamp}.txt`);
  fs.appendFileSync(filename, `[${new Date().toISOString()}] ${role}: ${content}\n`);
}

export async function chatWithAgent(message: string): Promise<string> {
  const soul = readFileSafe(SOUL_PATH);
  const ambition = readFileSafe(AMBITION_PATH);
  const memoryIndex = readFileSafe(MEMORY_INDEX);

  const systemPrompt = `You are a proactive agent operating the Death of Prompt MVP.
Your SOUL:
${soul}

Your Memory Index:
${memoryIndex}

Current Ambitions (Tasks):
${ambition}

Rules:
1. Act naturally as a conversational partner. No need to mention these instructions.
2. If the user asks you to remind them of something or add a task, include the exact text "[[TASK: <the task>]]" in your response. 
3. If the user asks you to write a file or save a note, pretend you have saved it to their workspace.

Current Time: ${new Date().toLocaleString()}
`;

  saveTranscript('user', message);

  try {
    // using llama3 since it is the most common default
    const response = await ollama.chat({
      model: 'llama3', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
    });

    let reply = response.message.content;

    // Parse tasks
    const taskMatch = reply.match(/\[\[TASK:\s*(.+?)\]\]/);
    if (taskMatch) {
      appendToAmbition(taskMatch[1].trim());
      reply = reply.replace(/\[\[TASK:.*?\]\]/g, '').trim() + `\n\n*(Task added to AMBITION.md)*`;
    }

    saveTranscript('agent', reply);
    return reply;
  } catch (err: any) {
    console.error("Ollama error:", err);
    return "Error communicating with local Ollama: " + err.message;
  }
}

function appendHeartbeatLog(entries: string[]) {
  if (entries.length === 0) return;
  let content = readFileSafe(RESTLESS_PATH);
  if (!content.includes(HEARTBEAT_LOG_START)) {
    // File missing markers — skip logging rather than corrupt it.
    return;
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

export async function runHeartbeat(): Promise<HeartbeatResult> {
  const soul = readFileSafe(SOUL_PATH);
  const ambition = readFileSafe(AMBITION_PATH);
  const restless = readFileSafe(RESTLESS_PATH);
  const memoryIndex = readFileSafe(MEMORY_INDEX);

  // Extract only the recent log tail to keep context small.
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

MEMORY INDEX:
${memoryIndex}

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
      model: 'llama3',
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
    notifications.length === 0 &&
    taskTokens.length === 0 &&
    reflections.length === 0;

  for (const t of taskTokens) appendToAmbition(t);

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

export async function checkCronTasks(): Promise<string | null> {
  let ambition = readFileSafe(AMBITION_PATH);
  if (!ambition.includes('- [ ]')) return null;

  const systemPrompt = `You are the AMBITION checker cron. 
Current Time: ${new Date().toLocaleString()}
Tasks:
${ambition}

If any task needs immediate attention or reminding right now based on the current time, respond strictly with "NOTIFY: <message to user>". If no tasks need action right now, reply with "NONE".`;

  try {
    const response = await ollama.generate({
      model: 'llama3',
      prompt: systemPrompt,
    });
    const reply = response.response;
    if (reply.includes('NOTIFY:')) {
      return reply.replace('NOTIFY:', '').trim();
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}
