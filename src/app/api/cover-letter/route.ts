import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetter, CoverLetterTone } from '@/lib/cover-letter-generator';
import { StoryVibeId } from '@/lib/follow-up-generator';
import { JobListing } from '@/types/job';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', message: 'Please sign in to generate tailored cover letters.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      job,
      tone = 'story',
      candidateName,
      hiringManager,
      userSkills,
      experienceYears,
      vibeId,
      customStory,
    } = body as {
      job: JobListing;
      tone?: CoverLetterTone;
      candidateName?: string;
      hiringManager?: string;
      userSkills?: string[];
      experienceYears?: number;
      vibeId?: StoryVibeId;
      customStory?: string;
    };

    if (!job) {
      return NextResponse.json({ error: 'Job details required' }, { status: 400 });
    }

    const { user } = auth;
    const name = candidateName || user.name || 'Candidate Name';
    const skills = userSkills && userSkills.length > 0 ? userSkills : job.tags || [];

    const coverLetter = generateCoverLetter({
      candidateName: name,
      candidateEmail: user.email,
      jobTitle: job.title,
      company: job.company,
      hiringManager,
      tone,
      keySkills: skills,
      experienceYears: experienceYears || 5,
      location: job.location,
      vibeId,
      customStory,
    });

    return NextResponse.json({
      success: true,
      data: coverLetter,
    });
  } catch (error: unknown) {
    console.error('API Error in /api/cover-letter:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to generate cover letter', message },
      { status: 500 }
    );
  }
}
