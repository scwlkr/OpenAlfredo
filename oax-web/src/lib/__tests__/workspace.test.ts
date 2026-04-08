import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  WORKSPACE_DIR,
  parseFileSaves,
  stripFileSaveMarkers,
  saveWorkspaceFile,
  saveSticky,
  listWorkspaceFiles,
  readWorkspaceFile,
  parseStickyMarkers,
  stripStickyMarkers,
  inlineFileSaveMarkers,
  inlineStickyMarkers,
} from '../workspace';
import {
  WORKSPACE_DESK_DIR,
  WORKSPACE_GENERATED_DIR,
  WORKSPACE_FILES_DIR,
} from '../paths';

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

  it('saveWorkspaceFile writes to generated/ by default', () => {
    const name = 'test-gen-' + Math.random().toString(36).slice(2, 8) + '.md';
    const fullPath = saveWorkspaceFile({ name, content: '# hello\n' });
    written.push(fullPath);
    expect(fullPath.startsWith(WORKSPACE_GENERATED_DIR)).toBe(true);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('saveWorkspaceFile routes to specified subdir', () => {
    const name = 'test-files-' + Math.random().toString(36).slice(2, 8) + '.md';
    const fullPath = saveWorkspaceFile({ name, content: 'data' }, 'files');
    written.push(fullPath);
    expect(fullPath.startsWith(WORKSPACE_FILES_DIR)).toBe(true);
  });

  it('saveWorkspaceFile rejects path-escape attempts', () => {
    const fullPath = saveWorkspaceFile({ name: '../../etc/passwd', content: 'x' });
    written.push(fullPath);
    expect(fullPath.startsWith(WORKSPACE_GENERATED_DIR)).toBe(true);
    expect(path.basename(fullPath)).not.toContain('..');
  });
});

describe('Sticky notes', () => {
  it('saveSticky creates a markdown file in desk/ with frontmatter', () => {
    const fullPath = saveSticky('test idea', 'Try running in the morning');
    written.push(fullPath);
    expect(fullPath.startsWith(WORKSPACE_DESK_DIR)).toBe(true);
    expect(fs.existsSync(fullPath)).toBe(true);
    const content = fs.readFileSync(fullPath, 'utf-8');
    expect(content).toContain('type: sticky');
    expect(content).toContain('title: test idea');
    expect(content).toContain('Try running in the morning');
  });

  it('parseStickyMarkers extracts [[STICKY]] blocks', () => {
    const reply = `Here's an idea:
[[STICKY: workout tips]]
- Morning runs
- Evening yoga
[[/STICKY]]
Let me know!`;
    const stickies = parseStickyMarkers(reply);
    expect(stickies).toHaveLength(1);
    expect(stickies[0].title).toBe('workout tips');
    expect(stickies[0].content).toContain('Morning runs');
  });

  it('stripStickyMarkers removes blocks from visible text', () => {
    const reply = `Done. [[STICKY: note]]content[[/STICKY]] Bye.`;
    const out = stripStickyMarkers(reply);
    expect(out).not.toContain('STICKY');
    expect(out).toContain('Done.');
    expect(out).toContain('Bye.');
  });
});

describe('Workspace listing and reading', () => {
  it('listWorkspaceFiles returns files across subdirs', () => {
    const p1 = saveWorkspaceFile({ name: 'list-test-gen.md', content: 'gen' }, 'generated');
    const p2 = saveSticky('list-test-sticky', 'note content');
    written.push(p1, p2);

    const all = listWorkspaceFiles();
    expect(all.some((f) => f.name === 'list-test-gen.md' && f.subdir === 'generated')).toBe(true);
    expect(all.some((f) => f.subdir === 'desk' && f.type === 'sticky')).toBe(true);
  });

  it('listWorkspaceFiles filters by subdir', () => {
    const p = saveWorkspaceFile({ name: 'filter-test.md', content: 'x' }, 'files');
    written.push(p);

    const filesOnly = listWorkspaceFiles('files');
    expect(filesOnly.some((f) => f.name === 'filter-test.md')).toBe(true);
    expect(filesOnly.every((f) => f.subdir === 'files')).toBe(true);
  });

  it('readWorkspaceFile reads a file with path traversal protection', () => {
    const p = saveWorkspaceFile({ name: 'readable.md', content: 'hello world' }, 'generated');
    written.push(p);

    const content = readWorkspaceFile('generated', 'readable.md');
    expect(content).toBe('hello world');
  });

  it('readWorkspaceFile sanitizes path escape attempts', () => {
    // The sanitizer strips ../  so this should either throw or read from within the dir
    expect(() => readWorkspaceFile('generated', '../../etc/passwd')).toThrow();
  });
});

describe('Dual delivery: inline markers', () => {
  it('inlineFileSaveMarkers replaces SAVE_FILE blocks with readable content', () => {
    const reply = `Done.\n[[SAVE_FILE: plan.md]]\n# My Plan\nStep 1.\n[[/SAVE_FILE]]\nLet me know.`;
    const result = inlineFileSaveMarkers(reply);
    expect(result).toContain('**Saved to workspace:** `generated/plan.md`');
    expect(result).toContain('# My Plan');
    expect(result).toContain('Let me know.');
    expect(result).not.toContain('[[SAVE_FILE');
  });

  it('inlineFileSaveMarkers truncates large content', () => {
    const bigContent = 'x'.repeat(3000);
    const reply = `[[SAVE_FILE: big.md]]\n${bigContent}\n[[/SAVE_FILE]]`;
    const result = inlineFileSaveMarkers(reply);
    expect(result).toContain('see workspace for full version');
    expect(result.length).toBeLessThan(bigContent.length);
  });

  it('inlineStickyMarkers replaces STICKY blocks with confirmation', () => {
    const reply = `Here:\n[[STICKY: ideas]]\n- Try yoga\n- Run more\n[[/STICKY]]\nDone.`;
    const result = inlineStickyMarkers(reply);
    expect(result).toContain('**Sticky note saved:** "ideas"');
    expect(result).toContain('Try yoga');
    expect(result).not.toContain('[[STICKY');
  });
});
