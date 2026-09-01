import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getApplicationById } from '@/lib/db';
import {
  generateFollowUpEmail,
  generateColdDM,
  generateThankYouEmail,
} from '@/lib/follow-up-generator';

/**
 * POST /api/applications/follow-up — generate follow-up content
 * Body: { appId, type: 'email' | 'cold_dm_linkedin' | 'cold_dm_twitter' | 'thank_you', userName?, userSummary?, interviewerName?, keyDiscussionPoints? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    const { appId, type, userName, userSummary, interviewerName, keyDiscussionPoints, vibeId, customStory } = body;

    if (!appId || !type) {
      return NextResponse.json(
        { success: false, error: 'appId and type are required' },
        { status: 400 }
      );
    }

    const app = getApplicationById(appId, auth.user.id);
    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    const name = userName || auth.user.name || 'Job Seeker';
    const daysSince = app.applied_at
      ? Math.floor((Date.now() - new Date(app.applied_at).getTime()) / 86400000)
      : 7;

    if (type === 'cold_outreach_story' || type === 'cold_email') {
      const body = generateColdDM({
        userName: name,
        jobTitle: app.job.title,
        company: app.job.company,
        contactName: app.contact_name,
        platform: 'email',
        keySkills: app.job.tags || [],
        experienceYears: 5,
        userSummary,
        vibeId,
        customStory,
      });
      return NextResponse.json({
        success: true,
        content: {
          subject: `${app.job.title} — ${name}`,
          body,
        },
      });
    }

    if (type === 'email') {
      const result = generateFollowUpEmail({
        userName: name,
        jobTitle: app.job.title,
        company: app.job.company,
        contactName: app.contact_name,
        daysSinceApplied: daysSince,
        followUpNumber: (app.follow_up_count || 0) + 1,
        userSummary,
      });
      return NextResponse.json({ success: true, content: result });
    }

    if (type === 'cold_dm_linkedin' || type === 'cold_dm_twitter') {
      const platform = type === 'cold_dm_linkedin' ? 'linkedin' : 'twitter';
      const result = generateColdDM({
        userName: name,
        jobTitle: app.job.title,
        company: app.job.company,
        contactName: app.contact_name,
        platform,
        keySkills: app.job.tags || [],
        experienceYears: 5,
        userSummary,
        vibeId,
        customStory,
      });
      return NextResponse.json({ success: true, content: { body: result } });
    }

    if (type === 'thank_you') {
      const result = generateThankYouEmail({
        userName: name,
        interviewerName: interviewerName || app.contact_name || 'Hiring Manager',
        jobTitle: app.job.title,
        company: app.job.company,
        keyDiscussionPoints,
      });
      return NextResponse.json({ success: true, content: result });
    }

    return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });
  } catch (error: unknown) {
    console.error('POST /api/applications/follow-up error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate content' }, { status: 500 });
  }
}
