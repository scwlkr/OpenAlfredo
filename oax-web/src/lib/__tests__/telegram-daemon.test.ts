import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import fs from 'fs';
import { prisma } from '../db';

// The Telegram daemon now delegates to the shared engine (oax-engine.ts via
// processChatSync), so it uses the same SQLite transcripts + memory retrieval
// + [[TASK]] markers as the web UI. `ollama` is only imported by runHeartbeat
// inside oax.ts, so we still mock it to isolate tests from a running Ollama.
const { mockGenerate } = vi.hoisted(() => ({ mockGenerate: vi.fn() }));
vi.mock('ollama', () => ({
  default: { generate: mockGenerate, chat: vi.fn() },
}));

// processChatSync is the shared engine entry point — stub it so we can assert
// Telegram chats route through it without actually hitting Ollama.
const { mockProcessChatSync } = vi.hoisted(() => ({ mockProcessChatSync: vi.fn() }));
vi.mock('../oax-engine', () => ({
  processChatSync: mockProcessChatSync,
}));

import { chatWithAgent, checkCronTasks } from '../oax';
import { TASKS_PATH as AMBITION_PATH, appendTask } from '../tasks';

let originalAmbition = '';
beforeAll(() => {
  originalAmbition = fs.existsSync(AMBITION_PATH)
    ? fs.readFileSync(AMBITION_PATH, 'utf-8')
    : '# AMBITION\n\n## Tasks\n';
});
beforeEach(() => {
  mockGenerate.mockReset();
  mockProcessChatSync.mockReset();
  fs.writeFileSync(AMBITION_PATH, originalAmbition);
});
afterAll(async () => {
  fs.writeFileSync(AMBITION_PATH, originalAmbition);
  await prisma.$disconnect();
});

describe('F2: Telegram daemon delegates to shared engine', () => {
  it('chatWithAgent routes to processChatSync with telegram-<chatId> session', async () => {
    mockProcessChatSync.mockResolvedValue('Hello there.');
    const reply = await chatWithAgent('Hi', 12345);
    expect(reply).toBe('Hello there.');
    expect(mockProcessChatSync).toHaveBeenCalledWith('telegram-12345', 'Hi', 'default', undefined);
  });

  it('chatWithAgent falls back to telegram-global when no chatId given', async () => {
    mockProcessChatSync.mockResolvedValue('ack');
    await chatWithAgent('hi');
    expect(mockProcessChatSync).toHaveBeenCalledWith('telegram-global', 'hi', 'default', undefined);
  });

  it('chatWithAgent returns error string when the engine throws', async () => {
    mockProcessChatSync.mockRejectedValue(new Error('ECONNREFUSED'));
    const reply = await chatWithAgent('hi', 1);
    expect(reply).toContain('Error communicating');
    expect(reply).toContain('ECONNREFUSED');
  });
});

describe('F12: checkCronTasks is deterministic (no LLM call)', () => {
  it('returns formatted NOTIFY when tasks are due', async () => {
    // Put a due task in the window — within the last 30 minutes.
    const marker = 'cron-' + Math.random().toString(36).slice(2, 8);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    appendTask(`${marker} call Nora |when:${fiveMinAgo}`);

    const out = await checkCronTasks();
    expect(out).not.toBeNull();
    expect(out).toContain(marker);
    expect(out).toContain('call Nora');
    // It never asks the LLM — ollama.generate must not have been touched.
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns null when no tasks are due', async () => {
    fs.writeFileSync(AMBITION_PATH, '# AMBITION\n\n## Tasks\n');
    const out = await checkCronTasks();
    expect(out).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
