export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

// GET active notifications for a target platform (public for broadcasts, authenticated for user-specific)
export async function GET(req: NextRequest) {
  try {
    const target = req.nextUrl.searchParams.get('target') === 'phone' ? 'phone' : 'web';
    
    // Extract userId if session token is provided in Authorization header
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = verifySessionToken(token);
    }

    const notifications = await db.getActiveNotifications(target, userId);
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Notifications API Error:', error);
    return NextResponse.json({ success: false, notifications: [] });
  }
}
