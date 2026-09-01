import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getUserTransactions, getUserById } from '@/lib/db';
import { CREDIT_RATES, CREDIT_PACKAGES } from '@/lib/credits';

export async function GET(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const latestUser = getUserById(auth.user.id);
    const transactions = getUserTransactions(auth.user.id);

    return NextResponse.json({
      success: true,
      credits: latestUser?.credits ?? 0,
      rates: CREDIT_RATES,
      packages: CREDIT_PACKAGES,
      transactions: transactions.slice(0, 20), // recent 20
    });
  } catch (err: unknown) {
    console.error('Error fetching credit balance:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch credit details.' }, { status: 500 });
  }
}
