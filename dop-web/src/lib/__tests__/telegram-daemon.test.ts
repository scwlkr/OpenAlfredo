import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

// The Telegram daemon imports from '../dop' (NOT dop-engine) — that legacy path
// uses the `ollama` package directly and reads SOUL.md from the repo root.
const { mockChat, mockGenerate } = vi.hoisted(() => ({
  mockChat: vi.fn(),
  mockGenerate: vi.fn(),
}));
vi.mock('ollama', () => ({
  default: { chat: mockChat, generate: mockGenerate },
}));

import { chatWithAgent, checkCronTasks } from '../dop';

const REPO_ROOT = path.join(process.cwd(), '..');
const AMBITION_PATH = path.join(REPO_ROOT, 'AMBITION.md');
const TRANSCRIPTS_DIR = path.join(REPO_ROOT, 'memory', 'transcripts');

let originalAmbition = '';
beforeAll(() => {
  originalAmbition = fs.existsSync(AMBITION_PATH)
    ? fs.readFileSync(AMBITION_PATH, 'utf-8')
    : '# AMBITION\n\n## Tasks\n';
});
beforeEach(() => {
  mockChat.mockReset();
  mockGenerate.mockReset();
  fs.writeFileSync(AMBITION_PATH, originalAmbition);
});
afterAll(() => {
  fs.writeFileSync(AMBITION_PATH, originalAmbition);
});

describe('F2: Telegram daemon path (legacy dop.ts)', () => {
  it('chatWithAgent calls ollama.chat with a system prompt', async () => {
    mockChat.mockResolvedValue({ message: { content: 'Hello there.' } });
    const reply = await chatWithAgent('Hi');
    expect(reply).toBe('Hello there.');
    expect(mockChat).toHaveBeenCalledTimes(1);
    const args = mockChat.mock.calls[0][0];
    expect(args.model).toBeTruthy();
    expect(args.messages[0].role).toBe('system');
    expect(args.messages[1]).toEqual({ role: 'user', content: 'Hi' });
  });

  it('chatWithAgent appends parsed [[TASK:…]] to AMBITION.md and strips marker', async () => {
    const marker = 'tg-' + Math.random().toString(36).slice(2, 8);
    mockChat.mockResolvedValue({
      message: { content: `Ok. [[TASK: ${marker} pick up laundry]] done.` },
    });
    const reply = await chatWithAgent('remind me to grab laundry');
    expect(reply).not.toContain('[[TASK:');
    expect(reply).toContain('Task added to AMBITION.md');
    const raw = fs.readFileSync(AMBITION_PATH, 'utf-8');
    expect(raw).toContain(`${marker} pick up laundry`);
  });

  it('chatWithAgent returns error string when ollama throws', async () => {
    mockChat.mockRejectedValue(new Error('ECONNREFUSED'));
    const reply = await chatWithAgent('hi');
    expect(reply).toContain('Error communicating');
    expect(reply).toContain('ECONNREFUSED');
  });

  it('saveTranscript writes to memory/transcripts/<date>.txt', async () => {
    mockChat.mockResolvedValue({ message: { content: 'ack' } });
    await chatWithAgent('trace-' + Math.random().toString(36).slice(2, 8));
    const today = new Date().toISOString().split('T')[0];
    const file = path.join(TRANSCRIPTS_DIR, `${today}.txt`);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('checkCronTasks returns the NOTIFY payload when tasks exist', async () => {
    fs.writeFileSync(AMBITION_PATH, originalAmbition + '- [ ] call Nora about the trip\n');
    mockGenerate.mockResolvedValue({ response: 'NOTIFY: time to call Nora' });
    const out = await checkCronTasks();
    expect(out).toBe('time to call Nora');
  });

  it('checkCronTasks returns null when no open tasks', async () => {
    fs.writeFileSync(AMBITION_PATH, '# AMBITION\n\n## Tasks\n');
    const out = await checkCronTasks();
    expect(out).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
