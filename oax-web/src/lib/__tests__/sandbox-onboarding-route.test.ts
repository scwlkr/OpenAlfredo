import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { profilePaths, resetProfileFixture } from '../../../../bin/profile-state.js';

const originalDataRoot = process.env.OAX_DATA_ROOT;
let profile = '';

beforeEach(async () => {
  profile = 'test-onboarding-' + Math.random().toString(36).slice(2, 8);
  const { dataDir } = await resetProfileFixture(profile, 'blank', { quiet: true });
  process.env.OAX_DATA_ROOT = dataDir;
});

afterEach(() => {
  if (originalDataRoot === undefined) {
    delete process.env.OAX_DATA_ROOT;
  } else {
    process.env.OAX_DATA_ROOT = originalDataRoot;
  }
  if (profile) {
    const { root } = profilePaths(profile);
    fs.rmSync(root, { recursive: true, force: true });
  }
  vi.resetModules();
});

describe('sandbox onboarding route', () => {
  it('blank fixture reports exists=false until onboarding POST creates SOUL.md', async () => {
    vi.resetModules();
    const route = await import('../../app/api/onboarding/route');

    const before = await route.GET(new Request('http://local/api/onboarding?agentId=default'));
    expect((await before.json()).exists).toBe(false);

    const create = await route.POST(
      new Request('http://local/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'default',
          persona: 'Sandbox tester',
          goals: 'Validate blank onboarding',
          style: 'Direct',
        }),
      })
    );
    expect(create.status).toBe(200);

    vi.resetModules();
    const routeAfter = await import('../../app/api/onboarding/route');
    const after = await routeAfter.GET(
      new Request('http://local/api/onboarding?agentId=default')
    );
    expect((await after.json()).exists).toBe(true);
  });
});
