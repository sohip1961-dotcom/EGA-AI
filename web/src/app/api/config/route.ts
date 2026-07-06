import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

// GET public system settings
export async function GET(req: NextRequest) {
  try {
    const websiteLink = await db.getSystemSetting('website_link');
    
    let activeGradesRaw = await db.getSystemSetting('active_grade_levels');
    let activeGradeLevels = ['1_middle', '2_middle', '3_middle', '1_high', '2_high', '3_high'];
    if (activeGradesRaw) {
      try {
        activeGradeLevels = JSON.parse(activeGradesRaw);
      } catch (e) {}
    }
    
    let activeCurrsRaw = await db.getSystemSetting('active_curriculum_ids');
    let activeCurriculumIds: string[] = [];
    if (activeCurrsRaw) {
      try {
        activeCurriculumIds = JSON.parse(activeCurrsRaw);
      } catch (e) {}
    }
    
    const allCurriculums = await db.getCurriculums();

    // Check for authenticated user to return current coins
    const authHeader = req.headers.get('Authorization');
    let profile = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const userId = verifySessionToken(token);
        if (userId) {
          profile = await db.getProfile(userId);
        }
      } catch (e) {}
    }

    const deviceId = req.headers.get('x-device-id');
    let guestMessagesCount = 0;
    let guestCoins = 5.0;
    if (deviceId) {
      const guest = await db.getDeviceGuest(deviceId);
      guestMessagesCount = guest ? guest.free_message_count : 0;
      guestCoins = guest && guest.coins !== undefined ? guest.coins : 5.0;
    }
    
    return NextResponse.json({
      website_link: websiteLink || 'http://localhost:3000',
      active_grade_levels: activeGradeLevels,
      active_curriculum_ids: activeCurriculumIds,
      all_curriculums: allCurriculums,
      guest_messages_count: guestMessagesCount,
      guest_coins: guestCoins,
      ...(profile ? {
        user: {
          id: profile.id,
          phone: profile.phone,
          name: profile.name,
          grade_level: profile.grade_level,
          plan_type: profile.plan_type,
          role: profile.role,
          coins: profile.coins === undefined ? 50.0 : profile.coins
        }
      } : {})
    });
  } catch (error) {
    return NextResponse.json({
      website_link: 'http://localhost:3000',
      active_grade_levels: ['1_middle', '2_middle', '3_middle', '1_high', '2_high', '3_high'],
      active_curriculum_ids: [],
      all_curriculums: [],
      guest_messages_count: 0
    });
  }
}

// POST update system settings (Admin Only)
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح للقيام بهذه العملية' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = verifySessionToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'جلسة العمل منتهية أو غير صالحة' }, { status: 401 });
    }

    // Verify user role
    const profile = await db.getProfile(userId);
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحيات غير كافية. هذه العملية للمسؤولين فقط.' }, { status: 403 });
    }

    const body = await req.json();
    
    if (body.website_link !== undefined) {
      await db.setSystemSetting('website_link', body.website_link);
    }
    
    if (body.active_grade_levels !== undefined) {
      await db.setSystemSetting('active_grade_levels', JSON.stringify(body.active_grade_levels));
    }
    
    if (body.active_curriculum_ids !== undefined) {
      await db.setSystemSetting('active_curriculum_ids', JSON.stringify(body.active_curriculum_ids));
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Config API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حفظ الإعدادات.' },
      { status: 500 }
    );
  }
}
