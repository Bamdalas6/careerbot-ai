import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db';
import { extractTokenFromRequest, clearSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (token) {
      await deleteSession(token);
    }
    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    return clearSessionCookie(response);
  } catch (err: unknown) {
    console.error('Logout error:', err);
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
  }
}
