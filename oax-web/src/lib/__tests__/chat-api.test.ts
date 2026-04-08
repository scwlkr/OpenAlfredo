import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';

// Capture the onFinish promise so tests can await assistant persistence.
let finishPromise: Promise<void> | null = null;
const lastCall: { model?: any; messages?: any[] } = {};
let nextReply = 'Mocked assistant reply';

vi.mock('ai', () => ({
  streamText: (opts: any) => {
    lastCall.model = opts.model;
    lastCall.messages = opts.messages;
    const mockText = nextReply;
    finishPromise = (async () => {
      await opts.onFinish?.({ text: mockText });
    })();
    return {
      toUIMessageStreamResponse: () =>
        new Response(mockText, { headers: { 'content-type': 'text/plain' } }),
    };
  },
}));

vi.mock('ai-sdk-ollama', () => ({
  createOllama: () => (modelName: string) => ({ __tag: 'ollama', modelName }),
}));

type ProcessChatFn = typeof import('../oax-engine').processChat;
let processChatFn: ProcessChatFn;
let tasksPath = '';
let workspaceGeneratedDir = '';

const testSessionIds: string[] = [];

let originalAmbition = '';
const originalDataRoot = process.env.OAX_DATA_ROOT;

beforeAll(async () => {
  delete process.env.OAX_DATA_ROOT;
  vi.resetModules();
  const tasks = await import('../tasks');
  tasksPath = tasks.TASKS_PATH;
  originalAmbition = fs.existsSync(tasksPath)
    ? fs.readFileSync(tasksPath, 'utf-8')
    : '# Tasks\n\n## Tasks\n';
});

beforeEach(async () => {
  delete process.env.OAX_DATA_ROOT;
  vi.resetModules();
  const tasks = await import('../tasks');
  const engine = await import('../oax-engine');
  const paths = await import('../paths');

  tasksPath = tasks.TASKS_PATH;
  workspaceGeneratedDir = paths.WORKSPACE_GENERATED_DIR;
  processChatFn = engine.processChat;
  finishPromise = null;
  lastCall.model = undefined;
  lastCall.messages = undefined;
  nextReply = 'Mocked assistant reply';
  fs.writeFileSync(tasksPath, originalAmbition);
});

afterAll(async () => {
  if (testSessionIds.length) {
    await prisma.transcriptEntry.deleteMany({ where: { sessionId: { in: testSessionIds } } });
    await prisma.chatSession.deleteMany({ where: { id: { in: testSessionIds } } });
  }
  if (originalDataRoot === undefined) {
    delete process.env.OAX_DATA_ROOT;
  } else {
    process.env.OAX_DATA_ROOT = originalDataRoot;
  }
  fs.writeFileSync(tasksPath, originalAmbition);
  await prisma.$disconnect();
});

describe('F3: Web chat API end-to-end', () => {
  it('auto-creates session, persists user + assistant messages', async () => {
    const sessionId = 'test-f3-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    const res = await processChatFn(sessionId, 'What is the speed of light?', 'llama3');
    expect(res).toBeInstanceOf(Response);
    await finishPromise;

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    expect(session).not.toBeNull();
    expect(session!.agentId).toBe('default');
    expect(session!.model).toBe('llama3');

    const entries = await prisma.transcriptEntry.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    expect(entries).toHaveLength(2);
    expect(entries[0].role).toBe('user');
    expect(entries[0].content).toBe('What is the speed of light?');
    expect(entries[1].role).toBe('assistant');
    expect(entries[1].content).toBe('Mocked assistant reply');
  });

  it('injects system prompt with CONTEXT block', async () => {
    const sessionId = 'test-f3b-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    await processChatFn(sessionId, 'Hello', 'llama3');
    await finishPromise;

    expect(lastCall.messages).toBeDefined();
    const systemMsg = lastCall.messages!.find((m: any) => m.role === 'system');
    expect(systemMsg).toBeDefined();
    expect(systemMsg.content).toContain('CONTEXT');
    expect(systemMsg.content).toContain('INSTRUCTIONS');
    const userMsg = lastCall.messages!.find((m: any) => m.role === 'user');
    expect(userMsg.content).toBe('Hello');
  });
});

describe('F4: Ollama model switching', () => {
  it('processChat passes chosen model through to ollama provider', async () => {
    const sessionId = 'test-f4-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    await processChatFn(sessionId, 'hey', 'mistral');
    await finishPromise;

    expect(lastCall.model).toEqual({ __tag: 'ollama', modelName: 'mistral' });

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    expect(session!.model).toBe('mistral');
  });

  it('F13: appends to AMBITION.md and strips [[TASK:…]] from stored reply', async () => {
    const marker = 'chat-task-' + Math.random().toString(36).slice(2, 8);
    nextReply = `Sure. [[TASK: ${marker} call the vet]] Anything else?`;
    const sessionId = 'test-f13-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    await processChatFn(sessionId, 'remind me to call the vet', 'llama3');
    await finishPromise;

    const ambition = fs.readFileSync(tasksPath, 'utf-8');
    expect(ambition).toContain(`${marker} call the vet`);

    const entries = await prisma.transcriptEntry.findMany({
      where: { sessionId, role: 'assistant' },
    });
    expect(entries[0].content).not.toContain('[[TASK:');
    expect(entries[0].content).toContain('Anything else?');
  });

  it('F14: preserves |when:<ISO> suffix on scheduled reminders', async () => {
    const marker = 'sched-' + Math.random().toString(36).slice(2, 8);
    nextReply = `Got it. [[TASK: ${marker} book dinner |when:2026-04-11T18:00:00Z]]`;
    const sessionId = 'test-f14-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    await processChatFn(sessionId, 'date next week — remind me day before to book', 'llama3');
    await finishPromise;

    const ambition = fs.readFileSync(tasksPath, 'utf-8');
    expect(ambition).toContain(`${marker} book dinner |when:2026-04-11T18:00:00Z`);
  });

  it('F15: writes [[SAVE_FILE]] content to data/workspace/ and strips marker', async () => {
    const slug = 'plan-' + Math.random().toString(36).slice(2, 8) + '.md';
    nextReply = `Done.\n[[SAVE_FILE: ${slug}]]\n# Business Plan\nDolphins.\n[[/SAVE_FILE]]\nTell me what to change.`;
    const sessionId = 'test-f15-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    await processChatFn(sessionId, 'write a business plan', 'llama3');
    await finishPromise;

    const filePath = path.join(workspaceGeneratedDir, slug);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('Dolphins.');
    fs.unlinkSync(filePath);

    const entries = await prisma.transcriptEntry.findMany({
      where: { sessionId, role: 'assistant' },
    });
    expect(entries[0].content).not.toContain('[[SAVE_FILE');
    expect(entries[0].content).toContain('Saved to workspace');
    expect(entries[0].content).toContain('Dolphins.');
    expect(entries[0].content).toContain('Tell me what to change.');
  });

  it('defaults to llama3 when no model specified', async () => {
    const sessionId = 'test-f4b-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    await processChatFn(sessionId, 'hey');
    await finishPromise;

    expect(lastCall.model).toEqual({
      __tag: 'ollama',
      modelName: process.env.OAX_MODEL || 'llama3',
    });
  });
});
