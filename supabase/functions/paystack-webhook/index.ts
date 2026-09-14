// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This is a Supabase Edge Function running on Deno.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_ngn: number;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter Pack', credits: 50, price_ngn: 5000 },
  { id: 'pro', name: 'Pro Job Hunter', credits: 150, price_ngn: 12000 },
  { id: 'accelerator', name: 'Career Accelerator', credits: 500, price_ngn: 29000 },
];

function resolvePackage(
  amountInSmallestUnit: number,
  currency = 'NGN',
  packageId?: string,
  extraContext = ''
): CreditPackage {
  const combined = `${packageId || ''} ${extraContext || ''}`.toLowerCase();

  if (
    combined.includes('career-accelerator') ||
    combined.includes('accelerator') ||
    combined.includes('500')
  ) {
    return CREDIT_PACKAGES[2];
  }
  if (
    combined.includes('pro-job-hunter') ||
    combined.includes('job hunter') ||
    combined.includes('150')
  ) {
    return CREDIT_PACKAGES[1];
  }
  if (
    combined.includes('starterpack') ||
    combined.includes('starter') ||
    combined.includes('50')
  ) {
    return CREDIT_PACKAGES[0];
  }

  const isNgn = currency.toUpperCase() === 'NGN';
  const majorAmount = Math.round(amountInSmallestUnit / 100);

  if (isNgn) {
    if (majorAmount >= 20000) return CREDIT_PACKAGES[2];
    if (majorAmount >= 8000) return CREDIT_PACKAGES[1];
    return CREDIT_PACKAGES[0];
  } else {
    if (majorAmount >= 20) return CREDIT_PACKAGES[2];
    if (majorAmount >= 8) return CREDIT_PACKAGES[1];
    return CREDIT_PACKAGES[0];
  }
}

function hexToUint8Array(hexString: string): Uint8Array {
  const clean = hexString.trim().toLowerCase();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

async function verifyHmacSha512(
  secret: string,
  rawBody: string,
  signatureHex: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret.trim()),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const compBytes = new Uint8Array(sigBuf);
    const providedBytes = hexToUint8Array(signatureHex);

    if (providedBytes.length !== compBytes.length) {
      return false;
    }

    // Constant-time byte-by-byte comparison
    let match = 0;
    for (let i = 0; i < providedBytes.length; i++) {
      match |= providedBytes[i] ^ compBytes[i];
    }
    return match === 0;
  } catch (err) {
    console.error('[HMAC Verify Error]:', err);
    return false;
  }
}

