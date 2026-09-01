import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { addPurchasedCredits, CREDIT_PACKAGES } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required to purchase credits.' }, { status: 401 });
    }

    const body = await req.json();
    const { packageId, paymentMethod, currency = 'USD' } = body;

    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ success: false, error: 'Invalid credit package selected.' }, { status: 400 });
    }

    const price = currency === 'NGN' ? pkg.price_ngn : pkg.price_usd;

    // Process top-up transaction
    const result = addPurchasedCredits(auth.user.id, pkg.id, price, currency);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to apply credits.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${result.packageCredits} credits to your account!`,
      newCredits: result.newCredits,
      package: pkg,
      paymentMethod: paymentMethod || 'Card',
    });
  } catch (err: unknown) {
    console.error('Credit top-up error:', err);
    return NextResponse.json({ success: false, error: 'Failed to process credit top-up.' }, { status: 500 });
  }
}
