export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSessionToken } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, has_registered_before } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني ورمز التحقق مطلوبان' },
        { status: 400 }
      );
    }

    // Get pending registration
    const pending = await db.getPendingRegistration(email);
    if (!pending) {
      return NextResponse.json(
        { error: 'لم يتم العثور على طلب تسجيل معلق لهذا البريد الإلكتروني. يرجى التسجيل أولاً.' },
        { status: 404 }
      );
    }

    // Verify OTP (Check for test fallback code 111111 as well)
    if (otp !== '111111' && otp !== pending.otp) {
      return NextResponse.json(
        { error: 'رمز التحقق غير صحيح.' },
        { status: 400 }
      );
    }

    // Create profile
    const userId = crypto.randomUUID();
    const profile = await db.createProfile({
      id: userId,
      email: pending.email,
      name: pending.name,
      grade_level: pending.grade_level,
      plan_type: 'free',
      role: 'student',
      password_hash: pending.password_hash,
      coins: has_registered_before ? 0.0 : 50.0,
      terms_accepted_at: pending.terms_accepted_at || new Date().toISOString()
    });

    // Delete pending registration
    await db.deletePendingRegistration(email);

    // Generate Session Token
    const token = generateSessionToken(userId);

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
    console.error('OTP API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تأكيد رمز التحقق.' },
      { status: 500 }
    );
  }
}
