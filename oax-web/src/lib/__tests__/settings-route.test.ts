import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const originalRuntimeEnvPath = process.env.OAX_RUNTIME_ENV_PATH;
const baseEnvPath = path.join(process.cwd(), '.env');
const overlayDir = path.join(process.cwd(), '.profiles', 'settings-route-test');
const overlayEnvPath = path.join(overlayDir, '.env');

let baseEnvSnapshot = '';

beforeEach(() => {
  baseEnvSnapshot = fs.existsSync(baseEnvPath) ? fs.readFileSync(baseEnvPath, 'utf-8') : '';
  fs.mkdirSync(overlayDir, { recursive: true });
  fs.writeFileSync(overlayEnvPath, 'OAX_MODEL="llama3"\n');
  process.env.OAX_RUNTIME_ENV_PATH = overlayEnvPath;
});

afterEach(() => {
  if (originalRuntimeEnvPath === undefined) {
    delete process.env.OAX_RUNTIME_ENV_PATH;
  } else {
    process.env.OAX_RUNTIME_ENV_PATH = originalRuntimeEnvPath;
  }
  fs.rmSync(overlayDir, { recursive: true, force: true });
  if (fs.existsSync(baseEnvPath)) {
    fs.writeFileSync(baseEnvPath, baseEnvSnapshot);
  }
  vi.resetModules();
});

describe('/api/settings runtime env overlay', () => {
  it('reads and writes the sandbox overlay instead of the shared base .env', async () => {
    vi.resetModules();
    const route = await import('../../app/api/settings/route');

    const initial = await route.GET();
    const initialJson = await initial.json();
    expect(initialJson.settings.OAX_MODEL).toBe('llama3');

    const update = await route.POST(
      new Request('http://local/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            OAX_MODEL: 'mistral',
            HEARTBEAT_ACTIVE: 'false',
          },
        }),
      })
    );

    expect(update.status).toBe(200);
    const overlayContent = fs.readFileSync(overlayEnvPath, 'utf-8');
    expect(overlayContent).toContain('OAX_MODEL="mistral"');
    expect(overlayContent).toContain('HEARTBEAT_ACTIVE="false"');
    expect(fs.readFileSync(baseEnvPath, 'utf-8')).toBe(baseEnvSnapshot);
  });
});
