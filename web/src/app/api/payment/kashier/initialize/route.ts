import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';
import { KASHIER_PLANS, generateKashierOrderHash, getKashierCredentials } from '@/lib/kashier';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'يرجى تسجيل الدخول أولاً لإتمام عملية الاشتراك' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة العمل منتهية. يرجى إعادة تسجيل الدخول.' }, { status: 401 });
    }

    const profile = await db.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: 'لم يتم العثور على حساب المستخدم' }, { status: 404 });
    }

    const body = await req.json();
    const planId = body.plan_id || 'pro_1m';
    const plan = KASHIER_PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: 'باقة الاشتراك المحددة غير صالحة' }, { status: 400 });
    }

    const { merchantId, mode } = getKashierCredentials();
    const orderId = `egs_sub_${userId.replace(/-/g, '').slice(0, 8)}_${Date.now()}`;
    const hash = generateKashierOrderHash(orderId, plan.amount, plan.currency);

    // Save pending transaction
    await db.createPaymentTransaction({
      user_id: userId,
      order_id: orderId,
      plan_id: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      status: 'pending',
      provider: 'kashier'
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://egsaiedu.com';
    const merchantRedirect = `${siteUrl}/api/payment/kashier/callback`;
    const serverWebhook = `${siteUrl}/api/payment/kashier/webhook`;

    return NextResponse.json({
      success: true,
      order: {
        orderId,
        merchantId,
        amount: plan.amount,
        currency: plan.currency,
        hash,
        mode,
        planTitle: plan.name,
        allowedMethods: 'card,wallet,bank_installments',
        merchantRedirect,
        serverWebhook,
        customer: {
          name: profile.name,
          email: profile.email || '',
          phone: profile.phone || ''
        }
      }
    });

  } catch (error: any) {
    console.error('Kashier Init Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تجهيز عملية الدفع عبر كاشير.' },
      { status: 500 }
    );
  }
}
