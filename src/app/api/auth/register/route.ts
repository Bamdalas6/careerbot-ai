import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, createSession, getUserByReferralCode, processReferralReward } from '@/lib/db';
import { hashPassword, setSessionCookie, sanitizeUser } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, ref_code } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Please enter a valid name (at least 2 characters).' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
    }

    // Lookup referrer if ref_code was provided in body, cookies, or full URL
    const rawRef =
      (ref_code && typeof ref_code === 'string' && ref_code.trim()) ||
      req.cookies.get('careerbot_ref')?.value ||
      null;

    let referrerUser = null;
    if (rawRef) {
      let clean = rawRef.trim();
      if (clean.includes('ref=')) {
        clean = clean.split('ref=')[1].split('&')[0];
      }
      clean = clean.replace(/^@/, '').replace(/\/$/, '').trim();
      if (clean) {
        referrerUser = await getUserByReferralCode(clean);
      }
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const { hash, salt } = hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hash,
      salt,
      initialCredits: 25, // 25 free credits upon sign up
      referred_by: referrerUser ? referrerUser.id : undefined,
      signup_ip: clientIp,
    });

    // Reward the referrer with 10 free tokens
    if (referrerUser && referrerUser.id !== user.id) {
      try {
        await processReferralReward(referrerUser.id, user.id, user.name, clientIp);
      } catch (refErr) {
        console.warn('Referral reward payout notice:', refErr);
      }
    }

    // Also sync to Supabase Auth so native password resets and OTPs work out-of-the-box
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: {
            name: name.trim(),
            referral_code: user.referral_code,
            referred_by: referrerUser ? referrerUser.id : null,
            credits: 25,
            referral_count: 0,
            referral_earnings: 0,
            signup_ip: clientIp,
          },
        });
      } catch (authErr) {
        console.warn('Supabase auth.admin.createUser notice:', authErr);
      }
    }

    const session = await createSession(user.id);
    const safeUser = sanitizeUser(user);

    const response = NextResponse.json({
      success: true,
      message: referrerUser
        ? `Welcome! 25 free credits added to your account. Your friend earned 10 bonus tokens for the referral!`
        : `Account created successfully! 25 free credits have been added.`,
      user: safeUser,
      token: session.token,
    });

    return setSessionCookie(response, session.token);
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create account. Please try again.' }, { status: 500 });
  }
}
