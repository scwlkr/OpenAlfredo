// AMBITION Reflection Engine
//
// Generates a reflective morning brief by synthesizing signals from:
//   - SOUL.md (agent identity)
//   - Recent transcripts (last 20 across all sessions)
//   - RESTLESS heartbeat REFLECT entries (last 10)
//   - Workspace files modified in the last 7 days
//
// The output fully replaces AMBITION.md — it rewrites rather than appends,
// per the MVP plan: "constantly changing and flowing from day to day."

import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { readAmbition, writeAmbition, AMBITION_PATH } from './ambition';
import { DEFAULT_SOUL_PATH, RESTLESS_LOG_PATH, WORKSPACE_DIR, THEMES_FILE } from './paths';
import { logInfo, logError } from './logger';

const HEARTBEAT_LOG_START = '<!-- heartbeat-log-start -->';
const HEARTBEAT_LOG_END = '<!-- heartbeat-log-end -->';

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function getRecentReflections(limit = 10): string[] {
  const restless = readFileSafe(RESTLESS_LOG_PATH);
  if (!restless.includes(HEARTBEAT_LOG_START)) return [];
  return restless
    .split(HEARTBEAT_LOG_START)[1]
    .split(HEARTBEAT_LOG_END)[0]
    .split('\n')
    .filter((l) => l.includes('REFLECT'))
    .slice(-limit);
}

function getRecentWorkspaceFiles(daysBack = 7): string[] {
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const files: string[] = [];
  try {
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          const stat = fs.statSync(full);
          if (stat.mtimeMs >= cutoff) {
            files.push(path.relative(WORKSPACE_DIR, full));
          }
        }
      }
    };
    if (fs.existsSync(WORKSPACE_DIR)) walk(WORKSPACE_DIR);
  } catch {}
  return files;
}

export interface ReflectionInput {
  soul: string;
  transcripts: string[];
  reflections: string[];
  workspaceFiles: string[];
  activeThemes?: string[];
}

export function buildReflectionPrompt(input: ReflectionInput): string {
  const { soul, transcripts, reflections, workspaceFiles, activeThemes = [] } = input;

  return `You are a reflective agent generating a personal morning brief for your user.

SOUL (your identity):
${soul || '(no SOUL yet)'}

RECENT CONVERSATIONS (last 20 messages across all sessions):
${transcripts.length > 0 ? transcripts.join('\n---\n') : '(no recent conversations)'}

YOUR RECENT REFLECTIONS (from heartbeat ticks):
${reflections.length > 0 ? reflections.join('\n') : '(no recent reflections)'}

ACTIVE THEMES (from continuity loop — the user's evolving interests):
${activeThemes.length > 0 ? activeThemes.map((t) => `- ${t}`).join('\n') : '(no tracked themes yet)'}

WORKSPACE ACTIVITY (files modified in the last 7 days):
${workspaceFiles.length > 0 ? workspaceFiles.map((f) => `- ${f}`).join('\n') : '(no recent workspace activity)'}

Current Time: ${new Date().toLocaleString()}

Generate a personal, flowing morning brief. This is NOT a task list. It is a reflective synthesis. Cover:
1. Current trajectory — what direction is the user heading?
2. Emerging themes — what patterns or interests are surfacing?
3. What deserves attention — what should the user be thinking about today?
4. Practical reminders — any gentle nudges based on recent signals?

Guidelines:
- Write in first person as the agent addressing the user
- Be personal, warm, and grounded — not robotic or overly formal
- Keep it concise (3-6 short paragraphs)
- Do NOT produce a bullet-point task list
- Do NOT use markdown headers
- Reference specific things from recent conversations when possible
- If there's not much signal, keep it brief and honest about that`;
}

export async function gatherReflectionInput(): Promise<ReflectionInput> {
  const soul = readFileSafe(DEFAULT_SOUL_PATH);

  // Last 20 transcript entries across all sessions
  const entries = await prisma.transcriptEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { role: true, content: true, createdAt: true },
  });
  const transcripts = entries
    .reverse()
    .map((e) => `[${e.role}] ${e.content.slice(0, 500)}`);

  const reflections = getRecentReflections(10);
  const workspaceFiles = getRecentWorkspaceFiles(7);

  // Active themes from the continuity loop
  let activeThemes: string[] = [];
  try {
    if (fs.existsSync(THEMES_FILE)) {
      const data = JSON.parse(fs.readFileSync(THEMES_FILE, 'utf-8'));
      activeThemes = (data.themes || [])
        .filter((t: any) => t.strength >= 0.3)
        .sort((a: any, b: any) => b.strength - a.strength)
        .map((t: any) => t.tag);
    }
  } catch {}

  return { soul, transcripts, reflections, workspaceFiles, activeThemes };
}

// Generate a new reflection and write it to AMBITION.md.
// Uses the provided generateFn for testability (defaults to Ollama).
export async function generateReflection(
  generateFn?: (prompt: string) => Promise<string>
): Promise<string> {
  const input = await gatherReflectionInput();
  const prompt = buildReflectionPrompt(input);

  let reflection: string;
  if (generateFn) {
    reflection = await generateFn(prompt);
  } else {
    // Default: use Ollama directly
    const ollama = (await import('ollama')).default;
    const response = await ollama.generate({
      model: process.env.OAX_MODEL || 'llama3',
      prompt,
    });
    reflection = response.response;
  }

  const content = `# AMBITION\n\n_Generated: ${new Date().toISOString()}_\n\n${reflection.trim()}\n`;
  writeAmbition(content);
  logInfo('ambition_reflection_generated', { length: reflection.length });
  return reflection;
}

export { readAmbition as readReflection } from './ambition';
