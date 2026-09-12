import crypto from 'crypto';
import { updateUserCredits, getUserById, getUserByEmail, createUser, ensureLocalDb, writeLocalDb, type TransactionRecord } from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import { CREDIT_RATES, CREDIT_PACKAGES, CreditActionType, CreditPackage } from '@/types/credits';

export { CREDIT_RATES, CREDIT_PACKAGES };
export type { CreditActionType };

/**
 * Accounts with unlimited bypass (empty by default so all accounts actively consume and reduce coins on live engagement).
 */
const UNLIMITED_EMAILS: string[] = [];

/**
 * Checks if user has enough credits, and deducts them if available.
 */
export async function deductUserCredits(
  userId: string,
  currentCredits: number,
  action: CreditActionType,
  customDescription?: string
): Promise<{ success: boolean; newCredits: number; cost: number; error?: string }> {
  const cost = CREDIT_RATES[action];

  // Unlimited accounts bypass check if configured
  const user = await getUserById(userId);
  if (user && UNLIMITED_EMAILS.includes(user.email.toLowerCase())) {
    return { success: true, newCredits: currentCredits, cost: 0 };
  }

  if (currentCredits < cost) {
    return {
      success: false,
      newCredits: currentCredits,
      cost,
      error: `Insufficient credits. This action requires ${cost} credit${cost > 1 ? 's' : ''}, but you have ${currentCredits}.`,
    };
  }

  const description = customDescription || `Credit deduction for ${action.replace('_', ' ').toLowerCase()}`;
  const result = await updateUserCredits(userId, -cost, 'usage', description);

  if (!result.success) {
    return {
      success: false,
      newCredits: currentCredits,
      cost,
      error: result.error || 'Failed to update credit balance',
    };
  }

  return {
    success: true,
    newCredits: result.credits,
    cost,
  };
}

/**
 * Adds credits to user account upon purchase or bonus.
 */
export async function addPurchasedCredits(
  userId: string,
  packageId: string,
  amountPaid: number,
  currency = 'USD'
): Promise<{ success: boolean; newCredits: number; packageCredits: number; error?: string }> {
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  const creditsToAdd = pkg ? pkg.credits : 50;

  const result = await updateUserCredits(
    userId,
    creditsToAdd,
    'purchase',
    `Purchased ${pkg?.name || 'Credit Package'} (+${creditsToAdd} credits)`,
    amountPaid,
    currency
  );

  if (!result.success) {
    return {
      success: false,
      newCredits: 0,
      packageCredits: creditsToAdd,
      error: result.error || 'Failed to add credits',
    };
  }

  return {
    success: true,
    newCredits: result.credits,
    packageCredits: creditsToAdd,
  };
}

/**
 * Resolves the matching credit package from payment details.
 */
export function resolvePackageFromPayment(
  amountInSmallestUnit: number,
  currency: string = 'NGN',
  metadataPackageId?: string
): (typeof CREDIT_PACKAGES)[number] {
  if (metadataPackageId) {
    const matched = CREDIT_PACKAGES.find((p) => p.id === metadataPackageId.toLowerCase());
    if (matched) return matched;
  }

  const isNgn = currency.toUpperCase() === 'NGN';
  const majorAmount = Math.round(amountInSmallestUnit / 100);

  if (isNgn) {
    if (majorAmount >= 25000) return CREDIT_PACKAGES[2]; // Career Accelerator (29,000 NGN)
    if (majorAmount >= 10000) return CREDIT_PACKAGES[1]; // Pro Job Hunter (12,000 NGN)
    return CREDIT_PACKAGES[0]; // Starter Pack (5,000 NGN)
  } else {
    if (majorAmount >= 25) return CREDIT_PACKAGES[2]; // $29
    if (majorAmount >= 10) return CREDIT_PACKAGES[1]; // $12
    return CREDIT_PACKAGES[0]; // $5
  }
}

/**
 * Fulfills a Paystack purchase by verifying the reference, adding coins to user account,
 * and creating a permanent audit trail in the ledger. Strictly idempotent.
 */
export async function fulfillPaystackPurchase(params: {
  email: string;
  amountInSmallestUnit: number;
  currency: string;
  reference: string;
  packageId?: string;
}): Promise<{
  success: boolean;
  credited: boolean;
  userId?: string;
  creditsAdded: number;
  newBalance: number;
  package: CreditPackage;
  message: string;
}> {
  const { email, amountInSmallestUnit, currency, reference, packageId } = params;
  const normalizedEmail = email.trim().toLowerCase();
  const pkg = resolvePackageFromPayment(amountInSmallestUnit, currency, packageId);
  const majorAmount = Math.round(amountInSmallestUnit / 100);
  const cleanRef = reference.trim();
  const description = `Paystack ${pkg.name} purchase (+${pkg.credits} credits) [Ref: ${cleanRef}]`;

  // 1. Check idempotency in local database
  const db = ensureLocalDb();
  const alreadyFulfilledLocal = (db.transactions || []).some(
    (t: TransactionRecord) => t.description && t.description.includes(cleanRef)
  );

  if (alreadyFulfilledLocal) {
    const existingTx = db.transactions.find((t: TransactionRecord) => t.description && t.description.includes(cleanRef));
    return {
      success: true,
      credited: false,
      userId: existingTx?.user_id,
      creditsAdded: 0,
      newBalance: existingTx?.balance_after ?? 0,
      package: pkg,
      message: 'Payment was already processed and credited.',
    };
  }

  // 2. Check idempotency in Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id, balance_after, user_id')
        .ilike('description', `%${cleanRef}%`)
        .maybeSingle();

      if (existingTx) {
        return {
          success: true,
          credited: false,
          userId: existingTx.user_id,
          creditsAdded: 0,
          newBalance: existingTx.balance_after,
          package: pkg,
          message: 'Payment was already processed and credited.',
        };
      }
    } catch {
      /* fallback */
    }
  }

  // 3. Find user or provision account
  let user = await getUserByEmail(normalizedEmail);
  if (!user) {
    // User paid before registering: pre-create account with bonus so their coins are ready upon registration
    const initialCoins = 5 + pkg.credits;
    user = await createUser({
      name: normalizedEmail.split('@')[0],
      email: normalizedEmail,
      password_hash: '',
      salt: '',
      initialCredits: initialCoins,
    });

    const tx: TransactionRecord = {
      id: `tx_${crypto.randomUUID()}`,
      user_id: user.id,
      type: 'purchase',
      amount: majorAmount,
      currency: currency.toUpperCase(),
      credits_delta: pkg.credits,
      balance_after: initialCoins,
      description,
      created_at: new Date().toISOString(),
    };
    if (!db.transactions) db.transactions = [];
    db.transactions.push(tx);
    writeLocalDb(db);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('transactions').insert([tx]);
      } catch (err) {
        console.warn('Supabase fulfillPaystackPurchase transaction insert notice:', err);
      }
    }

    return {
      success: true,
      credited: true,
      userId: user.id,
      creditsAdded: pkg.credits,
      newBalance: initialCoins,
      package: pkg,
      message: `Account created and ${pkg.credits} coins credited successfully!`,
    };
  }

  // 4. Existing user: update credits
  const updateRes = await updateUserCredits(
    user.id,
    pkg.credits,
    'purchase',
    description,
    majorAmount,
    currency.toUpperCase()
  );

  return {
    success: updateRes.success,
    credited: updateRes.success,
    userId: user.id,
    creditsAdded: pkg.credits,
    newBalance: updateRes.credits,
    package: pkg,
    message: `${pkg.credits} coins added to ${user.email} successfully!`,
  };
}
