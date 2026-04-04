import { prisma } from './db';
import { retrieveContext } from './memory-retrieval';
import { streamText, generateText } from 'ai';
import { createOllama } from 'ai-sdk-ollama';
const ollama = createOllama();

export async function processChat(sessionId: string, userMessage: string, model: string = 'llama3') {
  // Get or create agent session
  let session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    session = await prisma.chatSession.create({
      data: { id: sessionId, agentId: 'default', model }
    });
  }

  // Save user message to transcript
  await prisma.transcriptEntry.create({
    data: {
      sessionId,
      role: 'user',
      content: userMessage
    }
  });

  const context = await retrieveContext(sessionId, session.agentId, userMessage);
  
  const systemPrompt = `You are a personalized assistant.
CONTEXT:
${context.map((c, i) => `--- [Source: ${c.source}] ---\n${c.content}\n--------------------`).join('\n\n')}

INSTRUCTIONS:
Respond to the user naturally based on your SOUL profile and retrieved context.`;

  // Start streaming response
  const stream = await streamText({
    model: ollama(model) as any,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    onFinish: async ({ text }) => {
       await prisma.transcriptEntry.create({
         data: {
           sessionId,
           role: 'assistant',
           content: text
         }
       });
    }
  });

  return stream.toTextStreamResponse();
}

export async function createSession(agentId: string, model: string) {
  return await prisma.chatSession.create({
    data: { agentId, model }
  });
}
