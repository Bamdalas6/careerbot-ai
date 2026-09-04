import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, setSessionCookie } from '@/lib/auth';
import { claimFreeCredits, getNextFreeClaimInfo } from '@/lib/db';

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

    // 7-day free credit claim
    if (action === 'claim_free') {
      const result = await claimFreeCredits(auth.user.id, clientClaimAt);
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

      const response = NextResponse.json({
        success: true,
        message: '🎉 5 free credits added to your account! Come back in 7 days for more.',
        newCredits: result.credits,
        token: result.newToken,
        claimTimeIso: result.claimTimeIso,
        canClaim: false,
        hoursRemaining: result.hoursRemaining ?? 168,
        daysRemaining: result.daysRemaining ?? 7,
        nextClaimAt: result.nextClaimAt,
      });

      if (result.newToken) {
        setSessionCookie(response, result.newToken);
      }

      if (result.claimTimeIso) {
        response.cookies.set(`careerbot_last_claim_${auth.user.id}`, result.claimTimeIso, {
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
          sameSite: 'lax',
        });
      }

      return response;
    }

    // GET claim status (used on modal open)
    if (action === 'claim_status') {
      const info = await getNextFreeClaimInfo(auth.user.id, auth.user, clientClaimAt);
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
