export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySessionToken } from '@/lib/auth_helpers';

const DEFAULT_GRADE_LEVELS = ['1_middle', '2_middle', '3_middle', '1_high', '2_high'];
const DEFAULT_TRACKS = ['medicine_life_sciences', 'engineering_cs', 'business', 'arts_literature'];

// GET public system settings
export async function GET(req: NextRequest) {
  try {
    const websiteLink = await db.getSystemSetting('website_link');
    
    let activeGradesRaw = await db.getSystemSetting('active_grade_levels');
    let activeGradeLevels = DEFAULT_GRADE_LEVELS;
    if (activeGradesRaw) {
      try {
        const parsed = JSON.parse(activeGradesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          activeGradeLevels = parsed.filter(g => g !== '3_high');
        }
      } catch (e) {}
    }
    
    let activeTracksRaw = await db.getSystemSetting('active_tracks');
    let activeTracks = DEFAULT_TRACKS;
    if (activeTracksRaw) {
      try {
        const parsed = JSON.parse(activeTracksRaw);
        if (Array.isArray(parsed)) {
          activeTracks = parsed;
        }
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

    // Check for authenticated user to return current coins and profile
    const authHeader = req.headers.get('Authorization');
    let profile = null;
    let authAttempted = false;
    let authValid = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authAttempted = true;
      const token = authHeader.substring(7);
      try {
        const userId = verifySessionToken(token);
        if (userId) {
          profile = await db.getProfile(userId);
          if (profile) {
            authValid = true;
          }
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
    
    const userNotFound = authAttempted && !authValid;

    return NextResponse.json({
      website_link: websiteLink || 'http://localhost:3000',
      active_grade_levels: activeGradeLevels,
      active_tracks: activeTracks,
      active_curriculum_ids: activeCurriculumIds,
      all_curriculums: allCurriculums,
      guest_messages_count: guestMessagesCount,
      guest_coins: guestCoins,
      authenticated: authValid,
      ...(userNotFound ? {
        user: null,
        user_not_found: true,
        session_invalid: true
      } : {}),
      ...(profile ? {
        user: {
          id: profile.id,
          phone: profile.phone,
          email: profile.email,
          name: profile.name,
          grade_level: profile.grade_level,
          track_id: profile.track_id || null,
          elective_subject: profile.elective_subject || null,
          plan_type: profile.plan_type,
          subscription_status: profile.subscription_status || (profile.plan_type && profile.plan_type !== 'free' ? 'active' : 'inactive'),
          subscription_start_date: profile.subscription_start_date,
          subscription_end_date: profile.subscription_end_date,
          subscription_plan_id: profile.subscription_plan_id,
          role: profile.role,
          coins: profile.coins === undefined ? 15.0 : profile.coins,
          points: profile.points || 0,
          study_streak: profile.study_streak || 1
        }
      } : {})
    });
  } catch (error) {
    return NextResponse.json({
      website_link: 'http://localhost:3000',
      active_grade_levels: DEFAULT_GRADE_LEVELS,
      active_tracks: DEFAULT_TRACKS,
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
      const filtered = Array.isArray(body.active_grade_levels) ? body.active_grade_levels.filter((g: string) => g !== '3_high') : body.active_grade_levels;
      await db.setSystemSetting('active_grade_levels', JSON.stringify(filtered));
    }

    if (body.active_tracks !== undefined) {
      await db.setSystemSetting('active_tracks', JSON.stringify(body.active_tracks));
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
