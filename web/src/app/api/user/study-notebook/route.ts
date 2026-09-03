export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'تسجيل الدخول مطلوب' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة غير صالحة', code: 'invalid_token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectName = searchParams.get('subject_name') || undefined;

    const notes = await db.getStudyNotebook(userId, subjectName);

    return NextResponse.json({
      success: true,
      notes,
      totalCount: notes.length
    });
  } catch (error: any) {
    console.error('Study notebook GET error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب دفتر الملاحظات' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'تسجيل الدخول مطلوب' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة غير صالحة', code: 'invalid_token' }, { status: 401 });
    }

    const body = await req.json();
    const { subject_name, grade_level, title, content, note_type } = body;

    if (!subject_name || !title || !content) {
      return NextResponse.json({ error: 'المادة والعنوان والمحتوى حقول مطلوبة' }, { status: 400 });
    }

    const profile = await db.getProfile(userId);
    const targetGrade = grade_level || profile?.grade_level || '1_high';

    const note = await db.createStudyNote({
      userId,
      subjectName: subject_name,
      gradeLevel: targetGrade,
      title,
      content,
      noteType: note_type || 'formula'
    });

    return NextResponse.json({
      success: true,
      note
    });
  } catch (error: any) {
    console.error('Study notebook POST error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ الملاحظة' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'تسجيل الدخول مطلوب' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة غير صالحة', code: 'invalid_token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('id');

    if (!noteId) {
      return NextResponse.json({ error: 'معرف الملاحظة مطلوب' }, { status: 400 });
    }

    const success = await db.deleteStudyNote(noteId, userId);

    return NextResponse.json({
      success
    });
  } catch (error: any) {
    console.error('Study notebook DELETE error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف الملاحظة' }, { status: 500 });
  }
}
