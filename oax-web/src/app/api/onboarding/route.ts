import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { agentId, persona, goals, style } = await request.json();
    if (!agentId || !persona || !goals) {
      return NextResponse.json(
        { error: 'Missing fields', code: 'ONBOARDING_MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Sanitize agentId to prevent path traversal
    const safeAgentId = agentId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeAgentId || safeAgentId !== agentId) {
      return NextResponse.json(
        { error: 'Invalid agentId — only alphanumeric, dash, and underscore allowed', code: 'ONBOARDING_INVALID_AGENT_ID' },
        { status: 400 }
      );
    }

    const agentDir = path.join(process.cwd(), 'data', 'agents', safeAgentId);
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, code: 'ONBOARDING_FAILED' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ exists: false });

  // Sanitize agentId to prevent path traversal
  const safeAgentId = agentId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeAgentId || safeAgentId !== agentId) {
    return NextResponse.json({ exists: false });
  }

  const agentDir = path.join(process.cwd(), 'data', 'agents', safeAgentId);
  const exists = fs.existsSync(path.join(agentDir, 'SOUL.md'));
  return NextResponse.json({ exists });
}
