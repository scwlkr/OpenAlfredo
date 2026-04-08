import { describe, expect, it } from 'vitest';
import {
  defaultOaxModel,
  isSettingEnabled,
  sanitizeRuntimeSettings,
  validateRuntimeSettingsPatch,
} from '../runtime-settings';

describe('runtime settings validation', () => {
  it('falls back to safe defaults when env values are malformed', () => {
    const { settings, issues } = sanitizeRuntimeSettings({
      HEARTBEAT_CRON: 'not cron',
      HEARTBEAT_ACTIVE: 'maybe',
      OAX_MODEL: '   ',
    });

    expect(settings.HEARTBEAT_CRON).toBe('0 * * * *');
    expect(settings.HEARTBEAT_ACTIVE).toBe('true');
    expect(settings.OAX_MODEL).toBe('llama3');
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'HEARTBEAT_CRON', code: 'SETTINGS_INVALID_CRON' }),
        expect.objectContaining({ key: 'HEARTBEAT_ACTIVE', code: 'SETTINGS_INVALID_BOOLEAN' }),
        expect.objectContaining({ key: 'OAX_MODEL', code: 'SETTINGS_INVALID_MODEL' }),
      ])
    );
  });

  it('normalizes valid updates before they are written', () => {
    const { updates, issues } = validateRuntimeSettingsPatch({
      HEARTBEAT_ACTIVE: ' FALSE ',
      HEARTBEAT_CRON: ' */30 * * * * ',
      OAX_MODEL: ' mistral ',
    });

    expect(issues).toEqual([]);
    expect(updates).toEqual({
      HEARTBEAT_ACTIVE: 'false',
      HEARTBEAT_CRON: '*/30 * * * *',
      OAX_MODEL: 'mistral',
    });
  });

  it('exposes helpers for runtime callers', () => {
    expect(defaultOaxModel({ OAX_MODEL: '  mistral  ' })).toBe('mistral');
    expect(defaultOaxModel({ OAX_MODEL: '   ' })).toBe('llama3');
    expect(isSettingEnabled('true')).toBe(true);
    expect(isSettingEnabled('false')).toBe(false);
  });
});
