// Self-modification via markers. The agent can mutate its own codebase by
// emitting [[READ_FILE]], [[EDIT_FILE]], or [[WRITE_FILE]] blocks. All paths
// are resolved relative to the repo root and clamped — anything that escapes
// the repo, touches .git / node_modules / build artifacts / the SQLite DB, or
// tries to walk outside the sandbox is rejected.
//
// Two shapes:
//   [[READ_FILE: path/to/file]]
//   [[EDIT_FILE: path/to/file]]
//   <old>EXACT OLD STRING</old>
//   <new>NEW STRING</new>
//   [[/EDIT_FILE]]
//
//   [[WRITE_FILE: path/to/file]]
//   whole-file contents...
//   [[/WRITE_FILE]]
//
// EDIT_FILE is preferred (surgical). WRITE_FILE is the nuclear option.
import fs from 'fs';
import path from 'path';
import {
  REPO_ROOT as CANONICAL_REPO_ROOT,
  DATA_ROOT_REPO_REL,
} from './paths';

// oax-web/ is cwd at runtime; repo root is one level up.
export const REPO_ROOT = CANONICAL_REPO_ROOT;

// Directories we refuse to touch, ever. Single-segment entries match at any
// depth; slashed entries match as path prefixes from the repo root.
const FORBIDDEN_ANY_DEPTH = ['.git', 'node_modules', '.next'];
const FORBIDDEN_PREFIXES = Array.from(
  new Set([DATA_ROOT_REPO_REL, 'oax-web/data', 'data'].filter(Boolean))
);
const FORBIDDEN_EXTS = new Set(['.db', '.db-journal', '.sqlite', '.sqlite3']);

export type SelfEdit =
  | { kind: 'read'; path: string }
  | { kind: 'edit'; path: string; oldString: string; newString: string }
  | { kind: 'write'; path: string; content: string };

export type SelfEditResult = {
  edit: SelfEdit;
  ok: boolean;
  message: string;
  // For reads, the file contents the model asked to see.
  content?: string;
};

function resolveInsideRepo(relPath: string): string | null {
  const trimmed = relPath.trim().replace(/^\/+/, '');
  if (!trimmed) return null;
  const abs = path.resolve(REPO_ROOT, trimmed);
  const rel = path.relative(REPO_ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  for (const seg of FORBIDDEN_ANY_DEPTH) {
    if (parts.includes(seg)) return null;
  }
  const relPosix = parts.join('/');
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (relPosix === prefix || relPosix.startsWith(prefix + '/')) return null;
  }
  if (FORBIDDEN_EXTS.has(path.extname(abs).toLowerCase())) return null;
  return abs;
}

export function parseSelfEdits(reply: string): SelfEdit[] {
  const edits: SelfEdit[] = [];

  // READ_FILE (single-line marker)
  const readRe = /\[\[READ_FILE:\s*(.+?)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = readRe.exec(reply)) !== null) {
    edits.push({ kind: 'read', path: m[1].trim() });
  }

  // EDIT_FILE block
  const editRe =
    /\[\[EDIT_FILE:\s*(.+?)\]\]\s*\n<old>([\s\S]*?)<\/old>\s*\n<new>([\s\S]*?)<\/new>\s*\n\[\[\/EDIT_FILE\]\]/g;
  while ((m = editRe.exec(reply)) !== null) {
    edits.push({
      kind: 'edit',
      path: m[1].trim(),
      oldString: m[2],
      newString: m[3],
    });
  }

  // WRITE_FILE block
  const writeRe = /\[\[WRITE_FILE:\s*(.+?)\]\]\s*\n([\s\S]*?)\n\[\[\/WRITE_FILE\]\]/g;
  while ((m = writeRe.exec(reply)) !== null) {
    edits.push({ kind: 'write', path: m[1].trim(), content: m[2] });
  }

  return edits;
}

export function stripSelfEditMarkers(reply: string): string {
  return reply
    .replace(/\[\[READ_FILE:.*?\]\]/g, '')
    .replace(/\[\[EDIT_FILE:[\s\S]*?\[\[\/EDIT_FILE\]\]/g, '')
    .replace(/\[\[WRITE_FILE:[\s\S]*?\[\[\/WRITE_FILE\]\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function applySelfEdit(edit: SelfEdit): SelfEditResult {
  const abs = resolveInsideRepo(edit.path);
  if (!abs) {
    return {
      edit,
      ok: false,
      message: `rejected: ${edit.path} is outside repo or in a protected path`,
    };
  }
  try {
    if (edit.kind === 'read') {
      if (!fs.existsSync(abs)) return { edit, ok: false, message: `not found: ${edit.path}` };
      const stat = fs.statSync(abs);
      if (stat.size > 200_000)
        return { edit, ok: false, message: `too large (${stat.size} bytes): ${edit.path}` };
      return { edit, ok: true, message: `read ${edit.path} (${stat.size}b)`, content: fs.readFileSync(abs, 'utf-8') };
    }
    if (edit.kind === 'edit') {
      if (!fs.existsSync(abs)) return { edit, ok: false, message: `not found: ${edit.path}` };
      const cur = fs.readFileSync(abs, 'utf-8');
      const occurrences = cur.split(edit.oldString).length - 1;
      if (occurrences === 0)
        return { edit, ok: false, message: `old_string not found in ${edit.path}` };
      if (occurrences > 1)
        return {
          edit,
          ok: false,
          message: `old_string matches ${occurrences}× in ${edit.path} — add more context to make it unique`,
        };
      const next = cur.replace(edit.oldString, edit.newString);
      fs.writeFileSync(abs, next);
      return { edit, ok: true, message: `edited ${edit.path}` };
    }
    if (edit.kind === 'write') {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, edit.content);
      return { edit, ok: true, message: `wrote ${edit.path} (${edit.content.length}b)` };
    }
    return { edit, ok: false, message: 'unknown edit kind' };
  } catch (e: any) {
    return { edit, ok: false, message: `error: ${e?.message || e}` };
  }
}

// A compact inventory of the repo the agent can modify. Keeps the system
// prompt bounded — just paths + sizes, no contents. Model can READ_FILE to
// drill in.
export function buildCodeIndex(): string {
  const include = [
    'oax-web/src/lib',
    'oax-web/src/app/api',
    'oax-web/daemon.ts',
    // NOTE: .env intentionally excluded — contains secrets (TELEGRAM_TOKEN)
    'oax-web/.env.example',
    'oax-web/prisma/schema.prisma',
    'bin',
  ];
  const lines: string[] = [];
  for (const rel of include) {
    const abs = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      lines.push(`${rel} (${stat.size}b)`);
    } else if (stat.isDirectory()) {
      walk(abs, rel, lines, 2);
    }
  }
  return lines.join('\n');
}

function walk(abs: string, rel: string, out: string[], depth: number) {
  if (depth < 0) return;
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.env') continue;
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const childAbs = path.join(abs, e.name);
    const childRel = `${rel}/${e.name}`;
    if (e.isDirectory()) {
      walk(childAbs, childRel, out, depth - 1);
    } else if (e.isFile()) {
      try {
        const s = fs.statSync(childAbs);
        out.push(`${childRel} (${s.size}b)`);
      } catch {}
    }
  }
}
