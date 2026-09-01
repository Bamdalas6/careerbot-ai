import { NextRequest, NextResponse } from 'next/server';
import { generateTailoredPitch } from '@/lib/ai-agent';
import { JobListing } from '@/types/job';
import { authenticateRequest } from '@/lib/auth';
import { deductUserCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', message: 'Please sign in or create an account to generate tailored application pitches.' },
        { status: 401 }
      );
    }

    const { user } = auth;
    const deduction = await deductUserCredits(user.id, user.credits, 'TAILOR_PITCH', '1-Click Tailored Application Pitch');
    if (!deduction.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: deduction.error || 'You do not have enough credits to generate a tailored pitch.',
          credits: user.credits,
          required: deduction.cost,
        },
        { status: 402 }
      );
    }

    const body = await req.json();
    const { job, userSkills } = body as { job: JobListing; userSkills?: string[] };

    if (!job) {
      return NextResponse.json({ error: 'Job details required' }, { status: 400 });
    }

    const pitch = generateTailoredPitch(job, userSkills);

    return NextResponse.json({
      success: true,
      data: pitch,
      remainingCredits: deduction.newCredits,
    });
  } catch (error: unknown) {
    console.error('API Error in /api/tailor:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to generate tailored pitch', message },
      { status: 500 }
    );
  }
}
