import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  REPO_ROOT,
  parseSelfEdits,
  stripSelfEditMarkers,
  applySelfEdit,
} from '../self-edit';

// Scratch file under oax-web/ so resolveInsideRepo accepts it.
const SCRATCH = path.join(REPO_ROOT, 'oax-web', 'src', 'lib', '__tests__', '.scratch-self-edit.txt');
const SCRATCH_REL = 'oax-web/src/lib/__tests__/.scratch-self-edit.txt';

afterEach(() => {
  if (fs.existsSync(SCRATCH)) fs.unlinkSync(SCRATCH);
});

describe('self-edit: marker parsing', () => {
  it('parses READ_FILE markers', () => {
    const edits = parseSelfEdits('Let me check [[READ_FILE: oax-web/.env]] first.');
    expect(edits).toHaveLength(1);
    expect(edits[0]).toEqual({ kind: 'read', path: 'oax-web/.env' });
  });

  it('parses EDIT_FILE blocks', () => {
    const reply = `Here you go:
[[EDIT_FILE: oax-web/.env]]
<old>HEARTBEAT_CRON="0 * * * *"</old>
<new>HEARTBEAT_CRON="*/30 * * * *"</new>
[[/EDIT_FILE]]
Restart to pick it up.`;
    const edits = parseSelfEdits(reply);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({
      kind: 'edit',
      path: 'oax-web/.env',
      oldString: 'HEARTBEAT_CRON="0 * * * *"',
      newString: 'HEARTBEAT_CRON="*/30 * * * *"',
    });
  });

  it('parses WRITE_FILE blocks', () => {
    const reply = `[[WRITE_FILE: oax-web/hello.txt]]
hi there
[[/WRITE_FILE]]`;
    const edits = parseSelfEdits(reply);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({
      kind: 'write',
      path: 'oax-web/hello.txt',
      content: 'hi there',
    });
  });

  it('strips all self-edit markers from reply text', () => {
    const reply = `Done.
[[EDIT_FILE: a.txt]]
<old>x</old>
<new>y</new>
[[/EDIT_FILE]]
[[READ_FILE: b.txt]]
Bye.`;
    const cleaned = stripSelfEditMarkers(reply);
    expect(cleaned).not.toContain('[[');
    expect(cleaned).toContain('Done.');
    expect(cleaned).toContain('Bye.');
  });
});

describe('self-edit: path safety', () => {
  it('rejects paths that escape the repo', () => {
    const r = applySelfEdit({ kind: 'write', path: '../../../etc/passwd', content: 'no' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/outside repo|protected/);
  });

  it('rejects writes into .git', () => {
    const r = applySelfEdit({ kind: 'write', path: '.git/config', content: 'no' });
    expect(r.ok).toBe(false);
  });

  it('rejects writes into node_modules', () => {
    const r = applySelfEdit({ kind: 'write', path: 'oax-web/node_modules/evil.js', content: 'no' });
    expect(r.ok).toBe(false);
  });

  it('rejects .db files', () => {
    const r = applySelfEdit({ kind: 'write', path: 'oax-web/prisma/data/oax.db', content: 'no' });
    expect(r.ok).toBe(false);
  });

  it('rejects writes under data/', () => {
    const r = applySelfEdit({ kind: 'write', path: 'oax-web/data/anything.txt', content: 'no' });
    expect(r.ok).toBe(false);
  });
});

describe('self-edit: apply', () => {
  it('writes then reads a scratch file', () => {
    const w = applySelfEdit({ kind: 'write', path: SCRATCH_REL, content: 'hello world' });
    expect(w.ok).toBe(true);
    expect(fs.readFileSync(SCRATCH, 'utf-8')).toBe('hello world');

    const r = applySelfEdit({ kind: 'read', path: SCRATCH_REL });
    expect(r.ok).toBe(true);
    expect(r.content).toBe('hello world');
  });

  it('edits a unique old_string', () => {
    fs.writeFileSync(SCRATCH, 'alpha beta gamma');
    const r = applySelfEdit({
      kind: 'edit',
      path: SCRATCH_REL,
      oldString: 'beta',
      newString: 'BETA',
    });
    expect(r.ok).toBe(true);
    expect(fs.readFileSync(SCRATCH, 'utf-8')).toBe('alpha BETA gamma');
  });

  it('refuses to edit when old_string matches multiple times', () => {
    fs.writeFileSync(SCRATCH, 'foo foo foo');
    const r = applySelfEdit({
      kind: 'edit',
      path: SCRATCH_REL,
      oldString: 'foo',
      newString: 'bar',
    });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/3×|matches/);
  });

  it('refuses to edit when old_string is absent', () => {
    fs.writeFileSync(SCRATCH, 'alpha');
    const r = applySelfEdit({
      kind: 'edit',
      path: SCRATCH_REL,
      oldString: 'zeta',
      newString: 'zzz',
    });
    expect(r.ok).toBe(false);
  });
});
