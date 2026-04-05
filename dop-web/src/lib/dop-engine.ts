import { prisma } from './db';
import { retrieveContext, MemorySlice } from './memory-retrieval';
import { appendTask, parseTasksFromReply, stripTaskMarkers } from './ambition';
import { parseFileSaves, saveWorkspaceFile, stripFileSaveMarkers } from './workspace';
import { logInfo } from './logger';
import { streamText, generateText } from 'ai';
import { createOllama } from 'ai-sdk-ollama';
const ollama = createOllama();

// Ensure a ChatSession row exists for sessionId. Returns the session.
async function ensureSession(sessionId: string, agentId: string, model: string) {
  let session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    session = await prisma.chatSession.create({
      data: { id: sessionId, agentId, model },
    });
  }
  return session;
}

function buildSystemPrompt(context: MemorySlice[]): string {
  return `You are a personalized assistant.
CONTEXT:
${context.map((c) => `--- [Source: ${c.source}] ---\n${c.content}\n--------------------`).join('\n\n')}

INSTRUCTIONS:
Respond to the user naturally based on your SOUL profile and retrieved context.
If the user asks you to remind them of something, add a task, or schedule something,
include a marker in your reply of the form [[TASK: <task text>]] — optionally with
|when:<ISO 8601 UTC datetime> or |recur:<spec> appended. Example:
[[TASK: remind me to book a reservation |when:2026-04-10T15:00:00Z]]
The marker is stripped from the visible reply and appended to AMBITION.md automatically.

If the user asks you to save a file, write a note, or draft a document to their
workspace, wrap the file content like this:
[[SAVE_FILE: business-plan.md]]
# Business Plan
...contents...
[[/SAVE_FILE]]
The block is stripped from the visible reply; the file is saved under data/workspace/.

Current Time: ${new Date().toISOString()}`;
}

// Strip marker blocks from an assistant reply and side-effect their contents
// (append tasks to AMBITION.md, save workspace files). Returns the cleaned text.
function handleMarkers(sessionId: string, text: string): string {
  const tasks = parseTasksFromReply(text);
  for (const t of tasks) {
    try {
      appendTask(t);
      logInfo('task_appended', { sessionId, task: t });
    } catch (e: any) {
      logInfo('task_append_failed', { sessionId, task: t, error: e?.message });
    }
  }
  const files = parseFileSaves(text);
  for (const f of files) {
    try {
      const fullPath = saveWorkspaceFile(f);
      logInfo('workspace_file_saved', { sessionId, name: f.name, path: fullPath });
    } catch (e: any) {
      logInfo('workspace_file_save_failed', { sessionId, name: f.name, error: e?.message });
    }
  }
  let cleaned = tasks.length ? stripTaskMarkers(text) : text;
  if (files.length) cleaned = stripFileSaveMarkers(cleaned);
  return cleaned;
}

// Streaming chat turn — used by the web UI via /api/chat.
export async function processChat(sessionId: string, userMessage: string, model: string = process.env.DOP_MODEL || 'llama3') {
  const session = await ensureSession(sessionId, 'default', model);

  await prisma.transcriptEntry.create({
    data: { sessionId, role: 'user', content: userMessage },
  });

  const context = await retrieveContext(sessionId, session.agentId, userMessage);
  const systemPrompt = buildSystemPrompt(context);

  const stream = await streamText({
    model: ollama(model) as any,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    onFinish: async ({ text }) => {
      const cleaned = handleMarkers(sessionId, text);
      await prisma.transcriptEntry.create({
        data: { sessionId, role: 'assistant', content: cleaned },
      });
    },
  });

  return stream.toUIMessageStreamResponse();
}

// Non-streaming chat turn — used by the Telegram daemon. Same memory retrieval,
// same system prompt, same SQLite transcripts, same [[TASK]] / [[SAVE_FILE]]
// marker handling as the web path — just returns a plain string instead of a
// stream.
export async function processChatSync(
  sessionId: string,
  userMessage: string,
  agentId: string = 'default',
  model: string = process.env.DOP_MODEL || 'llama3'
): Promise<string> {
  const session = await ensureSession(sessionId, agentId, model);

  await prisma.transcriptEntry.create({
    data: { sessionId, role: 'user', content: userMessage },
  });

  const context = await retrieveContext(sessionId, session.agentId, userMessage);
  const systemPrompt = buildSystemPrompt(context);

  const { text } = await generateText({
    model: ollama(model) as any,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const cleaned = handleMarkers(sessionId, text);
  await prisma.transcriptEntry.create({
    data: { sessionId, role: 'assistant', content: cleaned },
  });

  return cleaned;
}

export async function createSession(agentId: string, model: string) {
  return await prisma.chatSession.create({ data: { agentId, model } });
}
