import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, sanitizeUser, clearSessionCookie } from '@/lib/auth';
import { updateUserProfile, deleteUserAccount } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, username } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return NextResponse.json(
        { success: false, error: 'Full name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    if (username !== undefined && username.trim().length > 0) {
      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Username must be 3-24 characters containing only letters, numbers, and underscores.',
          },
          { status: 400 }
        );
      }
    }

    const updated = await updateUserProfile(auth.user.id, {
      name: name !== undefined ? name.trim() : undefined,
      username: username !== undefined ? username.trim().toLowerCase().replace(/^@/, '') : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update profile.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: sanitizeUser(updated),
    });
  } catch (err: unknown) {
    console.error('Profile update error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update profile details.' }, { status: 500 });
  }
}

/**
 * Permanently deletes the authenticated user's account and all associated personal data
 * in compliance with the Nigeria Data Protection Act (NDPA) Right to Erasure.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const deleted = await deleteUserAccount(auth.user.id);

    const response = NextResponse.json({
      success: true,
      deleted,
      message: 'Your account and all associated personal data have been permanently deleted.',
    });

    // Clear authentication session cookie immediately
    clearSessionCookie(response);

    return response;
  } catch (err: unknown) {
    console.error('Account deletion error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete account.' }, { status: 500 });
  }
}
