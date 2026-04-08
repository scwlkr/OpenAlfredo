import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import fs from 'fs';

import { prisma } from '../db';

// The Telegram daemon now delegates to the shared engine (oax-engine.ts via
// processChatSync), so it uses the same SQLite transcripts + memory retrieval
// + [[TASK]] markers as the web UI. Heartbeat generation still talks to the
// shared Ollama client, so we mock that client here.
const { mockGenerate } = vi.hoisted(() => ({ mockGenerate: vi.fn() }));
vi.mock('../ollama-client', () => ({
  ollamaClient: { generate: mockGenerate },
}));

// processChatSync is the shared engine entry point — stub it so we can assert
// Telegram chats route through it without actually hitting Ollama.
const { mockProcessChatSync } = vi.hoisted(() => ({ mockProcessChatSync: vi.fn() }));
vi.mock('../oax-engine', () => ({
  processChatSync: mockProcessChatSync,
}));

import { chatWithAgent, checkCronTasks } from '../oax';
import { TASKS_PATH, appendTask } from '../tasks';

let originalTasks = '';
beforeAll(() => {
  originalTasks = fs.existsSync(TASKS_PATH)
    ? fs.readFileSync(TASKS_PATH, 'utf-8')
    : '# Tasks\n\n## Tasks\n';
});
beforeEach(() => {
  mockGenerate.mockReset();
  mockProcessChatSync.mockReset();
  fs.writeFileSync(TASKS_PATH, originalTasks);
});
afterAll(async () => {
  fs.writeFileSync(TASKS_PATH, originalTasks);
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
    const marker = 'cron-' + Math.random().toString(36).slice(2, 8);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    appendTask(`${marker} call Nora |when:${fiveMinAgo}`);

    const out = await checkCronTasks();
    expect(out).not.toBeNull();
    expect(out).toContain(marker);
    expect(out).toContain('call Nora');
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns null when no tasks are due', async () => {
    fs.writeFileSync(TASKS_PATH, '# Tasks\n\n## Tasks\n');
    const out = await checkCronTasks();
    expect(out).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
