import { NextRequest, NextResponse } from 'next/server';
import { processChatQuery } from '@/lib/ai-agent';
import { authenticateRequest } from '@/lib/auth';
import { deductUserCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Please sign up or sign in to search live jobs.',
        },
        { status: 401 }
      );
    }

    const { user } = auth;

    // Deduct 1 credit for search query - users with 0 coins must purchase coins before searching
    const deduction = await deductUserCredits(user.id, user.credits, 'CHAT_SEARCH', 'AI Job Search & Live Query');
    if (!deduction.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: deduction.error || 'You have 0 coins left. Please purchase coins to search and discover matching jobs.',
          remainingCredits: deduction.newCredits,
        },
        { status: 402 }
      );
    }
    const remainingCredits = deduction.newCredits;

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
