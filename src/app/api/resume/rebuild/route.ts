import { NextRequest, NextResponse } from 'next/server';
import { buildUpgradedCV, reviewResume } from '@/lib/cv-review';
import { authenticateRequest } from '@/lib/auth';
import { deductUserCredits } from '@/lib/credits';
import { saveUserResume } from '@/lib/db';

/**
 * Turns a review into an actual CV document.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', message: 'Please sign in or create an account to rebuild and export your upgraded CV.' },
        { status: 401 }
      );
    }

    const { user } = auth;
    const deduction = deductUserCredits(user.id, user.credits, 'CV_REBUILD', 'AI Rebuilt CV & ATS Restructure');
    if (!deduction.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: deduction.error || 'You do not have enough credits to rebuild your CV.',
          credits: user.credits,
          required: deduction.cost,
        },
        { status: 402 }
      );
    }

    const { text, targetRole } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 40) {
      return NextResponse.json(
        { success: false, error: 'Not enough text to rebuild. Upload or paste your full CV.' },
        { status: 400 }
      );
    }

    const role = typeof targetRole === 'string' && targetRole.trim() ? targetRole.trim() : undefined;
    const before = reviewResume(text, role);
    const cv = buildUpgradedCV(text, before, role);
    const after = reviewResume(cv.text, role, before.score);

    // Save to user's history
    try {
      saveUserResume(user.id, {
        title: role ? `${role} CV` : 'Upgraded CV',
        text: cv.text,
        score: after.score,
        review: after as unknown as Record<string, unknown>,
      });
    } catch (saveErr) {
      console.error('Failed to save rebuilt CV to history:', saveErr);
    }

    return NextResponse.json({
      success: true,
      cv,
      score_before: before.score,
      score_after: after.score,
      review_after: after,
      remainingCredits: deduction.newCredits,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('CV rebuild error:', message);
    return NextResponse.json({ success: false, error: 'Could not rebuild the CV.' }, { status: 500 });
  }
}
