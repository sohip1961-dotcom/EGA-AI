export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPasswordSecure, generateOtp, OTP_TTL_MS } from '@/lib/auth_helpers';
import { sendOtpEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate_limiter';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`register_${ip}`, 5, 600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'تم تجاوز الحد المسموح لطلبات التسجيل. يرجى الانتظار قليلاً قبل المحاولة مجدداً.' },
        { status: 429 }
      );
    }

    const { email, name, grade_level, password, terms_accepted, track_id, elective_subject } = await req.json();

    if (!email || !name || !grade_level || !password) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة (الاسم، البريد الإلكتروني، السنة الدراسية، كلمة المرور)' },
        { status: 400 }
      );
    }

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanName = typeof name === 'string' ? name.trim() : '';

    if (!cleanEmail || !cleanName) {
      return NextResponse.json(
        { error: 'الاسم والبريد الإلكتروني لا يمكن أن يكونا فارغين' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    if (grade_level === '2_high' && !track_id) {
      return NextResponse.json(
        { error: 'يرجى اختيار المسار الدراسي لطلاب البكالوريا' },
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
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'الرجاء إدخال بريد إلكتروني صحيح' },
        { status: 400 }
      );
    }

    const existingUser = await db.getProfileByEmail(cleanEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني هذا مسجل بالفعل. يرجى تسجيل الدخول.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPasswordSecure(password);
    const otpCode = generateOtp();

    const sent = await sendOtpEmail(cleanEmail, otpCode, 'register');
    if (!sent.ok) {
      return NextResponse.json(
        { error: 'تعذر إرسال رمز التحقق إلى بريدك الإلكتروني. يرجى المحاولة مرة أخرى بعد قليل.' },
        { status: 502 }
      );
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await db.createPendingRegistration(
      cleanEmail,
      cleanName,
      grade_level,
      passwordHash,
      otpCode,
      new Date().toISOString(),
      undefined,
      expiresAt,
      track_id || null,
      elective_subject || null
    );

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني بنجاح.',
      email: cleanEmail
    });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}
