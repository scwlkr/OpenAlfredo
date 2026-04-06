// Bootstrap endpoint: returns the API key to the local web UI.
// This is only accessible from localhost (Next.js bound to 127.0.0.1)
// and is exempted from the auth middleware.
import { NextResponse } from 'next/server';
import { getApiKey } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({ key: getApiKey() });
}
