import assert from 'assert';
import {
  ensureUserPromoCredits,
  getUserById,
  getUserTransactions,
  signSessionToken,
  verifySessionToken,
} from '../src/lib/db';
import type { SessionTokenPayload } from '../src/lib/auth';

async function runTests() {
  console.log('=== RUNNING PROMO CREDITS AUTOMATED VERIFICATION ===\n');

  // Test 1: User with old credits gets +20 credits and re-signed token with promo_20_granted
  console.log('Test 1: ensureUserPromoCredits grants +20 credits on fresh user token');
  const testUserId = `usr_promo_test_${Date.now()}`;
  const testEmail = `promo_test_${Date.now()}@example.com`;
  const initialPayload: SessionTokenPayload = {
    userId: testUserId,
    email: testEmail,
    exp: Math.floor(Date.now() / 1000) + 3600,
    name: 'Promo Test User',
    credits: 8,
  };
  const token = signSessionToken(initialPayload);

  const result1 = await ensureUserPromoCredits(testUserId, testEmail, token);
  assert.strictEqual(result1.upgraded, true, 'First call must report upgraded = true');
  assert.strictEqual(result1.credits, 28, 'Credits must be upgraded from 8 to 28');
  assert(result1.token, 'Updated token must be generated');

  const verified = verifySessionToken(result1.token!);
  assert(verified !== null, 'Re-signed token must verify');
  assert.strictEqual(verified!.credits, 28, 'Token credits must be 28');
  assert.strictEqual(verified!.promo_20_granted, true, 'Token must have promo_20_granted = true');
  console.log('  PASSED: 20 credits granted and token re-signed\n');

  // Test 2: Idempotency - second call does NOT add another 20 credits
  console.log('Test 2: ensureUserPromoCredits is strictly idempotent');
  const result2 = await ensureUserPromoCredits(testUserId, testEmail, result1.token);
  assert.strictEqual(result2.upgraded, false, 'Second call must report upgraded = false');
  assert.strictEqual(result2.credits, 28, 'Credits must remain exactly 28, not 48');
  console.log('  PASSED: Idempotency verified\n');

  // Test 3: Ledger transaction recorded with type 'bonus'
  console.log('Test 3: Transaction ledger records promotional bonus');
  const txs = await getUserTransactions(testUserId);
  const bonusTx = txs.find((t) => t.type === 'bonus');
  assert(bonusTx !== undefined, 'A bonus transaction must be recorded');
  assert.strictEqual(bonusTx!.credits_delta, 20, 'Transaction credits_delta must be +20');
  assert.strictEqual(bonusTx!.balance_after, 28, 'Transaction balance_after must be 28');
  console.log('  PASSED: Ledger transaction verified\n');

  // Test 4: Existing high-balance user (e.g. 2650) upgrades to 2670
  console.log('Test 4: High balance user upgrade');
  const highBalUserId = `usr_high_${Date.now()}`;
  const highBalPayload: SessionTokenPayload = {
    userId: highBalUserId,
    email: `high_${Date.now()}@example.com`,
    exp: Math.floor(Date.now() / 1000) + 3600,
    name: 'High Balance User',
    credits: 2650,
  };
  const highToken = signSessionToken(highBalPayload);
  const highResult = await ensureUserPromoCredits(highBalUserId, highBalPayload.email, highToken);
  assert.strictEqual(highResult.credits, 2670, 'Credits must upgrade from 2650 to 2670');
  console.log('  PASSED: High balance user upgrade verified\n');

  console.log('=== ALL PROMO CREDITS TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
