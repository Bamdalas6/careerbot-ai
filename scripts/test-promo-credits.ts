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

  // Test 1: ensureUserPromoCredits does NOT artificially boost credits and returns authentic balance (5)
  console.log('Test 1: ensureUserPromoCredits returns authentic credits without promo bump');
  const testUserId = `usr_promo_test_${Date.now()}`;
  const testEmail = `promo_test_${Date.now()}@example.com`;
  const initialPayload: SessionTokenPayload = {
    userId: testUserId,
    email: testEmail,
    exp: Math.floor(Date.now() / 1000) + 3600,
    name: 'Promo Test User',
    credits: 5,
  };
  const token = signSessionToken(initialPayload);

  const result1 = await ensureUserPromoCredits(testUserId, testEmail, token);
  assert.strictEqual(result1.upgraded, false, 'Promo bonus is disabled, upgraded must be false');
  assert.strictEqual(result1.credits, 5, 'Credits must remain 5, not artificially boosted');
  console.log('  PASSED: Promo bonus disabled and authentic credits preserved\n');

  // Test 2: Token with mismatching credits gets re-signed to authentic balance
  console.log('Test 2: Outdated session token is re-signed to match authentic credits');
  const stalePayload: SessionTokenPayload = {
    userId: testUserId,
    email: testEmail,
    exp: Math.floor(Date.now() / 1000) + 3600,
    name: 'Promo Test User',
    credits: 28, // Stale token from previous promo
  };
  const staleToken = signSessionToken(stalePayload);
  const result2 = await ensureUserPromoCredits(testUserId, testEmail, staleToken);
  assert.strictEqual(result2.credits, 5, 'Resolved credits must be 5');
  assert(result2.token, 'Updated token must be generated for mismatched token');
  const verified = verifySessionToken(result2.token!);
  assert(verified !== null, 'Re-signed token must verify');
  assert.strictEqual(verified!.credits, 5, 'Token credits must be aligned to 5');
  console.log('  PASSED: Stale token re-signed to 5 credits\n');

  console.log('=== ALL PROMO CREDITS TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
