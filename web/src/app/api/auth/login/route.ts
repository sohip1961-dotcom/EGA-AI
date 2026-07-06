import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateSessionToken } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'رقم الهاتف وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    // Get user profile
    const profile = await db.getProfileByPhone(phone);
    if (!profile) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Verify Password
    const passwordHash = hashPassword(password);
    if (profile.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Generate Session Token
    const token = generateSessionToken(profile.id);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: profile.id,
        phone: profile.phone,
        name: profile.name,
        grade_level: profile.grade_level,
        plan_type: profile.plan_type,
        role: profile.role,
        coins: profile.coins === undefined ? 50.0 : profile.coins
      }
    });

  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول.' },
      { status: 500 }
    );
  }
}
