import { NextRequest, NextResponse } from 'next/server';
import { fulfillPaystackPurchase } from '@/lib/credits';
import { ensureLocalDb, getActualUserCredits, type TransactionRecord } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function handleVerification(req: NextRequest, referenceInput?: string | null) {
  const rawReference = referenceInput?.trim();
  if (!rawReference) {
    return NextResponse.json(
      { success: false, error: 'Transaction reference is required for verification.' },
      { status: 400 }
    );
  }

  // Sanitize common user prefixes e.g. "Ref: #T123...", "Order #123...", "#123..."
  const cleanReference = rawReference
    .replace(/^(reference|ref|order|trxref|payment)[:#\s-]+/i, '')
    .replace(/^#+/, '')
    .trim();

  // Resolve currently authenticated user session if available
  const auth = await authenticateRequest(req).catch(() => null);
  const activeUserId = auth?.user?.id;
  const activeUserEmail = auth?.user?.email;

  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  // 1. Check if transaction has already been fulfilled in local DB or Supabase
  const db = ensureLocalDb();
  const existingLocalTx = (db.transactions || []).find(
    (t: TransactionRecord) =>
      t.description &&
      (t.description.includes(cleanReference) || (rawReference && t.description.includes(rawReference)))
  );

  if (existingLocalTx) {
    if (activeUserId && existingLocalTx.user_id !== activeUserId) {
      return NextResponse.json({
        success: false,
        error: 'This transaction reference has already been claimed by another account.',
      }, { status: 403 });
    }

    const currentBalance = await getActualUserCredits(
      activeUserId || existingLocalTx.user_id,
      activeUserEmail
    );
    return NextResponse.json({
      success: true,
      verified: true,
      credited: false,
      alreadyCredited: true,
      newBalance: currentBalance,
      creditsAdded: existingLocalTx.credits_delta,
      message: 'Transaction was already verified and credited to your account.',
    });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: supaTx } = await supabase
        .from('transactions')
        .select('id, balance_after, credits_delta, user_id, description, amount, currency')
        .or(`description.ilike.%${cleanReference}%,description.ilike.%${rawReference}%`)
        .maybeSingle();

      if (supaTx) {
        if (activeUserId && supaTx.user_id !== activeUserId) {
          return NextResponse.json({
            success: false,
            error: 'This transaction reference has already been claimed by another account.',
          }, { status: 403 });
        }

        const currentBalance = await getActualUserCredits(
          activeUserId || supaTx.user_id,
          activeUserEmail
        );
        return NextResponse.json({
          success: true,
          verified: true,
          credited: false,
          alreadyCredited: true,
          newBalance: currentBalance,
          creditsAdded: supaTx.credits_delta,
          message: 'Transaction was already verified and credited to your account.',
        });
      }
    } catch {
      /* ignore */
    }
  }

  // 2. If Paystack Secret Key is configured, verify directly via Paystack API
  if (secretKey) {
    try {
      let paystackData: any = null;
      let paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanReference)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey.trim()}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (paystackRes.ok) {
        paystackData = await paystackRes.json().catch(() => null);
      }

      // If not found with clean reference and raw differs, retry with raw
      if ((!paystackData || !paystackData.status) && rawReference !== cleanReference) {
        const retryRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(rawReference)}`,
          {
            headers: {
              Authorization: `Bearer ${secretKey.trim()}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        );
        if (retryRes.ok) {
          paystackData = await retryRes.json().catch(() => null);
        }
      }

      // If still not found, try Paystack Shop order endpoint
      if (!paystackData || !paystackData.status) {
        try {
          const orderRes = await fetch(
            `https://api.paystack.co/order/${encodeURIComponent(cleanReference)}`,
            {
              headers: {
                Authorization: `Bearer ${secretKey.trim()}`,
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            }
          );
          if (orderRes.ok) {
            const orderData = await orderRes.json().catch(() => null);
            if (orderData?.status && (orderData.data?.status === 'success' || orderData.data?.status === 'paid')) {
              paystackData = orderData;
            }
          }
        } catch {
          /* ignore order check fallback */
        }
      }

      if (paystackData?.status && (paystackData.data?.status === 'success' || paystackData.data?.status === 'paid')) {
        const tx = paystackData.data;
        const customerEmail =
          tx.customer?.email ||
          tx.customer_email ||
          tx.email ||
          tx.metadata?.email ||
          tx.order?.customer?.email;

        // Security check: If a user is signed in, verify this payment belongs to them
        const normalizedCustomerEmail = (customerEmail || '').trim().toLowerCase();
        const normalizedActiveEmail = (activeUserEmail || '').trim().toLowerCase();
        const txMetadataUserId = tx.metadata?.userId || tx.metadata?.user_id;

        if (
          normalizedActiveEmail &&
          normalizedCustomerEmail &&
          normalizedActiveEmail !== normalizedCustomerEmail &&
          txMetadataUserId !== activeUserId
        ) {
          console.warn('[Security] Unauthorized transaction verify attempt: Email mismatch', {
            activeUserEmail,
            customerEmail,
            reference: cleanReference,
          });
          return NextResponse.json(
            { success: false, error: 'The email address on this payment does not match your active account.' },
            { status: 403 }
          );
        }

        const email = normalizedActiveEmail || normalizedCustomerEmail;
        const amount = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount || tx.total_amount);
        const currency = tx.currency || 'NGN';
        const packageId = tx.metadata?.packageId || tx.metadata?.package_id || tx.metadata?.plan;

        const extraContext = [
          tx.description,
          tx.metadata?.product_name,
          tx.metadata?.page_name,
          Array.isArray(tx.line_items) ? tx.line_items.map((i: any) => i?.name).join(' ') : '',
        ]
          .filter(Boolean)
          .join(' ');

        if (!email || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
          return NextResponse.json(
            { success: false, error: 'Transaction data from Paystack is missing customer email or amount.' },
            { status: 400 }
          );
        }

        const fulfillment = await fulfillPaystackPurchase({
          email,
          amountInSmallestUnit: amount,
          currency,
          reference: tx.reference || cleanReference,
          packageId,
          extraContext,
          targetUserId: activeUserId,
        });

        return NextResponse.json({
          success: true,
          verified: true,
          credited: fulfillment.credited,
          creditsAdded: fulfillment.creditsAdded,
          newBalance: fulfillment.newBalance,
          package: fulfillment.package,
          message: fulfillment.message,
          userEmail: email,
        });
      }

      // If status from Paystack is failed or abandoned
      if (paystackData?.data?.status && paystackData.data.status !== 'success' && paystackData.data.status !== 'paid') {
        return NextResponse.json(
          {
            success: false,
            error: `Payment status is "${paystackData.data.status}". Only completed, successful payments can be credited.`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: paystackData?.message || 'Paystack could not verify this transaction reference.',
        },
        { status: 400 }
      );
    } catch (err: any) {
      console.error('Paystack transaction verify API error:', err);
    }
  }

  if (!secretKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          'PAYSTACK_SECRET_KEY is not configured yet on the server, and this transaction has not yet been processed by the live webhook.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { success: false, error: 'Could not verify transaction reference.' },
    { status: 400 }
  );
}

export async function GET(req: NextRequest) {
  const reference =
    req.nextUrl.searchParams.get('reference') ||
    req.nextUrl.searchParams.get('trxref') ||
    req.nextUrl.searchParams.get('order_code');
  return handleVerification(req, reference);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const reference = body.reference || body.trxref || body.order_code;
    return handleVerification(req, reference);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Invalid request body.' }, { status: 400 });
  }
}
