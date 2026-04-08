import fs from 'fs';
import path from 'path';

import { NextResponse } from 'next/server';

import { AGENTS_DIR } from '@/lib/paths';

function sanitizeAgentId(agentId: string): string {
  return agentId.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function POST(request: Request) {
  try {
    const { agentId, persona, goals, style } = await request.json();
    if (!agentId || !persona || !goals) {
      return NextResponse.json(
        { error: 'Missing fields', code: 'ONBOARDING_MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const safeAgentId = sanitizeAgentId(agentId);
    if (!safeAgentId || safeAgentId !== agentId) {
      return NextResponse.json(
        {
          error: 'Invalid agentId — only alphanumeric, dash, and underscore allowed',
          code: 'ONBOARDING_INVALID_AGENT_ID',
        },
        { status: 400 }
      );
    }

    const agentDir = path.join(AGENTS_DIR, safeAgentId);
    fs.mkdirSync(agentDir, { recursive: true });

    const soulContent = `# SOUL of ${agentId}

## Persona
${persona}

## Goals
${goals}

## Style
${style || 'Helpful and concise'}
`;

    fs.writeFileSync(path.join(agentDir, 'SOUL.md'), soulContent);
    return NextResponse.json({ success: true, agentId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, code: 'ONBOARDING_FAILED' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ exists: false });

  const safeAgentId = sanitizeAgentId(agentId);
  if (!safeAgentId || safeAgentId !== agentId) {
    return NextResponse.json({ exists: false });
  }

  const soulPath = path.join(AGENTS_DIR, safeAgentId, 'SOUL.md');
  return NextResponse.json({ exists: fs.existsSync(soulPath) });
}
