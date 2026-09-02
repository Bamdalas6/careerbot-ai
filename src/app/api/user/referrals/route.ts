import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getUserReferrals } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getUserReferrals(auth.user.id);
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://careerbot-ai-seven.vercel.app';
    const cleanOrigin = origin.replace(/\/$/, '');
    const referralLink = `${cleanOrigin}?ref=${stats.referralCode}`;

    return NextResponse.json({
      success: true,
      referralCode: stats.referralCode,
      referralLink,
      totalReferred: stats.totalReferred,
      totalEarned: stats.totalEarned,
      referredUsers: stats.referredUsers,
    });
  } catch (err: unknown) {
    console.error('Fetch referral stats error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral statistics' },
      { status: 500 }
    );
  }
}
