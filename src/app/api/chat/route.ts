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
          error: 'AUTH_REQUIRED',
          message: 'Please sign in or create a free account to access live AI career searches and match roles.',
        },
        { status: 401 }
      );
    }

    const { user } = auth;

    // Check & Deduct 1 credit for search
    const deduction = await deductUserCredits(user.id, user.credits, 'CHAT_SEARCH', 'AI Job Search & Live Query');
    if (!deduction.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: deduction.error || 'You have exhausted your credits. Please recharge to continue searching.',
          credits: user.credits,
          required: deduction.cost,
        },
        { status: 402 }
      );
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
      remainingCredits: deduction.newCredits,
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
