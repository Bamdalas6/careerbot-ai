import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fulfillPaystackPurchase } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'CareerBot AI Paystack Webhook Handler',
    configured: Boolean(process.env.PAYSTACK_SECRET_KEY),
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error('Paystack webhook error: PAYSTACK_SECRET_KEY is not configured in environment.');
      return NextResponse.json(
        { error: 'PAYSTACK_SECRET_KEY is not configured on server.' },
        { status: 500 }
      );
    }

    if (!signature) {
      console.warn('Paystack webhook request missing x-paystack-signature header.');
      return NextResponse.json(
        { error: 'Missing x-paystack-signature header.' },
        { status: 400 }
      );
    }

    // Verify HMAC-SHA512 signature using Paystack Secret Key
    const computedSignature = crypto
      .createHmac('sha512', secretKey.trim())
      .update(rawBody)
      .digest('hex');

    if (computedSignature !== signature) {
      console.warn('Paystack webhook signature mismatch.');
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    // Only process charge.success events
    if (event === 'charge.success' && data && data.status === 'success') {
      const email = data.customer?.email;
      const amount = data.amount; // In kobo or cents
      const currency = data.currency || 'NGN';
      const reference = data.reference;
      const packageId = data.metadata?.packageId || data.metadata?.package_id;

      if (!email || !reference || typeof amount !== 'number') {
        console.warn('Paystack charge.success missing required fields:', { email, reference, amount });
        return NextResponse.json(
          { error: 'Incomplete transaction payload.' },
          { status: 400 }
        );
      }

      console.log(`[Paystack Webhook] Processing payment for ${email}, amount: ${amount} ${currency}, ref: ${reference}`);

      const result = await fulfillPaystackPurchase({
        email,
        amountInSmallestUnit: amount,
        currency,
        reference,
        packageId,
      });

      console.log('[Paystack Webhook] Fulfillment result:', result);

      return NextResponse.json({
        received: true,
        fulfilled: result.credited,
        creditsAdded: result.creditsAdded,
        newBalance: result.newBalance,
        package: result.package.name,
        message: result.message,
      });
    }

    // For other Paystack events, respond 200 OK so Paystack knows the event was received
    return NextResponse.json({
      received: true,
      event,
      note: 'Event acknowledged.',
    });
  } catch (error: any) {
    console.error('Paystack webhook internal error:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
