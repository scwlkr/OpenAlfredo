import { describe, it, expect, vi } from 'vitest';

vi.mock('ollama', () => ({
  default: {
    list: vi.fn().mockResolvedValue({
      models: [{ name: 'llama3' }, { name: 'mistral' }, { name: 'phi3' }],
    }),
  },
}));

import { GET } from '../../app/api/models/route';

describe('F4: /api/models returns installed ollama models', () => {
  it('returns list of model names from ollama.list()', async () => {
    const res = await GET();
    const json = await res.json();
    expect(Array.isArray(json.models)).toBe(true);
    const names = json.models.map((m: any) => m.name);
    expect(names).toContain('llama3');
    expect(names).toContain('mistral');
    expect(names).toContain('phi3');
  });
});
