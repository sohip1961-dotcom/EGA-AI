import { createClient } from '@supabase/supabase-js';

// Types
export interface Profile {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  grade_level: string; // '1_middle', '2_middle', '3_middle', '1_high', '2_high', '3_high'
  plan_type: 'free' | 'pro' | 'max';
  role: 'student' | 'admin' | 'security';
  password_hash: string;
  created_at: string;
  coins?: number;
  points?: number;
  last_active_date?: string;
  unlimited_credit?: boolean;
  terms_accepted_at?: string | null;
  study_streak?: number;
}

export interface PendingRegistration {
  email: string;
  phone?: string;
  name: string;
  grade_level: string;
  password_hash: string;
  otp: string;
  created_at: string;
  terms_accepted_at?: string | null;
  expires_at?: string | null;
}

export interface PasswordReset {
  user_id: string;
  otp: string;
  expires_at: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id?: string | null;
  device_id?: string | null;
  message_id?: string | null;
  session_id?: string | null;
  reported_content: string;
  user_query?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'maintenance';
  target: 'both' | 'web' | 'phone';
  active: boolean;
  created_at: string;
}

export interface AppVersion {
  id: string;
  platform: 'android' | 'ios';
  version_code: number;
  version_name: string;
  release_notes: string;
  download_url: string;
  mandatory: boolean;
  active: boolean;
  created_at: string;
}

export interface DeviceGuest {
  device_id: string;
  free_message_count: number;
  last_message_date: string;
  coins?: number;
}

export interface Curriculum {
  id: string;
  grade_level: string;
  subject_name: string;
  file_name: string;
  created_at: string;
}

export interface CurriculumChunk {
  id: string;
  curriculum_id: string;
  content: string;
  heading: string;
  // v2 — hierarchical parent-child structure
  chunk_level?: 'parent' | 'child';
  parent_id?: string | null;
  position_index?: number;
  embedding?: number[] | null; // 768-dim vector (child chunks only)
}

export interface ChatMessage {
  id: string;
  user_id?: string;
  device_id?: string;
  session_id?: string;
  sender: 'user' | 'ai';
  message: string;
  created_at: string;
  coins_cost?: number;
}

export type ChatMode = 'socratic' | 'detailed' | 'summary';

export interface ChatSession {
  id: string;
  user_id?: string;
  device_id?: string;
  title: string;
  subject_name: string;
  grade_level: string;
  mode?: ChatMode;
  created_at: string;
  engagement_points_awarded?: boolean;
}

export interface ExamQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export interface Exam {
  id: string;
  title: string;
  subject_name: string;
  grade_level: string;
  questions: ExamQuestion[];
  created_at: string;
  session_id?: string;
  user_id?: string;
  device_id?: string;
}

export interface ExamSubmission {
  id: string;
  exam_id: string;
  user_id?: string;
  device_id?: string;
  answers: Record<string, string>;
  score: number;
  evaluation: string;
  submitted_at: string;
  points_awarded?: number;
  is_first_attempt?: boolean;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  subject_name: string;
  grade_level: string;
  title: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  question: string;
  answer: string;
  box: number;
  next_review_at: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id?: string | null;
  order_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  provider: string;
  transaction_id?: string | null;
  payment_method?: string | null;
  raw_response?: any;
  created_at: string;
  updated_at: string;
}

