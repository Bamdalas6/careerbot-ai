import { NextRequest, NextResponse } from 'next/server';
import { parseResumeText } from '@/lib/ai-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const profile = parseResumeText(text);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: unknown) {
    console.error('API Error in /api/resume:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to parse resume', message },
      { status: 500 }
    );
  }
}
