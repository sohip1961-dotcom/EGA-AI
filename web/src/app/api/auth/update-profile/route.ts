export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken, hashPasswordSecure, generateOtp, OTP_TTL_MS } from '@/lib/auth_helpers';
import { sendOtpEmail } from '@/lib/email';

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

    const body = await req.json();
    const { action, name, otp, new_password, grade_level, track_id, elective_subject } = body;

    if (!action) {
      return NextResponse.json({ error: 'حقل الإجراء مطلوب' }, { status: 400 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على حساب المستخدم أو تم حذفه.', code: 'user_not_found' }, { status: 401 });
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
          track_id: updated.track_id || null,
          elective_subject: updated.elective_subject || null,
          plan_type: updated.plan_type,
          subscription_status: updated.subscription_status || (updated.plan_type && updated.plan_type !== 'free' ? 'active' : 'inactive'),
          subscription_start_date: updated.subscription_start_date,
          subscription_end_date: updated.subscription_end_date,
          subscription_plan_id: updated.subscription_plan_id,
          role: updated.role,
          coins: updated.coins === undefined ? 15.0 : updated.coins,
          points: updated.points || 0,
          study_streak: updated.study_streak || 1
        }
      });
    }

    if (action === 'complete-onboarding') {
      const cleanName = (name || '').trim();
      const targetGrade = grade_level || profile.grade_level;
      const targetTrack = track_id !== undefined ? track_id : profile.track_id;
      const targetElective = elective_subject !== undefined ? elective_subject : profile.elective_subject;

      const validGrades = ['1_middle', '2_middle', '3_middle', '1_high', '2_high'];
      if (!targetGrade || !validGrades.includes(targetGrade)) {
        return NextResponse.json({ error: 'يرجى تحديد مرحلة دراسية صالحة.' }, { status: 400 });
      }

      if (cleanName) {
        await db.updateProfileName(userId, cleanName);
      }

      const updated = await db.updateProfileGradeLevel(
        userId,
        targetGrade,
        targetGrade === '2_high' ? (targetTrack || null) : null,
        targetGrade === '2_high' ? (targetElective || null) : null
      );

      if (!updated) {
        return NextResponse.json({ error: 'فشل حفظ إعدادات الحساب' }, { status: 500 });
      }

      const freshProfile = await db.getProfile(userId) || updated;

      return NextResponse.json({
        success: true,
        message: 'تم إعداد حسابك بنجاح. نوّرت المنصة!',
        user: {
          id: freshProfile.id,
          phone: freshProfile.phone,
          email: freshProfile.email,
          name: freshProfile.name,
          grade_level: freshProfile.grade_level,
          track_id: freshProfile.track_id || null,
          elective_subject: freshProfile.elective_subject || null,
          plan_type: freshProfile.plan_type,
          subscription_status: freshProfile.subscription_status || (freshProfile.plan_type && freshProfile.plan_type !== 'free' ? 'active' : 'inactive'),
          subscription_start_date: freshProfile.subscription_start_date,
          subscription_end_date: freshProfile.subscription_end_date,
          subscription_plan_id: freshProfile.subscription_plan_id,
          role: freshProfile.role,
          coins: freshProfile.coins === undefined ? 15.0 : freshProfile.coins,
          points: freshProfile.points || 0,
          study_streak: freshProfile.study_streak || 1
        }
      });
    }

    if (action === 'send-otp') {
      if (!profile.email) {
        return NextResponse.json({ error: 'لا يوجد بريد إلكتروني مسجل لهذا الحساب.' }, { status: 400 });
      }

      const otpCode = generateOtp();
      const sent = await sendOtpEmail(profile.email, otpCode, 'reset');
      if (!sent.ok) {
        return NextResponse.json(
          { error: 'تعذر إرسال رمز التحقق إلى بريدك الإلكتروني. يرجى المحاولة مرة أخرى بعد قليل.' },
          { status: 502 }
        );
      }

      await db.createPasswordReset(userId, otpCode, new Date(Date.now() + OTP_TTL_MS).toISOString());

      return NextResponse.json({
        success: true,
        message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.'
      });
    }

    if (action === 'verify-otp') {
      if (!otp || !new_password) {
        return NextResponse.json({ error: 'رمز التحقق وكلمة المرور الجديدة مطلوبان' }, { status: 400 });
      }

      const reset = await db.getPasswordReset(userId);
      if (!reset || Date.now() > new Date(reset.expires_at).getTime()) {
        if (reset) await db.deletePasswordReset(userId);
        return NextResponse.json({ error: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.' }, { status: 400 });
      }
      if (otp !== reset.otp) {
        return NextResponse.json({ error: 'رمز التحقق غير صحيح.' }, { status: 400 });
      }

      const passwordHash = await hashPasswordSecure(new_password);
      const updated = await db.updateProfilePassword(userId, passwordHash);
      if (!updated) {
        return NextResponse.json({ error: 'فشل تحديث كلمة المرور' }, { status: 500 });
      }
      await db.deletePasswordReset(userId);

      // Security: Deactivate other devices upon password change
      const currentDeviceId = req.headers.get('x-device-id') || undefined;
      if (currentDeviceId) {
        await db.deactivateAllOtherDevices(userId, currentDeviceId);
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
