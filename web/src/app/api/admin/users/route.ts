export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

// ─── Helper: Authorize admin ──────────────────────────────────────────────────
async function authorizeAdmin(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'غير مصرح للقيام بهذه العملية' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const userId = verifySessionToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'جلسة العمل منتهية أو غير صالحة' }, { status: 401 });
  }

  const profile = await db.getProfile(userId);
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'صلاحيات غير كافية. هذه العملية للمسؤولين فقط.' }, { status: 403 });
  }

  return userId;
}

// GET list/search users (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const users = await db.getUsers(search);
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحميل قائمة المستخدمين.' }, { status: 500 });
  }
}

// PATCH update a user's unlimited_credit flag (Admin only)
export async function PATCH(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id, unlimited_credit } = await req.json();
    if (!id || typeof unlimited_credit !== 'boolean') {
      return NextResponse.json({ error: 'معرف المستخدم وقيمة الرصيد غير المحدود مطلوبان' }, { status: 400 });
    }

    const updated = await db.setUserUnlimited(id, unlimited_credit);
    if (!updated) {
      return NextResponse.json({ error: 'فشل تحديث المستخدم' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: unlimited_credit ? 'تم منح رصيد غير محدود للمستخدم.' : 'تم إلغاء الرصيد غير المحدود للمستخدم.' });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث المستخدم.' }, { status: 500 });
  }
}

// DELETE a user (Admin only)
export async function DELETE(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب للحذف' }, { status: 400 });
    }

    if (id === authResult) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص.' }, { status: 400 });
    }

    const success = await db.deleteUser(id);
    if (!success) {
      return NextResponse.json({ error: 'فشل حذف المستخدم' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف المستخدم بنجاح.' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف المستخدم.' }, { status: 500 });
  }
}
