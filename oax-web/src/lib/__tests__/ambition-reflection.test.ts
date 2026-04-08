import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import { AMBITION_PATH } from '../ambition';
import {
  buildReflectionPrompt,
  generateReflection,
  ReflectionInput,
} from '../ambition-reflection';

// Mock the Prisma client so tests don't need a live database.
vi.mock('../db', () => ({
  prisma: {
    transcriptEntry: {
      findMany: vi.fn().mockResolvedValue([
        { role: 'user', content: 'I want to start working out more', createdAt: new Date() },
        { role: 'assistant', content: 'I can help with that! Let me create a plan.', createdAt: new Date() },
      ]),
    },
  },
}));

let originalAmbition: string;

beforeAll(() => {
  originalAmbition = fs.existsSync(AMBITION_PATH)
    ? fs.readFileSync(AMBITION_PATH, 'utf-8')
    : '';
});

afterAll(() => {
  if (originalAmbition) {
    fs.writeFileSync(AMBITION_PATH, originalAmbition);
  }
});

describe('buildReflectionPrompt', () => {
  it('constructs a prompt with all signal sources', () => {
    const input: ReflectionInput = {
      soul: 'Name: Alfredo\nVibe: Helpful',
      transcripts: ['[user] I want to work out', '[assistant] Great idea!'],
      reflections: ['- 2026-04-07T10:00:00Z — REFLECT — User seems health-focused'],
      workspaceFiles: ['generated/workout-plan.md'],
    };
    const prompt = buildReflectionPrompt(input);
    expect(prompt).toContain('Alfredo');
    expect(prompt).toContain('work out');
    expect(prompt).toContain('health-focused');
    expect(prompt).toContain('workout-plan.md');
    expect(prompt).toContain('NOT a task list');
  });

  it('handles empty signals gracefully', () => {
    const input: ReflectionInput = {
      soul: '',
      transcripts: [],
      reflections: [],
      workspaceFiles: [],
    };
    const prompt = buildReflectionPrompt(input);
    expect(prompt).toContain('no SOUL yet');
    expect(prompt).toContain('no recent conversations');
    expect(prompt).toContain('no recent reflections');
    expect(prompt).toContain('no recent workspace activity');
  });
});

describe('generateReflection', () => {
  it('writes reflection to AMBITION.md via custom generateFn', async () => {
    const mockReflection = 'Good morning! You have been focused on fitness lately.';
    const reflection = await generateReflection(async () => mockReflection);

    expect(reflection).toBe(mockReflection);

    const content = fs.readFileSync(AMBITION_PATH, 'utf-8');
    expect(content).toContain('# AMBITION');
    expect(content).toContain('Generated:');
    expect(content).toContain('focused on fitness');
    // Must NOT contain task checkbox lines
    expect(content).not.toContain('- [ ]');
    expect(content).not.toContain('## Tasks');
  });

  it('replaces previous reflection entirely', async () => {
    await generateReflection(async () => 'First reflection');
    await generateReflection(async () => 'Second reflection');

    const content = fs.readFileSync(AMBITION_PATH, 'utf-8');
    expect(content).not.toContain('First reflection');
    expect(content).toContain('Second reflection');
  });
});
