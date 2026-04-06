import fs from 'fs';
import path from 'path';
import { WORKSPACE_DIR as CANONICAL_WORKSPACE_DIR } from './paths';

export const WORKSPACE_DIR = CANONICAL_WORKSPACE_DIR;

if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

export type FileSave = { name: string; content: string };

// Parse [[SAVE_FILE: <name>]]\n<content>\n[[/SAVE_FILE]] blocks from an LLM reply.
// Filenames are sanitized — only [a-z0-9._-] survives, to prevent path escape.
export function parseFileSaves(reply: string): FileSave[] {
  const out: FileSave[] = [];
  const re = /\[\[SAVE_FILE:\s*(.+?)\]\]\s*\n([\s\S]*?)\n\[\[\/SAVE_FILE\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply)) !== null) {
    const name = sanitizeFilename(m[1].trim());
    if (!name) continue;
    out.push({ name, content: m[2] });
  }
  return out;
}

export function stripFileSaveMarkers(reply: string): string {
  return reply
    .replace(/\[\[SAVE_FILE:.*?\]\][\s\S]*?\[\[\/SAVE_FILE\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function saveWorkspaceFile(file: FileSave): string {
  const safe = sanitizeFilename(file.name);
  if (!safe) throw new Error('invalid filename');
  const full = path.join(WORKSPACE_DIR, safe);
  fs.writeFileSync(full, file.content);
  return full;
}

function sanitizeFilename(name: string): string {
  const base = path.basename(name).toLowerCase();
  const cleaned = base.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 120);
}
