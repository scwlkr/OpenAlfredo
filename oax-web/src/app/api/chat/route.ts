import { NextResponse } from 'next/server';

import { buildChatFailurePayload, chatFailureStatus } from '@/lib/chat-failure';
import { logError } from '@/lib/logger';
import { processChat } from '@/lib/oax-engine';

function extractMessage(payload: any): string {
  if (payload?.messages && Array.isArray(payload.messages)) {
    const lastMessage = payload.messages[payload.messages.length - 1];
    return (
      lastMessage?.content ||
      lastMessage?.text ||
      lastMessage?.parts?.find((part: any) => part.type === 'text')?.text ||
      ''
    );
  }

  return payload?.text || payload?.content || payload?.messages || '';
}

export async function POST(request: Request) {
  let model: string | undefined;

  try {
    const payload = await request.json();
    const sessionId = payload?.sessionId;
    model = payload?.model;
    const message = extractMessage(payload);

    if (!message || !sessionId) {
      return NextResponse.json(
        {
          code: 'CHAT_MISSING_FIELDS',
          error: 'The chat request is missing a session id or message.',
          hint: 'Retry after the page finishes loading, or start a new chat session.',
        },
        { status: 400 }
      );
    }

    return await processChat(sessionId, message, model);
  } catch (error) {
    const failure = buildChatFailurePayload(error, model);
    logError('chat_api_failed', failure);
    return NextResponse.json(failure, { status: chatFailureStatus(failure.code) });
  }
}
