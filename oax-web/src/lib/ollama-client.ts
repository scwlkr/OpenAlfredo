import { createOllama } from 'ai-sdk-ollama';
import { Ollama } from 'ollama';
import { Agent } from 'undici';

const OLLAMA_BASE_URL = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

// Ollama can take several minutes to start returning headers for large local
// models. The default undici headers timeout aborts those requests too early.
const ollamaDispatcher = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
});

const ollamaFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    dispatcher: ollamaDispatcher,
  } as RequestInit & { dispatcher: Agent });

export const ollamaClient = new Ollama({
  host: OLLAMA_BASE_URL,
  fetch: ollamaFetch,
});

export const ollamaProvider = createOllama({
  baseURL: OLLAMA_BASE_URL,
  client: ollamaClient,
  fetch: ollamaFetch,
});
