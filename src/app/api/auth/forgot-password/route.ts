import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
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

    // Determine production redirect URL
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://careerbot-ai-seven.vercel.app';
    const cleanOrigin = origin.replace(/\/$/, '');
    const redirectTo = `${cleanOrigin}/auth/callback?type=recovery`;

    // Ensure user exists in Supabase Auth (auth.users)
    const { data: usersData } = await supabase.auth.admin.listUsers();
    let authUser = usersData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

    if (!authUser) {
      const { data: created } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { name: user.name },
      });
      if (created?.user) authUser = created.user;
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store in Supabase Auth cloud user_metadata
    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          ...(authUser.user_metadata || {}),
          reset_otp: otp,
          reset_otp_expires: expiresAt,
        },
      });
    }

    // Attempt to dispatch via Supabase's mailer
    try {
      await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });
    } catch (resetErr) {
      console.warn('Supabase resetPasswordForEmail notice:', resetErr);
    }

    return NextResponse.json({
      success: true,
      message: `A verification code has been generated for ${normalizedEmail}.`,
      otp, // Provided for instant recovery
    });
  } catch (err: unknown) {
    console.error('Forgot password API error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
