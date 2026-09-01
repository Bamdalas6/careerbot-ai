import { updateUserCredits, getUserById } from './db';
import { CREDIT_RATES, CREDIT_PACKAGES, CreditActionType } from '@/types/credits';

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
