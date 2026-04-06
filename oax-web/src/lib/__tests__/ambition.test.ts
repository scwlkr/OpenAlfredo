import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  AMBITION_PATH,
  appendTask,
  listTasks,
  parseTasksFromReply,
  stripTaskMarkers,
  dueTasks,
} from '../ambition';
import { GET as ambitionGET, POST as ambitionPOST } from '../../app/api/ambition/route';

const MARKER = 'test-marker-' + Math.random().toString(36).slice(2, 8);
let originalAmbition: string;

beforeAll(() => {
  originalAmbition = fs.existsSync(AMBITION_PATH)
    ? fs.readFileSync(AMBITION_PATH, 'utf-8')
    : '# AMBITION\n\n## Tasks\n';
});

beforeEach(() => {
  // Restore to original between tests so tasks don't leak.
  fs.writeFileSync(AMBITION_PATH, originalAmbition);
});

afterAll(() => {
  fs.writeFileSync(AMBITION_PATH, originalAmbition);
});

describe('F13: [[TASK: …]] marker parsing', () => {
  it('extracts one task from an assistant reply', () => {
    const reply = 'Sure thing. [[TASK: remind me to water the plants]] Anything else?';
    expect(parseTasksFromReply(reply)).toEqual(['remind me to water the plants']);
  });

  it('extracts multiple tasks', () => {
    const reply = 'Done. [[TASK: call Mom]] [[TASK: buy milk |when:2026-04-10T09:00:00Z]]';
    expect(parseTasksFromReply(reply)).toEqual([
      'call Mom',
      'buy milk |when:2026-04-10T09:00:00Z',
    ]);
  });

  it('stripTaskMarkers removes markers from visible text', () => {
    const reply = 'Got it. [[TASK: x]] Will do.';
    const out = stripTaskMarkers(reply);
    expect(out).not.toContain('[[TASK:');
    expect(out).toContain('Got it.');
    expect(out).toContain('Will do.');
  });
});

describe('F12+F13: AMBITION.md append + list', () => {
  it('appendTask adds a "- [ ] …" line under ## Tasks', () => {
    appendTask(`${MARKER} first task`);
    const raw = fs.readFileSync(AMBITION_PATH, 'utf-8');
    expect(raw).toContain(`- [ ] ${MARKER} first task`);
  });

  it('listTasks round-trips plain + suffixed tasks', () => {
    appendTask(`${MARKER} plain task`);
    appendTask(`${MARKER} scheduled |when:2026-04-10T09:00:00Z`);
    appendTask(`${MARKER} recurring |recur:daily@09:00`);

    const mine = listTasks().filter((t) => t.text.includes(MARKER));
    expect(mine).toHaveLength(3);

    const plain = mine.find((t) => t.text.endsWith('plain task'))!;
    expect(plain.done).toBe(false);
    expect(plain.whenISO).toBeUndefined();

    const scheduled = mine.find((t) => t.text.endsWith('scheduled'))!;
    expect(scheduled.whenISO).toBe('2026-04-10T09:00:00Z');

    const recurring = mine.find((t) => t.text.endsWith('recurring'))!;
    expect(recurring.recur).toBe('daily@09:00');
  });

  it('listTasks marks checked boxes as done', () => {
    fs.writeFileSync(
      AMBITION_PATH,
      originalAmbition + `- [x] ${MARKER} completed\n- [ ] ${MARKER} pending\n`
    );
    const mine = listTasks().filter((t) => t.text.includes(MARKER));
    expect(mine.find((t) => t.text.endsWith('completed'))!.done).toBe(true);
    expect(mine.find((t) => t.text.endsWith('pending'))!.done).toBe(false);
  });
});

describe('F12: dueTasks() cron window logic', () => {
  it('returns tasks whose |when: falls inside [now-window, now]', () => {
    const now = new Date('2026-04-10T09:15:00Z');
    const past = '2026-04-10T09:00:00Z'; // 15 min ago — inside 30m window
    const older = '2026-04-10T08:30:00Z'; // 45 min ago — outside window
    const future = '2026-04-10T09:45:00Z'; // 30 min future — not due yet

    appendTask(`${MARKER} due |when:${past}`);
    appendTask(`${MARKER} stale |when:${older}`);
    appendTask(`${MARKER} future |when:${future}`);

    const due = dueTasks(now).filter((t) => t.text.includes(MARKER));
    expect(due).toHaveLength(1);
    expect(due[0].text).toContain('due');
  });

  it('excludes completed tasks', () => {
    fs.writeFileSync(
      AMBITION_PATH,
      originalAmbition + `- [x] ${MARKER} done |when:2026-04-10T09:00:00Z\n`
    );
    const due = dueTasks(new Date('2026-04-10T09:15:00Z'));
    expect(due.find((t) => t.text.includes(MARKER))).toBeUndefined();
  });
});

describe('F12/F13: /api/ambition endpoint', () => {
  it('POST appends, GET lists', async () => {
    const postRes = await ambitionPOST(
      new Request('http://local/api/ambition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: `${MARKER} api task` }),
      })
    );
    expect(postRes.status).toBe(200);

    const getRes = await ambitionGET(new Request('http://local/api/ambition'));
    const json = await getRes.json();
    expect(json.tasks.find((t: any) => t.text.includes('api task'))).toBeDefined();
  });

  it('POST without task returns AMBITION_MISSING_TASK 400', async () => {
    const res = await ambitionPOST(
      new Request('http://local/api/ambition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('AMBITION_MISSING_TASK');
  });
});
