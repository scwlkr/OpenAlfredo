import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  WORKSPACE_DIR,
  parseFileSaves,
  stripFileSaveMarkers,
  saveWorkspaceFile,
} from '../workspace';

const written: string[] = [];
afterEach(() => {
  for (const p of written.splice(0)) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe('F15: Workspace file save tool', () => {
  it('parses [[SAVE_FILE]] blocks out of a reply', () => {
    const reply = `Here you go:
[[SAVE_FILE: business-plan.md]]
# Dolphin Training Facility
Revenue: flips and fish.
[[/SAVE_FILE]]
Let me know what to tweak.`;
    const files = parseFileSaves(reply);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('business-plan.md');
    expect(files[0].content).toContain('Dolphin Training Facility');
  });

  it('parses multiple blocks in one reply', () => {
    const reply = `[[SAVE_FILE: a.md]]
alpha
[[/SAVE_FILE]]
[[SAVE_FILE: b.txt]]
beta
[[/SAVE_FILE]]`;
    const files = parseFileSaves(reply);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name)).toEqual(['a.md', 'b.txt']);
  });

  it('stripFileSaveMarkers removes entire block from visible text', () => {
    const reply = `Saved.
[[SAVE_FILE: x.md]]
secret
[[/SAVE_FILE]]
Anything else?`;
    const out = stripFileSaveMarkers(reply);
    expect(out).not.toContain('SAVE_FILE');
    expect(out).not.toContain('secret');
    expect(out).toContain('Saved.');
    expect(out).toContain('Anything else?');
  });

  it('saveWorkspaceFile writes under data/workspace/ with sanitized name', () => {
    const name = 'Test-File ' + Math.random().toString(36).slice(2, 8) + '.md';
    const fullPath = saveWorkspaceFile({ name, content: '# hello\n' });
    written.push(fullPath);
    expect(fullPath.startsWith(WORKSPACE_DIR)).toBe(true);
    expect(fs.existsSync(fullPath)).toBe(true);
    expect(fs.readFileSync(fullPath, 'utf-8')).toBe('# hello\n');
    // No spaces in final name
    expect(path.basename(fullPath)).not.toContain(' ');
  });

  it('saveWorkspaceFile rejects path-escape attempts', () => {
    const fullPath = saveWorkspaceFile({ name: '../../etc/passwd', content: 'x' });
    written.push(fullPath);
    // Sanitizer strips the slashes, writing file inside workspace.
    expect(fullPath.startsWith(WORKSPACE_DIR)).toBe(true);
    expect(path.basename(fullPath)).not.toContain('..');
    expect(path.basename(fullPath)).not.toContain('/');
  });
});
