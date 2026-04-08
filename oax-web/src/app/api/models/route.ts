import { NextResponse } from 'next/server';
import { ollamaClient } from '@/lib/ollama-client';

export async function GET() {
  try {
    const list = await ollamaClient.list();
    return NextResponse.json({ models: list.models });
  } catch (error) {
    console.error('Error fetching ollama models:', error);
    return NextResponse.json({ models: [] }, { status: 500 });
  }
}
