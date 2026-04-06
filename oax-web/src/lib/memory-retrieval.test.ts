import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { retrieveContext, saveTopic } from './memory-retrieval';
import { prisma } from './db';

const AGENT_ID = 'test-mem-' + Math.random().toString(36).slice(2, 8);
const AGENT_DIR = path.join(process.cwd(), 'data', 'agents', AGENT_ID);
const MEMORY_INDEX = path.join(process.cwd(), 'data', 'memory', 'index.json');
const TOPICS_DIR = path.join(process.cwd(), 'data', 'memory', 'topics');

const TEST_SESSION = 'test-sess-' + Math.random().toString(36).slice(2, 8);
const TEST_TOPIC_TITLE = 'Speed Of Light Test Topic ' + Math.random().toString(36).slice(2, 6);
const TEST_TOPIC_SLUG = TEST_TOPIC_TITLE.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';

// Snapshot index.json so tests can restore it.
let originalIndex: string;

beforeAll(async () => {
  originalIndex = fs.existsSync(MEMORY_INDEX)
    ? fs.readFileSync(MEMORY_INDEX, 'utf-8')
    : JSON.stringify({ version: '1.0', topics: [] });

  fs.mkdirSync(AGENT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(AGENT_DIR, 'SOUL.md'),
    '# SOUL\nI am a test agent focused on physics.'
  );

  // Seed one topic via saveTopic (tests F7 write path too).
  saveTopic(TEST_TOPIC_TITLE, 'Light travels at 299,792,458 m/s in vacuum.', [
    'physics',
    'light',
  ]);
});

afterAll(async () => {
  if (fs.existsSync(AGENT_DIR)) fs.rmSync(AGENT_DIR, { recursive: true, force: true });
  const topicPath = path.join(TOPICS_DIR, TEST_TOPIC_SLUG);
  if (fs.existsSync(topicPath)) fs.unlinkSync(topicPath);
  fs.writeFileSync(MEMORY_INDEX, originalIndex);
  await prisma.transcriptEntry.deleteMany({ where: { sessionId: TEST_SESSION } });
  await prisma.chatSession.deleteMany({ where: { id: TEST_SESSION } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.transcriptEntry.deleteMany({ where: { sessionId: TEST_SESSION } });
  await prisma.chatSession.deleteMany({ where: { id: TEST_SESSION } });
});

describe('F5/F6/F7/F9/F10: 3-layer memory system', () => {
  it('F5+F9: always loads SOUL as first slice', async () => {
    const slices = await retrieveContext(TEST_SESSION, AGENT_ID, 'unrelated query');
    expect(slices[0].source).toBe('soul');
    expect(slices[0].content).toContain('test agent focused on physics');
  });

  it('F8: transcript layer pulls from SQLite session history', async () => {
    await prisma.chatSession.create({
      data: { id: TEST_SESSION, agentId: AGENT_ID, model: 'llama3' },
    });
    await prisma.transcriptEntry.create({
      data: { sessionId: TEST_SESSION, role: 'user', content: 'Prior turn about Jupiter' },
    });
    await prisma.transcriptEntry.create({
      data: { sessionId: TEST_SESSION, role: 'assistant', content: 'Jupiter is a gas giant.' },
    });

    const slices = await retrieveContext(TEST_SESSION, AGENT_ID, 'hi');
    const transcript = slices.find((s) => s.source === 'transcript');
    expect(transcript).toBeDefined();
    expect(transcript!.content).toContain('Jupiter is a gas giant');
  });

  it('F6+F7: topic loaded only when keyword matches index', async () => {
    const matched = await retrieveContext(TEST_SESSION, AGENT_ID, 'tell me about light');
    const topicSlice = matched.find((s) => s.source === 'topic');
    expect(topicSlice).toBeDefined();
    expect(topicSlice!.content).toContain('299,792,458');
  });

  it('F10: unrelated query excludes topic (stays lightweight)', async () => {
    const unmatched = await retrieveContext(TEST_SESSION, AGENT_ID, 'recipe for pasta');
    const topicSlice = unmatched.find((s) => s.source === 'topic');
    expect(topicSlice).toBeUndefined();
  });

  it('retrieveContext never throws when agent/soul dir absent', async () => {
    const slices = await retrieveContext(TEST_SESSION, 'no-such-agent', 'anything');
    expect(Array.isArray(slices)).toBe(true);
    const soul = slices.find((s) => s.source === 'soul');
    expect(soul).toBeUndefined();
  });
});
