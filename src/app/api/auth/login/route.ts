import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession, createUser, updateUserPasswordByEmail, getActualUserCredits, remapUserId } from '@/lib/db';
import { verifyPassword, setSessionCookie, sanitizeUser, hashPassword } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await getUserByEmail(normalizedEmail);

    let isValid = false;
    if (user && user.password_hash && user.salt) {
      isValid = verifyPassword(password, user.password_hash, user.salt);
    }

    // Dual verification: If local hash fails or user has no local hash,
    // verify against Supabase Auth (handles users registered or reset in Supabase)
    if (!isValid && isSupabaseConfigured && supabase) {
      try {
        const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!sbErr && sbAuth?.user) {
          isValid = true;
          const { hash, salt } = hashPassword(password);

          if (!user) {
            const meta = sbAuth.user.user_metadata || {};
            const initialCredits = await getActualUserCredits(sbAuth.user.id, normalizedEmail);
            user = await createUser({
              id: sbAuth.user.id,
              name: meta.name || 'User',
              email: normalizedEmail,
              password_hash: hash,
              salt,
              initialCredits,
            });
          } else {
            // Align user ID with canonical Supabase Auth UUID if they differ
            if (sbAuth.user.id && user.id !== sbAuth.user.id) {
              const oldId = user.id;
              user.id = sbAuth.user.id;
              await remapUserId(oldId, sbAuth.user.id, normalizedEmail);
            }
            // Update local password hash so future logins are verified directly
            await updateUserPasswordByEmail(normalizedEmail, hash, salt);
            user.password_hash = hash;
            user.salt = salt;
          }
        }
      } catch (sbLoginErr) {
        console.warn('Supabase signInWithPassword fallback notice:', sbLoginErr);
      }
    }

    if (!user || !isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    // Maintain and display the user's actual saved credit balance from database/ledger upon login
    const actualCredits = await getActualUserCredits(user.id, user.email);
    user.credits = actualCredits;

    const session = await createSession(user.id, 30, user.email);
    const safeUser = sanitizeUser(user);

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user: safeUser,
      token: session.token,
    });

    return setSessionCookie(response, session.token);
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Failed to sign in. Please try again.' }, { status: 500 });
  }
}
