import fs from 'fs';
import path from 'path';
import {
  WORKSPACE_DIR as CANONICAL_WORKSPACE_DIR,
  WORKSPACE_DESK_DIR,
  WORKSPACE_FILES_DIR,
  WORKSPACE_GENERATED_DIR,
} from './paths';

export const WORKSPACE_DIR = CANONICAL_WORKSPACE_DIR;

// Ensure all workspace subdirectories exist on module load.
for (const dir of [WORKSPACE_DESK_DIR, WORKSPACE_FILES_DIR, WORKSPACE_GENERATED_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export type WorkspaceSubdir = 'desk' | 'files' | 'generated';

export type FileSave = { name: string; content: string };

export type WorkspaceFile = {
  name: string;
  path: string;
  size: number;
  modified: string;
  subdir: WorkspaceSubdir | 'root';
  type: 'sticky' | 'file';
};

export type Sticky = { title: string; content: string };

const SUBDIR_MAP: Record<WorkspaceSubdir, string> = {
  desk: WORKSPACE_DESK_DIR,
  files: WORKSPACE_FILES_DIR,
  generated: WORKSPACE_GENERATED_DIR,
};

function resolveSubdir(subdir?: WorkspaceSubdir): string {
  return subdir ? SUBDIR_MAP[subdir] : WORKSPACE_GENERATED_DIR;
}

// ─── Filename sanitization ──────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  const base = path.basename(name).toLowerCase();
  const cleaned = base.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 120);
}

// ─── SAVE_FILE marker parsing ───────────────────────────────────────────────

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

// ─── STICKY marker parsing ─────────────────────────────────────────────────

export function parseStickyMarkers(reply: string): Sticky[] {
  const out: Sticky[] = [];
  const re = /\[\[STICKY:\s*(.+?)\]\]\s*\n([\s\S]*?)\n\[\[\/STICKY\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply)) !== null) {
    out.push({ title: m[1].trim(), content: m[2] });
  }
  return out;
}

export function stripStickyMarkers(reply: string): string {
  return reply
    .replace(/\[\[STICKY:.*?\]\][\s\S]*?\[\[\/STICKY\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── File operations ────────────────────────────────────────────────────────

export function saveWorkspaceFile(file: FileSave, subdir?: WorkspaceSubdir): string {
  const safe = sanitizeFilename(file.name);
  if (!safe) throw new Error('invalid filename');
  const dir = resolveSubdir(subdir);
  const full = path.join(dir, safe);
  fs.writeFileSync(full, file.content);
  return full;
}

export function saveSticky(title: string, content: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safe = sanitizeFilename(`${ts}-${title}`);
  if (!safe) throw new Error('invalid sticky title');
  const name = safe.endsWith('.md') ? safe : `${safe}.md`;
  const full = path.join(WORKSPACE_DESK_DIR, name);
  const body = `---\ntype: sticky\ncreated: ${new Date().toISOString()}\ntitle: ${title}\n---\n\n${content}\n`;
  fs.writeFileSync(full, body);
  return full;
}

export function listWorkspaceFiles(subdir?: WorkspaceSubdir): WorkspaceFile[] {
  const results: WorkspaceFile[] = [];

  const scanDir = (dir: string, sub: WorkspaceSubdir | 'root') => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      const stat = fs.statSync(full);
      let type: 'sticky' | 'file' = 'file';
      try {
        const head = fs.readFileSync(full, 'utf-8').slice(0, 200);
        if (head.includes('type: sticky')) type = 'sticky';
      } catch {}
      results.push({
        name: entry.name,
        path: full,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        subdir: sub,
        type,
      });
    }
  };

  if (subdir) {
    scanDir(resolveSubdir(subdir), subdir);
  } else {
    // Scan all subdirs
    scanDir(WORKSPACE_DESK_DIR, 'desk');
    scanDir(WORKSPACE_FILES_DIR, 'files');
    scanDir(WORKSPACE_GENERATED_DIR, 'generated');
    // Also scan root for legacy files
    if (fs.existsSync(WORKSPACE_DIR)) {
      for (const entry of fs.readdirSync(WORKSPACE_DIR, { withFileTypes: true })) {
        if (entry.isDirectory()) continue;
        const full = path.join(WORKSPACE_DIR, entry.name);
        const stat = fs.statSync(full);
        results.push({
          name: entry.name,
          path: full,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          subdir: 'root',
          type: 'file',
        });
      }
    }
  }

  return results.sort((a, b) => b.modified.localeCompare(a.modified));
}

export function readWorkspaceFile(subdir: WorkspaceSubdir, name: string): string {
  const safe = sanitizeFilename(name);
  if (!safe) throw new Error('invalid filename');
  const dir = resolveSubdir(subdir);
  const full = path.join(dir, safe);
  // Path traversal protection
  if (!full.startsWith(dir)) throw new Error('path traversal blocked');
  return fs.readFileSync(full, 'utf-8');
}
