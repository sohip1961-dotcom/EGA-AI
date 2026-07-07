export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken, hashPassword } from '@/lib/auth_helpers';

// Helper: Get user id from headers
function getUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return verifySessionToken(token);
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة العمل منتهية أو غير صالحة. يرجى تسجيل الدخول.' }, { status: 401 });
    }

    const { action, name, otp, new_password } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'حقل الإجراء مطلوب' }, { status: 400 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (action === 'update-name') {
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'الاسم الجديد مطلوب' }, { status: 400 });
      }

      const updated = await db.updateProfileName(userId, name.trim());
      if (!updated) {
        return NextResponse.json({ error: 'فشل تحديث الاسم' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'تم تحديث الاسم بنجاح.',
        user: {
          id: updated.id,
          phone: updated.phone,
          email: updated.email,
          name: updated.name,
          grade_level: updated.grade_level,
          plan_type: updated.plan_type,
          role: updated.role,
          coins: updated.coins === undefined ? 50.0 : updated.coins
        }
      });
    }

    if (action === 'send-otp') {
      // Create pending password reset in database if needed, or just return success with mock instructions
      return NextResponse.json({
        success: true,
        message: 'تم إرسال رمز التحقق التجريبي بنجاح. يرجى استخدام "111111" للتأكيد.'
      });
    }

    if (action === 'verify-otp') {
      if (!otp || !new_password) {
        return NextResponse.json({ error: 'رمز التحقق وكلمة المرور الجديدة مطلوبان' }, { status: 400 });
      }

      if (otp !== '111111') {
        return NextResponse.json({ error: 'رمز التحقق غير صحيح. يرجى استخدام الرمز التجريبي "111111".' }, { status: 400 });
      }

      const passwordHash = hashPassword(new_password);
      const updated = await db.updateProfilePassword(userId, passwordHash);
      if (!updated) {
        return NextResponse.json({ error: 'فشل تحديث كلمة المرور' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'تم تحديث كلمة المرور بنجاح. يمكنك استخدامها في تسجيل الدخول القادم.'
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });

  } catch (error: any) {
    console.error('Update Profile API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء معالجة طلبك.' },
      { status: 500 }
    );
  }
}
