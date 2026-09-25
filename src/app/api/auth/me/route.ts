import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, sanitizeUser, setSessionCookie } from '@/lib/auth';
import { ensureUserPromoCredits, isOmololaAccount } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, user: null },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    let { credits: actualCredits, token: updatedToken } = await ensureUserPromoCredits(
      auth.user.id,
      auth.user.email,
      auth.session.token
    );
    if (isOmololaAccount(auth.user.email)) {
      actualCredits = Math.max(actualCredits, 100);
    }
    auth.user.credits = actualCredits;

    const tokenToSend = updatedToken || auth.session.token;
    const response = NextResponse.json(
      {
        success: true,
        user: sanitizeUser(auth.user),
        credits: actualCredits,
        token: updatedToken || auth.session.token, // token: auth.session.token
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

    if (updatedToken) {
      setSessionCookie(response, updatedToken);
    }

    return response;
  } catch (err: unknown) {
    console.error('Error fetching auth user:', err);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}

