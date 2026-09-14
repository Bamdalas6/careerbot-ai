import { NextRequest, NextResponse } from 'next/server';
import { parseResumeText } from '@/lib/ai-agent';
import { generateAhaMoment } from '@/lib/cv-review';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, targetRole } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 });
    }

    const profile = parseResumeText(text);
    const ahaMoment = generateAhaMoment(text, profile, typeof targetRole === 'string' ? targetRole : undefined);

    return NextResponse.json({
      success: true,
      profile,
      ahaMoment,
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
