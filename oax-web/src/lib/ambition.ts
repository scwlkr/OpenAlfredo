import fs from 'fs';
import path from 'path';
import { AMBITION_PATH as CANONICAL_AMBITION_PATH, LEGACY_AMBITION_PATH } from './paths';

// AMBITION.md lives under oax-web/data/ (gitignored) so contributors can clone
// without inheriting the owner's tasks. If only the legacy repo-root file
// exists (pre-migration owner), fall through to it transparently.
export const AMBITION_PATH = CANONICAL_AMBITION_PATH;

function resolveReadPath(): string {
  if (fs.existsSync(CANONICAL_AMBITION_PATH)) return CANONICAL_AMBITION_PATH;
  if (fs.existsSync(LEGACY_AMBITION_PATH)) return LEGACY_AMBITION_PATH;
  return CANONICAL_AMBITION_PATH;
}

export type AmbitionTask = {
  text: string;
  done: boolean;
  whenISO?: string; // absolute fire time, parsed from "|when:<ISO>" suffix
  recur?: string;   // recurrence hint, parsed from "|recur:<spec>" suffix
  raw: string;      // original line without the "- [ ] " prefix
};

const TASK_LINE = /^-\s\[( |x|X)\]\s+(.+)$/;

export function readAmbition(): string {
  try {
    return fs.readFileSync(resolveReadPath(), 'utf-8');
  } catch {
    return '';
  }
}

export function writeAmbition(content: string): void {
  // Always write to the canonical (data/) location. If a legacy file exists,
  // new writes still go to data/ — bootstrap/migration should move it over.
  fs.mkdirSync(path.dirname(CANONICAL_AMBITION_PATH), { recursive: true });
  fs.writeFileSync(CANONICAL_AMBITION_PATH, content);
}

export function listTasks(): AmbitionTask[] {
  const lines = readAmbition().split('\n');
  const tasks: AmbitionTask[] = [];
  for (const line of lines) {
    const m = line.match(TASK_LINE);
    if (!m) continue;
    const done = m[1].toLowerCase() === 'x';
    const raw = m[2].trim();
    tasks.push({
      text: stripSuffixes(raw),
      done,
      whenISO: extractSuffix(raw, 'when'),
      recur: extractSuffix(raw, 'recur'),
      raw,
    });
  }
  return tasks;
}

function extractSuffix(raw: string, key: string): string | undefined {
  const re = new RegExp(`\\|${key}:([^|\\s][^|]*?)(?=\\s*\\||\\s*$)`);
  const m = raw.match(re);
  return m ? m[1].trim() : undefined;
}

function stripSuffixes(raw: string): string {
  return raw.replace(/\s*\|(when|recur):[^|]*/g, '').trim();
}

// Append a plain task ("buy milk") or a scheduled task ("buy milk |when:2026-04-05T09:00:00Z").
export function appendTask(task: string): void {
  let content = readAmbition();
  if (!content.includes('## Tasks')) content += '\n## Tasks\n';
  if (!content.endsWith('\n')) content += '\n';
  content += `- [ ] ${task.trim()}\n`;
  writeAmbition(content);
}

// Flip the checkbox on the first task whose raw body matches.
// Returns true if a task was updated.
export function toggleTaskDone(raw: string, done: boolean): boolean {
  const target = raw.trim();
  const lines = readAmbition().split('\n');
  let hit = false;
  const next = lines.map((line) => {
    if (hit) return line;
    const m = line.match(TASK_LINE);
    if (!m) return line;
    if (m[2].trim() !== target) return line;
    hit = true;
    const box = done ? 'x' : ' ';
    return line.replace(TASK_LINE, `- [${box}] ${m[2]}`);
  });
  if (hit) writeAmbition(next.join('\n'));
  return hit;
}

// Remove the first task line whose raw body matches.
// Returns true if a task was removed.
export function deleteTask(raw: string): boolean {
  const target = raw.trim();
  const lines = readAmbition().split('\n');
  let hit = false;
  const next = lines.filter((line) => {
    if (hit) return true;
    const m = line.match(TASK_LINE);
    if (!m) return true;
    if (m[2].trim() !== target) return true;
    hit = true;
    return false;
  });
  if (hit) writeAmbition(next.join('\n'));
  return hit;
}

// Find [[TASK: <text>]] markers in an LLM reply and return the inner strings.
// Optional "|when:" / "|recur:" suffixes are preserved.
export function parseTasksFromReply(reply: string): string[] {
  const out: string[] = [];
  const re = /\[\[TASK:\s*(.+?)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply)) !== null) out.push(m[1].trim());
  return out;
}

export function stripTaskMarkers(reply: string): string {
  return reply.replace(/\[\[TASK:.*?\]\]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// Which scheduled tasks should fire between [now - windowMs, now]?
export function dueTasks(now: Date = new Date(), windowMs = 30 * 60 * 1000): AmbitionTask[] {
  const nowMs = now.getTime();
  return listTasks().filter((t) => {
    if (t.done) return false;
    if (!t.whenISO) return false;
    const fire = Date.parse(t.whenISO);
    if (Number.isNaN(fire)) return false;
    return fire <= nowMs && fire >= nowMs - windowMs;
  });
}
