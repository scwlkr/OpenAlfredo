import { describe, it, expect, beforeEach, afterAll, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { THEMES_FILE } from '../paths';
import { WORKSPACE_GENERATED_DIR, WORKSPACE_DESK_DIR } from '../paths';
import { TASKS_PATH } from '../tasks';

// Mock the ai SDK (same pattern as chat-api.test.ts)
let nextReply = 'Mocked reply';
let finishPromise: Promise<void> | null = null;

vi.mock('ai', () => ({
  streamText: (opts: any) => {
    const mockText = nextReply;
    finishPromise = (async () => {
      await opts.onFinish?.({ text: mockText });
    })();
    return {
      toUIMessageStreamResponse: () =>
        new Response(mockText, { headers: { 'content-type': 'text/plain' } }),
    };
  },
  generateText: vi.fn(),
}));
vi.mock('ai-sdk-ollama', () => ({
  createOllama: () => (modelName: string) => ({ __tag: 'ollama', modelName }),
}));

import { processChat } from '../oax-engine';
import { extractThemes, readThemes, writeThemes } from '../inference';
import { runContinuityLoop } from '../continuity';
import { generateReflection } from '../ambition-reflection';
import { AMBITION_PATH } from '../ambition';
import { shouldFadeTheme } from '../continuity';

const testSessionIds: string[] = [];
const createdFiles: string[] = [];

let originalTasks = '';
let originalAmbition = '';
let originalThemes: string | null = null;

beforeEach(() => {
  finishPromise = null;
  nextReply = 'Mocked reply';
  originalTasks = fs.existsSync(TASKS_PATH)
    ? fs.readFileSync(TASKS_PATH, 'utf-8')
    : '# TASKS\n';
  originalAmbition = fs.existsSync(AMBITION_PATH)
    ? fs.readFileSync(AMBITION_PATH, 'utf-8')
    : '';
  originalThemes = fs.existsSync(THEMES_FILE)
    ? fs.readFileSync(THEMES_FILE, 'utf-8')
    : null;
});

afterEach(() => {
  fs.writeFileSync(TASKS_PATH, originalTasks);
  fs.writeFileSync(AMBITION_PATH, originalAmbition);
  if (originalThemes !== null) {
    fs.writeFileSync(THEMES_FILE, originalThemes);
  } else if (fs.existsSync(THEMES_FILE)) {
    fs.unlinkSync(THEMES_FILE);
  }
  for (const f of createdFiles.splice(0)) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

afterAll(async () => {
  if (testSessionIds.length) {
    await prisma.transcriptEntry.deleteMany({ where: { sessionId: { in: testSessionIds } } });
    await prisma.chatSession.deleteMany({ where: { id: { in: testSessionIds } } });
  }
  await prisma.$disconnect();
});

describe('Golden Goose: end-to-end adaptive behavior chain', () => {
  it('Step 1+2: SAVE_FILE marker triggers workspace file + dual delivery', async () => {
    const slug = 'gg-plan-' + Math.random().toString(36).slice(2, 8) + '.md';
    nextReply = `Here's your plan!\n[[SAVE_FILE: ${slug}]]\n# Workout Plan\nRun 3x weekly.\n[[/SAVE_FILE]]\nLet me know!`;

    const sessionId = 'test-gg-1-' + Math.random().toString(36).slice(2, 10);
    testSessionIds.push(sessionId);

    await processChat(sessionId, 'create a workout plan for me', 'llama3');
    await finishPromise;

    // File saved to workspace
    const filePath = path.join(WORKSPACE_GENERATED_DIR, slug);
    createdFiles.push(filePath);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('Run 3x weekly');

    // Dual delivery: stored reply has inline content
    const entries = await prisma.transcriptEntry.findMany({
      where: { sessionId, role: 'assistant' },
    });
    expect(entries[0].content).toContain('Saved to workspace');
    expect(entries[0].content).toContain('Workout Plan');
    expect(entries[0].content).not.toContain('[[SAVE_FILE');
  });

  it('Step 3: extractThemes identifies "fitness" from transcripts', async () => {
    const mockGenerate = async (prompt: string) => {
      expect(prompt).toContain('workout');
      return '["fitness", "health"]';
    };
    const themes = await extractThemes(mockGenerate);
    expect(themes).toContain('fitness');
  });

  it('Step 4: runContinuityLoop creates follow-up artifacts', async () => {
    // Seed themes
    writeThemes({
      themes: [
        { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: '2026-04-07', strength: 0.8 },
      ],
    });

    // Mock: extraction returns "fitness", follow-up returns a task + sticky
    let callCount = 0;
    const mockGenerate = async (prompt: string) => {
      callCount++;
      if (callCount === 1) {
        // Theme extraction
        return '["fitness"]';
      }
      // Follow-up inference
      return JSON.stringify([
        {
          type: 'task',
          content: 'Check workout progress this week',
          title: null,
          theme: 'fitness',
          confidence: 0.85,
        },
        {
          type: 'sticky',
          content: 'Consider adding yoga to your routine',
          title: 'yoga idea',
          theme: 'fitness',
          confidence: 0.7,
        },
      ]);
    };

    const result = await runContinuityLoop(mockGenerate);

    expect(result.themesExtracted).toContain('fitness');
    expect(result.followUpsExecuted).toHaveLength(2);
    expect(result.followUpsExecuted[0].type).toBe('task');
    expect(result.followUpsExecuted[1].type).toBe('sticky');

    // Verify task was appended
    const tasks = fs.readFileSync(TASKS_PATH, 'utf-8');
    expect(tasks).toContain('Check workout progress');

    // Verify sticky was created in desk/
    const deskFiles = fs.readdirSync(WORKSPACE_DESK_DIR);
    const stickyFile = deskFiles.find((f) => f.includes('yoga-idea'));
    expect(stickyFile).toBeDefined();
    if (stickyFile) createdFiles.push(path.join(WORKSPACE_DESK_DIR, stickyFile));

    // Verify themes persisted
    const themes = readThemes();
    expect(themes.themes.some((t) => t.tag === 'fitness')).toBe(true);
  });

  it('Step 5: generateReflection mentions fitness theme', async () => {
    // Seed themes so reflection picks them up
    writeThemes({
      themes: [
        { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: '2026-04-07', strength: 0.9 },
      ],
    });

    const mockGenerate = async (prompt: string) => {
      // The prompt should now include active themes
      expect(prompt).toContain('fitness');
      return 'Good morning! You have been focused on fitness this week. Keep up the momentum.';
    };
    const reflection = await generateReflection(mockGenerate);

    expect(reflection).toContain('fitness');
    const content = fs.readFileSync(AMBITION_PATH, 'utf-8');
    expect(content).toContain('fitness');
  });

  it('Step 6: theme fade — ignoring a theme for 7+ days reduces strength', () => {
    const staleTheme = {
      tag: 'old-hobby',
      firstSeen: '2026-03-01T00:00:00Z',
      lastEngaged: '2026-03-25T00:00:00Z', // >7 days ago
      strength: 0.4,
    };
    expect(shouldFadeTheme(staleTheme)).toBe(true);

    const activeTheme = {
      tag: 'fitness',
      firstSeen: '2026-04-01T00:00:00Z',
      lastEngaged: new Date().toISOString(), // just now
      strength: 0.8,
    };
    expect(shouldFadeTheme(activeTheme)).toBe(false);
  });

  it('Step 7: continuity loop fades stale themes', async () => {
    writeThemes({
      themes: [
        { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: new Date().toISOString(), strength: 0.8 },
        { tag: 'old-hobby', firstSeen: '2026-02-01', lastEngaged: '2026-03-01', strength: 0.2 },
      ],
    });

    const mockGenerate = async (prompt: string) => {
      if (prompt.includes('Extract')) return '["fitness"]';
      return '[]'; // no follow-ups
    };

    const result = await runContinuityLoop(mockGenerate);
    expect(result.themesFaded).toContain('old-hobby');
    expect(result.activeThemes.some((t) => t.tag === 'fitness')).toBe(true);
    expect(result.activeThemes.some((t) => t.tag === 'old-hobby')).toBe(false);
  });

  it('Step 8: workspace_file follow-up creates a generated document', async () => {
    writeThemes({
      themes: [
        { tag: 'cooking', firstSeen: '2026-04-01', lastEngaged: '2026-04-07', strength: 0.7 },
      ],
    });

    let callCount = 0;
    const mockGenerate = async () => {
      callCount++;
      if (callCount === 1) return '["cooking"]';
      return JSON.stringify([
        {
          type: 'workspace_file',
          content: '# Weekly Meal Plan\n\nMonday: Pasta\nTuesday: Salad',
          title: 'meal-plan.md',
          theme: 'cooking',
          confidence: 0.9,
        },
      ]);
    };

    const result = await runContinuityLoop(mockGenerate);
    expect(result.followUpsExecuted).toHaveLength(1);
    expect(result.followUpsExecuted[0].type).toBe('workspace_file');

    const filePath = path.join(WORKSPACE_GENERATED_DIR, 'meal-plan.md');
    createdFiles.push(filePath);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('Weekly Meal Plan');
  });
});
