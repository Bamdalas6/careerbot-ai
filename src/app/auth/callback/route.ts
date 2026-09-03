import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  let recoveryEmail = '';
  if (code && isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.exchangeCodeForSession(code);
      if (data?.user?.email) {
        recoveryEmail = data.user.email;
      }
    } catch (err) {
      console.warn('Session code exchange warning:', err);
    }
  }

  // If this is a password recovery flow, redirect directly to the reset-password page
  if (type === 'recovery') {
    const target = new URL('/auth/reset-password', origin);
    if (recoveryEmail) target.searchParams.set('email', recoveryEmail);
    searchParams.forEach((val, key) => {
      if (key !== 'next' && key !== 'type' && !target.searchParams.has(key)) {
        target.searchParams.set(key, val);
      }
    });
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(next, origin));
}
