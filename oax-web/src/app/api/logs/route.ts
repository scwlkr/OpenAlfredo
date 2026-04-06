import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(process.cwd(), 'data', 'logs', `oax-${today}.jsonl`);
    if (!fs.existsSync(logPath)) return NextResponse.json({ logs: [] });
    
    const content = fs.readFileSync(logPath, 'utf-8');
    const logs = content.split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean);
    
    return NextResponse.json({ logs: logs.reverse() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
