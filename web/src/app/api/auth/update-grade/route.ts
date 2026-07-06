import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح للقيام بهذه العملية' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة العمل منتهية أو غير صالحة. يرجى تسجيل الدخول مجدداً.' }, { status: 401 });
    }

    const { grade_level } = await req.json();
    const validGrades = ['1_middle', '2_middle', '3_middle', '1_high', '2_high', '3_high'];
    if (!grade_level || !validGrades.includes(grade_level)) {
      return NextResponse.json({ error: 'السنة الدراسية المحددة غير صالحة' }, { status: 400 });
    }

    // Verify if user exists
    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على حساب المستخدم' }, { status: 404 });
    }

    // Update profile grade level in DB
    const updatedProfile = await db.updateProfileGradeLevel(userId, grade_level);
    if (!updatedProfile) {
      return NextResponse.json({ error: 'فشل تحديث السنة الدراسية' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedProfile.id,
        phone: updatedProfile.phone,
        name: updatedProfile.name,
        grade_level: updatedProfile.grade_level,
        plan_type: updatedProfile.plan_type,
        role: updatedProfile.role,
        coins: updatedProfile.coins === undefined ? 50.0 : updatedProfile.coins
      }
    });

  } catch (error: any) {
    console.error('Update Grade API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث السنة الدراسية.' },
      { status: 500 }
    );
  }
}
