import { NextRequest, NextResponse } from 'next/server';
import { applyManualEdit } from '@/lib/cv-review';
import { authenticateRequest } from '@/lib/auth';
import { deductUserCredits } from '@/lib/credits';

/**
 * Applies a user's manual edit instruction to their rebuilt CV text.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', message: 'Please sign in to edit your CV.' },
        { status: 401 }
      );
    }

    const { user } = auth;
    const deduction = await deductUserCredits(user.id, user.credits, 'CV_REVIEW', 'Manual CV Edit');
    if (!deduction.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: deduction.error || 'You do not have enough credits to edit your CV.',
          credits: user.credits,
          required: deduction.cost,
        },
        { status: 402 }
      );
    }

    const { text, instruction } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 40) {
      return NextResponse.json(
        { success: false, error: 'No CV text to edit.' },
        { status: 400 }
      );
    }

    if (!instruction || typeof instruction !== 'string' || instruction.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Please describe what you want to change.' },
        { status: 400 }
      );
    }

    const result = applyManualEdit(text, instruction);

    return NextResponse.json({
      success: result.success,
      text: result.text,
      applied: result.applied,
      remainingCredits: deduction.newCredits,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('CV edit error:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to edit CV', message },
      { status: 500 }
    );
  }
}
