import { NextRequest, NextResponse } from 'next/server';
import { reviewResume } from '@/lib/cv-review';
import { authenticateRequest } from '@/lib/auth';
import { deductUserCredits } from '@/lib/credits';

/**
 * "Upgrade my CV" — runs the heuristic reviewer over already-extracted text and
 * returns a structured CVReview.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', message: 'Please sign in or create an account to get a comprehensive CV review and score.' },
        { status: 401 }
      );
    }

    const { user } = auth;
    const deduction = deductUserCredits(user.id, user.credits, 'CV_REVIEW', 'CV Deep Review & Scoring');
    if (!deduction.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: deduction.error || 'You do not have enough credits for a CV review.',
          credits: user.credits,
          required: deduction.cost,
        },
        { status: 402 }
      );
    }

    const { text, targetRole } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length < 40) {
      return NextResponse.json(
        { success: false, error: 'Not enough CV text to review. Paste or upload a fuller CV.' },
        { status: 400 }
      );
    }

    const review = reviewResume(text, typeof targetRole === 'string' ? targetRole : undefined);
    return NextResponse.json({
      success: true,
      review,
      remainingCredits: deduction.newCredits,
    });
  } catch (error: unknown) {
    console.error('API Error in /api/resume/upgrade:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to review CV',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
