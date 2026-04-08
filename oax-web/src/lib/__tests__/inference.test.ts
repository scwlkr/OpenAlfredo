import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import {
  readThemes,
  writeThemes,
  mergeThemes,
  extractThemes,
  inferFollowUps,
  buildThemeExtractionPrompt,
  buildFollowUpPrompt,
  Theme,
  ThemesData,
} from '../inference';
import { THEMES_FILE } from '../paths';

// Mock Prisma for extractThemes
vi.mock('../db', () => ({
  prisma: {
    transcriptEntry: {
      findMany: vi.fn().mockResolvedValue([
        { role: 'user', content: 'I want to start working out more' },
        { role: 'assistant', content: 'Great! Let me help with a fitness plan.' },
        { role: 'user', content: 'Also thinking about meal prep and cooking' },
        { role: 'assistant', content: 'Meal prep is a great complement to fitness.' },
      ]),
    },
  },
}));

// Save/restore themes.json
let originalThemes: string | null = null;
afterEach(() => {
  if (originalThemes !== null) {
    fs.writeFileSync(THEMES_FILE, originalThemes);
  } else if (fs.existsSync(THEMES_FILE)) {
    fs.unlinkSync(THEMES_FILE);
  }
});

describe('Theme persistence', () => {
  it('readThemes returns empty array when file missing', () => {
    originalThemes = fs.existsSync(THEMES_FILE)
      ? fs.readFileSync(THEMES_FILE, 'utf-8')
      : null;
    if (fs.existsSync(THEMES_FILE)) fs.unlinkSync(THEMES_FILE);

    const data = readThemes();
    expect(data.themes).toEqual([]);
  });

  it('writeThemes + readThemes roundtrips', () => {
    originalThemes = fs.existsSync(THEMES_FILE)
      ? fs.readFileSync(THEMES_FILE, 'utf-8')
      : null;

    const data: ThemesData = {
      themes: [
        { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: '2026-04-07', strength: 0.8 },
      ],
    };
    writeThemes(data);
    const read = readThemes();
    expect(read.themes).toHaveLength(1);
    expect(read.themes[0].tag).toBe('fitness');
    expect(read.themes[0].strength).toBe(0.8);
  });
});

describe('mergeThemes', () => {
  it('boosts strength for re-engaged themes', () => {
    const existing: ThemesData = {
      themes: [
        { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: '2026-04-05', strength: 0.5 },
      ],
    };
    const result = mergeThemes(existing, ['fitness']);
    expect(result.themes[0].strength).toBe(0.65); // 0.5 + 0.15
  });

  it('decays themes not in new tags', () => {
    const existing: ThemesData = {
      themes: [
        { tag: 'cooking', firstSeen: '2026-04-01', lastEngaged: '2026-04-01', strength: 0.5 },
      ],
    };
    const result = mergeThemes(existing, ['fitness']);
    const cooking = result.themes.find((t) => t.tag === 'cooking');
    expect(cooking!.strength).toBe(0.45); // 0.5 - 0.05
  });

  it('adds brand-new themes at strength 0.6', () => {
    const existing: ThemesData = { themes: [] };
    const result = mergeThemes(existing, ['fitness', 'cooking']);
    expect(result.themes).toHaveLength(2);
    expect(result.themes.every((t) => t.strength === 0.6)).toBe(true);
  });

  it('caps strength at 1.0', () => {
    const existing: ThemesData = {
      themes: [
        { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: '2026-04-05', strength: 0.95 },
      ],
    };
    const result = mergeThemes(existing, ['fitness']);
    expect(result.themes[0].strength).toBe(1.0);
  });

  it('decays to minimum 0', () => {
    const existing: ThemesData = {
      themes: [
        { tag: 'old', firstSeen: '2026-03-01', lastEngaged: '2026-03-01', strength: 0.02 },
      ],
    };
    const result = mergeThemes(existing, []);
    expect(result.themes[0].strength).toBe(0);
  });
});

