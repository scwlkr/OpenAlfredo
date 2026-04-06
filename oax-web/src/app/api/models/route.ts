import { NextResponse } from 'next/server';
import ollama from 'ollama';

export async function GET() {
  try {
    const list = await ollama.list();
    return NextResponse.json({ models: list.models });
  } catch (error) {
    console.error('Error fetching ollama models:', error);
    return NextResponse.json({ models: [] }, { status: 500 });
  }
}
