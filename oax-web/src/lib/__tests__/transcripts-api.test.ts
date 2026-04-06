import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../db';
import { GET } from '../../app/api/transcripts/route';

const SESSION_A = 'test-trx-a-' + Math.random().toString(36).slice(2, 8);
const SESSION_B = 'test-trx-b-' + Math.random().toString(36).slice(2, 8);
const UNIQUE = 'zzqx' + Math.random().toString(36).slice(2, 8);

beforeAll(async () => {
  await prisma.chatSession.create({ data: { id: SESSION_A, agentId: 'default', model: 'llama3' } });
  await prisma.chatSession.create({ data: { id: SESSION_B, agentId: 'default', model: 'llama3' } });
  await prisma.transcriptEntry.createMany({
    data: [
      { sessionId: SESSION_A, role: 'user', content: `planning a trip ${UNIQUE} to Kyoto` },
      { sessionId: SESSION_A, role: 'assistant', content: `here are ideas for ${UNIQUE} Kyoto` },
      { sessionId: SESSION_A, role: 'user', content: 'completely unrelated note' },
      { sessionId: SESSION_B, role: 'user', content: `another ${UNIQUE} session mention` },
    ],
  });
});

afterAll(async () => {
  await prisma.transcriptEntry.deleteMany({ where: { sessionId: { in: [SESSION_A, SESSION_B] } } });
  await prisma.chatSession.deleteMany({ where: { id: { in: [SESSION_A, SESSION_B] } } });
  await prisma.$disconnect();
});

describe('F8: Searchable transcripts', () => {
  it('searches full history by substring', async () => {
    const res = await GET(new Request(`http://local/api/transcripts?q=${UNIQUE}`));
    const json = await res.json();
    expect(json.count).toBe(3);
    for (const r of json.results) expect(r.content).toContain(UNIQUE);
  });

  it('filters by sessionId', async () => {
    const res = await GET(
      new Request(`http://local/api/transcripts?q=${UNIQUE}&sessionId=${SESSION_A}`)
    );
    const json = await res.json();
    expect(json.count).toBe(2);
    for (const r of json.results) expect(r.sessionId).toBe(SESSION_A);
  });

  it('respects limit param', async () => {
    const res = await GET(new Request(`http://local/api/transcripts?q=${UNIQUE}&limit=1`));
    const json = await res.json();
    expect(json.count).toBe(1);
  });

  it('returns empty list for unmatched query', async () => {
    const res = await GET(new Request(`http://local/api/transcripts?q=nomatch-${UNIQUE}xxx`));
    const json = await res.json();
    expect(json.count).toBe(0);
    expect(json.results).toEqual([]);
  });
});
