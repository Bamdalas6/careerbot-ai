import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getUserResumes, saveUserResume } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, resumes: [] }, { status: 200 });
    }

    const resumes = await getUserResumes(auth.user.id);
    return NextResponse.json({ success: true, resumes });
  } catch (err: unknown) {
    console.error('Error fetching resume history:', err);
    return NextResponse.json({ success: false, resumes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, text, score, review } = body;

    if (!text) {
      return NextResponse.json({ success: false, error: 'Resume text is required.' }, { status: 400 });
    }

    const saved = await saveUserResume(auth.user.id, {
      title: title || 'Upgraded CV',
      text,
      score,
      review,
    });

    return NextResponse.json({ success: true, resume: saved });
  } catch (err: unknown) {
    console.error('Error saving resume history:', err);
    return NextResponse.json({ success: false, error: 'Failed to save resume.' }, { status: 500 });
  }
}
