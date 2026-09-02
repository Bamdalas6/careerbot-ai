import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, verifyPassword, hashPassword } from '@/lib/auth';
import { updateUserPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New password and confirmation do not match.' },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, auth.user.password_hash, auth.user.salt);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, error: 'Your current password is incorrect.' },
        { status: 400 }
      );
    }

    // Generate new hash and salt
    const { hash, salt } = hashPassword(newPassword);
    const updated = await updateUserPassword(auth.user.id, hash, salt);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update password in database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err: unknown) {
    console.error('Change password error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to change password. Please try again.' },
      { status: 500 }
    );
  }
}
