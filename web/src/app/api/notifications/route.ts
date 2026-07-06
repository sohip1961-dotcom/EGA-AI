export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET active notifications for a target platform (public, no auth required)
export async function GET(req: NextRequest) {
  try {
    const target = req.nextUrl.searchParams.get('target') === 'phone' ? 'phone' : 'web';
    const notifications = await db.getActiveNotifications(target);
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Notifications API Error:', error);
    return NextResponse.json({ success: false, notifications: [] });
  }
}