// @ts-ignore Deno global
Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        service: 'CareerBot Paystack Webhook Supabase Edge Function',
        status: 'online',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    // @ts-ignore Deno global
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing x-paystack-signature header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!paystackSecret) {
      console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY not set in Edge Function secrets.');
      return new Response(
        JSON.stringify({ error: 'PAYSTACK_SECRET_KEY is not configured in Supabase secrets' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 1. Verify Paystack Webhook Signature (timing-safe HMAC SHA512)
    const isValidSignature = await verifyHmacSha512(paystackSecret, rawBody, signature);
    if (!isValidSignature) {
      console.warn('[Paystack Webhook] Invalid webhook signature from IP.');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    const isChargeSuccess = event === 'charge.success' && (data?.status === 'success' || !data?.status);
    const isOrderSuccess =
      (event === 'order.created' || event === 'order.success') &&
      (data?.status === 'success' || data?.status === 'paid' || data?.paid === true);
    const isPaymentSuccess =
      event === 'paymentrequest.success' && (data?.status === 'success' || data?.status === 'paid');

    if (!isChargeSuccess && !isOrderSuccess && !isPaymentSuccess && data?.status !== 'success') {
      return new Response(
        JSON.stringify({ received: true, event, note: 'Event acknowledged, no credit action required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Extract transaction details
    const reference =
      data?.reference ||
      data?.order_code ||
      data?.trans_id ||
      (data?.id ? String(data.id) : undefined) ||
      data?.metadata?.reference;

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Missing transaction reference in payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const cleanRef = reference
      .replace(/^(reference|ref|order|trxref|payment)[:#\s-]+/i, '')
      .replace(/^#+/, '')
      .trim();

    // 2. Direct Verification with Paystack API
    console.log(`[Paystack Webhook] Verifying reference "${cleanRef}" with Paystack API...`);
    let paystackVerifiedData = data;

    try {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecret.trim()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (verifyRes.ok) {
        const verifyJson = await verifyRes.json();
        if (verifyJson?.status && verifyJson?.data?.status === 'success') {
          paystackVerifiedData = verifyJson.data;
          console.log(`[Paystack Webhook] Reference verified via Paystack API successfully.`);
        }
      }
    } catch (apiErr) {
      console.warn('[Paystack Webhook] Notice: Paystack API verification request notice:', apiErr);
    }

    // Extract customer and amount details
    const customerEmail = (
      paystackVerifiedData?.customer?.email ||
      paystackVerifiedData?.customer_email ||
      paystackVerifiedData?.email ||
      paystackVerifiedData?.metadata?.email ||
      data?.customer?.email ||
      data?.email
    )?.toLowerCase()?.trim();

    const rawAmount =
      paystackVerifiedData?.amount ??
      paystackVerifiedData?.total_amount ??
      data?.amount ??
      data?.total_amount;
    const amountInSmallestUnit = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount);
    const currency = paystackVerifiedData?.currency || data?.currency || 'NGN';
    const packageId = paystackVerifiedData?.metadata?.packageId || data?.metadata?.packageId;
    const targetUserId = paystackVerifiedData?.metadata?.userId || data?.metadata?.userId;

    const extraContext = [
      paystackVerifiedData?.description,
      paystackVerifiedData?.metadata?.product_name,
      paystackVerifiedData?.metadata?.page_name,
      data?.description,
    ]
      .filter(Boolean)
      .join(' ');

    if (!customerEmail || !amountInSmallestUnit || isNaN(amountInSmallestUnit)) {
      return new Response(
        JSON.stringify({ error: 'Incomplete customer email or transaction amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const pkg = resolvePackage(amountInSmallestUnit, currency, packageId, extraContext);
    const majorAmount = Math.round(amountInSmallestUnit / 100);

    // Initialize Supabase Service Role Client
    // @ts-ignore Deno global
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore Deno global
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Paystack Webhook] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.');
      return new Response(
        JSON.stringify({ error: 'Supabase credentials missing in Edge Function environment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Check Idempotency: Has this reference already been processed?
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id, user_id, balance_after, credits_delta')
      .ilike('description', `%${cleanRef}%`)
      .maybeSingle();

    if (existingTx) {
      console.log(`[Paystack Webhook] Reference "${cleanRef}" already processed. Returning cached success.`);
      return new Response(
        JSON.stringify({
          received: true,
          credited: false,
          alreadyProcessed: true,
          userId: existingTx.user_id,
          balance: existingTx.balance_after,
          message: 'Payment was already processed and credited.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 4. Find or Create User in Supabase
    let userId = targetUserId;
    let existingUser = null;

    if (userId) {
      const { data: u } = await supabase
        .from('users')
        .select('id, email, credits')
        .eq('id', userId)
        .maybeSingle();
      existingUser = u;
    }

    if (!existingUser) {
      const { data: u } = await supabase
        .from('users')
        .select('id, email, credits')
        .eq('email', customerEmail)
        .maybeSingle();
      existingUser = u;
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    const txId = `tx_${crypto.randomUUID()}`;
    const description = `Paystack ${pkg.name} purchase (+${pkg.credits} credits) [Ref: ${cleanRef}]`;

    // 5. Add Credits (Atomic Execution)
    if (!existingUser) {
      // User paid before creating an account: Pre-create user account with 5 welcome coins + purchased coins
      const initialCoins = 5 + pkg.credits;
      const newUserId = targetUserId || `user_${crypto.randomUUID()}`;

      const { error: createErr } = await supabase.from('users').insert([
        {
          id: newUserId,
          name: customerEmail.split('@')[0],
          email: customerEmail,
          password_hash: '',
          salt: '',
          credits: initialCoins,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (createErr) {
        console.error('[Paystack Webhook] Error creating user account:', createErr);
        throw createErr;
      }

      // Record transaction
      await supabase.from('transactions').insert([
        {
          id: txId,
          user_id: newUserId,
          type: 'purchase',
          amount: majorAmount,
          currency: currency.toUpperCase(),
          credits_delta: pkg.credits,
          balance_after: initialCoins,
          description,
          created_at: new Date().toISOString(),
        },
      ]);

      console.log(`[Paystack Webhook] Pre-created user ${customerEmail} with ${initialCoins} coins.`);

      return new Response(
        JSON.stringify({
          received: true,
          credited: true,
          userId: newUserId,
          creditsAdded: pkg.credits,
          newBalance: initialCoins,
          package: pkg.name,
          message: `${pkg.credits} coins successfully credited!`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Existing user: Try atomic RPC function first
    let newBalance = (existingUser.credits || 0) + pkg.credits;

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('add_user_credits_atomic', {
        p_user_id: existingUser.id,
        p_credits_delta: pkg.credits,
        p_description: description,
        p_amount: majorAmount,
        p_currency: currency.toUpperCase(),
        p_tx_id: txId,
      });

      if (!rpcErr && rpcRes && rpcRes.length > 0 && rpcRes[0].success) {
        newBalance = rpcRes[0].new_balance;
      } else {
        // Direct atomic update fallback if RPC function is not yet created
        await supabase
          .from('users')
          .update({
            credits: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);

        await supabase.from('transactions').insert([
          {
            id: txId,
            user_id: existingUser.id,
            type: 'purchase',
            amount: majorAmount,
            currency: currency.toUpperCase(),
            credits_delta: pkg.credits,
            balance_after: newBalance,
            description,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (atomicErr) {
      console.warn('[Paystack Webhook] Atomic update fallback executed:', atomicErr);
      await supabase
        .from('users')
        .update({
          credits: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);

      await supabase.from('transactions').insert([
        {
          id: txId,
          user_id: existingUser.id,
          type: 'purchase',
          amount: majorAmount,
          currency: currency.toUpperCase(),
          credits_delta: pkg.credits,
          balance_after: newBalance,
          description,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    console.log(`[Paystack Webhook] Credited ${pkg.credits} coins to user ${customerEmail}. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({
        received: true,
        credited: true,
        userId: existingUser.id,
        creditsAdded: pkg.credits,
        newBalance,
        package: pkg.name,
        message: `${pkg.credits} coins successfully credited to your account!`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[Paystack Webhook Edge Function Error]:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal Edge Function error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
