import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logInfo, logError } from '@/lib/logger';
import { RUNTIME_ENV_PATH as ENV_PATH } from '@/lib/paths';
import { sanitizeRuntimeSettings, validateRuntimeSettingsPatch } from '@/lib/runtime-settings';

function parseEnvFile(): Record<string, string> {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function writeEnvFile(values: Record<string, string>): void {
  let content: string;
  try {
    content = fs.readFileSync(ENV_PATH, 'utf-8');
  } catch {
    content = '';
  }

  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${key}\\s*=.*$`, 'm');
    const line = `${key}="${value}"`;
    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      content = content.trimEnd() + '\n' + line + '\n';
    }
  }

  fs.mkdirSync(path.dirname(ENV_PATH), { recursive: true });
  fs.writeFileSync(ENV_PATH, content);
}

// GET /api/settings — returns all allowed settings
export async function GET() {
  try {
    const env = parseEnvFile();
    const { settings, issues } = sanitizeRuntimeSettings(env);
    return NextResponse.json({ settings, issues });
  } catch (err: any) {
    logError('settings_read_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'SETTINGS_READ_FAILED' },
      { status: 500 }
    );
  }
}

// POST /api/settings { settings: { HEARTBEAT_CRON: "*/15 * * * *", ... } }
export async function POST(request: Request) {
  try {
    const { settings } = await request.json();
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Missing settings object', code: 'SETTINGS_MISSING' },
        { status: 400 }
      );
    }

    const { updates, issues } = validateRuntimeSettingsPatch(settings);

    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: 'One or more settings are invalid.',
          code: 'SETTINGS_VALIDATION_FAILED',
          issues,
        },
        { status: 400 }
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid settings to update', code: 'SETTINGS_NO_VALID_KEYS' },
        { status: 400 }
      );
    }

    writeEnvFile(updates);
    logInfo('settings_updated', { keys: Object.keys(updates) });
    return NextResponse.json({
      success: true,
      updated: Object.keys(updates),
      note: 'Restart the pod for changes to take effect.',
    });
  } catch (err: any) {
    logError('settings_update_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'SETTINGS_UPDATE_FAILED' },
      { status: 500 }
    );
  }
}
