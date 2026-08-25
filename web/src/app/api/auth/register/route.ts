export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPasswordSecure, generateOtp, OTP_TTL_MS } from '@/lib/auth_helpers';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, name, grade_level, password, terms_accepted } = await req.json();

    if (!email || !name || !grade_level || !password) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة (الاسم، البريد الإلكتروني، السنة الدراسية، كلمة المرور)' },
        { status: 400 }
      );
    }

    if (!terms_accepted) {
      return NextResponse.json(
        { error: 'يجب الموافقة على سياسة الخصوصية وشروط الاستخدام لإتمام التسجيل.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'الرجاء إدخال بريد إلكتروني صحيح' },
        { status: 400 }
      );
    }

    const existingUser = await db.getProfileByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني هذا مسجل بالفعل. يرجى تسجيل الدخول.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPasswordSecure(password);
    const otpCode = generateOtp();

    const sent = await sendOtpEmail(email, otpCode, 'register');
    if (!sent.ok) {
      return NextResponse.json(
        { error: 'تعذر إرسال رمز التحقق إلى بريدك الإلكتروني. يرجى المحاولة مرة أخرى بعد قليل.' },
        { status: 502 }
      );
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await db.createPendingRegistration(email, name, grade_level, passwordHash, otpCode, new Date().toISOString(), undefined, expiresAt);

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني بنجاح.',
      email: email
    });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}
