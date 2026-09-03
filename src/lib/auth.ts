import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken, UserRecord, SessionRecord } from './db';

const SESSION_COOKIE_NAME = 'career_bot_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Hashes a plaintext password using crypto.pbkdf2Sync.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verifies a password against a stored hash and salt.
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash || !salt) return false;
  try {
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const bufA = Buffer.from(testHash, 'hex');
    const bufB = Buffer.from(hash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Extracts session token from Cookie or Authorization header.
 */
export function extractTokenFromRequest(req: NextRequest): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 2. Check HTTP cookie
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value) {
    return cookie.value;
  }

  return null;
}

/**
 * Authenticates the current request and returns the UserRecord if valid.
 */
export async function authenticateRequest(req: NextRequest): Promise<{ user: UserRecord; session: SessionRecord } | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  return await getSessionByToken(token);
}

/**
 * Sets session cookie on an outgoing NextResponse.
 */
export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

/**
 * Clears session cookie on an outgoing NextResponse.
 */
export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}

/**
 * Strips password hash and salt for safe client consumption.
 */
export function sanitizeUser(user: UserRecord): Omit<UserRecord, 'password_hash' | 'salt'> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    credits: user.credits,
    referral_code: user.referral_code,
    referral_count: user.referral_count || 0,
    referral_earnings: user.referral_earnings || 0,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
