import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { verifyPasswordResetOtp } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const now = Date.now();

    // 1. Check in Supabase user_metadata (Cloud persistent)
    if (isSupabaseConfigured && supabase) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const authUser = usersData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

      if (authUser?.user_metadata) {
        const storedOtp = authUser.user_metadata.reset_otp;
        const storedExpires = authUser.user_metadata.reset_otp_expires;

        if (storedOtp === cleanOtp && (!storedExpires || Number(storedExpires) > now)) {
          // Invalidate used OTP
          await supabase.auth.admin.updateUserById(authUser.id, {
            user_metadata: {
              ...authUser.user_metadata,
              reset_otp: null,
              reset_otp_expires: null,
            },
          });

          return NextResponse.json({
            success: true,
            message: 'Verification code confirmed successfully.',
          });
        }
      }
    }

    // 2. Fallback check local / database OTP store
    const isDbValid = await verifyPasswordResetOtp(normalizedEmail, cleanOtp);
    if (isDbValid) {
      return NextResponse.json({
        success: true,
        message: 'Code verified successfully.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid or expired verification code. Please enter the correct code or request a new one.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
