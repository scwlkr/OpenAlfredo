import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';

// GET /api/transcripts?q=<query>&sessionId=<id>&limit=<n>
// Searches full transcript history in SQLite using LIKE.
// Results are NOT loaded into active context — this endpoint only surfaces matches.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const sessionId = searchParams.get('sessionId') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 200);

    const where: any = {};
    if (q) where.content = { contains: q };
    if (sessionId) where.sessionId = sessionId;

    const results = await prisma.transcriptEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        sessionId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    logInfo('transcripts_searched', { q, sessionId, hits: results.length });
    return NextResponse.json({ results, count: results.length });
  } catch (err: any) {
    logError('transcripts_search_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'TRANSCRIPT_SEARCH_FAILED' },
      { status: 500 }
    );
  }
}
