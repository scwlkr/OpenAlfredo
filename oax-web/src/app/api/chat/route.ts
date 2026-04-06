import { processChat } from '@/lib/oax-engine';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { messages, sessionId, model } = payload;
    
    // In some versions of useChat with custom body, messages might not be inside an array or might have different shapes
    let message = '';
    if (messages && Array.isArray(messages)) {
      const lastMessage = messages[messages.length - 1];
      message = lastMessage?.content || lastMessage?.text || lastMessage?.parts?.find((p: any) => p.type === 'text')?.text;
    } else {
      // If the entire payload was just {text: ...} because we passed {text: input} to sendMessage
      message = payload.text || payload.content || messages;
    }

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Missing requirements', code: 'CHAT_MISSING_FIELDS' },
        { status: 400 }
      );
    }

    return await processChat(sessionId, message, model);
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'CHAT_FAILED' },
      { status: 500 }
    );
  }
}
