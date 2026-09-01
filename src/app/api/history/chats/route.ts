import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getUserChats, saveChatSession, deleteChatSession } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, chats: [] }, { status: 200 });
    }

    const chats = getUserChats(auth.user.id);
    return NextResponse.json({ success: true, chats });
  } catch (err: unknown) {
    console.error('Error fetching chat history:', err);
    return NextResponse.json({ success: false, chats: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required to save history.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, messages } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ success: false, error: 'Messages array required.' }, { status: 400 });
    }

    const chat = saveChatSession(auth.user.id, {
      id,
      title,
      messages,
    });

    return NextResponse.json({ success: true, chat });
  } catch (err: unknown) {
    console.error('Error saving chat session:', err);
    return NextResponse.json({ success: false, error: 'Failed to save chat session.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('id');

    if (!chatId) {
      return NextResponse.json({ success: false, error: 'Chat ID required.' }, { status: 400 });
    }

    const deleted = deleteChatSession(chatId, auth.user.id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    console.error('Error deleting chat session:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete chat.' }, { status: 500 });
  }
}
