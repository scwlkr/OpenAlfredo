// Auth key management for the OAX web API.
// Generates a random 256-bit key on first run, persists it to
// data/.oax-api-key (mode 0o600), and sets process.env.OAX_API_KEY
// so the middleware can read it.

import crypto from 'crypto';
import fs from 'fs';
import { DATA_ROOT as DATA_DIR, API_KEY_FILE } from './paths';

let _cachedKey: string | null = null;

export function getApiKey(): string {
  if (_cachedKey) return _cachedKey;

  // Try to read existing key
  try {
    const existing = fs.readFileSync(API_KEY_FILE, 'utf-8').trim();
    if (existing) {
      _cachedKey = existing;
      process.env.OAX_API_KEY = existing;
      return existing;
    }
  } catch {}

  // Generate new key
  const key = crypto.randomBytes(32).toString('hex');
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(API_KEY_FILE, key, { mode: 0o600 });
  } catch (e) {
    console.error('Could not persist API key:', e);
  }

  _cachedKey = key;
  process.env.OAX_API_KEY = key;
  return key;
}

// Bootstrap on import — ensures OAX_API_KEY is in env before middleware runs
getApiKey();
