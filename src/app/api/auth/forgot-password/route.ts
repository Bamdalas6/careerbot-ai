import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);

    // Security: don't reveal whether email exists (prevents enumeration)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists for that email, a password reset link has been sent.',
      });
    }

    // Generate secure token (raw goes to email, only hash stored in DB)
    const rawToken = await createPasswordResetToken(normalizedEmail);

    // Send via Resend
    const emailResult = await sendPasswordResetEmail(normalizedEmail, user.name, rawToken);

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'A password reset link has been sent to your email. Please check your inbox and spam folder.',
    });
  } catch (err: unknown) {
    console.error('Forgot password API error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
