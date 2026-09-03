import { NextRequest, NextResponse } from 'next/server';
import { searchJobs } from '@/lib/job-providers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const isRemote = searchParams.get('remote') === 'true' ? true : searchParams.get('remote') === 'false' ? false : undefined;
    const location = searchParams.get('location') || undefined;
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10);
    const limit = Math.max(1, Math.min(100, Number.isFinite(rawLimit) ? rawLimit : 10));

    const jobs = await searchJobs({
      query,
      is_remote: isRemote,
      location,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error: unknown) {
    console.error('API Error in /api/jobs/search:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to search jobs', message },
      { status: 500 }
    );
  }
}
