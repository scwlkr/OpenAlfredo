// Theme Inference Engine
//
// Extracts themes from recent transcripts and generates concrete follow-up
// actions. This is the "perception" half of the Golden Goose loop — the
// continuity orchestrator (continuity.ts) calls these functions and acts
// on the results.

import fs from 'fs';
import { prisma } from './db';
import { THEMES_FILE, DEFAULT_SOUL_PATH } from './paths';
import { logInfo } from './logger';

// ---------------------------------------------------------------------------
// Theme persistence
// ---------------------------------------------------------------------------

export interface Theme {
  tag: string;
  firstSeen: string;   // ISO date
  lastEngaged: string;  // ISO date
  strength: number;     // 0–1, decays without engagement
}

export interface ThemesData {
  themes: Theme[];
}

export function readThemes(): ThemesData {
  try {
    const raw = fs.readFileSync(THEMES_FILE, 'utf-8');
    return JSON.parse(raw) as ThemesData;
  } catch {
    return { themes: [] };
  }
}

export function writeThemes(data: ThemesData): void {
  fs.writeFileSync(THEMES_FILE, JSON.stringify(data, null, 2));
}

// Merge newly extracted tags into the persisted theme list. Existing themes
// that reappear get their strength boosted and lastEngaged updated; brand-new
// tags are added at strength 0.6. All themes not in the new set decay slightly.
export function mergeThemes(existing: ThemesData, newTags: string[]): ThemesData {
  const now = new Date().toISOString();
  const seen = new Set(newTags.map((t) => t.toLowerCase()));

  const updated: Theme[] = existing.themes.map((t) => {
    if (seen.has(t.tag.toLowerCase())) {
      // Re-engaged: boost strength (capped at 1.0)
      return { ...t, lastEngaged: now, strength: Math.min(1.0, t.strength + 0.15) };
    }
    // Not mentioned this cycle: decay
    return { ...t, strength: Math.max(0, t.strength - 0.05) };
  });

  // Add brand-new themes
  const existingTags = new Set(updated.map((t) => t.tag.toLowerCase()));
  for (const tag of newTags) {
    if (!existingTags.has(tag.toLowerCase())) {
      updated.push({ tag: tag.toLowerCase(), firstSeen: now, lastEngaged: now, strength: 0.6 });
    }
  }

  return { themes: updated };
}

// ---------------------------------------------------------------------------
// Theme extraction (LLM-powered)
// ---------------------------------------------------------------------------

export function buildThemeExtractionPrompt(transcripts: string[]): string {
  return `You are analyzing recent conversation transcripts to identify the user's active themes and interests.

TRANSCRIPTS:
${transcripts.join('\n---\n')}

Extract 3-5 active themes or interests from these conversations. Each theme should be a short, lowercase tag (1-3 words). Only extract themes with clear evidence in the transcripts.

Respond with ONLY a JSON array of strings, nothing else. Example:
["fitness", "career planning", "cooking"]`;
}

// Extract themes from recent transcripts. Accepts an optional generateFn
// for testability (same pattern as ambition-reflection.ts).
export async function extractThemes(
  generateFn?: (prompt: string) => Promise<string>
): Promise<string[]> {
  const entries = await prisma.transcriptEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { role: true, content: true },
  });

  if (entries.length === 0) return [];

  const transcripts = entries
    .reverse()
    .map((e) => `[${e.role}] ${e.content.slice(0, 400)}`);

  const prompt = buildThemeExtractionPrompt(transcripts);

  let raw: string;
  if (generateFn) {
    raw = await generateFn(prompt);
  } else {
    const ollama = (await import('ollama')).default;
    const response = await ollama.generate({
      model: process.env.OAX_MODEL || 'llama3',
      prompt,
    });
    raw = response.response;
  }

  // Parse the JSON array from the LLM response. Be lenient — the model may
  // wrap it in markdown fences or add commentary.
  try {
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, 7);
  } catch {
    logInfo('theme_extraction_parse_failed', { raw: raw.slice(0, 200) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Follow-up inference (LLM-powered)
// ---------------------------------------------------------------------------

export interface FollowUp {
  type: 'task' | 'sticky' | 'workspace_file';
  content: string;      // the actual artifact text
  title?: string;       // filename or sticky title
  theme: string;        // which theme triggered this
  confidence: number;   // 0–1
}

export function buildFollowUpPrompt(themes: Theme[], soul: string): string {
  const activeThemes = themes
    .filter((t) => t.strength >= 0.3)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  return `You are a proactive assistant generating follow-up actions based on the user's active themes.

SOUL (your identity):
${soul || '(no SOUL yet)'}

ACTIVE THEMES (sorted by strength):
${activeThemes.map((t) => `- "${t.tag}" (strength: ${t.strength.toFixed(2)}, last engaged: ${t.lastEngaged})`).join('\n')}

Generate 1-3 concrete follow-up actions. Each action must be one of:
- "task": a reminder or to-do item (short, actionable text)
- "sticky": a quick idea or note for the user's desk (title + content)
- "workspace_file": a full document/plan/draft the user would find useful (title + content)

Respond with ONLY a JSON array of objects. Each object has:
- "type": "task" | "sticky" | "workspace_file"
- "content": the actual text content
- "title": filename (for workspace_file, e.g. "morning-routine.md") or sticky title
- "theme": which theme this relates to
- "confidence": 0-1 how confident you are this is useful

Only suggest actions that feel genuinely useful — not filler. If themes are weak or stale, return fewer actions or an empty array.

Example:
[{"type": "task", "content": "Review workout progress this week", "title": null, "theme": "fitness", "confidence": 0.8}]`;
}

export async function inferFollowUps(
  themes: Theme[],
  generateFn?: (prompt: string) => Promise<string>
): Promise<FollowUp[]> {
  const activeThemes = themes.filter((t) => t.strength >= 0.3);
  if (activeThemes.length === 0) return [];

  let soul = '';
  try {
    soul = fs.readFileSync(DEFAULT_SOUL_PATH, 'utf-8');
  } catch {}

  const prompt = buildFollowUpPrompt(activeThemes, soul);

  let raw: string;
  if (generateFn) {
    raw = await generateFn(prompt);
  } else {
    const ollama = (await import('ollama')).default;
    const response = await ollama.generate({
      model: process.env.OAX_MODEL || 'llama3',
      prompt,
    });
    raw = response.response;
  }

  try {
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x: any) =>
          x &&
          typeof x.type === 'string' &&
          ['task', 'sticky', 'workspace_file'].includes(x.type) &&
          typeof x.content === 'string'
      )
      .map((x: any) => ({
        type: x.type,
        content: x.content,
        title: x.title || undefined,
        theme: x.theme || 'unknown',
        confidence: typeof x.confidence === 'number' ? x.confidence : 0.5,
      }))
      .slice(0, 5);
  } catch {
    logInfo('follow_up_parse_failed', { raw: raw.slice(0, 200) });
    return [];
  }
}
