import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting map for edge/serverless runtime
const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired keys periodically
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}

function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; reset: number } {
  cleanExpiredEntries();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = rateLimitMap.get(identifier);

  if (!existing || existing.resetAt <= now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, reset: Math.ceil(windowMs / 1000) };
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, reset: retryAfter };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    reset: Math.ceil((existing.resetAt - now) / 1000),
  };
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (ip) return ip;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // Security Headers applied to every response
  const applySecurityHeaders = (res: NextResponse) => {
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    return res;
  };

  // Only apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    let limit = 120; // Default general API limit: 120 req / min
    let windowSec = 60;
    let tier = 'general';

    // 1. Auth endpoints: stricter limit to protect against brute force and credential stuffing
    if (pathname.startsWith('/api/auth/')) {
      limit = 15;
      tier = 'auth';
    }
    // 2. Heavy AI & Resume processing endpoints: protect against LLM cost exhaustion
    else if (
      pathname.startsWith('/api/chat') ||
      pathname.startsWith('/api/tailor') ||
      pathname.startsWith('/api/cover-letter') ||
      pathname.startsWith('/api/resume/')
    ) {
      limit = 30;
      tier = 'ai_endpoints';
    }
    // 3. Payment & Credits verification: prevent reference hammering
    else if (pathname.startsWith('/api/credits/')) {
      limit = 30;
      tier = 'credits';
    }

    const key = `${tier}:${ip}`;
    const result = checkRateLimit(key, limit, windowSec);

    if (!result.allowed) {
      console.warn(`[RateLimit 429] Exceeded for IP ${ip} on ${pathname} (tier: ${tier})`);
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please slow down and try again in a few moments.',
          retryAfter: result.reset,
        },
        { status: 429 }
      );
      errorResponse.headers.set('Retry-After', String(result.reset));
      return applySecurityHeaders(errorResponse);
    }

    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', String(limit));
    res.headers.set('X-RateLimit-Remaining', String(result.remaining));
    res.headers.set('X-RateLimit-Reset', String(result.reset));
    return applySecurityHeaders(res);
  }

  const res = NextResponse.next();
  return applySecurityHeaders(res);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
