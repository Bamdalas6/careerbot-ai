import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { verifyPasswordResetToken, updateUserPasswordByEmail } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid reset token is required.' },
        { status: 400 }
      );
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const email = await verifyPasswordResetToken(token.trim());
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const { hash, salt } = hashPassword(newPassword);
    const updated = await updateUserPasswordByEmail(email, hash, salt);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const authUser = usersData?.users?.find((u) => u.email?.toLowerCase() === email);
        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword });
        }
      } catch (e) {
        console.warn('Supabase password sync notice:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    });
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset. Please try again.' },
      { status: 500 }
    );
  }
}
