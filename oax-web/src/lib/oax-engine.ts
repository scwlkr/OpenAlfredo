import { prisma } from './db';
import { retrieveContext, MemorySlice } from './memory-retrieval';
import { appendTask, parseTasksFromReply, stripTaskMarkers } from './tasks';
import {
  parseFileSaves,
  saveWorkspaceFile,
  stripFileSaveMarkers,
  parseStickyMarkers,
  saveSticky,
  stripStickyMarkers,
} from './workspace';
import {
  buildCodeIndex,
  parseSelfEdits,
  applySelfEdit,
  stripSelfEditMarkers,
  SelfEditResult,
} from './self-edit';
import { triggerPodRestart, wantsRestart, stripRestartMarker } from './restart';
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
  const codeIndex = buildCodeIndex();
  return `You are a personalized assistant that can modify your own code.
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
The block is stripped from the visible reply; the file is saved under data/workspace/generated/.

If you want to leave a quick note on the user's desk (like a sticky note or idea),
wrap it like this:
[[STICKY: workout ideas]]
- Try adding a morning run
- Look into yoga classes
[[/STICKY]]
The sticky note is saved to the desk area of the workspace.

SELF-MODIFICATION:
You can read and edit your own source code. Paths are relative to the repo root.
To inspect a file before editing, emit:
[[READ_FILE: oax-web/daemon.ts]]
The file contents will be fed back to you and you can respond again with an edit.

To make a surgical edit, emit:
[[EDIT_FILE: oax-web/.env]]
<old>HEARTBEAT_CRON="0 * * * *"</old>
<new>HEARTBEAT_CRON="*/30 * * * *"</new>
[[/EDIT_FILE]]
The old string must match exactly once in the file. Prefer this over WRITE_FILE.

To overwrite a whole file, emit:
[[WRITE_FILE: oax-web/src/lib/foo.ts]]
...new file contents...
[[/WRITE_FILE]]

Paths under .git, node_modules, .next, data/, or database files are blocked.

Changes take effect only after the pod restarts. If your edits need to be
active immediately (changing cron schedules, timers, daemon behavior, new
commands, etc.), emit [[RESTART_POD]] on its own line AFTER your edit
markers. The pod will self-restart (~15-30s downtime) and the user will see
a notification. Only include [[RESTART_POD]] when a restart is actually
needed — cosmetic edits, doc changes, or workspace files do NOT require it.

After editing, tell the user plainly what you changed and whether a
restart is being triggered.

REPO INDEX (paths you can read or edit):
${codeIndex}

Current Time: ${new Date().toISOString()}`;
}

