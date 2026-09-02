import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { updateUserPasswordByEmail, getUserByEmail } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email.' },
        { status: 404 }
      );
    }

    const { hash, salt } = hashPassword(newPassword);
    const updated = await updateUserPasswordByEmail(email, hash, salt);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update password.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    });
  } catch (err: unknown) {
    console.error('Password reset sync error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset.' },
      { status: 500 }
    );
  }
}
