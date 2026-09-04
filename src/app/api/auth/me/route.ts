import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, sanitizeUser } from '@/lib/auth';
import { getActualUserCredits } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, user: null }, { status: 200 });
    }

    const actualCredits = await getActualUserCredits(auth.user.id, auth.user.email);
    auth.user.credits = actualCredits;

    return NextResponse.json({
      success: true,
      user: sanitizeUser(auth.user),
      credits: actualCredits,
      token: auth.session.token,
    });
  } catch (err: unknown) {
    console.error('Error fetching auth user:', err);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
