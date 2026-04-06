import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { logInfo, logError } from '../logger';
import { GET as logsGET } from '../../app/api/logs/route';
import { POST as chatPOST } from '../../app/api/chat/route';

const today = new Date().toISOString().split('T')[0];
const logPath = path.join(process.cwd(), 'data', 'logs', `oax-${today}.jsonl`);
const UNIQUE = 'logtest-' + Math.random().toString(36).slice(2, 8);

afterAll(() => {
  // Strip our test entries from today's log so we don't pollute.
  if (!fs.existsSync(logPath)) return;
  const keep = fs
    .readFileSync(logPath, 'utf-8')
    .split('\n')
    .filter((l) => l && !l.includes(UNIQUE))
    .join('\n');
  fs.writeFileSync(logPath, keep ? keep + '\n' : '');
});

describe('F11: Logs + error codes', () => {
  it('logInfo writes JSONL to data/logs/oax-<date>.jsonl', () => {
    logInfo('unit_test_event', { marker: UNIQUE });
    expect(fs.existsSync(logPath)).toBe(true);
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean);
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.level).toBe('INFO');
    expect(last.event).toBe('unit_test_event');
    expect(last.data.marker).toBe(UNIQUE);
    expect(last.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('logError writes level=ERROR', () => {
    logError('unit_test_error', { marker: UNIQUE, why: 'because' });
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean);
    const last = JSON.parse(lines[lines.length - 1]);
    expect(last.level).toBe('ERROR');
    expect(last.event).toBe('unit_test_error');
  });

  it('/api/logs returns parsed log entries (newest first)', async () => {
    logInfo('api_log_probe', { marker: UNIQUE });
    const res = await logsGET();
    const json = await res.json();
    expect(Array.isArray(json.logs)).toBe(true);
    const probe = json.logs.find((l: any) => l?.data?.marker === UNIQUE && l.event === 'api_log_probe');
    expect(probe).toBeDefined();
    // Newest-first ordering
    expect(json.logs[0].timestamp >= json.logs[json.logs.length - 1].timestamp).toBe(true);
  });

  it('chat API returns structured error code on missing fields', async () => {
    const res = await chatPOST(
      new Request('http://local/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] }),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('CHAT_MISSING_FIELDS');
  });
});
