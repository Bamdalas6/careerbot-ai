import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { claimFreeCredits, getNextFreeClaimInfo } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const info = await getNextFreeClaimInfo(auth.user.id);
    return NextResponse.json({ success: true, ...info });
  } catch (err: unknown) {
    console.error('Credit top-up GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch credit status.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // 7-day free credit claim
    if (action === 'claim_free') {
      const result = await claimFreeCredits(auth.user.id);
      if (!result.success) {
        return NextResponse.json({
          success: false,
          canClaim: false,
          error: result.error,
          hoursRemaining: result.hoursRemaining,
          daysRemaining: result.daysRemaining,
          nextClaimAt: result.nextClaimAt,
        }, { status: 429 });
      }
      return NextResponse.json({
        success: true,
        message: '🎉 5 free credits added to your account! Come back in 7 days for more.',
        newCredits: result.credits,
        canClaim: false,
        hoursRemaining: result.hoursRemaining ?? 168,
        daysRemaining: result.daysRemaining ?? 7,
        nextClaimAt: result.nextClaimAt,
      });
    }

    // GET claim status (used on modal open)
    if (action === 'claim_status') {
      const info = await getNextFreeClaimInfo(auth.user.id);
      return NextResponse.json({ success: true, ...info });
    }

    // Paystack payment - coming soon placeholder
    return NextResponse.json({
      success: false,
      error: 'Paystack payment integration coming soon. Please use the free weekly credits for now.',
    }, { status: 503 });

  } catch (err: unknown) {
    console.error('Credit top-up error:', err);
    return NextResponse.json({ success: false, error: 'Failed to process credit request.' }, { status: 500 });
  }
}
