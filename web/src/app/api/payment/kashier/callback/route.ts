import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyKashierCallbackSignature } from '@/lib/kashier';

async function handleCallback(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  
  let bodyParams: Record<string, any> = {};
  if (req.method === 'POST') {
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        bodyParams = await req.json();
      } else {
        const formData = await req.formData();
        bodyParams = Object.fromEntries(formData.entries());
      }
    } catch {
      // Ignored
    }
  }

  const params = { ...searchParams, ...bodyParams };
  const orderId = params.merchantOrderId || params.orderId || params.order_id || '';
  const paymentStatus = (params.paymentStatus || params.status || params.payment_status || '').toUpperCase();
  const transactionId = params.kashierOrderReference || params.transactionId || params.reference || null;
  const paymentMethod = params.paymentMethod || params.method || null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://egsaiedu.com';
  const hasValidSignature = verifyKashierCallbackSignature(params);
  const isSuccess = (paymentStatus === 'SUCCESS' || paymentStatus === 'CAPTURED' || paymentStatus === 'APPROVED' || paymentStatus === 'PAID') && hasValidSignature;

  if (orderId) {
    const transaction = await db.getPaymentTransactionByOrderId(orderId);
    if (transaction) {
      if (isSuccess) {
        if (transaction.status !== 'success') {
          await db.updatePaymentTransactionStatus(orderId, 'success', transactionId, paymentMethod, params);
          if (transaction.user_id) {
            await db.activateSubscription(transaction.user_id, transaction.plan_id, orderId);
          }
        }
        return NextResponse.redirect(`${siteUrl}/?payment_result=success&orderId=${orderId}&plan=${transaction.plan_id}`, 302);
      } else {
        if (transaction.status === 'pending') {
          await db.updatePaymentTransactionStatus(orderId, 'failed', transactionId, paymentMethod, params);
        }
        return NextResponse.redirect(`${siteUrl}/?payment_result=failed&orderId=${orderId}`, 302);
      }
    }
  }

  if (isSuccess) {
    return NextResponse.redirect(`${siteUrl}/?payment_result=success`, 302);
  } else {
    return NextResponse.redirect(`${siteUrl}/?payment_result=failed`, 302);
  }
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}
