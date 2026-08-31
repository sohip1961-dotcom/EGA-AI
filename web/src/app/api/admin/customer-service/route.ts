export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db, DAILY_COIN_CAPS } from '@/lib/db';
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

// GET student details or customer service stats
export async function GET(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const action = req.nextUrl.searchParams.get('action');
    const userId = req.nextUrl.searchParams.get('userId');

    if (action === 'student_detail' && userId) {
      const profile = await db.getProfile(userId);
      if (!profile) {
        return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 });
      }

      const devices = await db.getUserActiveDevices(userId);
      
      // Calculate subscription eligibility metrics
      let isCancellationEligible = false;
      let cancellationIneligibilityReason = '';
      let elapsedHours = 0;
      const planCap = DAILY_COIN_CAPS[profile.plan_type] ?? 0;
      const coinsRemaining = profile.coins ?? 0;
      const hasActiveSub = profile.subscription_status === 'active' && profile.plan_type !== 'free';

      if (!hasActiveSub) {
        cancellationIneligibilityReason = 'الطالب لا يملك اشتراكاً مدفوعاً نشطاً حالياً.';
      } else if (profile.subscription_start_date) {
        const start = new Date(profile.subscription_start_date).getTime();
        elapsedHours = (Date.now() - start) / (1000 * 60 * 60);
        if (elapsedHours > 72) {
          const days = Math.floor(elapsedHours / 24);
          const hours = Math.floor(elapsedHours % 24);
          cancellationIneligibilityReason = `لقد مضى ${days > 0 ? `${days} يوم و ` : ''}${hours} ساعة على الاشتراك (المسموح به أقل من 3 أيام).`;
        } else if (coinsRemaining < planCap) {
          cancellationIneligibilityReason = `تم استهلاك جزء من رصيد النقاط (الرصيد المتبقي ${coinsRemaining.toFixed(1)} من أصل ${planCap} نقطة).`;
        } else {
          isCancellationEligible = true;
        }
      }

      return NextResponse.json({
        success: true,
        student: {
          ...profile,
          password_hash: undefined,
          active_devices_count: devices.length,
          devices: devices.map(d => ({
            id: d.id,
            device_name: d.device_name,
            device_type: d.device_type,
            last_active_at: d.last_active_at,
            ip_address: d.ip_address
          })),
          cancellation_metrics: {
            is_eligible: isCancellationEligible,
            ineligibility_reason: cancellationIneligibilityReason,
            elapsed_hours: Math.round(elapsedHours * 10) / 10,
            plan_cap: planCap,
            coins_remaining: coinsRemaining
          }
        }
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error: any) {
    console.error('Customer service GET error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحميل بيانات خدمة العملاء.' }, { status: 500 });
  }
}

// POST customer service actions (cancel subscription, recalculate coins, add coins, delete student, update report action)
export async function POST(req: NextRequest) {
  const authResult = await authorizeAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { action, userId, amount, reportId, action_taken, status } = body;

    // 1. Action 1: Cancel subscription plan (1, 2, or 3 months) under <= 3 days & 0 coins consumed
    if (action === 'cancel_subscription') {
      if (!userId) {
        return NextResponse.json({ error: 'معرف المستخدم مطلوب لإلغاء الاشتراك.' }, { status: 400 });
      }

      const result = await db.cancelUserSubscription(userId);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'فشل إلغاء الاشتراك.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: result.message || 'تم إلغاء الاشتراك واسترداد الباقة بنجاح.'
      });
    }

    // 2. Action 2a: Recalculate daily coins due today
    if (action === 'recalculate_coins') {
      if (!userId) {
        return NextResponse.json({ error: 'معرف المستخدم مطلوب لإعادة احتساب النقاط.' }, { status: 400 });
      }

      const result = await db.recalculateUserCoins(userId);
      if (!result.success) {
        return NextResponse.json({ error: result.message || 'فشلت إعادة احتساب النقاط.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        coins: result.coins,
        message: result.message
      });
    }

    // 3. Action 2b: Add coins directly to student account
    if (action === 'add_coins') {
      if (!userId || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return NextResponse.json({ error: 'معرف المستخدم وقيمة نقاط صالحة موجبة مطلوبان.' }, { status: 400 });
      }

      const updatedCoins = await db.addCoins(userId, amount);
      return NextResponse.json({
        success: true,
        coins: updatedCoins,
        message: `تمت إضافة ${amount} نقطة بنجاح إلى رصيد الطالب. الرصيد الإجمالي الحالي: ${updatedCoins} نقطة.`
      });
    }

    // 4. Action 3: Permanently delete student account
    if (action === 'delete_student') {
      if (!userId) {
        return NextResponse.json({ error: 'معرف المستخدم مطلوب لحذف الحساب.' }, { status: 400 });
      }

      if (userId === authResult) {
        return NextResponse.json({ error: 'لا يمكنك حذف حساب المسؤول الحالي.' }, { status: 400 });
      }

      const success = await db.deleteUser(userId);
      if (!success) {
        return NextResponse.json({ error: 'فشل حذف حساب الطالب من النظام.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'تم حذف حساب الطالب وجميع بياناته وسجلاته نهائياً من النظام.'
      });
    }

    // 5. Action on AI Complaint (Record action taken)
    if (action === 'update_report_action') {
      if (!reportId || !action_taken) {
        return NextResponse.json({ error: 'معرف البلاغ والإجراء المتخذ مطلوبان.' }, { status: 400 });
      }

      const newStatus = status || 'action_taken';
      const success = await db.updateReportStatus(reportId, newStatus, action_taken);
      if (!success) {
        return NextResponse.json({ error: 'فشل تسجيل الإجراء المتخذ للبلاغ.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'تم تسجيل وتوثيق الإجراء المتخذ للبلاغ بنجاح.'
      });
    }

    return NextResponse.json({ error: 'نوع العملية غير معروف.' }, { status: 400 });
  } catch (error: any) {
    console.error('Customer service POST error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تنفيذ عملية خدمة العملاء.' }, { status: 500 });
  }
}
