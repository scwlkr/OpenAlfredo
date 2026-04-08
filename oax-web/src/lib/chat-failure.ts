export type ChatFailureCode =
  | 'CHAT_MISSING_FIELDS'
  | 'CHAT_OLLAMA_UNREACHABLE'
  | 'CHAT_MODEL_UNAVAILABLE'
  | 'CHAT_MODEL_FAILED';

export interface ChatFailurePayload {
  code: ChatFailureCode;
  error: string;
  hint: string;
  detail?: string;
  model?: string;
}

export interface ChatFailureSummary {
  code: ChatFailureCode;
  title: string;
  detail: string;
  hint: string;
  technicalDetail?: string;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'Unknown model failure.';
}

function containsAny(input: string, patterns: string[]): boolean {
  return patterns.some((pattern) => input.includes(pattern));
}

function isChatFailurePayload(value: unknown): value is ChatFailurePayload {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ChatFailurePayload).code === 'string' &&
    typeof (value as ChatFailurePayload).error === 'string' &&
    typeof (value as ChatFailurePayload).hint === 'string'
  );
}

export function parseChatFailurePayload(value: unknown): ChatFailurePayload | null {
  if (isChatFailurePayload(value)) return value;

  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    return isChatFailurePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function buildChatFailurePayload(error: unknown, model?: string): ChatFailurePayload {
  const detail = normalizeErrorMessage(error);
  const normalized = detail.toLowerCase();
  const isModelUnavailable =
    (normalized.includes('model') && normalized.includes('not found')) ||
    containsAny(normalized, [
      'unknown model',
      'pull it first',
      'not found, try pulling it first',
    ]);

  if (isModelUnavailable) {
    const modelName = model ? `Model "${model}"` : 'The selected model';
    const modelHint = model
      ? `Run \`ollama pull ${model}\` or switch models in the sidebar, then retry.`
      : 'Pull the missing model in Ollama or switch models in the sidebar, then retry.';

    return {
      code: 'CHAT_MODEL_UNAVAILABLE',
      error: `${modelName} is not installed in Ollama.`,
      hint: modelHint,
      detail,
      model,
    };
  }

  if (
    containsAny(normalized, [
      'econnrefused',
      'fetch failed',
      'failed to fetch',
      'socket hang up',
      '127.0.0.1:11434',
      'localhost:11434',
    ])
  ) {
    return {
      code: 'CHAT_OLLAMA_UNREACHABLE',
      error: 'OpenAlfredo could not reach your local Ollama service.',
      hint: 'Start Ollama or restart the pod, then retry the last prompt.',
      detail,
      model,
    };
  }

  return {
    code: 'CHAT_MODEL_FAILED',
    error: model
      ? `Model "${model}" failed before it could start responding.`
      : 'The selected model failed before it could start responding.',
    hint: 'Check Runtime Logs for the exact failure, then retry once the model is healthy.',
    detail,
    model,
  };
}

export function chatFailureStatus(code: ChatFailureCode): number {
  switch (code) {
    case 'CHAT_MISSING_FIELDS':
      return 400;
    case 'CHAT_MODEL_UNAVAILABLE':
      return 404;
    case 'CHAT_OLLAMA_UNREACHABLE':
      return 503;
    case 'CHAT_MODEL_FAILED':
    default:
      return 500;
  }
}

export function summarizeChatFailure(
  error: Error | undefined,
  model?: string
): ChatFailureSummary | null {
  if (!error) return null;

  const payload = parseChatFailurePayload(error.message) ?? buildChatFailurePayload(error, model);

  switch (payload.code) {
    case 'CHAT_MISSING_FIELDS':
      return {
        code: payload.code,
        title: 'The chat request is incomplete.',
        detail: payload.error,
        hint: payload.hint,
        technicalDetail: payload.detail,
      };
    case 'CHAT_OLLAMA_UNREACHABLE':
      return {
        code: payload.code,
        title: 'Ollama is unavailable.',
        detail: payload.error,
        hint: payload.hint,
        technicalDetail: payload.detail,
      };
    case 'CHAT_MODEL_UNAVAILABLE':
      return {
        code: payload.code,
        title: 'That model is not installed.',
        detail: payload.error,
        hint: payload.hint,
        technicalDetail: payload.detail,
      };
    case 'CHAT_MODEL_FAILED':
    default:
      return {
        code: payload.code,
        title: model ? `Could not start ${model}.` : 'Could not start the selected model.',
        detail: payload.error,
        hint: payload.hint,
        technicalDetail: payload.detail,
      };
  }
}