describe('extractThemes', () => {
  it('extracts themes from LLM JSON response', async () => {
    const mockGenerate = async () => '["fitness", "cooking", "meal prep"]';
    const themes = await extractThemes(mockGenerate);
    expect(themes).toEqual(['fitness', 'cooking', 'meal prep']);
  });

  it('handles markdown-fenced JSON response', async () => {
    const mockGenerate = async () => '```json\n["fitness", "reading"]\n```';
    const themes = await extractThemes(mockGenerate);
    expect(themes).toEqual(['fitness', 'reading']);
  });

  it('returns empty array on parse failure', async () => {
    const mockGenerate = async () => 'I think the themes are fitness and cooking.';
    const themes = await extractThemes(mockGenerate);
    expect(themes).toEqual([]);
  });

  it('caps at 7 themes', async () => {
    const mockGenerate = async () =>
      '["a","b","c","d","e","f","g","h","i","j"]';
    const themes = await extractThemes(mockGenerate);
    expect(themes).toHaveLength(7);
  });
});

describe('inferFollowUps', () => {
  const activeThemes: Theme[] = [
    { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: '2026-04-07', strength: 0.8 },
  ];

  it('infers follow-ups from LLM JSON response', async () => {
    const mockGenerate = async () =>
      '[{"type":"task","content":"Review workout progress","title":null,"theme":"fitness","confidence":0.8}]';
    const followUps = await inferFollowUps(activeThemes, mockGenerate);
    expect(followUps).toHaveLength(1);
    expect(followUps[0].type).toBe('task');
    expect(followUps[0].content).toBe('Review workout progress');
    expect(followUps[0].theme).toBe('fitness');
  });

  it('returns empty for no active themes', async () => {
    const weakThemes: Theme[] = [
      { tag: 'old', firstSeen: '2026-03-01', lastEngaged: '2026-03-01', strength: 0.1 },
    ];
    const followUps = await inferFollowUps(weakThemes);
    expect(followUps).toEqual([]);
  });

  it('handles parse failure gracefully', async () => {
    const mockGenerate = async () => 'Here are some suggestions for you...';
    const followUps = await inferFollowUps(activeThemes, mockGenerate);
    expect(followUps).toEqual([]);
  });

  it('filters invalid follow-up types', async () => {
    const mockGenerate = async () =>
      '[{"type":"invalid","content":"bad"},{"type":"task","content":"good","theme":"fitness","confidence":0.9}]';
    const followUps = await inferFollowUps(activeThemes, mockGenerate);
    expect(followUps).toHaveLength(1);
    expect(followUps[0].type).toBe('task');
  });
});

describe('Prompt construction', () => {
  it('buildThemeExtractionPrompt includes transcripts', () => {
    const prompt = buildThemeExtractionPrompt(['[user] I love running']);
    expect(prompt).toContain('I love running');
    expect(prompt).toContain('JSON array');
  });

  it('buildFollowUpPrompt includes active themes', () => {
    const themes: Theme[] = [
      { tag: 'fitness', firstSeen: '2026-04-01', lastEngaged: '2026-04-07', strength: 0.8 },
    ];
    const prompt = buildFollowUpPrompt(themes, 'I am Alfredo');
    expect(prompt).toContain('fitness');
    expect(prompt).toContain('0.80');
    expect(prompt).toContain('Alfredo');
  });

  it('buildFollowUpPrompt filters weak themes', () => {
    const themes: Theme[] = [
      { tag: 'strong', firstSeen: '2026-04-01', lastEngaged: '2026-04-07', strength: 0.8 },
      { tag: 'weak', firstSeen: '2026-03-01', lastEngaged: '2026-03-01', strength: 0.1 },
    ];
    const prompt = buildFollowUpPrompt(themes, '');
    expect(prompt).toContain('strong');
    expect(prompt).not.toContain('"weak"');
  });
});
