import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  if (code && isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.warn('Session code exchange warning:', err);
    }
  }

  // If this is a password recovery flow, redirect to home with recovery hash
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/#type=recovery', origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
