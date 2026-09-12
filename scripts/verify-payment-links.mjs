import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { CREDIT_PACKAGES } from '../src/types/credits.ts';

console.log('=== VERIFYING LIVE PAYSTACK PAYMENT LINKS & BUTTONS ===\n');

// Test 1: Verify CREDIT_PACKAGES contains correct links
console.log('Test 1: Verify CREDIT_PACKAGES payment links');
const starter = CREDIT_PACKAGES.find((p) => p.id === 'starter');
assert(starter !== undefined, 'Starter pack must exist');
assert.strictEqual(
  starter.payment_link,
  'https://paystack.shop/pay/-starterpack',
  'Starter pack payment link must match exactly'
);

const pro = CREDIT_PACKAGES.find((p) => p.id === 'pro');
assert(pro !== undefined, 'Pro Job Hunter pack must exist');
assert.strictEqual(
  pro.payment_link,
  'https://paystack.shop/pay/pro-job-hunter',
  'Pro Job Hunter payment link must match exactly'
);

const accelerator = CREDIT_PACKAGES.find((p) => p.id === 'accelerator');
assert(accelerator !== undefined, 'Career Accelerator pack must exist');
assert.strictEqual(
  accelerator.payment_link,
  'https://paystack.shop/pay/career-accelerator',
  'Career Accelerator payment link must match exactly'
);
console.log('  PASSED: All 3 packages defined with exact Paystack payment links\n');

// Test 2: Verify Pricing page has live buttons linking to payment links
console.log('Test 2: Verify Pricing page live buttons');
const pricingSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/pricing/page.tsx'), 'utf-8');
assert(pricingSrc.includes('href={pkg.payment_link}'), 'Pricing page cards must link to pkg.payment_link');
assert(pricingSrc.includes('target="_blank"'), 'Pricing page buttons must open in a new tab');
assert(pricingSrc.includes('rel="noopener noreferrer"'), 'Pricing page links must have security attributes');
assert(pricingSrc.includes('Get {pkg.name}'), 'Pricing page button text must invite user to get package');
console.log('  PASSED: Pricing page cards contain live direct payment links\n');

// Test 3: Verify CreditTopUpModal has live Buy buttons for each package
console.log('Test 3: Verify CreditTopUpModal live Buy buttons');
const modalSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/Credits/CreditTopUpModal.tsx'), 'utf-8');
assert(modalSrc.includes('href={pkg.payment_link}') || modalSrc.includes('href={checkoutUrl}'), 'Modal packages must have link to pkg.payment_link');
assert(modalSrc.includes('<span>Buy</span>'), 'Modal must contain Buy button');
assert(modalSrc.includes('target="_blank"'), 'Modal buy button must open in new tab');
console.log('  PASSED: CreditTopUpModal contains live Buy buttons for each package\n');

// Test 4: Verify topup API route supports package link resolution
console.log('Test 4: Verify topup API route package resolution');
const topupSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/api/credits/topup/route.ts'), 'utf-8');
assert(topupSrc.includes('paymentUrl: pkg.payment_link'), 'Topup API route must resolve paymentUrl from package');
console.log('  PASSED: Topup API route resolves paymentUrl\n');

console.log('=== ALL PAYMENT LINK VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
