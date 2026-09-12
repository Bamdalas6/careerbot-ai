import assert from 'assert';
import crypto from 'crypto';
import { resolvePackageFromPayment, fulfillPaystackPurchase } from '../src/lib/credits';
import { ensureLocalDb, getUserById, getUserByEmail, createUser, getActualUserCredits, writeLocalDb } from '../src/lib/db';
import { CREDIT_PACKAGES } from '../src/types/credits';

async function runPaystackTests() {
  console.log('=== RUNNING PAYSTACK SHOP & WEBHOOK FULFILLMENT TESTS ===\n');

  // -------------------------------------------------------------
  // Test 1: Package Resolution with Paystack Shop prices
  // -------------------------------------------------------------
  console.log('Test 1: Package resolution for Paystack Shop prices (5k, 12k, 29k)');
  
  // Starter Pack: 5,000 NGN (500,000 kobo) -> 50 coins
  const pkgStarter = resolvePackageFromPayment(500000, 'NGN');
  assert.strictEqual(pkgStarter.id, 'starter', '5,000 NGN must resolve to Starter Pack');
  assert.strictEqual(pkgStarter.credits, 50, 'Starter Pack must provide 50 credits');
  assert.strictEqual(pkgStarter.price_ngn, 5000, 'Starter Pack price must be 5,000 NGN');

  // Pro Job Hunter: 12,000 NGN (1,200,000 kobo) -> 150 coins
  const pkgPro = resolvePackageFromPayment(1200000, 'NGN');
  assert.strictEqual(pkgPro.id, 'pro', '12,000 NGN must resolve to Pro Job Hunter');
  assert.strictEqual(pkgPro.credits, 150, 'Pro Job Hunter must provide 150 credits');
  assert.strictEqual(pkgPro.price_ngn, 12000, 'Pro Job Hunter price must be 12,000 NGN');

  // Career Accelerator: 29,000 NGN (2,900,000 kobo) -> 500 coins
  const pkgAccel = resolvePackageFromPayment(2900000, 'NGN');
  assert.strictEqual(pkgAccel.id, 'accelerator', '29,000 NGN must resolve to Career Accelerator');
  assert.strictEqual(pkgAccel.credits, 500, 'Career Accelerator must provide 500 credits');
  assert.strictEqual(pkgAccel.price_ngn, 29000, 'Career Accelerator price must be 29,000 NGN');

  // Context-based / slug-based matching
  const pkgFromSlug = resolvePackageFromPayment(0, 'NGN', undefined, 'paystack.shop/pay/pro-job-hunter');
  assert.strictEqual(pkgFromSlug.id, 'pro', 'URL slug must resolve to Pro Job Hunter');

  const pkgFromStarterSlug = resolvePackageFromPayment(0, 'NGN', undefined, 'paystack.shop/pay/-starterpack');
  assert.strictEqual(pkgFromStarterSlug.id, 'starter', 'URL slug must resolve to Starter Pack');

  const pkgFromAccelSlug = resolvePackageFromPayment(0, 'NGN', undefined, 'career-accelerator plan');
  assert.strictEqual(pkgFromAccelSlug.id, 'accelerator', 'URL slug must resolve to Career Accelerator');
  console.log('  PASSED: All package resolutions verified accurately\n');

  // -------------------------------------------------------------
  // Test 2: Existing User Fulfillment
  // -------------------------------------------------------------
  console.log('Test 2: Fulfilling purchase for existing registered user');
  const testEmail = `paytest_${Date.now()}@careerbot-test.io`;
  const initialCoins = 5;
  const user = await createUser({
    name: 'Payment Tester',
    email: testEmail,
    password_hash: 'hash',
    salt: 'salt',
    initialCredits: initialCoins,
  });

  const refStarter = `REF_STARTER_${Date.now()}`;
  const fulfillment1 = await fulfillPaystackPurchase({
    email: testEmail,
    amountInSmallestUnit: 500000,
    currency: 'NGN',
    reference: refStarter,
  });

  assert.strictEqual(fulfillment1.success, true, 'Fulfillment must succeed');
  assert.strictEqual(fulfillment1.credited, true, 'User must be credited');
  assert.strictEqual(fulfillment1.creditsAdded, 50, 'Must add 50 credits');
  assert.strictEqual(fulfillment1.newBalance, initialCoins + 50, 'New balance must be 55');

  const updatedCoins = await getActualUserCredits(user.id, testEmail);
  assert.strictEqual(updatedCoins, 55, 'Live user balance in DB must be exactly 55');
  console.log('  PASSED: Existing user credited successfully (+50 coins -> 55)\n');

  // -------------------------------------------------------------
  // Test 3: Purchase Pro Job Hunter (12,000 NGN -> +150 coins)
  // -------------------------------------------------------------
  console.log('Test 3: Fulfilling Pro Job Hunter purchase for user');
  const refPro = `REF_PRO_${Date.now()}`;
  const fulfillment2 = await fulfillPaystackPurchase({
    email: testEmail,
    amountInSmallestUnit: 1200000,
    currency: 'NGN',
    reference: refPro,
  });

  assert.strictEqual(fulfillment2.credited, true, 'Pro purchase must be credited');
  assert.strictEqual(fulfillment2.creditsAdded, 150, 'Must add 150 credits');
  assert.strictEqual(fulfillment2.newBalance, 55 + 150, 'New balance must be 205');

  const updatedCoins2 = await getActualUserCredits(user.id, testEmail);
  assert.strictEqual(updatedCoins2, 205, 'Live user balance in DB must be exactly 205');
  console.log('  PASSED: Pro pack credited successfully (+150 coins -> 205)\n');

  // -------------------------------------------------------------
  // Test 4: Idempotency with Reference Sanitation (e.g. leading #)
  // -------------------------------------------------------------
  console.log('Test 4: Idempotency with leading # in reference');
  const duplicateFulfillment = await fulfillPaystackPurchase({
    email: testEmail,
    amountInSmallestUnit: 1200000,
    currency: 'NGN',
    reference: `#${refPro}`, // user copied reference with #
  });

  assert.strictEqual(duplicateFulfillment.success, true, 'Response must succeed');
  assert.strictEqual(duplicateFulfillment.credited, false, 'Must NOT credit twice');
  assert.strictEqual(duplicateFulfillment.creditsAdded, 0, 'No extra credits added');
  assert.strictEqual(duplicateFulfillment.newBalance, 205, 'Balance must remain 205');

  const coinsAfterDupe = await getActualUserCredits(user.id, testEmail);
  assert.strictEqual(coinsAfterDupe, 205, 'Database balance must remain 205');
  console.log('  PASSED: Idempotency preserved and duplicate ignored\n');

  // -------------------------------------------------------------
  // Test 5: Pre-provisioning for New User Who Paid Before Registering
  // -------------------------------------------------------------
  console.log('Test 5: Pre-provisioning account when user pays before registering');
  const newEmail = `prepay_${Date.now()}@careerbot-test.io`;
  const refPrepay = `REF_PREPAY_${Date.now()}`;
  const fulfillmentNew = await fulfillPaystackPurchase({
    email: newEmail,
    amountInSmallestUnit: 2900000, // Career Accelerator (500 coins, 29,000 NGN)
    currency: 'NGN',
    reference: refPrepay,
  });

  assert.strictEqual(fulfillmentNew.success, true);
  assert.strictEqual(fulfillmentNew.credited, true);
  assert.strictEqual(fulfillmentNew.creditsAdded, 500, 'Career Accelerator adds 500 coins');
  assert.strictEqual(fulfillmentNew.newBalance, 505, 'Initial 5 bonus + 500 coins = 505');

  const newUser = await getUserByEmail(newEmail);
  assert(newUser !== null, 'Account must be pre-provisioned in database');
  assert.strictEqual(newUser!.credits, 505, 'Pre-provisioned user must have 505 coins ready');
  console.log('  PASSED: Pre-provisioned account created with 505 coins\n');

  // -------------------------------------------------------------
  // Test 6: Paystack Shop Order Event Fulfillment (order.created)
  // -------------------------------------------------------------
  console.log('Test 6: Fulfilling Paystack Shop order.created event');
  const shopCustomerEmail = `shop_buyer_${Date.now()}@careerbot-test.io`;
  const shopOrderRef = `ORD_${Date.now()}`;
  
  // Simulate order.created event payload from Paystack Shop
  const shopOrderFulfillment = await fulfillPaystackPurchase({
    email: shopCustomerEmail,
    amountInSmallestUnit: 1200000, // 12,000 NGN -> Pro Job Hunter (150 coins)
    currency: 'NGN',
    reference: shopOrderRef,
    extraContext: 'pro-job-hunter storefront order',
  });

  assert.strictEqual(shopOrderFulfillment.success, true);
  assert.strictEqual(shopOrderFulfillment.package.id, 'pro');
  assert.strictEqual(shopOrderFulfillment.creditsAdded, 150);
  assert.strictEqual(shopOrderFulfillment.newBalance, 155); // 5 initial + 150
  console.log('  PASSED: Paystack Shop order.created fulfilled with Pro Job Hunter package (150 coins)\n');

  // -------------------------------------------------------------
  // Test 7: Target User ID Override during Verification
  // -------------------------------------------------------------
  console.log('Test 7: Target user ID override when logged-in user email differs from Paystack checkout email');
  const loggedInUserEmail = `active_session_${Date.now()}@careerbot-test.io`;
  const checkoutEmail = `alternate_paystack_${Date.now()}@payment.com`;
  
  const activeUser = await createUser({
    name: 'Active Session User',
    email: loggedInUserEmail,
    password_hash: 'hash',
    salt: 'salt',
    initialCredits: 5,
  });

  const crossRef = `REF_CROSS_${Date.now()}`;
  const crossFulfillment = await fulfillPaystackPurchase({
    email: checkoutEmail,
    amountInSmallestUnit: 500000,
    currency: 'NGN',
    reference: crossRef,
    targetUserId: activeUser.id,
  });

  assert.strictEqual(crossFulfillment.success, true);
  assert.strictEqual(crossFulfillment.userId, activeUser.id, 'Must credit the active user ID');
  assert.strictEqual(crossFulfillment.newBalance, 55);

  const activeUserCoins = await getActualUserCredits(activeUser.id, loggedInUserEmail);
  assert.strictEqual(activeUserCoins, 55, 'Active user received the 50 coins');
  console.log('  PASSED: Coins properly credited to active logged-in account despite different checkout email\n');

  console.log('=== ALL PAYSTACK SHOP & WEBHOOK FULFILLMENT TESTS PASSED! ===');
}

runPaystackTests()
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(() => {
    const db = ensureLocalDb();
    db.users = db.users.filter(
      (u) =>
        !u.email.includes('paytest_') &&
        !u.email.includes('prepay_') &&
        !u.email.includes('shop_buyer_') &&
        !u.email.includes('active_session_')
    );
    db.transactions = (db.transactions || []).filter(
      (t) => !t.description.includes('REF_') && !t.description.includes('ORD_')
    );
    writeLocalDb(db);
  });

