import fs from 'fs';
import path from 'path';
import { prisma } from './db';
import { logInfo, logError } from './logger';
import {
  WEB_ROOT,
  AGENTS_DIR,
  MEMORY_DIR,
  MEMORY_INDEX_FILE,
  TOPICS_DIR,
  THEMES_FILE,
} from './paths';

// `topic.sourcePath` in the index is stored as a oax-web-relative path
// (e.g. "data/memory/topics/foo.md") so keep ROOT_DIR = WEB_ROOT for join.
const ROOT_DIR = WEB_ROOT;

// Initialize directories
[AGENTS_DIR, MEMORY_DIR, TOPICS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(MEMORY_INDEX_FILE)) {
  fs.writeFileSync(MEMORY_INDEX_FILE, JSON.stringify({ version: "1.0", topics: [] }, null, 2));
}

export type MemorySlice = {
  source: 'soul' | 'topic' | 'transcript';
  content: string;
  metadata?: any;
};

export async function retrieveContext(sessionId: string, agentId: string, query: string): Promise<MemorySlice[]> {
  const slices: MemorySlice[] = [];
  
  try {
    // 1. Always load SOUL.md if it exists
    const soulPath = path.join(AGENTS_DIR, agentId, 'SOUL.md');
    if (fs.existsSync(soulPath)) {
      slices.push({
        source: 'soul',
        content: fs.readFileSync(soulPath, 'utf-8'),
        metadata: { path: soulPath }
      });
    }

    // 2. Transcripts from SQLite (layer 3)
    // Fetch last 10 messages for context, plus any context matching text (simplified search for MVP)
    const recentTranscripts = await prisma.transcriptEntry.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (recentTranscripts.length > 0) {
      slices.push({
        source: 'transcript',
        content: recentTranscripts.reverse().map(t => `${t.role}: ${t.content}`).join('\n'),
      });
    }

    // 3. Simple JSON Topic Keyword Matching
    const indexData = JSON.parse(fs.readFileSync(MEMORY_INDEX_FILE, 'utf-8'));
    const terms = query.toLowerCase().split(' ');
    
    if (indexData.topics) {
      for (const topic of indexData.topics) {
        if (terms.some(t => topic.tags?.includes(t) || topic.title.toLowerCase().includes(t))) {
            const topicPath = path.join(ROOT_DIR, topic.sourcePath);
            // Validate that resolved path stays inside ROOT_DIR (prevent path traversal)
            const resolved = path.resolve(topicPath);
            if (!resolved.startsWith(path.resolve(ROOT_DIR) + path.sep)) continue;
            if (fs.existsSync(topicPath)) {
               slices.push({
                 source: 'topic',
                 content: fs.readFileSync(topicPath, 'utf-8'),
                 metadata: { title: topic.title }
               });
            }
        }
      }
    }

    // 4. Active themes (from the continuity loop) — gives the agent
    //    awareness of user interests even in fresh sessions.
    try {
      if (fs.existsSync(THEMES_FILE)) {
        const themesData = JSON.parse(fs.readFileSync(THEMES_FILE, 'utf-8'));
        const active = (themesData.themes || [])
          .filter((t: any) => t.strength >= 0.3)
          .sort((a: any, b: any) => b.strength - a.strength)
          .slice(0, 5);
        if (active.length > 0) {
          slices.push({
            source: 'topic',
            content:
              'ACTIVE USER THEMES (from continuity loop):\n' +
              active.map((t: any) => `- ${t.tag} (strength: ${t.strength.toFixed(2)})`).join('\n'),
            metadata: { type: 'themes' },
          });
        }
      }
    } catch {}

    logInfo('context_retrieved', { sessionId, query, sliceCount: slices.length });
  } catch (err: any) {
    logError('context_retrieval_failed', { sessionId, error: err.message });
  }

  return slices;
}

export async function saveTopic(title: string, content: string, tags: string[]) {
  const safeFilename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
  const filePath = path.join(TOPICS_DIR, safeFilename);
  fs.writeFileSync(filePath, content);

  const indexData = JSON.parse(fs.readFileSync(MEMORY_INDEX_FILE, 'utf-8'));
  
  indexData.topics = indexData.topics || [];
  indexData.topics.push({
    title,
    summary: content.substring(0, 100),
    tags,
    sourcePath: `data/memory/topics/${safeFilename}`
  });

  fs.writeFileSync(MEMORY_INDEX_FILE, JSON.stringify(indexData, null, 2));
}
