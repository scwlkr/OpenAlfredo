import { processChat } from '@/lib/dop-engine';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("PAYLOAD RECEIVED:", JSON.stringify(payload, null, 2));
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
      console.error("Missing requirements check failed. Message:", message, "SessionId:", sessionId);
      return NextResponse.json({ error: 'Missing requirements' }, { status: 400 });
    }

    return await processChat(sessionId, message, model);
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
