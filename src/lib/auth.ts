import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionByToken, type UserRecord, type SessionRecord } from './db';

const SESSION_COOKIE_NAME = 'career_bot_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionTokenPayload {
  userId: string;
  email: string;
  exp: number;
  name?: string;
  credits?: number;
  last_free_credit_claim_at?: string;
  referral_code?: string;
}

const SESSION_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  'careerbot_ai_stateless_session_hmac_secret_key_2026';

/**
 * Creates an HMAC-signed stateless session token (payload = { userId, email, exp }).
 */
export function signSessionToken(payload: SessionTokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export const generateSessionToken = signSessionToken;

/**
 * Verifies an HMAC-signed session token.
 * Returns decoded SessionTokenPayload if signature is valid and unexpired; otherwise null.
 */
export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf-8'));
    if (!header || header.alg !== 'HS256') {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as SessionTokenPayload;
    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.userId !== 'string' ||
      !payload.userId.trim() ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= 0
    ) {
      return null;
    }

    if (payload.email !== undefined && typeof payload.email !== 'string') {
      return null;
    }
    if (payload.name !== undefined && typeof payload.name !== 'string') {
      return null;
    }
    if (
      payload.credits !== undefined &&
      (typeof payload.credits !== 'number' || !Number.isFinite(payload.credits) || payload.credits < 0)
    ) {
      return null;
    }
    if (payload.last_free_credit_claim_at !== undefined && typeof payload.last_free_credit_claim_at !== 'string') {
      return null;
    }
    if (payload.referral_code !== undefined && typeof payload.referral_code !== 'string') {
      return null;
    }

    const now = Date.now();
    const expMs = payload.exp > 1e11 ? payload.exp : payload.exp * 1000;
    if (!Number.isFinite(expMs) || expMs < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

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
 * Supports case-insensitive Bearer scheme (RFC 6750 / RFC 7235) and guards against null/undefined strings.
 */
export function extractTokenFromRequest(req: NextRequest): string | null {
  // 1. Check Authorization Bearer header (case-insensitive per RFC 6750 / RFC 7235)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(\S+)/i);
    if (match && match[1] && match[1] !== 'undefined' && match[1] !== 'null') {
      return match[1].trim();
    }
  }

  // 2. Check HTTP cookie
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value && cookie.value !== 'undefined' && cookie.value !== 'null') {
    return cookie.value.trim();
  }

  return null;
}

/**
 * Authenticates the current request and returns the UserRecord if valid.
 * Tries the Authorization Bearer header first, with automatic fallback to session cookie.
 */
export async function authenticateRequest(req: NextRequest): Promise<{ user: UserRecord; session: SessionRecord } | null> {
  // 1. Try Bearer token from Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(\S+)/i);
    if (match && match[1] && match[1] !== 'undefined' && match[1] !== 'null') {
      const auth = await getSessionByToken(match[1].trim());
      if (auth) return auth;
    }
  }

  // 2. Try HTTP cookie (fallback if Bearer header is missing, expired, or invalid)
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (cookie?.value && cookie.value !== 'undefined' && cookie.value !== 'null') {
    const auth = await getSessionByToken(cookie.value.trim());
    if (auth) return auth;
  }

  return null;
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
    last_free_credit_claim_at: user.last_free_credit_claim_at,
    referral_code: user.referral_code,
    referral_count: user.referral_count || 0,
    referral_earnings: user.referral_earnings || 0,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
