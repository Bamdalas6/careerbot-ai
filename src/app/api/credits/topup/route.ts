import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, setSessionCookie } from '@/lib/auth';
import { claimFreeCredits, getNextFreeClaimInfo } from '@/lib/db';
import { CREDIT_PACKAGES } from '@/types/credits';

function extractClientClaimAt(req: NextRequest, bodyClaimAt?: unknown): string | undefined {
  if (typeof bodyClaimAt === 'string' && bodyClaimAt.trim()) {
    return bodyClaimAt.trim();
  }
  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.startsWith('careerbot_last_claim_') && cookie.value) {
      try {
        return decodeURIComponent(cookie.value);
      } catch {
        return cookie.value;
      }
    }
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const clientClaimAt = extractClientClaimAt(req);
    const info = await getNextFreeClaimInfo(auth.user.id, auth.user, clientClaimAt);
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
    const { action, clientLastClaimAt } = body;
    const clientClaimAt = extractClientClaimAt(req, clientLastClaimAt);

    // Free recurring credit refills are discontinued to promote paid packages
    if (action === 'claim_free') {
      return NextResponse.json(
        {
          success: false,
          canClaim: false,
          error: 'Free recurring refills are discontinued. All registered accounts receive 5 starter credits; additional credits can be purchased via our Paystack packages.',
        },
        { status: 403 }
      );
    }

    // GET claim status (used on modal open or legacy clients)
    if (action === 'claim_status') {
      return NextResponse.json({
        success: true,
        canClaim: false,
        hoursRemaining: 0,
        daysRemaining: 0,
        nextClaimAt: null,
      });
    }

    // Paystack payment package link resolution
    if (action === 'purchase' || body.packageId) {
      const pkg = CREDIT_PACKAGES.find((p) => p.id === body.packageId);
      if (pkg) {
        return NextResponse.json({
          success: true,
          paymentUrl: pkg.payment_link,
          package: pkg,
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or package specified.',
    }, { status: 400 });

  } catch (err: unknown) {
    console.error('Credit top-up error:', err);
    return NextResponse.json({ success: false, error: 'Failed to process credit request.' }, { status: 500 });
  }
}
