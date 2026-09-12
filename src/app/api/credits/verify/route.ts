import { NextRequest, NextResponse } from 'next/server';
import { fulfillPaystackPurchase } from '@/lib/credits';
import { ensureLocalDb, type TransactionRecord } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function handleVerification(referenceInput?: string | null) {
  const reference = referenceInput?.trim();
  if (!reference) {
    return NextResponse.json(
      { success: false, error: 'Transaction reference is required for verification.' },
      { status: 400 }
    );
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  // 1. If Paystack Secret Key is configured, verify directly with Paystack API
  if (secretKey) {
    try {
      const paystackRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey.trim()}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      );

      const paystackData = await paystackRes.json().catch(() => null);

      if (paystackRes.ok && paystackData?.status && paystackData?.data?.status === 'success') {
        const tx = paystackData.data;
        const email = tx.customer?.email;
        const amount = tx.amount;
        const currency = tx.currency || 'NGN';
        const packageId = tx.metadata?.packageId || tx.metadata?.package_id;

        if (!email || typeof amount !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Transaction data from Paystack is missing customer email or amount.' },
            { status: 400 }
          );
        }

        const fulfillment = await fulfillPaystackPurchase({
          email,
          amountInSmallestUnit: amount,
          currency,
          reference: tx.reference || reference,
          packageId,
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

      // If status from Paystack is not success (e.g. abandoned, failed)
      if (paystackData?.data?.status) {
        return NextResponse.json(
          {
            success: false,
            error: `Payment status is "${paystackData.data.status}". Only successful payments can be credited.`,
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
      // Fall through to database check below
    }
  }

  // 2. Fallback check: If already processed via Webhook in database
  const db = ensureLocalDb();
  const existingLocalTx = (db.transactions || []).find(
    (t: TransactionRecord) => t.description && t.description.includes(reference)
  );

  if (existingLocalTx) {
    return NextResponse.json({
      success: true,
      verified: true,
      credited: false,
      newBalance: existingLocalTx.balance_after,
      creditsAdded: existingLocalTx.credits_delta,
      message: 'Transaction was already verified and credited to your account.',
    });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: supaTx } = await supabase
        .from('transactions')
        .select('id, balance_after, credits_delta, user_id')
        .ilike('description', `%${reference}%`)
        .maybeSingle();

      if (supaTx) {
        return NextResponse.json({
          success: true,
          verified: true,
          credited: false,
          newBalance: supaTx.balance_after,
          creditsAdded: supaTx.credits_delta,
          message: 'Transaction was already verified and credited to your account.',
        });
      }
    } catch {
      /* ignore */
    }
  }

  if (!secretKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'PAYSTACK_SECRET_KEY is not configured yet on the server, and this transaction has not yet been processed by webhook.',
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
  const reference = req.nextUrl.searchParams.get('reference') || req.nextUrl.searchParams.get('trxref');
  return handleVerification(reference);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const reference = body.reference || body.trxref;
    return handleVerification(reference);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Invalid request body.' }, { status: 400 });
  }
}
