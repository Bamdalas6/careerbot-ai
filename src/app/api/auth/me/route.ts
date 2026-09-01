import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, sanitizeUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, user: null }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      user: sanitizeUser(auth.user),
      credits: auth.user.credits,
    });
  } catch (err: unknown) {
    console.error('Error fetching auth user:', err);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
