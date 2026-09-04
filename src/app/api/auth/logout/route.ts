import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db';
import { extractTokenFromRequest, clearSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerMatch = authHeader?.match(/^Bearer\s+(\S+)/i);
    const bearerToken =
      bearerMatch && bearerMatch[1] && bearerMatch[1] !== 'undefined' && bearerMatch[1] !== 'null'
        ? bearerMatch[1].trim()
        : null;
    const cookieToken = req.cookies.get('career_bot_session')?.value?.trim();

    if (bearerToken) {
      await deleteSession(bearerToken);
    }
    if (cookieToken && cookieToken !== bearerToken) {
      await deleteSession(cookieToken);
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    return clearSessionCookie(response);
  } catch (err: unknown) {
    console.error('Logout error:', err);
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
  }
}
