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

    // Resolve current active site URL from request headers (guarantees link matches active site)
    const originHeader = req.headers.get('origin');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const hostHeader = req.headers.get('host');

    let siteUrl = 'https://careerbot-ai-seven.vercel.app';
    if (originHeader && !originHeader.includes('localhost') && originHeader.startsWith('http')) {
      siteUrl = originHeader.replace(/\/$/, '');
    } else if (forwardedHost && !forwardedHost.includes('localhost')) {
      siteUrl = `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '');
    } else if (hostHeader && !hostHeader.includes('localhost')) {
      siteUrl = `${forwardedProto}://${hostHeader}`.replace(/\/$/, '');
    } else if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    }

    // 1. Try sending via Resend (direct link to active domain)
    let resendSent = false;
    let resendErrorMsg = '';

    try {
      const emailResult = await sendPasswordResetEmail(normalizedEmail, user.name, rawToken, siteUrl);
      if (emailResult.success) {
        resendSent = true;
      } else {
        resendErrorMsg = emailResult.error || '';
        console.warn('[ForgotPassword] Resend delivery notice:', resendErrorMsg);
      }
    } catch (e) {
      resendErrorMsg = e instanceof Error ? e.message : 'Resend error';
      console.warn('[ForgotPassword] Resend exception:', resendErrorMsg);
    }

    // 2. Fallback: ONLY dispatch via Supabase Auth if Resend was NOT sent
    let supabaseSent = false;
    if (!resendSent) {
      const { supabase, isSupabaseConfigured } = await import('@/lib/supabase');
      if (isSupabaseConfigured && supabase) {
        try {
          const redirectTo = `${siteUrl}/auth/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
          const { error: supErr } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo,
          });
          if (!supErr) {
            supabaseSent = true;
          } else {
            console.warn('[ForgotPassword] Supabase reset notice:', supErr.message);
          }
        } catch (supErr) {
          console.warn('[ForgotPassword] Supabase dispatch exception:', supErr);
        }
      }
    }

    if (resendSent || supabaseSent) {
      return NextResponse.json({
        success: true,
        message: 'A password reset link has been sent to your email. Please check your inbox and spam folder.',
      });
    }

    // If Resend failed because of test domain restriction (onboarding@resend.dev only sends to owner)
    if (resendErrorMsg.toLowerCase().includes('testing') || resendErrorMsg.toLowerCase().includes('verify')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'On Resend test mode, emails can only be delivered to the account owner email. To send to any recipient, please verify your domain at resend.com/domains.',
        },
        { status: 400 }
      );
    }

    if (resendErrorMsg.toLowerCase().includes('api key') || !process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            'RESEND_API_KEY is not configured in Vercel environment variables. Please add your Resend API key in Vercel Settings.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: resendErrorMsg || 'Failed to send reset email. Please try again later.',
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    console.error('Forgot password API error:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
