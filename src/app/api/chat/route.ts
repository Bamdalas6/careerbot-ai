import { NextRequest, NextResponse } from 'next/server';
import { processChatQuery } from '@/lib/ai-agent';
import { authenticateRequest } from '@/lib/auth';
import { deductUserCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', message: 'Authentication required. Please log in or create an account to search for jobs.' },
        { status: 401 }
      );
    }

    let remainingCredits: number | undefined = undefined;
    const { user } = auth;
    // Deduct 1 credit if available, but don't hard-crash the discovery if 0 credits
    if (user.credits > 0) {
      const deduction = await deductUserCredits(user.id, user.credits, 'CHAT_SEARCH', 'AI Job Search & Live Query');
      if (deduction.success) {
        remainingCredits = deduction.newCredits;
      }
    }

    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await processChatQuery(message, history || []);

    return NextResponse.json({
      success: true,
      data: response,
      remainingCredits,
    });
  } catch (error: unknown) {
    console.error('API Error in /api/chat:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to process chat query', message },
      { status: 500 }
    );
  }
}
