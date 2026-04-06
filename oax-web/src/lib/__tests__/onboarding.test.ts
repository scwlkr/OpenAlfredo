import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { POST, GET } from '../../app/api/onboarding/route';

const testAgentId = 'test-agent-' + Math.random().toString(36).slice(2, 8);
const agentDir = path.join(process.cwd(), 'data', 'agents', testAgentId);

afterEach(() => {
  if (fs.existsSync(agentDir)) fs.rmSync(agentDir, { recursive: true, force: true });
});

describe('F1: Onboarding → SOUL.md', () => {
  it('POST creates SOUL.md with persona/goals/style', async () => {
    const req = new Request('http://local/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: testAgentId,
        persona: 'Stoic advisor',
        goals: 'Clarity of thought',
        style: 'Terse and direct',
      }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.agentId).toBe(testAgentId);

    const soulPath = path.join(agentDir, 'SOUL.md');
    expect(fs.existsSync(soulPath)).toBe(true);
    const content = fs.readFileSync(soulPath, 'utf-8');
    expect(content).toContain('Stoic advisor');
    expect(content).toContain('Clarity of thought');
    expect(content).toContain('Terse and direct');
  });

  it('POST rejects missing fields with 400', async () => {
    const req = new Request('http://local/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'x' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('GET reports SOUL existence by agentId', async () => {
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'SOUL.md'), '# SOUL');
    const req = new Request(`http://local/api/onboarding?agentId=${testAgentId}`);
    const res = await GET(req);
    const json = await res.json();
    expect(json.exists).toBe(true);
  });

  it('GET returns exists:false for unknown agent', async () => {
    const req = new Request('http://local/api/onboarding?agentId=nope-nope-nope');
    const res = await GET(req);
    const json = await res.json();
    expect(json.exists).toBe(false);
  });
});
