import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import {
  signSessionToken,
  verifySessionToken,
  authenticateRequest,
  extractTokenFromRequest,
  type SessionTokenPayload,
} from '../src/lib/auth';
import { createSession, getSessionByToken, createUser, getUserByEmail, getUserById } from '../src/lib/db';

async function runTests() {
  console.log('=== RUNNING SESSION PERSISTENCE TEST SUITE ===\n');

  const nowSec = Math.floor(Date.now() / 1000);

  // Test 1: HMAC Token Sign & Verify
  console.log('Test 1: HMAC Token Sign & Verify');
  const testPayload: SessionTokenPayload = {
    userId: 'user_test_123',
    email: 'tester@example.com',
    exp: nowSec + 3600,
    name: 'Test User',
    credits: 50,
  };

  const token = signSessionToken(testPayload);
  assert(token && typeof token === 'string', 'Token must be a string');
  assert.strictEqual(token.split('.').length, 3, 'Token must be header.payload.signature format');

  const verified = verifySessionToken(token);
  assert(verified !== null, 'Token must verify successfully');
  assert.strictEqual(verified.userId, testPayload.userId);
  assert.strictEqual(verified.email, testPayload.email);
  assert.strictEqual(verified.name, testPayload.name);
  assert.strictEqual(verified.credits, testPayload.credits);
  console.log('  PASSED: Token correctly signed and verified\n');

  // Test 2: Tampered Token Rejection
  console.log('Test 2: Tampered Token Rejection');
  const parts = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...testPayload, userId: 'hacked_id' })
  ).toString('base64url');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  const tamperedResult = verifySessionToken(tamperedToken);
  assert.strictEqual(tamperedResult, null, 'Tampered token must fail verification');
  console.log('  PASSED: Tampered token was rejected\n');

  // Test 3: Expired Token Rejection
  console.log('Test 3: Expired Token Rejection');
  const expiredPayload: SessionTokenPayload = {
    userId: 'user_expired',
    email: 'expired@example.com',
    exp: nowSec - 100, // already expired
  };
  const expiredToken = signSessionToken(expiredPayload);
  const expiredResult = verifySessionToken(expiredToken);
  assert.strictEqual(expiredResult, null, 'Expired token must fail verification');
  console.log('  PASSED: Expired token was rejected\n');

  // Test 4: Cold Start Lambda Resilience (User not in local db)
  console.log('Test 4: Cold Start Lambda Resilience (User not in local DB)');
  const coldStartPayload: SessionTokenPayload = {
    userId: `user_cold_${Date.now()}`,
    email: 'coldstart@example.com',
    exp: nowSec + 86400,
    name: 'Cold Start User',
    credits: 42,
  };
  const coldToken = signSessionToken(coldStartPayload);
  const authResult = await getSessionByToken(coldToken);
  assert(authResult !== null, 'getSessionByToken must succeed for valid HMAC token even on cold start');
  assert.strictEqual(authResult.user.id, coldStartPayload.userId);
  assert.strictEqual(authResult.user.email, coldStartPayload.email);
  assert.strictEqual(authResult.user.name, coldStartPayload.name);
  assert.strictEqual(authResult.user.credits, 42);
  assert.strictEqual(authResult.session.token, coldToken);
  console.log('  PASSED: getSessionByToken hydrated user statelessly without database dependency\n');

  // Test 5: createSession integration
  console.log('Test 5: createSession generates HMAC-signed tokens');
  const testUser = await createUser({
    name: 'Database User',
    email: `dbuser_${Date.now()}@example.com`,
    password_hash: 'hash',
    salt: 'salt',
    initialCredits: 30,
  });
  const dbSession = await createSession(testUser.id, 30, testUser.email);
  assert(dbSession.token.split('.').length === 3, 'createSession must generate HMAC 3-part token');
  const dbSessionLookup = await getSessionByToken(dbSession.token);
  assert(dbSessionLookup !== null, 'Lookup of createSession token must succeed');
  assert.strictEqual(dbSessionLookup.user.id, testUser.id);
  assert.strictEqual(dbSessionLookup.user.email, testUser.email);
  console.log('  PASSED: createSession generates valid verifiable HMAC tokens\n');

  // Test 6: NextRequest Authorization Bearer extraction (Standard, lowercase, multiple spaces)
  console.log('Test 6: NextRequest Authorization Bearer Header (Case-Insensitive & Spacing)');
  const standardReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { authorization: `Bearer ${coldToken}` },
  });
  assert.strictEqual(extractTokenFromRequest(standardReq), coldToken, 'extractTokenFromRequest must extract Bearer token');
  const bearerAuth = await authenticateRequest(standardReq);
  assert(bearerAuth !== null, 'authenticateRequest must succeed with standard Bearer header');

  // Lowercase bearer test (RFC 6750 / RFC 7235 compliance)
  const lowercaseReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { authorization: `bearer ${coldToken}` },
  });
  assert.strictEqual(extractTokenFromRequest(lowercaseReq), coldToken, 'extractTokenFromRequest must support lowercase bearer');

  // Extra whitespace test
  const spacedReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { authorization: `Bearer    ${coldToken}` },
  });
  assert.strictEqual(extractTokenFromRequest(spacedReq), coldToken, 'extractTokenFromRequest must handle extra spaces');
  console.log('  PASSED: Bearer token extraction verified across case schemes\n');

  // Test 7: NextRequest Cookie extraction & authentication
  console.log('Test 7: NextRequest Cookie Authentication');
  const cookieReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: {
      cookie: `career_bot_session=${dbSession.token}`,
    },
  });
  const cookieAuth = await authenticateRequest(cookieReq);
  assert(cookieAuth !== null, 'authenticateRequest must succeed with session cookie');
  assert.strictEqual(cookieAuth.user.id, testUser.id);
  console.log('  PASSED: Cookie authentication verified\n');

  // Test 8: Verify GlassHeader.tsx uses <Link> instead of raw <a>
  console.log('Test 8: GlassHeader.tsx uses <Link> instead of raw <a>');
  const headerContent = fs.readFileSync(
    path.join(process.cwd(), 'src/components/Hero/GlassHeader.tsx'),
    'utf-8'
  );
  assert(!headerContent.includes('<a href="/pricing"'), 'GlassHeader must not contain <a href="/pricing"');
  assert(!headerContent.includes('<a\n                key={link.href}\n                href={link.href}'), 'GlassHeader must not use <a> for nav links');
  assert(headerContent.includes('<Link\n                key={link.href}\n                href={link.href}'), 'GlassHeader must use <Link> for nav links');
  assert(/<Link[\s\S]*?href="\/pricing"/.test(headerContent), 'GlassHeader must use <Link href="/pricing"> for mobile nav');
  console.log('  PASSED: GlassHeader uses Next.js <Link> for client-side navigation\n');

  // Test 9: Verify SiteFooter.tsx uses <Link> for internal links
  console.log('Test 9: SiteFooter.tsx uses <Link> for internal links');
  const footerContent = fs.readFileSync(
    path.join(process.cwd(), 'src/components/Sections/SiteFooter.tsx'),
    'utf-8'
  );
  assert(footerContent.includes("import Link from 'next/link';"), 'SiteFooter must import Link');
  assert(footerContent.includes('<Link\n                        href={link.href || \'#\'}'), 'SiteFooter must use Link for internal navigation');
  console.log('  PASSED: SiteFooter uses Next.js <Link> for internal links\n');

  // Test 10: Verify AuthContext.tsx persistence & hydration
  console.log('Test 10: AuthContext.tsx localStorage persistence and hydration');
  const authContextContent = fs.readFileSync(
    path.join(process.cwd(), 'src/context/AuthContext.tsx'),
    'utf-8'
  );
  assert(authContextContent.includes('careerbot_user'), 'AuthContext must use careerbot_user in localStorage');
  assert(authContextContent.includes('careerbot_token'), 'AuthContext must use careerbot_token in localStorage');
  assert(authContextContent.includes('Authorization'), 'AuthContext must send Authorization header');
  assert(authContextContent.includes('Bearer'), 'AuthContext must use Bearer token');
  console.log('  PASSED: AuthContext implements full localStorage persistence and Bearer headers\n');

  // Test 11: Verify pricing/page.tsx displays active session & credits
  console.log('Test 11: pricing/page.tsx active session display');
  const pricingContent = fs.readFileSync(
    path.join(process.cwd(), 'src/app/pricing/page.tsx'),
    'utf-8'
  );
  assert(pricingContent.includes('credits'), 'Pricing page must use credits from useAuth');
  assert(pricingContent.includes('Active Session:'), 'Pricing page must show Active Session indicator');
  assert(pricingContent.includes('Credits Available'), 'Pricing page must display credits count');
  console.log('  PASSED: Pricing page displays active session and credits\n');

  // Test 12: Edge cases: empty, malformed, invalid auth headers & non-numeric exp
  console.log('Test 12: Edge cases handling & Non-Numeric exp hardening');
  assert.strictEqual(verifySessionToken(''), null, 'Empty token must return null');
  assert.strictEqual(verifySessionToken('not.a.token'), null, 'Invalid token must return null');
  assert.strictEqual(verifySessionToken('part1.part2'), null, '2-part token must return null');
  assert.strictEqual(verifySessionToken('a.b.c.d'), null, '4-part token must return null');

  // Token without userId
  const invalidPayloadToken = signSessionToken({ userId: '', email: 'test@example.com', exp: nowSec + 1000 });
  assert.strictEqual(verifySessionToken(invalidPayloadToken), null, 'Token without userId must return null');

  // Non-numeric exp bypass test (string 'never')
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'careerbot_ai_stateless_session_hmac_secret_key_2026';
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ userId: 'u_hack', email: 'hack@example.com', exp: 'never' })).toString('base64url');
  const d = `${h}.${p}`;
  const s = crypto.createHmac('sha256', secret).update(d).digest('base64url');
  const stringExpToken = `${d}.${s}`;
  assert.strictEqual(verifySessionToken(stringExpToken), null, 'Token with string exp must be rejected as null');

  // Non-HS256 header (e.g. alg: none)
  const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const noneData = `${noneHeader}.${p}`;
  const noneSig = crypto.createHmac('sha256', secret).update(noneData).digest('base64url');
  assert.strictEqual(verifySessionToken(`${noneData}.${noneSig}`), null, 'Token with non-HS256 alg must be rejected');

  // Negative or zero exp
  const zeroExpToken = signSessionToken({ userId: 'u_zero', email: 'zero@example.com', exp: 0 });
  assert.strictEqual(verifySessionToken(zeroExpToken), null, 'Token with exp <= 0 must return null');

  // Millisecond timestamp expiration support
  const msExpToken = signSessionToken({ userId: 'u_ms', email: 'ms@example.com', exp: Date.now() + 100000 });
  assert.notStrictEqual(verifySessionToken(msExpToken), null, 'Token with ms exp must verify successfully');

  // Non-bearer authorization header
  const basicReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { authorization: 'Basic dXNlcjpwYXNz' },
  });
  assert.strictEqual(extractTokenFromRequest(basicReq), null, 'Basic auth header must not be treated as session token');

  // Empty Bearer header
  const emptyBearerReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { authorization: 'Bearer   ' },
  });
  assert.strictEqual(extractTokenFromRequest(emptyBearerReq), null, 'Empty Bearer must return null');

  // 'undefined' and 'null' string tokens in Bearer header
  const undefBearerReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { authorization: 'Bearer undefined' },
  });
  assert.strictEqual(extractTokenFromRequest(undefBearerReq), null, 'Bearer undefined must return null');

  const nullBearerReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: { authorization: 'Bearer null' },
  });
  assert.strictEqual(extractTokenFromRequest(nullBearerReq), null, 'Bearer null must return null');

  console.log('  PASSED: All edge cases and non-numeric exp hardening verified\n');

  // Test 13: Cold start zero credit balance preservation
  console.log('Test 13: Cold start zero credit balance preservation');
  const zeroCreditsPayload: SessionTokenPayload = {
    userId: `user_zero_${Date.now()}`,
    email: 'zerocreds@example.com',
    exp: nowSec + 86400,
    name: 'Zero Credits User',
    credits: 0,
  };
  const zeroCredsToken = signSessionToken(zeroCreditsPayload);
  const zeroCredsAuth = await getSessionByToken(zeroCredsToken);
  assert(zeroCredsAuth !== null, 'getSessionByToken must succeed for 0-credits user');
  assert.strictEqual(zeroCredsAuth.user.credits, 0, 'User with 0 credits must retain 0 credits, not default to 25');
  console.log('  PASSED: Zero credits balance preserved correctly\n');

  // Test 14: Reset password page persistence check
  console.log('Test 14: Reset password page localStorage persistence check');
  const resetPasswordPageContent = fs.readFileSync(
    path.join(process.cwd(), 'src/app/auth/reset-password/page.tsx'),
    'utf-8'
  );
  assert(resetPasswordPageContent.includes("localStorage.setItem('careerbot_user'"), 'Reset password page must persist user');
  assert(resetPasswordPageContent.includes("localStorage.setItem('careerbot_token'"), 'Reset password page must persist token');
  console.log('  PASSED: Reset password page persistence verified\n');

  // Test 15: Dual Cookie Fallback in authenticateRequest when Bearer header is invalid or expired
  console.log('Test 15: Dual Cookie Fallback in authenticateRequest');
  const validCookieUser = await createUser({
    name: 'Cookie User',
    email: `cookieuser_${Date.now()}@example.com`,
    password_hash: 'hash',
    salt: 'salt',
    initialCredits: 15,
  });
  const validCookieSession = await createSession(validCookieUser.id, 30, validCookieUser.email);

  // Request with EXPIRED Bearer token BUT VALID session cookie
  const expiredBearerToken = signSessionToken({
    userId: 'expired_user',
    email: 'expired@example.com',
    exp: nowSec - 500,
  });
  const dualReq = new NextRequest('http://localhost:3000/api/auth/me', {
    headers: {
      authorization: `Bearer ${expiredBearerToken}`,
      cookie: `career_bot_session=${validCookieSession.token}`,
    },
  });
  const dualAuth = await authenticateRequest(dualReq);
  assert(dualAuth !== null, 'authenticateRequest must fall back to valid cookie when Bearer token is expired/invalid');
  assert.strictEqual(dualAuth.user.id, validCookieUser.id, 'Must authenticate as cookie user when Bearer token is expired');
  console.log('  PASSED: authenticateRequest successfully fell back to valid cookie on expired header token\n');

  // Test 16: Safe handling of invalid types for getUserByEmail and getUserById
  console.log('Test 16: Safe handling of invalid types in getUserByEmail and getUserById');
  // @ts-ignore
  assert.strictEqual(await getUserByEmail(undefined), null, 'getUserByEmail(undefined) must safely return null');
  // @ts-ignore
  assert.strictEqual(await getUserByEmail(null), null, 'getUserByEmail(null) must safely return null');
  // @ts-ignore
  assert.strictEqual(await getUserByEmail(123), null, 'getUserByEmail(number) must safely return null');
  // @ts-ignore
  assert.strictEqual(await getUserById(undefined), null, 'getUserById(undefined) must safely return null');
  // @ts-ignore
  assert.strictEqual(await getUserById(null), null, 'getUserById(null) must safely return null');
  assert.strictEqual(await getUserById('   '), null, 'getUserById(whitespace) must safely return null');
  console.log('  PASSED: getUserByEmail and getUserById handle invalid types safely without crashing\n');

  // Test 17: Strict payload type validation in verifySessionToken
  console.log('Test 17: Strict payload type validation in verifySessionToken');
  const secret17 = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'careerbot_ai_stateless_session_hmac_secret_key_2026';
  const h17 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

  // Non-string email
  const badEmailPayload = Buffer.from(JSON.stringify({ userId: 'u1', email: 12345, exp: nowSec + 1000 })).toString('base64url');
  const badEmailToken = `${h17}.${badEmailPayload}.${crypto.createHmac('sha256', secret17).update(`${h17}.${badEmailPayload}`).digest('base64url')}`;
  assert.strictEqual(verifySessionToken(badEmailToken), null, 'Token with non-string email must be rejected');

  // Non-string name
  const badNamePayload = Buffer.from(JSON.stringify({ userId: 'u1', email: 'a@b.com', name: 999, exp: nowSec + 1000 })).toString('base64url');
  const badNameToken = `${h17}.${badNamePayload}.${crypto.createHmac('sha256', secret17).update(`${h17}.${badNamePayload}`).digest('base64url')}`;
  assert.strictEqual(verifySessionToken(badNameToken), null, 'Token with non-string name must be rejected');

  // Negative credits
  const negCreditsPayload = Buffer.from(JSON.stringify({ userId: 'u1', email: 'a@b.com', credits: -10, exp: nowSec + 1000 })).toString('base64url');
  const negCreditsToken = `${h17}.${negCreditsPayload}.${crypto.createHmac('sha256', secret17).update(`${h17}.${negCreditsPayload}`).digest('base64url')}`;
  assert.strictEqual(verifySessionToken(negCreditsToken), null, 'Token with negative credits must be rejected');
  console.log('  PASSED: verifySessionToken strictly validates payload field types\n');

  // Test 18: Mobile menu, settings page, and settings modal fallback checks
  console.log('Test 18: Mobile menu, settings page, and modal user.name defensive fallbacks');
  const glassHeaderSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/Hero/GlassHeader.tsx'), 'utf-8');
  assert(!glassHeaderSrc.includes('{user.name.charAt(0)'), 'GlassHeader must not have unprotected user.name.charAt(0)');
  assert(glassHeaderSrc.includes('(user.name || user.email || \'U\').charAt(0)'), 'GlassHeader must have defensive avatar initial fallback');

  const settingsPageSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/settings/page.tsx'), 'utf-8');
  assert(!settingsPageSrc.includes('{user.name.charAt(0)'), 'Settings page must not have unprotected user.name.charAt(0)');

  const settingsModalSrc = fs.readFileSync(path.join(process.cwd(), 'src/components/Settings/SettingsModal.tsx'), 'utf-8');
  assert(!settingsModalSrc.includes('{user.name.charAt(0)'), 'SettingsModal must not have unprotected user.name.charAt(0)');
  console.log('  PASSED: Defensive fallbacks for user.name verified across all header and settings components\n');

  // Test 19: /api/auth/me response includes token for client self-healing session
  console.log('Test 19: /api/auth/me response includes token');
  const authMeSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/api/auth/me/route.ts'), 'utf-8');
  assert(authMeSrc.includes('token: auth.session.token'), '/api/auth/me must return token for client session self-healing');
  console.log('  PASSED: /api/auth/me returns token property for client storage synchronization\n');

  // Test 20: Dual session deletion in POST /api/auth/logout
  console.log('Test 20: POST /api/auth/logout dual token deletion');
  const logoutSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/api/auth/logout/route.ts'), 'utf-8');
  assert(logoutSrc.includes('bearerToken'), 'Logout route must extract bearerToken');
  assert(logoutSrc.includes('cookieToken'), 'Logout route must extract cookieToken');
  console.log('  PASSED: Logout route cleanly cleans up both bearer header and cookie sessions\n');

  console.log('=== ALL 20 VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
