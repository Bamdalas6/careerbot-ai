import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getUserTransactions, ensureUserPromoCredits } from '@/lib/db';
import { CREDIT_RATES, CREDIT_PACKAGES } from '@/lib/credits';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { credits: actualCredits } = await ensureUserPromoCredits(
      auth.user.id,
      auth.user.email,
      auth.session.token
    );
    const transactions = await getUserTransactions(auth.user.id);

    return NextResponse.json(
      {
        success: true,
        credits: actualCredits,
        rates: CREDIT_RATES,
        packages: CREDIT_PACKAGES,
        transactions: transactions.slice(0, 20), // recent 20
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err: unknown) {
    console.error('Error fetching credit balance:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch credit details.' }, { status: 500 });
  }
}

