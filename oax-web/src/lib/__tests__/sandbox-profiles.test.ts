import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  profilePaths,
  resetProfileFixture,
  databaseUrlForDataDir,
  buildSandboxEnv,
  devSessionId,
} from '../../../../bin/profile-state.js';

const profiles: string[] = [];

afterAll(() => {
  for (const profile of profiles) {
    const { root } = profilePaths(profile);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('sandbox profiles', () => {
  it('blank fixture creates isolated profile state and leaves onboarding incomplete', async () => {
    const profile = 'test-blank-' + Math.random().toString(36).slice(2, 8);
    profiles.push(profile);

    const { dataDir, envPath } = await resetProfileFixture(profile, 'blank', { quiet: true });

    expect(dataDir).toContain(`${path.sep}.profiles${path.sep}`);
    expect(fs.existsSync(envPath)).toBe(true);
    expect(fs.existsSync(path.join(dataDir, 'agents', 'default', 'SOUL.md'))).toBe(false);
    expect(fs.readFileSync(path.join(dataDir, 'TASKS.md'), 'utf-8')).toContain('## Tasks');
    expect(fs.readFileSync(path.join(dataDir, 'AMBITION.md'), 'utf-8')).toContain('No reflection yet');
  });

  it('returning fixture seeds topic, workspace artifact, and transcript history into the sandbox db', async () => {
    const profile = 'test-returning-' + Math.random().toString(36).slice(2, 8);
    profiles.push(profile);

    const { dataDir } = await resetProfileFixture(profile, 'returning', { quiet: true });
    const index = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'memory', 'index.json'), 'utf-8')
    );

    expect(index.topics).toHaveLength(1);
    expect(index.topics[0].sourcePath).toBe('memory/topics/sandbox-onboarding-retrospective.md');
    expect(
      fs.existsSync(
        path.join(dataDir, 'workspace', 'generated', 'sandbox-validation-checklist.md')
      )
    ).toBe(true);
    expect(fs.readFileSync(path.join(dataDir, 'TASKS.md'), 'utf-8')).toContain(
      'Verify the sandbox blank profile'
    );

    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrlForDataDir(dataDir) } },
    });
    try {
      const count = await prisma.transcriptEntry.count({
        where: { sessionId: devSessionId(profile) },
      });
      expect(count).toBeGreaterThanOrEqual(4);
    } finally {
      await prisma.$disconnect();
    }
  });

  it('buildSandboxEnv points runtime state and session id at the selected profile', () => {
    const profile = 'test-env-' + Math.random().toString(36).slice(2, 8);
    profiles.push(profile);
    const env = buildSandboxEnv(profile, { port: 3123 });
    const { dataDir, envPath } = profilePaths(profile);

    expect(env.OAX_PROFILE).toBe(profile);
    expect(env.OAX_DATA_ROOT).toBe(dataDir);
    expect(env.OAX_RUNTIME_ENV_PATH).toBe(envPath);
    expect(env.DATABASE_URL).toBe(databaseUrlForDataDir(dataDir));
    expect(env.PORT).toBe('3123');
    expect(env.NEXT_PUBLIC_OAX_DEV_SESSION_ID).toBe(devSessionId(profile));
    expect(env.TELEGRAM_TOKEN).toBe('');
  });
});
