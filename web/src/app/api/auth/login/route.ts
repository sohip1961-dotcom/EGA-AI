export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPasswordSecure, generateSessionToken } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    // Get user profile
    const profile = await db.getProfileByEmail(email);
    if (!profile) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Verify Password (supports legacy sha256 hashes; upgrades them on success)
    const { valid, needsRehash } = await verifyPassword(password, profile.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }
    if (needsRehash) {
      await db.updateProfilePassword(profile.id, await hashPasswordSecure(password));
    }

    // Generate Session Token
    const token = generateSessionToken(profile.id);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: profile.id,
        email: profile.email,
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
