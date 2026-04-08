import { NextResponse } from 'next/server';
import { readAmbition } from '@/lib/ambition';
import { generateReflection } from '@/lib/ambition-reflection';
import { logInfo, logError } from '@/lib/logger';

// GET /api/ambition — returns the current reflection text
export async function GET() {
  try {
    const reflection = readAmbition();
    return NextResponse.json({ reflection });
  } catch (err: any) {
    logError('ambition_read_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'AMBITION_READ_FAILED' },
      { status: 500 }
    );
  }
}

// POST /api/ambition — trigger reflection regeneration
export async function POST() {
  try {
    const reflection = await generateReflection();
    logInfo('ambition_reflection_requested', {});
    return NextResponse.json({ reflection, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    logError('ambition_reflection_failed', { error: err.message });
    return NextResponse.json(
      { error: err.message, code: 'AMBITION_REFLECTION_FAILED' },
      { status: 500 }
    );
  }
}
