import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetOtp } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify user exists in database
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase authentication service is not configured.' },
        { status: 500 }
      );
    }

    // Determine the production application redirect URL
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://careerbot-ai-seven.vercel.app';
    const cleanOrigin = origin.replace(/\/$/, '');
    const redirectTo = `${cleanOrigin}/auth/callback?type=recovery`;

    // Ensure the user exists in Supabase Auth (auth.users)
    try {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const authUserExists = usersData?.users?.some((u) => u.email?.toLowerCase() === normalizedEmail);

      if (!authUserExists) {
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          user_metadata: { name: user.name },
        });
      }
    } catch (adminErr) {
      console.warn('Supabase admin check notice:', adminErr);
    }

    // Generate cryptographically secure 6-digit OTP stored in database (15 min expiry)
    const otp = await createPasswordResetOtp(normalizedEmail);

    // Trigger Supabase reset password email with explicit production redirect URL
    try {
      await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
    } catch (resetErr) {
      console.warn('Supabase resetPasswordForEmail notice:', resetErr);
    }

    return NextResponse.json({
      success: true,
      message: `A verification code has been dispatched for ${normalizedEmail}.`,
    });
  } catch (err: unknown) {
    console.error('Forgot password API error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
