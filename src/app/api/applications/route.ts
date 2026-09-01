import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import {
  getUserApplications,
  getApplicationById,
  saveUserApplication,
  updateApplication,
  addApplicationEvent,
  deleteApplication,
  getApplicationsDueForFollowUp,
} from '@/lib/db';

/**
 * GET /api/applications — list user's tracked applications
 * GET /api/applications?due=1 — list applications due for follow-up
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const due = req.nextUrl.searchParams.get('due');
    if (due === '1') {
      const apps = await getApplicationsDueForFollowUp(auth.user.id);
      return NextResponse.json({ success: true, applications: apps });
    }

    const apps = await getUserApplications(auth.user.id);
    return NextResponse.json({ success: true, applications: apps });
  } catch (error: unknown) {
    console.error('GET /api/applications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch applications' }, { status: 500 });
  }
}

/**
 * POST /api/applications — save/track a new application
 * Body: { job, status?, notes?, contact_name?, contact_email?, contact_linkedin? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.job) {
      return NextResponse.json({ success: false, error: 'Job data is required' }, { status: 400 });
    }

    const app = await saveUserApplication(auth.user.id, {
      job: body.job,
      status: body.status,
      notes: body.notes,
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      contact_linkedin: body.contact_linkedin,
    });

    return NextResponse.json({ success: true, application: app });
  } catch (error: unknown) {
    console.error('POST /api/applications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save application' }, { status: 500 });
  }
}

/**
 * PATCH /api/applications — update an application
 * Body: { id, status?, follow_up_at?, contact_name?, contact_email?, contact_linkedin?, notes?, applied_at?, event? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 });
    }

    // Add a timeline event if provided
    if (body.event) {
      const result = await addApplicationEvent(body.id, auth.user.id, body.event);
      if (!result) {
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
      }
    }

    // Update fields
    const { id, event: _event, ...updates } = body;
    if (Object.keys(updates).length > 0) {
      const app = await updateApplication(id, auth.user.id, updates);
      if (!app) {
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, application: app });
    }

    // If only event was added, fetch and return the updated app
    const app = await getApplicationById(id, auth.user.id);
    return NextResponse.json({ success: true, application: app });
  } catch (error: unknown) {
    console.error('PATCH /api/applications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 });
  }
}

/**
 * DELETE /api/applications — remove an application
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 });
    }

    const deleted = await deleteApplication(body.id, auth.user.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/applications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete application' }, { status: 500 });
  }
}
