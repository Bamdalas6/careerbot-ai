import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { runFullJobHarvester } from '@/lib/job-crawler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const secret = process.env.CRON_SECRET;
    const url = new URL(req.url);
    const queryKey = url.searchParams.get('key') || '';

    const providedKey = authHeader.replace(/^Bearer\s+/i, '').trim() || queryKey.trim();

    if (secret) {
      const expBuf = Buffer.from(secret.trim());
      const provBuf = Buffer.from(providedKey);
      if (provBuf.length === 0 || provBuf.length !== expBuf.length || !crypto.timingSafeEqual(provBuf, expBuf)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET is not configured on server.' },
        { status: 500 }
      );
    }

    console.log('[Job Crawler Cron] Starting full multi-platform sweep...');
    const jobs = await runFullJobHarvester();
    const added = jobs.added ?? 0;
    const total = jobs.total ?? jobs.length;

    console.log(`[Job Crawler Cron] Harvested ${jobs.length} jobs. Added ${added} new jobs.`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      harvested: jobs.length,
      newJobsAdded: added,
      totalStored: total,
    });
  } catch (err: unknown) {
    console.error('[Job Crawler Cron] Ingestion error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to run job sync crawler' },
      { status: 500 }
    );
  }
}
