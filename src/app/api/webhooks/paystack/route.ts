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

    if (!signature) {
      console.warn('[Paystack Webhook] Request missing x-paystack-signature header.');
      return NextResponse.json(
        { error: 'Missing x-paystack-signature header.' },
        { status: 400 }
      );
    }

    if (!secretKey) {
      console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY is not configured in environment.');
      return NextResponse.json(
        { error: 'PAYSTACK_SECRET_KEY is not configured on server.' },
        { status: 500 }
      );
    }

    // Verify HMAC-SHA512 signature using Paystack Secret Key with constant-time comparison
    const computedSignature = crypto
      .createHmac('sha512', secretKey.trim())
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signature.trim().toLowerCase(), 'hex');
    const compBuf = Buffer.from(computedSignature.trim().toLowerCase(), 'hex');

    if (sigBuf.length === 0 || sigBuf.length !== compBuf.length || !crypto.timingSafeEqual(sigBuf, compBuf)) {
      console.warn('[Paystack Webhook] Signature mismatch.');
      return NextResponse.json(
        { error: 'Invalid webhook signature.' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    // Check if event indicates a completed payment or shop order
    const isChargeSuccess = event === 'charge.success' && (data?.status === 'success' || !data?.status);
    const isOrderSuccess =
      (event === 'order.created' || event === 'order.success') &&
      (data?.status === 'success' || data?.status === 'paid' || data?.paid === true);
    const isPaymentSuccess =
      event === 'paymentrequest.success' && (data?.status === 'success' || data?.status === 'paid');

    if (isChargeSuccess || isOrderSuccess || isPaymentSuccess || data?.status === 'success') {
      // Flexibly extract customer email across Paystack Shop / Standard Charge payloads
      const customFieldEmail = Array.isArray(data?.metadata?.custom_fields)
        ? data.metadata.custom_fields.find(
            (f: any) =>
              f?.variable_name?.toLowerCase() === 'email' ||
              f?.name?.toLowerCase() === 'email'
          )?.value
        : undefined;

      const email =
        data?.customer?.email ||
        data?.customer_email ||
        data?.email ||
        data?.metadata?.email ||
        data?.metadata?.customer_email ||
        data?.order?.customer?.email ||
        customFieldEmail;

      const rawAmount = data?.amount ?? data?.total_amount ?? data?.order?.amount;
      const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
      const currency = data?.currency || 'NGN';

      const reference =
        data?.reference ||
        data?.order_code ||
        data?.trans_id ||
        (data?.id ? String(data.id) : undefined) ||
        data?.metadata?.reference;

      const packageId =
        data?.metadata?.packageId ||
        data?.metadata?.package_id ||
        data?.metadata?.plan ||
        data?.plan;

      const extraContext = [
        data?.description,
        data?.metadata?.product_name,
        data?.metadata?.page_name,
        data?.metadata?.referrer,
        data?.plan_object?.name,
        Array.isArray(data?.line_items) ? data.line_items.map((i: any) => i?.name).join(' ') : '',
        Array.isArray(data?.order?.line_items) ? data.order.line_items.map((i: any) => i?.name).join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (!email || !reference || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        console.warn('[Paystack Webhook] Incomplete transaction payload:', {
          event,
          email,
          reference,
          amount,
        });
        return NextResponse.json(
          { error: 'Incomplete transaction payload.' },
          { status: 400 }
        );
      }

      console.log(
        `[Paystack Webhook] Fulfilling payment event "${event}" for ${email}, amount: ${amount} ${currency}, ref: ${reference}`
      );

      const result = await fulfillPaystackPurchase({
        email,
        amountInSmallestUnit: amount,
        currency,
        reference,
        packageId,
        extraContext,
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

    // For other acknowledged Paystack events, respond 200 OK
    return NextResponse.json({
      received: true,
      event,
      note: 'Event acknowledged.',
    });
  } catch (error: any) {
    console.error('[Paystack Webhook] Internal processing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
