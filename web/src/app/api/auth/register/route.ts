export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth_helpers';

export async function POST(req: NextRequest) {
  try {
    const { phone, name, grade_level, password, terms_accepted } = await req.json();

    if (!phone || !name || !grade_level || !password) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة (الاسم، رقم الهاتف، السنة الدراسية، كلمة المرور)' },
        { status: 400 }
      );
    }

    if (!terms_accepted) {
      return NextResponse.json(
        { error: 'يجب الموافقة على سياسة الخصوصية وشروط الاستخدام لإتمام التسجيل.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.getProfileByPhone(phone);
    if (existingUser) {
      return NextResponse.json(
        { error: 'رقم الهاتف هذا مسجل بالفعل. يرجى تسجيل الدخول.' },
        { status: 400 }
      );
    }

    // Hash password and store in pending registrations
    const passwordHash = hashPassword(password);
    const otpCode = '111111'; // Mock OTP code for testing

    await db.createPendingRegistration(phone, name, grade_level, passwordHash, otpCode, new Date().toISOString());

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رمز التحقق (OTP) بنجاح.',
      phone: phone
    });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}
