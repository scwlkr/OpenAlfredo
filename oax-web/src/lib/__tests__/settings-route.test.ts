import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const originalRuntimeEnvPath = process.env.OAX_RUNTIME_ENV_PATH;
const baseEnvPath = path.join(process.cwd(), '.env');
const overlayDir = path.join(process.cwd(), '.profiles', 'settings-route-test');
const overlayEnvPath = path.join(overlayDir, '.env');

let baseEnvSnapshot = '';
let baseEnvExisted = false;

beforeEach(() => {
  baseEnvExisted = fs.existsSync(baseEnvPath);
  baseEnvSnapshot = baseEnvExisted ? fs.readFileSync(baseEnvPath, 'utf-8') : '';
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
  if (baseEnvExisted && fs.existsSync(baseEnvPath)) {
    fs.writeFileSync(baseEnvPath, baseEnvSnapshot);
  } else if (!baseEnvExisted) {
    fs.rmSync(baseEnvPath, { force: true });
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
    expect(initialJson.settings.HEARTBEAT_CRON).toBe('0 * * * *');

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
    const baseEnvContent = fs.existsSync(baseEnvPath)
      ? fs.readFileSync(baseEnvPath, 'utf-8')
      : '';
    expect(baseEnvContent).toBe(baseEnvSnapshot);
  });

  it('rejects invalid cron expressions without mutating the overlay', async () => {
    vi.resetModules();
    const route = await import('../../app/api/settings/route');

    const update = await route.POST(
      new Request('http://local/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            HEARTBEAT_CRON: 'every minute please',
          },
        }),
      })
    );

    expect(update.status).toBe(400);
    const json = await update.json();
    expect(json.code).toBe('SETTINGS_VALIDATION_FAILED');
    expect(json.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'HEARTBEAT_CRON', code: 'SETTINGS_INVALID_CRON' }),
      ])
    );
    expect(fs.readFileSync(overlayEnvPath, 'utf-8')).toBe('OAX_MODEL="llama3"\n');
  });

  it('rejects malformed boolean values', async () => {
    vi.resetModules();
    const route = await import('../../app/api/settings/route');

    const update = await route.POST(
      new Request('http://local/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            HEARTBEAT_ACTIVE: 'sometimes',
          },
        }),
      })
    );

    expect(update.status).toBe(400);
    const json = await update.json();
    expect(json.code).toBe('SETTINGS_VALIDATION_FAILED');
    expect(json.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'HEARTBEAT_ACTIVE', code: 'SETTINGS_INVALID_BOOLEAN' }),
      ])
    );
  });

  it('sanitizes invalid stored values back to safe defaults on read', async () => {
    fs.writeFileSync(
      overlayEnvPath,
      [
        'HEARTBEAT_CRON="not-a-cron"',
        'HEARTBEAT_ACTIVE="sometimes"',
        'OAX_MODEL=""',
        '',
      ].join('\n')
    );

    vi.resetModules();
    const route = await import('../../app/api/settings/route');

    const response = await route.GET();
    const json = await response.json();

    expect(json.settings.HEARTBEAT_CRON).toBe('0 * * * *');
    expect(json.settings.HEARTBEAT_ACTIVE).toBe('true');
    expect(json.settings.OAX_MODEL).toBe('llama3');
    expect(json.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'HEARTBEAT_CRON', code: 'SETTINGS_INVALID_CRON' }),
        expect.objectContaining({ key: 'HEARTBEAT_ACTIVE', code: 'SETTINGS_INVALID_BOOLEAN' }),
        expect.objectContaining({ key: 'OAX_MODEL', code: 'SETTINGS_INVALID_MODEL' }),
      ])
    );
  });
});
