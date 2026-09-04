import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, setSessionCookie, sanitizeUser } from '@/lib/auth';
import { verifyPasswordResetToken, updateUserPasswordByEmail, getUserByEmail, createSession } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, newPassword, email: providedEmail } = body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    let email: string | null = null;

    // 1. Primary: Verify token if token is provided
    if (token && typeof token === 'string' && token.trim().length > 0) {
      email = await verifyPasswordResetToken(token.trim());
    }

    // 2. Secondary: If from Supabase Auth recovery session
    if (!email && providedEmail && typeof providedEmail === 'string') {
      const authHeader = req.headers.get('authorization');
      if (authHeader && isSupabaseConfigured && supabase) {
        try {
          const sbToken = authHeader.replace(/^Bearer\s+/i, '');
          const { data: userData } = await supabase.auth.getUser(sbToken);
          if (userData?.user?.email?.toLowerCase() === providedEmail.trim().toLowerCase()) {
            email = providedEmail.trim().toLowerCase();
          }
        } catch {
          /* ignore */
        }
      }
    }

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

    // Sync to Supabase Auth cloud
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

    // Auto-login: Create session so the user does NOT need to type email & password again
    const user = await getUserByEmail(email);
    let sessionToken = '';
    if (user) {
      const session = await createSession(user.id, 30, user.email);
      sessionToken = session.token;
    }

    const response = NextResponse.json({
      success: true,
      message: 'Password updated successfully! Logging you in...',
      user: user ? sanitizeUser(user) : null,
      token: sessionToken,
    });

    if (sessionToken) {
      return setSessionCookie(response, sessionToken);
    }

    return response;
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to process password reset. Please try again.' },
      { status: 500 }
    );
  }
}
