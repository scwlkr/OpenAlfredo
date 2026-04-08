import { describe, expect, it } from 'vitest';

import {
  buildChatFailurePayload,
  chatFailureStatus,
  parseChatFailurePayload,
  summarizeChatFailure,
} from '../chat-failure';

describe('chat failure classification', () => {
  it('classifies an unreachable Ollama daemon', () => {
    const payload = buildChatFailurePayload(
      new Error('connect ECONNREFUSED 127.0.0.1:11434'),
      'llama3'
    );

    expect(payload.code).toBe('CHAT_OLLAMA_UNREACHABLE');
    expect(payload.error).toContain('could not reach');
    expect(chatFailureStatus(payload.code)).toBe(503);
  });

  it('classifies a missing model before generic Ollama transport errors', () => {
    const payload = buildChatFailurePayload(
      new Error('Ollama request failed: model "mistral" not found, try pulling it first'),
      'mistral'
    );

    expect(payload.code).toBe('CHAT_MODEL_UNAVAILABLE');
    expect(payload.error).toContain('Model "mistral"');
    expect(payload.hint).toContain('ollama pull mistral');
    expect(chatFailureStatus(payload.code)).toBe(404);
  });

  it('parses structured server payloads from the chat transport error message', () => {
    const parsed = parseChatFailurePayload(
      JSON.stringify({
        code: 'CHAT_MODEL_FAILED',
        error: 'Model "llama3" failed before it could start responding.',
        hint: 'Check Runtime Logs for the exact failure, then retry once the model is healthy.',
        detail: '500 from provider',
        model: 'llama3',
      })
    );

    expect(parsed).toEqual({
      code: 'CHAT_MODEL_FAILED',
      error: 'Model "llama3" failed before it could start responding.',
      hint: 'Check Runtime Logs for the exact failure, then retry once the model is healthy.',
      detail: '500 from provider',
      model: 'llama3',
    });
  });

  it('summarizes structured errors into UI copy', () => {
    const summary = summarizeChatFailure(
      new Error(
        JSON.stringify({
          code: 'CHAT_MODEL_UNAVAILABLE',
          error: 'Model "phi3" is not installed in Ollama.',
          hint: 'Run `ollama pull phi3` or switch models in the sidebar, then retry.',
          detail: 'model "phi3" not found',
          model: 'phi3',
        })
      ),
      'phi3'
    );

    expect(summary).toEqual({
      code: 'CHAT_MODEL_UNAVAILABLE',
      title: 'That model is not installed.',
      detail: 'Model "phi3" is not installed in Ollama.',
      hint: 'Run `ollama pull phi3` or switch models in the sidebar, then retry.',
      technicalDetail: 'model "phi3" not found',
    });
  });
});
