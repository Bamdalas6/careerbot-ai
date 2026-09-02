import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, createSession } from '@/lib/db';
import { hashPassword, setSessionCookie, sanitizeUser } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

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

    const { hash, salt } = hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hash,
      salt,
      initialCredits: 25, // 25 free credits upon sign up
    });

    // Also sync to Supabase Auth so native password resets and OTPs work out-of-the-box
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: { name: name.trim() },
        });
      } catch (authErr) {
        console.warn('Supabase auth.admin.createUser notice:', authErr);
      }
    }

    const session = await createSession(user.id);
    const safeUser = sanitizeUser(user);

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully! 25 free credits have been added.',
      user: safeUser,
      token: session.token,
    });

    return setSessionCookie(response, session.token);
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create account. Please try again.' }, { status: 500 });
  }
}
