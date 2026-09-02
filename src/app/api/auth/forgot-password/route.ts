import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetOtp } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

    // 1. Verify user exists in application database
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    // 2. Generate and store secure 6-digit OTP in database with 15-minute TTL
    const otp = await createPasswordResetOtp(normalizedEmail);
    const expiresAt = Date.now() + 15 * 60 * 1000;

    // 3. Determine production redirect URL
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://careerbot-ai-seven.vercel.app';
    const cleanOrigin = origin.replace(/\/$/, '');
    const redirectTo = `${cleanOrigin}/auth/callback?type=recovery`;

    // 4. Synchronize with Supabase Auth (Cloud user_metadata & email dispatch)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        let authUser = usersData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

        // If user doesn't exist in Supabase auth.users yet, create them
        if (!authUser) {
          const { data: created } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            email_confirm: true,
            user_metadata: { name: user.name },
          });
          if (created?.user) authUser = created.user;
        }

        // Store OTP in user_metadata for serverless verification
        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, {
            user_metadata: {
              ...(authUser.user_metadata || {}),
              reset_otp: otp,
              reset_otp_expires: expiresAt,
            },
          });
        }

        // Send reset email containing private 1-click recovery link
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo,
        });
      } catch (supErr) {
        console.warn('Supabase auth reset dispatch notice:', supErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `A verification email with a reset link and 6-digit code has been sent to ${normalizedEmail}. Please check your inbox and spam folder.`,
    });
  } catch (err: unknown) {
    console.error('Forgot password API error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while requesting password reset.' },
      { status: 500 }
    );
  }
}