// Initialize local DB file if missing
function initLocalDB() {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const fs = require('fs');
  const DB_FILE = './db_data.json';
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      profiles: [
        {
          id: 'admin-id-1234567890',
          phone: '01147814652',
          email: 'admin@egsaiedu.com',
          name: 'مدير النظام',
          grade_level: '3_high',
          plan_type: 'max',
          role: 'admin',
          password_hash: '343f7ea65b1d1ed5b5980d214808c2e06379a8b97586db4d6c97874d4440c174',
          created_at: new Date().toISOString(),
          coins: 1000.0,
          last_active_date: new Date().toISOString().split('T')[0],
          unlimited_credit: true
        }
      ],
      pending_registrations: [],
      password_resets: [],
      device_guests: [],
      curriculums: [],
      curriculum_chunks: [],
      chat_history: [],
      chat_sessions: [],
      system_settings: [
        { key: 'website_link', value: 'http://localhost:3000' }
      ],
      exams: [],
      exam_submissions: [],
      reports: [],
      notifications: [],
      app_versions: [],
      flashcard_decks: [],
      flashcards: [],
      payment_transactions: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Read local DB
function readLocalDB() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return {
      profiles: [],
      pending_registrations: [],
      password_resets: [],
      device_guests: [],
      curriculums: [],
      curriculum_chunks: [],
      chat_history: [],
      chat_sessions: [],
      system_settings: [],
      exams: [],
      exam_submissions: [],
      reports: [],
      notifications: [],
      app_versions: [],
      flashcard_decks: [],
      flashcards: [],
      payment_transactions: []
    };
  }
  const fs = require('fs');
  const DB_FILE = './db_data.json';
  initLocalDB();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    let changed = false;

    if (!parsed.payment_transactions) {
      parsed.payment_transactions = [];
      changed = true;
    }
    
    if (!parsed.chat_sessions) {
      parsed.chat_sessions = [];
      changed = true;
    }
    
    // Migrate local profiles if coins or last_active_date are missing
    if (parsed.profiles) {
      parsed.profiles.forEach((p: any) => {
        if (p.coins === undefined) {
          p.coins = p.plan_type === 'pro' ? 500.0 : (p.plan_type === 'max' ? 1000.0 : 50.0);
          changed = true;
        }
        if (p.last_active_date === undefined) {
          p.last_active_date = new Date().toISOString().split('T')[0];
          changed = true;
        }
        if (p.unlimited_credit === undefined) {
          p.unlimited_credit = p.role === 'admin';
          changed = true;
        }
      });
    }

    // Migrate local device guests if coins are missing
    if (parsed.device_guests) {
      parsed.device_guests.forEach((dg: any) => {
        if (dg.coins === undefined) {
          dg.coins = 5.0;
          changed = true;
        }
      });
    }

    // Migrate local chat history if coins_cost is missing
    if (parsed.chat_history) {
      parsed.chat_history.forEach((ch: any) => {
        if (ch.coins_cost === undefined) {
          ch.coins_cost = 0.0;
          changed = true;
        }
      });
    }

    if (!parsed.exams) {
      parsed.exams = [];
      changed = true;
    }

    if (!parsed.exam_submissions) {
      parsed.exam_submissions = [];
      changed = true;
    }

    if (!parsed.reports) {
      parsed.reports = [];
      changed = true;
    }

    if (!parsed.notifications) {
      parsed.notifications = [];
      changed = true;
    }

    if (!parsed.app_versions) {
      parsed.app_versions = [];
      changed = true;
    }

    if (!parsed.password_resets) {
      parsed.password_resets = [];
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    }
    
    return parsed;
  } catch (e) {
    console.error("Error reading local DB, resetting file", e);
    const initialData = {
      profiles: [
        {
          id: 'admin-id-1234567890',
          phone: '01147814652',
          email: 'admin@egsaiedu.com',
          name: 'مدير النظام',
          grade_level: '3_high',
          plan_type: 'max',
          role: 'admin',
          password_hash: '343f7ea65b1d1ed5b5980d214808c2e06379a8b97586db4d6c97874d4440c174',
          created_at: new Date().toISOString(),
          coins: 1000.0,
          last_active_date: new Date().toISOString().split('T')[0],
          unlimited_credit: true
        }
      ],
      pending_registrations: [],
      password_resets: [],
      device_guests: [],
      curriculums: [],
      curriculum_chunks: [],
      chat_history: [],
      chat_sessions: [],
      system_settings: [
        { key: 'website_link', value: 'http://localhost:3000' }
      ],
      exams: [],
      exam_submissions: [],
      reports: [],
      notifications: [],
      app_versions: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
}

// Write local DB
function writeLocalDB(data: any) {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const fs = require('fs');
  const DB_FILE = './db_data.json';
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Supabase client setup (optional)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isSupabaseEnabled = supabaseUrl !== '' && supabaseServiceKey !== '';

const supabase = isSupabaseEnabled ? createClient(supabaseUrl, supabaseServiceKey) : null;

if (isSupabaseEnabled) {
  console.log("Database Mode: Supabase Cloud Database Connected.");
} else {
  console.log("Database Mode: Local JSON File Database Enabled.");
}

// Daily coin caps per plan. Replenishment tops the balance UP TO the cap on the
// first request of a new day — it never reduces a balance already above the cap.
export const DAILY_COIN_CAPS: Record<string, number> = {
  free: 15.0,
  pro: 50.0,
  max: 100.0
};

// Helper: Daily coin replenishment + activity date refresh + streak update
async function checkAndResetDailyCoins(profile: Profile): Promise<Profile> {
  const today = new Date().toISOString().split('T')[0];
  if (profile.last_active_date !== today) {
    const cap = DAILY_COIN_CAPS[profile.plan_type] ?? DAILY_COIN_CAPS.free;
    const current = profile.coins === undefined ? 0.0 : profile.coins;
    const newCoins = Math.max(current, cap);

    // Calculate new streak
    let newStreak = profile.study_streak || 1;
    if (profile.last_active_date) {
      const todayDate = new Date(today);
      const lastActiveDate = new Date(profile.last_active_date);
      const diffTime = todayDate.getTime() - lastActiveDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        newStreak = (profile.study_streak || 1) + 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    profile.last_active_date = today;
    profile.coins = newCoins;
    profile.study_streak = newStreak;

    if (supabase) {
      await supabase.from('profiles').update({ 
        last_active_date: today, 
        coins: newCoins,
        study_streak: newStreak
      }).eq('id', profile.id);
    } else {
      const data = readLocalDB();
      const p = data.profiles.find((x: any) => x.id === profile.id);
      if (p) {
        p.last_active_date = today;
        p.coins = newCoins;
        p.study_streak = newStreak;
        writeLocalDB(data);
      }
    }
  }
  return profile;
}


// Helper: Check and reset device guest coins daily
async function checkAndResetGuestDailyCoins(guest: DeviceGuest): Promise<DeviceGuest> {
  const today = new Date().toISOString().split('T')[0];
  if (guest.last_message_date !== today) {
    guest.coins = 5.0; // Reset guest to 5 coins daily
    guest.last_message_date = today;
    
    if (supabase) {
      await supabase.from('device_guests').update({ coins: 5.0, last_message_date: today }).eq('device_id', guest.device_id);
    } else {
      const data = readLocalDB();
      const g = data.device_guests.find((x: any) => x.device_id === guest.device_id);
      if (g) {
        g.coins = 5.0;
        g.last_message_date = today;
        writeLocalDB(data);
      }
    }
  }
  return guest;
}

export const db = {
  // Profiles
  async getProfile(id: string): Promise<Profile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error || !data) return null;
      return await checkAndResetDailyCoins(data);
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.id === id) || null;
      if (!profile) return null;
      return await checkAndResetDailyCoins(profile);
    }
  },

  async getProfileByPhone(phone: string): Promise<Profile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle();
      if (error || !data) return null;
      return await checkAndResetDailyCoins(data);
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.phone === phone) || null;
      if (!profile) return null;
      return await checkAndResetDailyCoins(profile);
    }
  },

  async getProfileByEmail(email: string): Promise<Profile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
      if (error || !data) return null;
      return await checkAndResetDailyCoins(data);
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.email?.toLowerCase() === email.toLowerCase()) || null;
      if (!profile) return null;
      return await checkAndResetDailyCoins(profile);
    }
  },

  async createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile> {
    const defaultCoins = profile.plan_type === 'pro' ? 500.0 : (profile.plan_type === 'max' ? 1000.0 : 50.0);
    const newProfile = {
      ...profile,
      email: profile.email ? profile.email.toLowerCase() : undefined,
      coins: profile.coins !== undefined ? profile.coins : defaultCoins,
      last_active_date: profile.last_active_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase.from('profiles').insert(newProfile).select().single();
      if (error) throw new Error(error.message);
      return data;
    } else {
      const data = readLocalDB();
      data.profiles = data.profiles.filter((p: Profile) => 
        p.id !== profile.id && 
        (!profile.email || p.email?.toLowerCase() !== profile.email.toLowerCase()) && 
        (!profile.phone || p.phone !== profile.phone)
      );
      data.profiles.push(newProfile);
      writeLocalDB(data);
      return newProfile;
    }
  },

  async updateProfilePlan(id: string, planType: 'free' | 'pro' | 'max'): Promise<Profile | null> {
    const coins = planType === 'pro' ? 500.0 : (planType === 'max' ? 1000.0 : 50.0);
    const today = new Date().toISOString().split('T')[0];
    if (supabase) {
      const { data, error } = await supabase.from('profiles').update({ plan_type: planType, coins, last_active_date: today }).eq('id', id).select().single();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.id === id);
      if (!profile) return null;
      profile.plan_type = planType;
      profile.coins = coins;
      profile.last_active_date = today;
      writeLocalDB(data);
      return profile;
    }
  },

  async updateProfileGradeLevel(id: string, gradeLevel: string): Promise<Profile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').update({ grade_level: gradeLevel }).eq('id', id).select().single();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.id === id);
      if (!profile) return null;
      profile.grade_level = gradeLevel;
      writeLocalDB(data);
      return profile;
    }
  },

  // Pending registrations (OTP flow)
  async getPendingRegistration(email: string): Promise<PendingRegistration | null> {
    if (supabase) {
      const { data, error } = await supabase.from('pending_registrations').select('*').eq('email', email.toLowerCase()).maybeSingle();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      return data.pending_registrations.find((pr: PendingRegistration) => pr.email?.toLowerCase() === email.toLowerCase()) || null;
    }
  },

  async createPendingRegistration(email: string, name: string, gradeLevel: string, passwordHash: string, otp: string, termsAcceptedAt?: string, phone?: string, expiresAt?: string): Promise<PendingRegistration> {
    const pending = {
      email: email.toLowerCase(),
      phone: phone || undefined,
      name,
      grade_level: gradeLevel,
      password_hash: passwordHash,
      otp,
      created_at: new Date().toISOString(),
      terms_accepted_at: termsAcceptedAt || null,
      expires_at: expiresAt || null
    };

    if (supabase) {
      const { data, error } = await supabase.from('pending_registrations').upsert(pending).select().single();
      if (error) throw error;
      return data;
    } else {
      const data = readLocalDB();
      data.pending_registrations = data.pending_registrations.filter((pr: PendingRegistration) => pr.email?.toLowerCase() !== email.toLowerCase());
      data.pending_registrations.push(pending);
      writeLocalDB(data);
      return pending;
    }
  },

  async deletePendingRegistration(email: string): Promise<void> {
    if (supabase) {
      await supabase.from('pending_registrations').delete().eq('email', email.toLowerCase());
    } else {
      const data = readLocalDB();
      data.pending_registrations = data.pending_registrations.filter((pr: PendingRegistration) => pr.email?.toLowerCase() !== email.toLowerCase());
      writeLocalDB(data);
    }
  },

  // Password reset OTPs
  async getPasswordReset(userId: string): Promise<PasswordReset | null> {
    if (supabase) {
      const { data, error } = await supabase.from('password_resets').select('*').eq('user_id', userId).maybeSingle();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      return (data.password_resets || []).find((pr: PasswordReset) => pr.user_id === userId) || null;
    }
  },

  async createPasswordReset(userId: string, otp: string, expiresAt: string): Promise<void> {
    const reset = { user_id: userId, otp, expires_at: expiresAt, created_at: new Date().toISOString() };
    if (supabase) {
      const { error } = await supabase.from('password_resets').upsert(reset);
      if (error) throw error;
    } else {
      const data = readLocalDB();
      data.password_resets = (data.password_resets || []).filter((pr: PasswordReset) => pr.user_id !== userId);
      data.password_resets.push(reset);
      writeLocalDB(data);
    }
  },

  async deletePasswordReset(userId: string): Promise<void> {
    if (supabase) {
      await supabase.from('password_resets').delete().eq('user_id', userId);
    } else {
      const data = readLocalDB();
      data.password_resets = (data.password_resets || []).filter((pr: PasswordReset) => pr.user_id !== userId);
      writeLocalDB(data);
    }
  },

  // Device limits for guest users
  async getDeviceGuest(deviceId: string): Promise<DeviceGuest | null> {
    if (supabase) {
      const { data, error } = await supabase.from('device_guests').select('*').eq('device_id', deviceId).maybeSingle();
      if (error || !data) {
        return null;
      }
      return await checkAndResetGuestDailyCoins(data);
    } else {
      const data = readLocalDB();
      let guest = data.device_guests.find((dg: DeviceGuest) => dg.device_id === deviceId);
      if (!guest) return null;
      return await checkAndResetGuestDailyCoins(guest);
    }
  },

  async incrementDeviceGuestCount(deviceId: string): Promise<DeviceGuest> {
    const today = new Date().toISOString().split('T')[0];
    if (supabase) {
      const { data: existing } = await supabase.from('device_guests').select('*').eq('device_id', deviceId).maybeSingle();
      if (!existing) {
        const { data, error } = await supabase
          .from('device_guests')
          .insert({ device_id: deviceId, free_message_count: 1, last_message_date: today, coins: 5.0 })
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('device_guests')
          .update({ free_message_count: existing.free_message_count + 1 })
          .eq('device_id', deviceId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    } else {
      const data = readLocalDB();
      let guest = data.device_guests.find((dg: DeviceGuest) => dg.device_id === deviceId);
      if (!guest) {
        guest = {
          device_id: deviceId,
          free_message_count: 1,
          last_message_date: today,
          coins: 5.0
        };
        data.device_guests.push(guest);
      } else {
        guest.free_message_count += 1;
      }
      writeLocalDB(data);
      return guest;
    }
  },

  // Curriculum Management
  async getCurriculums(): Promise<Curriculum[]> {
    if (supabase) {
      const { data, error } = await supabase.from('curriculums').select('*');
      if (error) return [];
      return data;
    } else {
      const data = readLocalDB();
      return data.curriculums;
    }
  },

  async createCurriculum(
    gradeLevel: string,
    subjectName: string,
    fileName: string,
    chunks: Omit<CurriculumChunk, 'curriculum_id'>[]
  ): Promise<Curriculum> {
    const cleanGrade = gradeLevel.trim();
    const cleanSubject = subjectName.trim();
    const curriculumId = crypto.randomUUID();
    const newCurriculum: Curriculum = {
      id: curriculumId,
      grade_level: cleanGrade,
      subject_name: cleanSubject,
      file_name: fileName,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      const { error: currError } = await supabase.from('curriculums').insert(newCurriculum);
      if (currError) throw currError;

      // Assign IDs to parent chunks first so children can reference them
      const parentMap = new Map<string, string>(); // temp_parent_id -> real UUID
      for (const c of chunks) {
        if (c.chunk_level === 'parent' && c.id) {
          parentMap.set(c.id, crypto.randomUUID());
        }
      }

      const formattedChunks = chunks.map(c => {
        const realId = (c.chunk_level === 'parent' && c.id && parentMap.has(c.id))
          ? parentMap.get(c.id)!
          : (c.id || crypto.randomUUID());
        return {
          id: realId,
          curriculum_id: curriculumId,
          content: c.content,
          heading: c.heading,
          chunk_level: c.chunk_level || 'parent',
          parent_id: c.parent_id ? (parentMap.get(c.parent_id) || c.parent_id) : null,
          position_index: c.position_index || 0,
          embedding: c.embedding || null
        };
      });

      // Insert in batches of 100 to avoid payload limits
      const BATCH = 100;
      for (let i = 0; i < formattedChunks.length; i += BATCH) {
        const batch = formattedChunks.slice(i, i + BATCH);
        const { error: chunkError } = await supabase.from('curriculum_chunks').insert(batch);
        if (chunkError) {
          await supabase.from('curriculums').delete().eq('id', curriculumId);
          throw chunkError;
        }
      }
      return newCurriculum;
    } else {
      const data = readLocalDB();
      const existing = data.curriculums.find((c: Curriculum) => c.grade_level === cleanGrade && c.subject_name === cleanSubject);
      if (existing) {
        data.curriculums = data.curriculums.filter((c: Curriculum) => c.id !== existing.id);
        data.curriculum_chunks = data.curriculum_chunks.filter((cc: CurriculumChunk) => cc.curriculum_id !== existing.id);
      }

      data.curriculums.push(newCurriculum);

      const newChunks = chunks.map(c => ({
        id: c.id || crypto.randomUUID(),
        curriculum_id: curriculumId,
        content: c.content,
        heading: c.heading,
        chunk_level: c.chunk_level || 'parent',
        parent_id: c.parent_id || null,
        position_index: c.position_index || 0
        // Note: embeddings not stored in local JSON (too large)
      }));
      data.curriculum_chunks.push(...newChunks);

      writeLocalDB(data);
      return newCurriculum;
    }
  },

  async deleteCurriculum(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('curriculums').delete().eq('id', id);
      return !error;
    } else {
      const data = readLocalDB();
      data.curriculums = data.curriculums.filter((c: Curriculum) => c.id !== id);
      data.curriculum_chunks = data.curriculum_chunks.filter((cc: CurriculumChunk) => cc.curriculum_id !== id);
      writeLocalDB(data);
      return true;
    }
  },

  // ─── Legscy RAG search (kept for backward compat) ──────────────────────────
  async searchCurriculum(gradeLevel: string, subjectName: string, queryKeywords: string[]): Promise<CurriculumChunk[]> {
    return this.bm25SearchCurriculum(gradeLevel, subjectName, queryKeywords, []);
  },

  // ─── v2 RAG: BM25 keyword search (dual-language) ─────────────────────────
  async bm25SearchCurriculum(
    gradeLevel: string,
    subjectName: string,
    arabicKeywords: string[],
    englishKeywords: string[]
  ): Promise<CurriculumChunk[]> {
    const cleanGrade = gradeLevel.trim();
    const cleanSubject = subjectName.trim();
    const arabicQuery = arabicKeywords.join(' ');
    const englishQuery = englishKeywords.join(' ');

    if (supabase) {
      const { data: currList } = await supabase
        .from('curriculums')
        .select('id')
        .eq('grade_level', cleanGrade)
        .eq('subject_name', cleanSubject);

      if (!currList || currList.length === 0) return [];
      const curriculumIds = currList.map(c => c.id);

      // Fetch child chunks that match Arabic or English keywords
      const { data: chunks } = await supabase
        .from('curriculum_chunks')
        .select('id, content, heading, curriculum_id, chunk_level, parent_id, position_index')
        .in('curriculum_id', curriculumIds)
        .eq('chunk_level', 'child')
        .limit(50);

      if (!chunks || chunks.length === 0) {
        // Fallback: return parent chunks if no children exist (old data)
        const { data: parents } = await supabase
          .from('curriculum_chunks')
          .select('id, content, heading, curriculum_id, chunk_level, parent_id, position_index')
          .in('curriculum_id', curriculumIds)
          .limit(20);
        return rankChunksV2(parents || [], arabicKeywords, englishKeywords);
      }

      return rankChunksV2(chunks, arabicKeywords, englishKeywords);
    } else {
      // Local JSON mode: score all chunks against keywords
      const data = readLocalDB();
      const curr = data.curriculums.find((c: Curriculum) =>
        c.grade_level === cleanGrade && c.subject_name === cleanSubject
      );
      if (!curr) return [];

      const allChunks = data.curriculum_chunks.filter(
        (cc: CurriculumChunk) => cc.curriculum_id === curr.id
      );
      // In local mode, prioritize parent chunks for better context
      const parentChunks = allChunks.filter((c: CurriculumChunk) => c.chunk_level !== 'child');
      const toRank = parentChunks.length > 0 ? parentChunks : allChunks;
      return rankChunksV2(toRank, arabicKeywords, englishKeywords).slice(0, 8);
    }
  },

  // ─── v2 RAG: Vector similarity search (Supabase pgvector only) ───────────
  async vectorSearchCurriculum(
    gradeLevel: string,
    subjectName: string,
    queryEmbedding: number[]
  ): Promise<CurriculumChunk[]> {
    if (!supabase || !queryEmbedding || queryEmbedding.length === 0) return [];
    const cleanGrade = gradeLevel.trim();
    const cleanSubject = subjectName.trim();

    const { data: currList } = await supabase
      .from('curriculums')
      .select('id')
      .eq('grade_level', cleanGrade)
      .eq('subject_name', cleanSubject);

    if (!currList || currList.length === 0) return [];
    const curriculumId = currList[0].id; // use first curriculum

    // Use the hybrid_search_curriculum RPC function
    const { data: results, error } = await supabase.rpc('hybrid_search_curriculum', {
      p_curriculum_id: curriculumId,
      p_query_embedding: queryEmbedding,
      p_arabic_query: '',
      p_english_query: '',
      p_match_count: 30,
      p_rrf_k: 60
    });

    if (error) {
      console.error('vectorSearchCurriculum RPC error:', error);
      return [];
    }
    return results || [];
  },

  // ─── v2 RAG: Full hybrid search via Supabase RPC ──────────────────────────
  async hybridSearchCurriculum(
    gradeLevel: string,
    subjectName: string,
    queryEmbedding: number[],
    arabicKeywords: string[],
    englishKeywords: string[]
  ): Promise<CurriculumChunk[]> {
    if (!supabase) {
      return this.bm25SearchCurriculum(gradeLevel, subjectName, arabicKeywords, englishKeywords);
    }

    const cleanGrade = gradeLevel.trim();
    const cleanSubject = subjectName.trim();

    const { data: currList } = await supabase
      .from('curriculums')
      .select('id')
      .eq('grade_level', cleanGrade)
      .eq('subject_name', cleanSubject);

    if (!currList || currList.length === 0) return [];
    const curriculumId = currList[0].id;

    const { data: results, error } = await supabase.rpc('hybrid_search_curriculum', {
      p_curriculum_id: curriculumId,
      p_query_embedding: queryEmbedding.length > 0 ? queryEmbedding : Array(768).fill(0),
      p_arabic_query: arabicKeywords.join(' '),
      p_english_query: englishKeywords.join(' '),
      p_match_count: 8,
      p_rrf_k: 60
    });

    if (error) {
      console.error('hybridSearchCurriculum RPC error:', error);
      // Fallback to BM25 only
      return this.bm25SearchCurriculum(gradeLevel, subjectName, arabicKeywords, englishKeywords);
    }
    return results || [];
  },

  // ─── v2 RAG: Fetch parent chunks by their IDs ─────────────────────────────
  async getParentChunks(parentIds: string[]): Promise<CurriculumChunk[]> {
    if (parentIds.length === 0) return [];
    const uniqueIds = [...new Set(parentIds)];

    if (supabase) {
      const { data, error } = await supabase
        .from('curriculum_chunks')
        .select('id, content, heading, curriculum_id, chunk_level, parent_id, position_index')
        .in('id', uniqueIds)
        .eq('chunk_level', 'parent');

      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      return data.curriculum_chunks.filter(
        (cc: CurriculumChunk) => uniqueIds.includes(cc.id)
      );
    }
  },

  // ─── v2 RAG: Get the curriculum summary chunk ─────────────────────────────
  async getCurriculumSummary(gradeLevel: string, subjectName: string): Promise<string> {
    const cleanGrade = gradeLevel.trim();
    const cleanSubject = subjectName.trim();

    if (supabase) {
      const { data: currList } = await supabase
        .from('curriculums')
        .select('id')
        .eq('grade_level', cleanGrade)
        .eq('subject_name', cleanSubject);

      if (!currList || currList.length === 0) return '';

      const { data } = await supabase
        .from('curriculum_chunks')
        .select('content')
        .eq('curriculum_id', currList[0].id)
        .eq('heading', '__CURRICULUM_SUMMARY__')
        .limit(1)
        .single();

      return data?.content || '';
    } else {
      const data = readLocalDB();
      const curr = data.curriculums.find((c: Curriculum) =>
        c.grade_level === cleanGrade && c.subject_name === cleanSubject
      );
      if (!curr) return '';
      const summaryChunk = data.curriculum_chunks.find(
        (cc: CurriculumChunk) => cc.curriculum_id === curr.id && cc.heading === '__CURRICULUM_SUMMARY__'
      );
      return summaryChunk?.content || '';
    }
  },

  // ─── v2 RAG: Get full curriculum outline (all parent headings) ────────────
  async getFullCurriculumOutline(gradeLevel: string, subjectName: string): Promise<string[]> {
    const cleanGrade = gradeLevel.trim();
    const cleanSubject = subjectName.trim();

    if (supabase) {
      const { data: currList } = await supabase
        .from('curriculums')
        .select('id')
        .eq('grade_level', cleanGrade)
        .eq('subject_name', cleanSubject);

      if (!currList || currList.length === 0) return [];

      const { data } = await supabase
        .from('curriculum_chunks')
        .select('heading, position_index')
        .eq('curriculum_id', currList[0].id)
        .eq('chunk_level', 'parent')
        .neq('heading', '__CURRICULUM_SUMMARY__')
        .order('position_index', { ascending: true });

      return (data || []).map((c: any) => c.heading);
    } else {
      const data = readLocalDB();
      const curr = data.curriculums.find((c: Curriculum) =>
        c.grade_level === cleanGrade && c.subject_name === cleanSubject
      );
      if (!curr) return [];
      return data.curriculum_chunks
        .filter((cc: CurriculumChunk) =>
          cc.curriculum_id === curr.id &&
          cc.heading !== '__CURRICULUM_SUMMARY__' &&
          cc.chunk_level !== 'child'
        )
        .map((cc: CurriculumChunk) => cc.heading);
    }
  },

  // System Settings
  async getSystemSetting(key: string): Promise<string> {
    if (supabase) {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).single();
      if (error || !data) {
        if (key === 'website_link') return 'http://localhost:3000';
        return '';
      }
      return data.value;
    } else {
      const data = readLocalDB();
      const setting = data.system_settings.find((s: any) => s.key === key);
      return setting ? setting.value : (key === 'website_link' ? 'http://localhost:3000' : '');
    }
  },

  async setSystemSetting(key: string, value: string): Promise<void> {
    if (supabase) {
      await supabase.from('system_settings').upsert({ key, value });
    } else {
      const data = readLocalDB();
      let setting = data.system_settings.find((s: any) => s.key === key);
      if (setting) {
        setting.value = value;
      } else {
        data.system_settings.push({ key, value });
      }
      writeLocalDB(data);
    }
  },

  // Chat History Logging
  async getChatHistory(userId?: string, deviceId?: string, sessionId?: string): Promise<ChatMessage[]> {
    if (supabase) {
      let query = supabase.from('chat_history').select('*');
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else if (userId) {
        query = query.eq('user_id', userId);
      } else if (deviceId) {
        query = query.eq('device_id', deviceId);
      } else {
        return [];
      }
      const { data, error } = await query.order('created_at', { ascending: true });
      if (error) return [];
      return data;
    } else {
      const data = readLocalDB();
      if (sessionId) {
        return data.chat_history.filter((chat: ChatMessage) => chat.session_id === sessionId);
      } else if (userId) {
        return data.chat_history.filter((chat: ChatMessage) => chat.user_id === userId);
      } else if (deviceId) {
        return data.chat_history.filter((chat: ChatMessage) => chat.device_id === deviceId);
      }
      return [];
    }
  },

  async addChatMessage(sender: 'user' | 'ai', message: string, userId?: string, deviceId?: string, sessionId?: string, coinsCost?: number): Promise<ChatMessage> {
    const chat: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: userId,
      device_id: deviceId,
      session_id: sessionId,
      sender,
      message,
      created_at: new Date().toISOString(),
      coins_cost: coinsCost || 0.0
    };

    if (supabase) {
      await supabase.from('chat_history').insert(chat);
    } else {
      const data = readLocalDB();
      data.chat_history.push(chat);
      if (data.chat_history.length > 2000) {
        data.chat_history = data.chat_history.slice(-1500);
      }
      writeLocalDB(data);
    }
    return chat;
  },

  async deductCoins(userId: string | null, deviceId: string | null, amount: number): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    if (userId) {
      const profile = await this.getProfile(userId);
      if (!profile) return 0;
      const currentCoins = profile.coins === undefined ? 50.0 : profile.coins;
      if (profile.role === 'admin' || profile.unlimited_credit) {
        return currentCoins;
      }
      const newCoins = Math.max(0, currentCoins - amount);
      
      if (supabase) {
        await supabase.from('profiles').update({ coins: newCoins, last_active_date: today }).eq('id', userId);
      } else {
        const data = readLocalDB();
        const p = data.profiles.find((x: any) => x.id === userId);
        if (p) {
          p.coins = newCoins;
          p.last_active_date = today;
          writeLocalDB(data);
        }
      }
      return newCoins;
    } else if (deviceId) {
      const guest = await this.getDeviceGuest(deviceId);
      const currentCoins = guest ? (guest.coins === undefined ? 5.0 : guest.coins) : 5.0;
      const newCoins = Math.max(0, currentCoins - amount);
      
      if (supabase) {
        await supabase.from('device_guests').upsert({ device_id: deviceId, coins: newCoins, last_message_date: today });
      } else {
        const data = readLocalDB();
        let g = data.device_guests.find((x: any) => x.device_id === deviceId);
        if (!g) {
          g = { device_id: deviceId, free_message_count: 0, last_message_date: today, coins: newCoins };
          data.device_guests.push(g);
        } else {
          g.coins = newCoins;
          g.last_message_date = today;
        }
        writeLocalDB(data);
      }
      return newCoins;
    }
    return 0;
  },

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    if (supabase) {
      const { data, error } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).maybeSingle();
      if (error || !data) return null;
      return data;
    } else {
      const data = readLocalDB();
      if (!data.chat_sessions) return null;
      return data.chat_sessions.find((s: ChatSession) => s.id === sessionId) || null;
    }
  },

  async updateChatSessionEngagement(sessionId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('chat_sessions').update({ engagement_points_awarded: true }).eq('id', sessionId);
      return !error;
    } else {
      const data = readLocalDB();
      const s = (data.chat_sessions || []).find((x: any) => x.id === sessionId);
      if (s) {
        s.engagement_points_awarded = true;
        writeLocalDB(data);
      }
      return true;
    }
  },

  async getChatSessions(userId?: string, deviceId?: string): Promise<ChatSession[]> {
    if (supabase) {
      let query = supabase.from('chat_sessions').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (deviceId) {
        query = query.eq('device_id', deviceId);
      } else {
        return [];
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return [];
      return data;
    } else {
      const data = readLocalDB();
      if (!data.chat_sessions) data.chat_sessions = [];
      let sessions = [];
      if (userId) {
        sessions = data.chat_sessions.filter((s: ChatSession) => s.user_id === userId);
      } else if (deviceId) {
        sessions = data.chat_sessions.filter((s: ChatSession) => s.device_id === deviceId);
      }
      return sessions.sort((a: ChatSession, b: ChatSession) => b.created_at.localeCompare(a.created_at));
    }
  },

  async createChatSession(
    title: string,
    subjectName: string,
    gradeLevel: string,
    userId?: string,
    deviceId?: string,
    mode: ChatMode = 'detailed'
  ): Promise<ChatSession> {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      device_id: deviceId,
      title,
      subject_name: subjectName,
      grade_level: gradeLevel,
      mode,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      let { error } = await supabase.from('chat_sessions').insert(session);
      if (error && (error.code === 'PGRST204' || (error.message && error.message.includes("mode")))) {
        // Fallback: retry without the mode column if it's missing from the schema cache
        const { mode: _, ...sessionWithoutMode } = session;
        const retryResult = await supabase.from('chat_sessions').insert(sessionWithoutMode);
        error = retryResult.error;
      }
      if (error) throw error;
    } else {
      const data = readLocalDB();
      if (!data.chat_sessions) data.chat_sessions = [];
      data.chat_sessions.push(session);
      writeLocalDB(data);
    }
    return session;
  },

  async updateChatSessionMode(sessionId: string, mode: ChatMode): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('chat_sessions').update({ mode }).eq('id', sessionId);
      if (error && (error.code === 'PGRST204' || (error.message && error.message.includes("mode")))) {
        console.warn("Could not update chat session mode because the 'mode' column is missing from the database. Please run the migrations.");
        return;
      }
      if (error) throw error;
    } else {
      const data = readLocalDB();
      const session = (data.chat_sessions || []).find((s: ChatSession) => s.id === sessionId);
      if (session) {
        session.mode = mode;
        writeLocalDB(data);
      }
    }
  },

  async deleteChatSession(sessionId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
      return !error;
    } else {
      const data = readLocalDB();
      if (!data.chat_sessions) data.chat_sessions = [];
      data.chat_sessions = data.chat_sessions.filter((s: ChatSession) => s.id !== sessionId);
      data.chat_history = data.chat_history.filter((h: ChatMessage) => h.session_id !== sessionId);
      writeLocalDB(data);
      return true;
    }
  },

  async getCurriculumDetail(id: string): Promise<{ curriculum: Curriculum; content: string } | null> {
    if (supabase) {
      const { data: curriculum, error: err1 } = await supabase.from('curriculums').select('*').eq('id', id).single();
      if (err1 || !curriculum) return null;
      
      const { data: chunks, error: err2 } = await supabase.from('curriculum_chunks').select('*').eq('curriculum_id', id);
      if (err2 || !chunks) return null;
      
      const content = chunks.map(c => {
        if (c.heading && c.heading !== 'مقدمة المنهج' && !c.heading.includes('(جزء')) {
          return `# ${c.heading}\n${c.content}`;
        }
        return c.content;
      }).join('\n\n');
      
      return { curriculum, content };
    } else {
      const data = readLocalDB();
      const curriculum = data.curriculums.find((c: Curriculum) => c.id === id);
      if (!curriculum) return null;
      
      const chunks = data.curriculum_chunks.filter((cc: CurriculumChunk) => cc.curriculum_id === id);
      const content = chunks.map((c: CurriculumChunk) => {
        if (c.heading && c.heading !== 'مقدمة المنهج' && !c.heading.includes('(جزء')) {
          return `# ${c.heading}\n${c.content}`;
        }
        return c.content;
      }).join('\n\n');
      
      return { curriculum, content };
    }
  },

  async updateCurriculumContent(
    id: string,
    gradeLevel: string,
    subjectName: string,
    chunks: Omit<CurriculumChunk, 'id' | 'curriculum_id'>[]
  ): Promise<boolean> {
    const cleanGrade = gradeLevel.trim();
    const cleanSubject = subjectName.trim();
    
    if (supabase) {
      const { error: err1 } = await supabase
        .from('curriculums')
        .update({ grade_level: cleanGrade, subject_name: cleanSubject })
        .eq('id', id);
      if (err1) return false;
      
      const { error: err2 } = await supabase
        .from('curriculum_chunks')
        .delete()
        .eq('curriculum_id', id);
      if (err2) return false;
      
      const formattedChunks = chunks.map(c => ({
        id: crypto.randomUUID(),
        curriculum_id: id,
        content: c.content,
        heading: c.heading
      }));
      const { error: err3 } = await supabase.from('curriculum_chunks').insert(formattedChunks);
      if (err3) return false;
      
      return true;
    } else {
      const data = readLocalDB();
      const curriculum = data.curriculums.find((c: Curriculum) => c.id === id);
      if (!curriculum) return false;
      
      curriculum.grade_level = cleanGrade;
      curriculum.subject_name = cleanSubject;
      
      data.curriculum_chunks = data.curriculum_chunks.filter((cc: CurriculumChunk) => cc.curriculum_id !== id);
      
      const newChunks = chunks.map(c => ({
        id: crypto.randomUUID(),
        curriculum_id: id,
        content: c.content,
        heading: c.heading
      }));
      data.curriculum_chunks.push(...newChunks);
      
      writeLocalDB(data);
      return true;
    }
  },

  async updateProfileName(id: string, name: string): Promise<Profile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').update({ name }).eq('id', id).select().single();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.id === id);
      if (!profile) return null;
      profile.name = name;
      writeLocalDB(data);
      return profile;
    }
  },

  async updateProfilePassword(id: string, passwordHash: string): Promise<Profile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').update({ password_hash: passwordHash }).eq('id', id).select().single();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.id === id);
      if (!profile) return null;
      profile.password_hash = passwordHash;
      writeLocalDB(data);
      return profile;
    }
  },

  async getDashboardStats() {
    if (supabase) {
      const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('id, name, phone, email, grade_level, role');
      if (profilesErr || !profiles) {
        return { totalUsers: 0, usersByGrade: {}, highestUsageUser: null, highestUsageGrade: null };
      }
      
      const students = profiles.filter(p => p.role === 'student');
      const totalUsers = students.length;
      
      const usersByGrade: Record<string, number> = {};
      students.forEach(p => {
        usersByGrade[p.grade_level] = (usersByGrade[p.grade_level] || 0) + 1;
      });
      
      const { data: chats, error: chatsErr } = await supabase.from('chat_history').select('user_id, sender, coins_cost');
      if (chatsErr || !chats) {
        return { totalUsers, usersByGrade, highestUsageUser: null, highestUsageGrade: null };
      }
      
      const userMessageCounts: Record<string, number> = {};
      const userCoinConsumption: Record<string, number> = {};
      chats.forEach(chat => {
        if (chat.sender === 'user' && chat.user_id) {
          userMessageCounts[chat.user_id] = (userMessageCounts[chat.user_id] || 0) + 1;
        }
        if (chat.user_id) {
          userCoinConsumption[chat.user_id] = (userCoinConsumption[chat.user_id] || 0) + Number(chat.coins_cost || 0);
        }
      });
      
      let highestUserId = '';
      let highestCoins = 0;
      Object.entries(userCoinConsumption).forEach(([uid, coins]) => {
        if (coins > highestCoins) {
          highestCoins = coins;
          highestUserId = uid;
        }
      });
      
      if (!highestUserId) {
        let highestCount = 0;
        Object.entries(userMessageCounts).forEach(([uid, count]) => {
          if (count > highestCount) {
            highestCount = count;
            highestUserId = uid;
          }
        });
      }
      
      let highestUsageUser = null;
      if (highestUserId) {
        const u = students.find(p => p.id === highestUserId);
        if (u) {
          highestUsageUser = { 
            name: u.name, 
            phone: u.phone, 
            email: u.email,
            grade_level: u.grade_level, 
            message_count: userMessageCounts[highestUserId] || 0,
            coins_used: Math.round(userCoinConsumption[highestUserId] * 100) / 100
          };
        }
      }
      
      const gradeCoinConsumption: Record<string, number> = {};
      const gradeMessageCounts: Record<string, number> = {};
      chats.forEach(chat => {
        if (chat.user_id) {
          const u = students.find(p => p.id === chat.user_id);
          if (u) {
            if (chat.sender === 'user') {
              gradeMessageCounts[u.grade_level] = (gradeMessageCounts[u.grade_level] || 0) + 1;
            }
            gradeCoinConsumption[u.grade_level] = (gradeCoinConsumption[u.grade_level] || 0) + Number(chat.coins_cost || 0);
          }
        }
      });
      
      let highestGrade = '';
      let highestGradeCoins = 0;
      Object.entries(gradeCoinConsumption).forEach(([grade, coins]) => {
        if (coins > highestGradeCoins) {
          highestGradeCoins = coins;
          highestGrade = grade;
        }
      });
      
      const highestUsageGrade = highestGrade ? { 
        grade_level: highestGrade, 
        message_count: gradeMessageCounts[highestGrade] || 0,
        coins_used: Math.round(highestGradeCoins * 100) / 100
      } : null;
      
      return {
        totalUsers,
        usersByGrade,
        highestUsageUser,
        highestUsageGrade
      };
    } else {
      const data = readLocalDB();
      const students = data.profiles.filter((p: Profile) => p.role === 'student');
      const totalUsers = students.length;
      
      const usersByGrade: Record<string, number> = {};
      students.forEach((p: Profile) => {
        usersByGrade[p.grade_level] = (usersByGrade[p.grade_level] || 0) + 1;
      });
      
      const userMessageCounts: Record<string, number> = {};
      const userCoinConsumption: Record<string, number> = {};
      data.chat_history.forEach((chat: ChatMessage) => {
        if (chat.sender === 'user' && chat.user_id) {
          userMessageCounts[chat.user_id] = (userMessageCounts[chat.user_id] || 0) + 1;
        }
        if (chat.user_id) {
          userCoinConsumption[chat.user_id] = (userCoinConsumption[chat.user_id] || 0) + Number(chat.coins_cost || 0);
        }
      });
      
      let highestUserId = '';
      let highestCoins = 0;
      Object.entries(userCoinConsumption).forEach(([uid, coins]) => {
        if (coins > highestCoins) {
          highestCoins = coins;
          highestUserId = uid;
        }
      });
      
      if (!highestUserId) {
        let highestCount = 0;
        Object.entries(userMessageCounts).forEach(([uid, count]) => {
          if (count > highestCount) {
            highestCount = count;
            highestUserId = uid;
          }
        });
      }
      
      let highestUsageUser = null;
      if (highestUserId) {
        const u = students.find((p: Profile) => p.id === highestUserId);
        if (u) {
          highestUsageUser = { 
            name: u.name, 
            phone: u.phone, 
            email: u.email,
            grade_level: u.grade_level, 
            message_count: userMessageCounts[highestUserId] || 0,
            coins_used: Math.round(userCoinConsumption[highestUserId] * 100) / 100
          };
        }
      }
      
      const gradeCoinConsumption: Record<string, number> = {};
      const gradeMessageCounts: Record<string, number> = {};
      data.chat_history.forEach((chat: ChatMessage) => {
        if (chat.user_id) {
          const u = students.find((p: Profile) => p.id === chat.user_id);
          if (u) {
            if (chat.sender === 'user') {
              gradeMessageCounts[u.grade_level] = (gradeMessageCounts[u.grade_level] || 0) + 1;
            }
            gradeCoinConsumption[u.grade_level] = (gradeCoinConsumption[u.grade_level] || 0) + Number(chat.coins_cost || 0);
          }
        }
      });
      
      let highestGrade = '';
      let highestGradeCoins = 0;
      Object.entries(gradeCoinConsumption).forEach(([grade, coins]) => {
        if (coins > highestGradeCoins) {
          highestGradeCoins = coins;
          highestGrade = grade;
        }
      });
      
      const highestUsageGrade = highestGrade ? { 
        grade_level: highestGrade, 
        message_count: gradeMessageCounts[highestGrade] || 0,
        coins_used: Math.round(highestGradeCoins * 100) / 100
      } : null;
      
      return {
        totalUsers,
        usersByGrade,
        highestUsageUser,
        highestUsageGrade
      };
    }
  },

  // Exams & Testing
  async getExams(gradeLevel?: string, subjectName?: string, userId?: string, deviceId?: string): Promise<Exam[]> {
    if (supabase) {
      let query = supabase.from('exams').select('*');
      if (gradeLevel) query = query.eq('grade_level', gradeLevel);
      if (subjectName) query = query.eq('subject_name', subjectName);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      let list = data.exams || [];
      if (gradeLevel) list = list.filter((e: any) => e.grade_level === gradeLevel);
      if (subjectName) list = list.filter((e: any) => e.subject_name === subjectName);
      return list;
    }
  },

  async getExam(id: string): Promise<Exam | null> {
    if (supabase) {
      const { data, error } = await supabase.from('exams').select('*').eq('id', id).maybeSingle();
      if (error || !data) return null;
      return data;
    } else {
      const data = readLocalDB();
      return (data.exams || []).find((e: any) => e.id === id) || null;
    }
  },

  async createExam(exam: Omit<Exam, 'id' | 'created_at'>): Promise<Exam> {
    const newExam = {
      ...exam,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase.from('exams').insert(newExam).select().single();
      if (error) throw error;
      return data;
    } else {
      const data = readLocalDB();
      if (!data.exams) data.exams = [];
      data.exams.push(newExam);
      writeLocalDB(data);
      return newExam;
    }
  },

  async getExamSubmissions(userId?: string, deviceId?: string): Promise<ExamSubmission[]> {
    if (supabase) {
      let query = supabase.from('exam_submissions').select('*');
      if (userId) query = query.eq('user_id', userId);
      else if (deviceId) query = query.eq('device_id', deviceId);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      let list = data.exam_submissions || [];
      if (userId) list = list.filter((s: any) => s.user_id === userId);
      else if (deviceId) list = list.filter((s: any) => s.device_id === deviceId);
      return list;
    }
  },

  async createExamSubmission(submission: Omit<ExamSubmission, 'id' | 'submitted_at'>): Promise<ExamSubmission> {
    const newSub: any = {
      ...submission,
      id: crypto.randomUUID(),
      submitted_at: new Date().toISOString()
    };

    if (supabase) {
      let { data, error } = await supabase.from('exam_submissions').insert(newSub).select().single();
      if (error) {
        console.warn('Exam submission insert warning, retrying without phase 3 columns:', error.message);
        // Fallback for databases where migration_phase3.sql has not been executed yet
        const { points_awarded, is_first_attempt, ...fallbackSub } = newSub;
        const retry = await supabase.from('exam_submissions').insert(fallbackSub).select().single();
        if (!retry.error && retry.data) {
          data = retry.data;
          error = null;
        }
      }
      if (error) throw error;
      return data;
    } else {
      const data = readLocalDB();
      if (!data.exam_submissions) data.exam_submissions = [];
      data.exam_submissions.push(newSub);
      writeLocalDB(data);
      return newSub;
    }
  },

  // ─── Curriculum rename (metadata only, chunks untouched) ──────────────────
  async renameCurriculum(id: string, subjectName: string, fileName?: string): Promise<Curriculum | null> {
    const cleanSubject = subjectName.trim();
    if (supabase) {
      const update: any = { subject_name: cleanSubject };
      if (fileName) update.file_name = fileName;
      const { data, error } = await supabase.from('curriculums').update(update).eq('id', id).select().single();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      const curriculum = data.curriculums.find((c: Curriculum) => c.id === id);
      if (!curriculum) return null;
      curriculum.subject_name = cleanSubject;
      if (fileName) curriculum.file_name = fileName;
      writeLocalDB(data);
      return curriculum;
    }
  },

  // ─── Reports (AI response reporting) ───────────────────────────────────────
  async createReport(report: Omit<Report, 'id' | 'created_at' | 'status'>): Promise<Report> {
    const newReport: Report = {
      ...report,
      id: crypto.randomUUID(),
      status: 'pending',
      created_at: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('reports').insert(newReport).select().single();
      if (error) throw error;
      return data;
    } else {
      const data = readLocalDB();
      if (!data.reports) data.reports = [];
      data.reports.push(newReport);
      writeLocalDB(data);
      return newReport;
    }
  },

  async getReports(status?: string): Promise<Report[]> {
    if (supabase) {
      let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      let list = (data.reports || []) as Report[];
      if (status) list = list.filter(r => r.status === status);
      return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  async updateReportStatus(id: string, status: 'pending' | 'reviewed' | 'dismissed'): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('reports').update({ status }).eq('id', id);
      return !error;
    } else {
      const data = readLocalDB();
      const report = (data.reports || []).find((r: Report) => r.id === id);
      if (!report) return false;
      report.status = status;
      writeLocalDB(data);
      return true;
    }
  },

  async deleteReport(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('reports').delete().eq('id', id);
      return !error;
    } else {
      const data = readLocalDB();
      data.reports = (data.reports || []).filter((r: Report) => r.id !== id);
      writeLocalDB(data);
      return true;
    }
  },

  // ─── Notifications ─────────────────────────────────────────────────────────
  async getActiveNotifications(target: 'web' | 'phone'): Promise<AppNotification[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).filter((n: AppNotification) => n.target === 'both' || n.target === target);
    } else {
      const data = readLocalDB();
      const list = (data.notifications || []) as AppNotification[];
      return list
        .filter(n => n.active && (n.target === 'both' || n.target === target))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  async getAllNotifications(): Promise<AppNotification[]> {
    if (supabase) {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      return [...((data.notifications || []) as AppNotification[])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  async createNotification(notification: Omit<AppNotification, 'id' | 'created_at' | 'active'>): Promise<AppNotification> {
    const newNotification: AppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      active: true,
      created_at: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('notifications').insert(newNotification).select().single();
      if (error) throw error;
      return data;
    } else {
      const data = readLocalDB();
      if (!data.notifications) data.notifications = [];
      data.notifications.push(newNotification);
      writeLocalDB(data);
      return newNotification;
    }
  },

  async setNotificationActive(id: string, active: boolean): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('notifications').update({ active }).eq('id', id);
      return !error;
    } else {
      const data = readLocalDB();
      const n = (data.notifications || []).find((x: AppNotification) => x.id === id);
      if (!n) return false;
      n.active = active;
      writeLocalDB(data);
      return true;
    }
  },

  async deleteNotification(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      return !error;
    } else {
      const data = readLocalDB();
      data.notifications = (data.notifications || []).filter((n: AppNotification) => n.id !== id);
      writeLocalDB(data);
      return true;
    }
  },

  // ─── App Versions (mobile force-update) ────────────────────────────────────
  async getLatestVersion(platform: string = 'android'): Promise<AppVersion | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('platform', platform)
        .eq('active', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data;
    } else {
      const data = readLocalDB();
      const list = ((data.app_versions || []) as AppVersion[])
        .filter(v => v.platform === platform && v.active)
        .sort((a, b) => b.version_code - a.version_code);
      return list[0] || null;
    }
  },

  async getAllVersions(): Promise<AppVersion[]> {
    if (supabase) {
      const { data, error } = await supabase.from('app_versions').select('*').order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      return [...((data.app_versions || []) as AppVersion[])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  },

  async createVersion(version: Omit<AppVersion, 'id' | 'created_at' | 'active'>): Promise<AppVersion> {
    const newVersion: AppVersion = {
      ...version,
      id: crypto.randomUUID(),
      active: true,
      created_at: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('app_versions').insert(newVersion).select().single();
      if (error) throw error;
      return data;
    } else {
      const data = readLocalDB();
      if (!data.app_versions) data.app_versions = [];
      data.app_versions.push(newVersion);
      writeLocalDB(data);
      return newVersion;
    }
  },

  async deleteVersion(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('app_versions').delete().eq('id', id);
      return !error;
    } else {
      const data = readLocalDB();
      data.app_versions = (data.app_versions || []).filter((v: AppVersion) => v.id !== id);
      writeLocalDB(data);
      return true;
    }
  },

  // ─── User management (admin) ───────────────────────────────────────────────
  async getUsers(search?: string): Promise<Omit<Profile, 'password_hash'>[]> {
    if (supabase) {
      let query = supabase.from('profiles').select('id, phone, email, name, grade_level, plan_type, role, coins, unlimited_credit, created_at, last_active_date');
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      let list = data.profiles as Profile[];
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(s) || (p.phone && p.phone.includes(s)) || (p.email && p.email.toLowerCase().includes(s)));
      }
      return [...list]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ password_hash, ...rest }) => rest);
    }
  },

  async setUserUnlimited(id: string, unlimited: boolean): Promise<Profile | null> {
    if (supabase) {
      const { data, error } = await supabase.from('profiles').update({ unlimited_credit: unlimited }).eq('id', id).select().single();
      if (error) return null;
      return data;
    } else {
      const data = readLocalDB();
      const profile = data.profiles.find((p: Profile) => p.id === id);
      if (!profile) return null;
      profile.unlimited_credit = unlimited;
      writeLocalDB(data);
      return profile;
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      return !error;
    } else {
      const data = readLocalDB();
      data.profiles = data.profiles.filter((p: Profile) => p.id !== id);
      writeLocalDB(data);
      return true;
    }
  },

  async addCoins(userId: string, amount: number): Promise<number> {
    const profile = await this.getProfile(userId);
    if (!profile) return 0;
    const currentCoins = profile.coins === undefined ? 50.0 : profile.coins;
    const newCoins = currentCoins + amount;
    
    if (supabase) {
      await supabase.from('profiles').update({ coins: newCoins }).eq('id', userId);
    } else {
      const data = readLocalDB();
      const p = data.profiles.find((x: any) => x.id === userId);
      if (p) {
        p.coins = newCoins;
        writeLocalDB(data);
      }
    }
    return newCoins;
  },

  async addPoints(userId: string, amount: number): Promise<number> {
    const profile = await this.getProfile(userId);
    if (!profile) return 0;
    const currentPoints = profile.points || 0;
    const newPoints = currentPoints + amount;
    
    if (supabase) {
      try {
        await supabase.from('profiles').update({ points: newPoints }).eq('id', userId);
      } catch (e) {
        console.warn('addPoints update failed:', e);
      }
    } else {
      const data = readLocalDB();
      const p = data.profiles.find((x: any) => x.id === userId);
      if (p) {
        p.points = newPoints;
        writeLocalDB(data);
      }
    }
    return newPoints;
  },

  async hasSubmittedExam(examId: string, userId?: string, deviceId?: string): Promise<boolean> {
    if (supabase) {
      let query = supabase.from('exam_submissions').select('id', { count: 'exact', head: true }).eq('exam_id', examId);
      if (userId) query = query.eq('user_id', userId);
      else if (deviceId) query = query.eq('device_id', deviceId);
      const { count } = await query;
      return (count || 0) > 0;
    } else {
      const data = readLocalDB();
      const subs = data.exam_submissions || [];
      return subs.some((s: any) => s.exam_id === examId && (userId ? s.user_id === userId : s.device_id === deviceId));
    }
  },

  async getLeaderboard(gradeLevel?: string, limit: number = 20): Promise<any[]> {
    if (supabase) {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_grade_level: gradeLevel || null,
        p_limit: limit
      });
      if (error) {
        console.error('get_leaderboard RPC error:', error);
        return [];
      }
      return data || [];
    } else {
      const data = readLocalDB();
      const students = data.profiles.filter((p: any) => {
        if (p.role !== 'student') return false;
        if (gradeLevel && p.grade_level !== gradeLevel) return false;
        const email = (p.email || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        if (email.includes('test') || email.includes('trial')) return false;
        if (name.includes('test') || name.includes('trial') || p.name?.includes('اختباري') || p.name?.includes('تجريبي')) return false;
        return true;
      });
      
      const stats = students.map((p: any) => {
        const userSubmissions = data.exam_submissions ? data.exam_submissions.filter((es: any) => es.user_id === p.id) : [];
        const avgAccuracy = userSubmissions.length > 0 
          ? userSubmissions.reduce((acc: number, curr: any) => acc + curr.score, 0) / userSubmissions.length
          : 0.0;
        return {
          user_id: p.id,
          name: p.name,
          grade_level: p.grade_level,
          coins: p.coins || 0,
          points: p.points || 0,
          study_streak: p.study_streak || 1,
          average_accuracy: Math.round(avgAccuracy * 100) / 100
        };
      });
      
      stats.sort((a: any, b: any) => {
        if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
        if (b.study_streak !== a.study_streak) return b.study_streak - a.study_streak;
        return b.average_accuracy - a.average_accuracy;
      });
      
      return stats.slice(0, limit).map((s: any, idx: number) => ({
        ...s,
        rank_number: idx + 1
      }));
    }
  },

  async getFlashcardDecks(userId: string): Promise<any[]> {
    if (supabase) {
      const { data: decks, error: decksErr } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', userId);
      
      if (decksErr || !decks) return [];

      const result = [];
      const today = new Date().toISOString();

      for (const deck of decks) {
        const { count, error: countErr } = await supabase
          .from('flashcards')
          .select('id', { count: 'exact', head: true })
          .eq('deck_id', deck.id)
          .lte('next_review_at', today);
        
        const { count: totalCount } = await supabase
          .from('flashcards')
          .select('id', { count: 'exact', head: true })
          .eq('deck_id', deck.id);

        result.push({
          ...deck,
          due_count: countErr ? 0 : (count || 0),
          total_count: totalCount || 0
        });
      }
      return result;
    } else {
      const data = readLocalDB();
      const decks = (data.flashcard_decks || []).filter((d: any) => d.user_id === userId);
      const todayStr = new Date().toISOString();
      
      return decks.map((deck: any) => {
        const cards = (data.flashcards || []).filter((c: any) => c.deck_id === deck.id);
        const dueCards = cards.filter((c: any) => c.next_review_at <= todayStr);
        return {
          ...deck,
          due_count: dueCards.length,
          total_count: cards.length
        };
      });
    }
  },

  async createFlashcardDeck(
    userId: string,
    subjectName: string,
    gradeLevel: string,
    title: string,
    cards: Omit<Flashcard, 'id' | 'deck_id' | 'box' | 'next_review_at' | 'created_at'>[]
  ): Promise<any> {
    const deckId = crypto.randomUUID();
    const today = new Date().toISOString();
    const newDeck = {
      id: deckId,
      user_id: userId,
      subject_name: subjectName,
      grade_level: gradeLevel,
      title,
      created_at: today
    };

    const newCards = cards.map(c => ({
      id: crypto.randomUUID(),
      deck_id: deckId,
      question: c.question,
      answer: c.answer,
      box: 1,
      next_review_at: today,
      created_at: today
    }));

    if (supabase) {
      const { data: deck, error: deckErr } = await supabase.from('flashcard_decks').insert(newDeck).select().single();
      if (deckErr) throw deckErr;
      
      const { error: cardsErr } = await supabase.from('flashcards').insert(newCards);
      if (cardsErr) throw cardsErr;

      return { ...deck, cards: newCards };
    } else {
      const data = readLocalDB();
      if (!data.flashcard_decks) data.flashcard_decks = [];
      if (!data.flashcards) data.flashcards = [];

      data.flashcard_decks.push(newDeck);
      data.flashcards.push(...newCards);
      writeLocalDB(data);

      return { ...newDeck, cards: newCards };
    }
  },

  async getFlashcardsDue(deckId: string): Promise<any[]> {
    const today = new Date().toISOString();
    if (supabase) {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .lte('next_review_at', today)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data || [];
    } else {
      const data = readLocalDB();
      const cards = (data.flashcards || []).filter((c: any) => c.deck_id === deckId && c.next_review_at <= today);
      return cards.sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
    }
  },

  async reviewFlashcard(cardId: string, rating: number): Promise<any> {
    const intervals = [1, 2, 4, 7, 14];
    
    let card: any = null;
    if (supabase) {
      const { data } = await supabase.from('flashcards').select('*').eq('id', cardId).maybeSingle();
      card = data;
    } else {
      const data = readLocalDB();
      card = (data.flashcards || []).find((c: any) => c.id === cardId) || null;
    }

    if (!card) throw new Error('Flashcard not found');

    let currentBox = card.box || 1;
    let nextBox = currentBox;

    if (rating >= 4) {
      nextBox = Math.min(5, currentBox + 1);
    } else if (rating === 3) {
      nextBox = currentBox;
    } else {
      nextBox = 1;
    }

    const intervalDays = intervals[nextBox - 1];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + intervalDays);
    const nextReviewStr = nextReview.toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('flashcards')
        .update({ box: nextBox, next_review_at: nextReviewStr })
        .eq('id', cardId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const data = readLocalDB();
      const c = data.flashcards.find((x: any) => x.id === cardId);
      if (c) {
        c.box = nextBox;
        c.next_review_at = nextReviewStr;
        writeLocalDB(data);
      }
      return { ...card, box: nextBox, next_review_at: nextReviewStr };
    }
  },

  async getFlashcardsBySubject(userId: string, subjectName: string): Promise<{ decks: any[]; cards: any[] }> {
    if (supabase) {
      const { data: decks, error: dErr } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', userId)
        .eq('subject_name', subjectName);
      if (dErr || !decks || decks.length === 0) return { decks: [], cards: [] };

      const deckIds = decks.map((d: any) => d.id);
      const deckTitleMap: Record<string, string> = {};
      decks.forEach((d: any) => { deckTitleMap[d.id] = d.title; });

      const { data: cards, error: cErr } = await supabase
        .from('flashcards')
        .select('*')
        .in('deck_id', deckIds)
        .order('created_at', { ascending: true });

      const cardsWithTitle = (cards || []).map((c: any) => ({
        ...c,
        deck_title: deckTitleMap[c.deck_id] || ''
      }));

      return { decks, cards: cardsWithTitle };
    } else {
      const data = readLocalDB();
      const decks = (data.flashcard_decks || []).filter((d: any) => d.user_id === userId && d.subject_name === subjectName);
      const deckIds = new Set(decks.map((d: any) => d.id));
      const deckTitleMap: Record<string, string> = {};
      decks.forEach((d: any) => { deckTitleMap[d.id] = d.title; });

      const cards = (data.flashcards || [])
        .filter((c: any) => deckIds.has(c.deck_id))
        .map((c: any) => ({ ...c, deck_title: deckTitleMap[c.deck_id] || '' }));

      return { decks, cards };
    }
  },

  async updateFlashcardDeck(deckId: string, userId: string, title: string): Promise<boolean> {
    const cleanTitle = title.trim();
    if (supabase) {
      const { error } = await supabase.from('flashcard_decks').update({ title: cleanTitle }).eq('id', deckId).eq('user_id', userId);
      return !error;
    } else {
      const data = readLocalDB();
      const deck = (data.flashcard_decks || []).find((d: any) => d.id === deckId && d.user_id === userId);
      if (!deck) return false;
      deck.title = cleanTitle;
      writeLocalDB(data);
      return true;
    }
  },

  async deleteFlashcardDeck(deckId: string, userId: string): Promise<boolean> {
    if (supabase) {
      const { error: cardsErr } = await supabase.from('flashcards').delete().eq('deck_id', deckId);
      const { error: deckErr } = await supabase.from('flashcard_decks').delete().eq('id', deckId).eq('user_id', userId);
      return !deckErr && !cardsErr;
    } else {
      const data = readLocalDB();
      data.flashcards = (data.flashcards || []).filter((c: any) => c.deck_id !== deckId);
      data.flashcard_decks = (data.flashcard_decks || []).filter((d: any) => !(d.id === deckId && d.user_id === userId));
      writeLocalDB(data);
      return true;
    }
  },

  async updateFlashcard(cardId: string, question: string, answer: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('flashcards').update({ question, answer }).eq('id', cardId);
      return !error;
    } else {
      const data = readLocalDB();
      const card = (data.flashcards || []).find((c: any) => c.id === cardId);
      if (!card) return false;
      card.question = question;
      card.answer = answer;
      writeLocalDB(data);
      return true;
    }
  },

  async deleteFlashcard(cardId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
      return !error;
    } else {
      const data = readLocalDB();
      data.flashcards = (data.flashcards || []).filter((c: any) => c.id !== cardId);
      writeLocalDB(data);
      return true;
    }
  },

  // Payment Transactions
  async createPaymentTransaction(tx: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<PaymentTransaction> {
    const newTx: PaymentTransaction = {
      id: crypto.randomUUID(),
      ...tx,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase.from('payment_transactions').insert(newTx).select().single();
      if (error) {
        // Fallback if table doesn't exist yet: return newTx in memory
        console.warn('Supabase payment insert warning:', error.message);
        return newTx;
      }
      return data;
    } else {
      const data = readLocalDB();
      data.payment_transactions = data.payment_transactions || [];
      data.payment_transactions.push(newTx);
      writeLocalDB(data);
      return newTx;
    }
  },

  async getPaymentTransactionByOrderId(orderId: string): Promise<PaymentTransaction | null> {
    if (supabase) {
      const { data, error } = await supabase.from('payment_transactions').select('*').eq('order_id', orderId).maybeSingle();
      if (error || !data) return null;
      return data;
    } else {
      const data = readLocalDB();
      return (data.payment_transactions || []).find((t: PaymentTransaction) => t.order_id === orderId) || null;
    }
  },

  async updatePaymentTransactionStatus(
    orderId: string,
    status: 'pending' | 'success' | 'failed' | 'refunded',
    transactionId?: string | null,
    paymentMethod?: string | null,
    rawResponse?: any
  ): Promise<PaymentTransaction | null> {
    const now = new Date().toISOString();
    const updatePayload: any = { status, updated_at: now };
    if (transactionId !== undefined) updatePayload.transaction_id = transactionId;
    if (paymentMethod !== undefined) updatePayload.payment_method = paymentMethod;
    if (rawResponse !== undefined) updatePayload.raw_response = rawResponse;

    if (supabase) {
      const { data, error } = await supabase
        .from('payment_transactions')
        .update(updatePayload)
        .eq('order_id', orderId)
        .select()
        .maybeSingle();
      if (error) {
        console.warn('Supabase payment update warning:', error.message);
        return null;
      }
      return data;
    } else {
      const data = readLocalDB();
      const tx = (data.payment_transactions || []).find((t: PaymentTransaction) => t.order_id === orderId);
      if (!tx) return null;
      Object.assign(tx, updatePayload);
      writeLocalDB(data);
      return tx;
    }
  },

  async activateSubscription(userId: string, planId: string, orderId?: string): Promise<{ success: boolean; profile?: Profile | null }> {
    const profile = await this.getProfile(userId);
    if (!profile) return { success: false };

    let bonusCoins = 500.0;
    let planTitle = 'باقة برو (شهر)';
    if (planId === 'pro_2m' || planId === '2_months') {
      bonusCoins = 1000.0;
      planTitle = 'باقة برو (شهرين)';
    } else if (planId === 'pro_3m' || planId === '3_months') {
      bonusCoins = 2500.0;
      planTitle = 'باقة برو (3 أشهر)';
    }

    const currentCoins = profile.coins ?? 50.0;
    const newCoins = currentCoins + bonusCoins;
    const today = new Date().toISOString().split('T')[0];

    // Upgrade profile to pro
    if (supabase) {
      await supabase.from('profiles').update({
        plan_type: 'pro',
        coins: newCoins,
        last_active_date: today
      }).eq('id', userId);
    } else {
      const data = readLocalDB();
      const p = (data.profiles || []).find((x: Profile) => x.id === userId);
      if (p) {
        p.plan_type = 'pro';
        p.coins = newCoins;
        p.last_active_date = today;
        writeLocalDB(data);
      }
    }

    // Create in-app confirmation notification
    try {
      await this.createNotification({
        title: 'تم تفعيل اشتراكك بنجاح',
        body: `تهانينا! تم تفعيل ${planTitle} وإضافة ${bonusCoins} نقطة إلى رصيدك. استمتع بميزات المساعد الذكي غير المحدودة.`,
        type: 'success',
        target: 'web'
      });
    } catch {
      // Non-blocking
    }

    const updatedProfile = await this.getProfile(userId);
    return { success: true, profile: updatedProfile };
  }
};

