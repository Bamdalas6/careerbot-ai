import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetOtp } from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

    // 1. Check local / database OTP store
    const isDbValid = await verifyPasswordResetOtp(normalizedEmail, cleanOtp);
    if (isDbValid) {
      return NextResponse.json({
        success: true,
        message: 'Code verified successfully.',
      });
    }

    // 2. Fallback check with Supabase Auth verifyOtp
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: cleanOtp,
          type: 'recovery',
        });

        if (!error && data) {
          return NextResponse.json({
            success: true,
            message: 'Code verified successfully via Supabase.',
          });
        }
      } catch (supErr) {
        console.warn('Supabase verifyOtp notice:', supErr);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid or expired verification code. Please request a new one.' },
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
