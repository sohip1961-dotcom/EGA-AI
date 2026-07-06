export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

// GET all sessions for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'تسجيل الدخول مطلوب لعرض سجل المحادثات.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'session_expired', message: 'جلسة العمل منتهية. يرجى تسجيل الدخول مجدداً.' },
        { status: 401 }
      );
    }

    const sessions = await db.getChatSessions(userId, undefined);
    return NextResponse.json({
      success: true,
      sessions
    });

  } catch (error: any) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'حدث خطأ أثناء تحميل جلسات المحادثة.' },
      { status: 500 }
    );
  }
}

// POST: Create a new chat session
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'تسجيل الدخول مطلوب لبدء محادثة جديدة.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'session_expired', message: 'جلسة العمل منتهية. يرجى تسجيل الدخول مجدداً.' },
        { status: 401 }
      );
    }

    const { title, subject_name, grade_level } = await req.json();
    if (!title || !subject_name || !grade_level) {
      return NextResponse.json(
        { error: 'bad_request', message: 'يرجى تقديم العنوان واسم المادة والسنة الدراسية.' },
        { status: 400 }
      );
    }

    const session = await db.createChatSession(
      title.trim(),
      subject_name.trim(),
      grade_level.trim(),
      userId,
      undefined
    );

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error: any) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'حدث خطأ أثناء إنشاء محادثة جديدة.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a chat session
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'تسجيل الدخول مطلوب لحذف المحادثة.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'session_expired', message: 'جلسة العمل منتهية. يرجى تسجيل الدخول مجدداً.' },
        { status: 401 }
      );
    }

    // Try reading from URL query parameter first, then JSON body
    let sessionId = req.nextUrl.searchParams.get('id');
    if (!sessionId) {
      try {
        const body = await req.json();
        sessionId = body.id || body.session_id;
      } catch (e) {
        // Body reading failed or empty
      }
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'bad_request', message: 'معرف المحادثة مطلوب للحذف.' },
        { status: 400 }
      );
    }

    // Ownership check: only the owning user may delete their session
    const session = await db.getChatSession(sessionId);
    if (!session || session.user_id !== userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'ليس لديك صلاحية لحذف هذه المحادثة.' },
        { status: 403 }
      );
    }

    // Delete session
    const deleted = await db.deleteChatSession(sessionId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'delete_failed', message: 'فشل حذف المحادثة.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف المحادثة وسجل رسائلها بنجاح.'
    });

  } catch (error: any) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'حدث خطأ أثناء حذف المحادثة.' },
      { status: 500 }
    );
  }
}