// Helper: Rank chunks based on keywords
function rankChunks(chunks: CurriculumChunk[], keywords: string[]): CurriculumChunk[] {
  if (keywords.length === 0) return chunks.slice(0, 5);

  const scored = chunks.map(chunk => {
    let score = 0;
    const textToSearch = `${chunk.heading} ${chunk.content}`.toLowerCase();
    
    keywords.forEach(keyword => {
      if (!keyword.trim()) return;
      const regex = new RegExp(escapeRegExp(keyword.toLowerCase()), 'g');
      const matches = textToSearch.match(regex);
      if (matches) {
        score += matches.length;
        if (chunk.heading.toLowerCase().includes(keyword.toLowerCase())) {
          score += 5;
        }
      }
    });

    return { chunk, score };
  });

  let filtered = scored.filter(s => s.score > 0);
  if (filtered.length === 0) {
    filtered = scored.slice(0, 5);
  }

  filtered.sort((a, b) => b.score - a.score);

  return filtered.slice(0, 5).map(s => s.chunk);
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// v2: Enhanced ranking with separate Arabic and English keyword scoring
function rankChunksV2(
  chunks: CurriculumChunk[],
  arabicKeywords: string[],
  englishKeywords: string[]
): CurriculumChunk[] {
  const allKeywords = [...arabicKeywords, ...englishKeywords].filter(k => k.trim().length > 0);
  if (allKeywords.length === 0) return chunks.slice(0, 8);

  const scored = chunks.map(chunk => {
    let score = 0;
    const textToSearch = `${chunk.heading} ${chunk.content}`.toLowerCase();

    // Score Arabic keywords (higher weight since curriculum is primarily Arabic)
    arabicKeywords.forEach(keyword => {
      if (!keyword.trim()) return;
      const regex = new RegExp(escapeRegExp(keyword.toLowerCase()), 'g');
      const matches = textToSearch.match(regex);
      if (matches) {
        score += matches.length * 2; // Arabic keywords weighted 2x
        if (chunk.heading.toLowerCase().includes(keyword.toLowerCase())) {
          score += 8; // Heading match bonus
        }
      }
    });

    // Score English keywords (scientific terms)
    englishKeywords.forEach(keyword => {
      if (!keyword.trim()) return;
      const regex = new RegExp(escapeRegExp(keyword.toLowerCase()), 'g');
      const matches = textToSearch.match(regex);
      if (matches) {
        score += matches.length;
        if (chunk.heading.toLowerCase().includes(keyword.toLowerCase())) {
          score += 4;
        }
      }
    });

    return { chunk, score };
  });

  let filtered = scored.filter(s => s.score > 0);
  if (filtered.length === 0) {
    // Return top 8 by position_index as last resort
    return chunks
      .sort((a, b) => (a.position_index || 0) - (b.position_index || 0))
      .slice(0, 8);
  }

  filtered.sort((a, b) => b.score - a.score);
  return filtered.slice(0, 8).map(s => s.chunk);
}

// v2: Cosine similarity for local vector search fallback
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// v2: JavaScript RRF fusion (used in local mode)
export function applyRRF(
  vectorResults: CurriculumChunk[],
  bm25Results: CurriculumChunk[],
  k: number = 60
): CurriculumChunk[] {
  const scores = new Map<string, { chunk: CurriculumChunk; score: number }>();

  vectorResults.forEach((chunk, rank) => {
    const score = 1 / (k + rank + 1);
    const existing = scores.get(chunk.id);
    scores.set(chunk.id, { chunk, score: (existing?.score || 0) + score });
  });

  bm25Results.forEach((chunk, rank) => {
    const score = 1 / (k + rank + 1);
    const existing = scores.get(chunk.id);
    scores.set(chunk.id, { chunk, score: (existing?.score || 0) + score });
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ chunk }) => chunk);
}

