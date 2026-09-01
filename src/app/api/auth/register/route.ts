import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, createSession } from '@/lib/db';
import { hashPassword, setSessionCookie, sanitizeUser } from '@/lib/auth';

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
    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
    }

    const { hash, salt } = hashPassword(password);
    const user = createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hash,
      salt,
      initialCredits: 25, // 25 free credits upon sign up
    });

    const session = createSession(user.id);
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
