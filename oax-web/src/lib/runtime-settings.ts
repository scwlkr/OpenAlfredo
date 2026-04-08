import cron from 'node-cron';

export const RUNTIME_SETTING_DEFAULTS = {
  HEARTBEAT_CRON: '0 * * * *',
  HEARTBEAT_ACTIVE: 'true',
  AMBITION_CRON: '*/30 * * * *',
  REFLECTION_CRON: '0 7 * * *',
  REFLECTION_ACTIVE: 'true',
  CONTINUITY_CRON: '0 10,16 * * *',
  CONTINUITY_ACTIVE: 'true',
  OAX_MODEL: 'llama3',
} as const;

export type RuntimeSettingKey = keyof typeof RUNTIME_SETTING_DEFAULTS;
export type RuntimeSettings = { [K in RuntimeSettingKey]: string };
export type RuntimeSettingsPatch = Partial<RuntimeSettings>;
export type RuntimeSettingIssueCode =
  | 'SETTINGS_INVALID_KEY'
  | 'SETTINGS_INVALID_TYPE'
  | 'SETTINGS_INVALID_BOOLEAN'
  | 'SETTINGS_INVALID_CRON'
  | 'SETTINGS_INVALID_MODEL';

export interface RuntimeSettingIssue {
  key: string;
  code: RuntimeSettingIssueCode;
  message: string;
  value?: unknown;
}

const RUNTIME_SETTING_KEYS = Object.keys(RUNTIME_SETTING_DEFAULTS) as RuntimeSettingKey[];
const BOOLEAN_SETTING_KEYS = new Set<RuntimeSettingKey>([
  'HEARTBEAT_ACTIVE',
  'REFLECTION_ACTIVE',
  'CONTINUITY_ACTIVE',
]);
const CRON_SETTING_KEYS = new Set<RuntimeSettingKey>([
  'HEARTBEAT_CRON',
  'AMBITION_CRON',
  'REFLECTION_CRON',
  'CONTINUITY_CRON',
]);

function buildIssue(
  key: string,
  code: RuntimeSettingIssueCode,
  message: string,
  value?: unknown
): RuntimeSettingIssue {
  return { key, code, message, value };
}

function hasUnsafeEnvChars(value: string): boolean {
  return /[\r\n"]/.test(value);
}

function isRuntimeSettingKey(value: string): value is RuntimeSettingKey {
  return RUNTIME_SETTING_KEYS.includes(value as RuntimeSettingKey);
}

function validateRuntimeSetting(
  key: RuntimeSettingKey,
  rawValue: unknown
): { value?: string; issue?: RuntimeSettingIssue } {
  if (typeof rawValue !== 'string') {
    return {
      issue: buildIssue(key, 'SETTINGS_INVALID_TYPE', `${key} must be a string.`, rawValue),
    };
  }

  const trimmed = rawValue.trim();

  if (BOOLEAN_SETTING_KEYS.has(key)) {
    const normalized = trimmed.toLowerCase();
    if (normalized === 'true' || normalized === 'false') {
      return { value: normalized };
    }
    return {
      issue: buildIssue(
        key,
        'SETTINGS_INVALID_BOOLEAN',
        `${key} must be "true" or "false".`,
        rawValue
      ),
    };
  }

  if (CRON_SETTING_KEYS.has(key)) {
    if (!trimmed || hasUnsafeEnvChars(trimmed) || !cron.validate(trimmed)) {
      return {
        issue: buildIssue(
          key,
          'SETTINGS_INVALID_CRON',
          `${key} must be a valid node-cron expression.`,
          rawValue
        ),
      };
    }
    return { value: trimmed };
  }

  if (!trimmed || hasUnsafeEnvChars(trimmed)) {
    return {
      issue: buildIssue(
        key,
        'SETTINGS_INVALID_MODEL',
        `${key} must be a non-empty single-line string without double quotes.`,
        rawValue
      ),
    };
  }

  return { value: trimmed };
}

export function listRuntimeSettingKeys(): RuntimeSettingKey[] {
  return [...RUNTIME_SETTING_KEYS];
}

export function validateRuntimeSettingsPatch(input: unknown): {
  updates: RuntimeSettingsPatch;
  issues: RuntimeSettingIssue[];
} {
  const updates: RuntimeSettingsPatch = {};
  const issues: RuntimeSettingIssue[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      updates,
      issues: [
        buildIssue(
          'settings',
          'SETTINGS_INVALID_TYPE',
          'Settings payload must be an object.',
          input
        ),
      ],
    };
  }

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isRuntimeSettingKey(key)) {
      issues.push(buildIssue(key, 'SETTINGS_INVALID_KEY', `Unsupported setting key: ${key}.`, value));
      continue;
    }

    const { value: normalizedValue, issue } = validateRuntimeSetting(key, value);
    if (issue) {
      issues.push(issue);
      continue;
    }

    updates[key] = normalizedValue!;
  }

  return { updates, issues };
}

export function sanitizeRuntimeSettings(input: Partial<Record<string, string | undefined>>): {
  settings: RuntimeSettings;
  issues: RuntimeSettingIssue[];
} {
  const settings: RuntimeSettings = { ...RUNTIME_SETTING_DEFAULTS };
  const issues: RuntimeSettingIssue[] = [];

  for (const key of RUNTIME_SETTING_KEYS) {
    const rawValue = input[key];
    if (rawValue === undefined) continue;

    const { value, issue } = validateRuntimeSetting(key, rawValue);
    if (issue) {
      issues.push(issue);
      continue;
    }

    settings[key] = value!;
  }

  return { settings, issues };
}

export function defaultOaxModel(
  env: Partial<Record<string, string | undefined>> = process.env
): string {
  return sanitizeRuntimeSettings(env).settings.OAX_MODEL;
}

export function isSettingEnabled(value: string): boolean {
  return value === 'true';
}