// Strip marker blocks from an assistant reply and side-effect their contents
// (append tasks to AMBITION.md, save workspace files, apply self-edits).
// Returns the cleaned text + a human summary of any self-edits applied.
function handleMarkers(
  sessionId: string,
  text: string
): { cleaned: string; editSummary: string } {
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
      const fullPath = saveWorkspaceFile(f, 'generated');
      logInfo('workspace_file_saved', { sessionId, name: f.name, path: fullPath });
    } catch (e: any) {
      logInfo('workspace_file_save_failed', { sessionId, name: f.name, error: e?.message });
    }
  }
  const stickies = parseStickyMarkers(text);
  for (const s of stickies) {
    try {
      const fullPath = saveSticky(s.title, s.content);
      logInfo('sticky_saved', { sessionId, title: s.title, path: fullPath });
    } catch (e: any) {
      logInfo('sticky_save_failed', { sessionId, title: s.title, error: e?.message });
    }
  }

  // Self-edits: skip READ (those are handled as a reflex loop before we get
  // here), apply EDIT and WRITE.
  const mutating = parseSelfEdits(text).filter((e) => e.kind !== 'read');
  const results: SelfEditResult[] = [];
  for (const edit of mutating) {
    const r = applySelfEdit(edit);
    results.push(r);
    logInfo(r.ok ? 'self_edit_applied' : 'self_edit_failed', {
      sessionId,
      kind: edit.kind,
      path: edit.path,
      message: r.message,
    });
  }

  let cleaned = tasks.length ? stripTaskMarkers(text) : text;
  if (files.length) cleaned = stripFileSaveMarkers(cleaned);
  if (stickies.length) cleaned = stripStickyMarkers(cleaned);
  if (mutating.length || /\[\[READ_FILE:/.test(cleaned)) cleaned = stripSelfEditMarkers(cleaned);

  // Restart: only honored if the agent also applied at least one successful
  // edit this turn — prevents accidental restart loops.
  const restartRequested = wantsRestart(cleaned);
  if (restartRequested) cleaned = stripRestartMarker(cleaned);
  const anyEditOk = results.some((r) => r.ok);
  const willRestart = restartRequested && anyEditOk;

  if (willRestart) {
    logInfo('pod_restart_triggered', { sessionId, editCount: results.length });
    triggerPodRestart();
  } else if (restartRequested && !anyEditOk) {
    logInfo('pod_restart_skipped_no_edits', { sessionId });
  }

  const editSummary =
    results.length === 0
      ? ''
      : '\n\n---\n**Self-edits applied:**\n' +
        results.map((r) => `- ${r.ok ? '✅' : '❌'} ${r.message}`).join('\n') +
        (willRestart
          ? '\n\n🔄 _Pod restart triggered — expect ~15-30s of downtime. Check `oax-web/data/logs/respawn.log` if it doesn\'t come back._'
          : anyEditOk
            ? '\n\n_Restart with `oax pod stop && oax pod` to load changes._'
            : '');

  return { cleaned: cleaned + editSummary, editSummary };
}

// If the model emitted READ_FILE markers, satisfy them in-process and return
// a follow-up user message that feeds the file contents back. Capped at a
// small number of reads per turn.
function resolveReadMarkers(text: string): string | null {
  const reads = parseSelfEdits(text).filter((e) => e.kind === 'read');
  if (reads.length === 0) return null;
  const MAX = 4;
  const chunks: string[] = [];
  for (const r of reads.slice(0, MAX)) {
    const res = applySelfEdit(r);
    if (r.kind !== 'read') continue;
    if (res.ok && res.content !== undefined) {
      chunks.push(`--- ${r.path} ---\n${res.content}`);
    } else {
      chunks.push(`--- ${r.path} (ERROR) ---\n${res.message}`);
    }
  }
  return (
    'Here are the files you asked to read. Now produce your final answer — ' +
    'use [[EDIT_FILE]] or [[WRITE_FILE]] if changes are needed, and explain what you changed:\n\n' +
    chunks.join('\n\n')
  );
}

// Streaming chat turn — used by the web UI via /api/chat. Streams the first
// response directly. If the model asks to READ_FILE, the user sees the read
// request and can re-prompt ("yes, go ahead") — the next turn will have the
// file contents appended via the reflex logic on the assistant's prior
// message. (The telegram path runs the reflex automatically; the web path
// keeps streaming responsive.)
export async function processChat(sessionId: string, userMessage: string, model: string = process.env.OAX_MODEL || 'llama3') {
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
      const { cleaned } = handleMarkers(sessionId, text);
      await prisma.transcriptEntry.create({
        data: { sessionId, role: 'assistant', content: cleaned },
      });
    },
  });

  return stream.toUIMessageStreamResponse();
}

// Non-streaming chat turn — used by the Telegram daemon. Same memory retrieval,
// same system prompt, same SQLite transcripts, same [[TASK]] / [[SAVE_FILE]] /
// [[EDIT_FILE]] / [[WRITE_FILE]] marker handling as the web path — just
// returns a plain string instead of a stream.
export async function processChatSync(
  sessionId: string,
  userMessage: string,
  agentId: string = 'default',
  model: string = process.env.OAX_MODEL || 'llama3'
): Promise<string> {
  const session = await ensureSession(sessionId, agentId, model);

  await prisma.transcriptEntry.create({
    data: { sessionId, role: 'user', content: userMessage },
  });

  const context = await retrieveContext(sessionId, session.agentId, userMessage);
  const systemPrompt = buildSystemPrompt(context);

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  let result = await generateText({ model: ollama(model) as any, messages });

  // One-round READ reflex: if the model asked to read files, feed them back
  // and generate the real answer.
  const readFollowup = resolveReadMarkers(result.text);
  if (readFollowup) {
    messages.push({ role: 'assistant', content: result.text });
    messages.push({ role: 'user', content: readFollowup });
    result = await generateText({ model: ollama(model) as any, messages });
  }

  const { cleaned } = handleMarkers(sessionId, result.text);
  await prisma.transcriptEntry.create({
    data: { sessionId, role: 'assistant', content: cleaned },
  });

  return cleaned;
}

export async function createSession(agentId: string, model: string) {
  return await prisma.chatSession.create({ data: { agentId, model } });
}
