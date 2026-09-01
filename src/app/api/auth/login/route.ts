import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession } from '@/lib/db';
import { verifyPassword, setSessionCookie, sanitizeUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const session = createSession(user.id);
    const safeUser = sanitizeUser(user);

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user: safeUser,
      token: session.token,
    });

    return setSessionCookie(response, session.token);
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Failed to sign in. Please try again.' }, { status: 500 });
  }
}
