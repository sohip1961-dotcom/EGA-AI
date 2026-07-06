-- EGS AI — Beta Release Migration (additive, idempotent, safe to run on a live DB)
-- Run this in your Supabase SQL Editor AFTER the base supabase_schema.sql.
-- Adds: unlimited admin credit flag, terms acceptance tracking, reports,
-- notifications, and app version management (for mobile force-update).

-- ─── 1. Profiles: unlimited credit + terms acceptance ────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlimited_credit BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Admin account gets unlimited credit by default
UPDATE public.profiles SET unlimited_credit = true WHERE role = 'admin';

-- ─── 2. Pending registrations: terms acceptance ──────────────────────────────
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- ─── 3. Reports Table (AI response reporting) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    device_id TEXT,
    message_id TEXT,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    reported_content TEXT NOT NULL,
    user_query TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'reviewed' | 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON public.reports(created_at);

-- ─── 4. Notifications Table (admin-authored, student-facing) ────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info' | 'success' | 'warning' | 'maintenance'
    target TEXT NOT NULL DEFAULT 'both', -- 'both' | 'web' | 'phone'
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_active_idx ON public.notifications(active);

-- ─── 5. App Versions Table (mobile force-update management) ─────────────────
CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL DEFAULT 'android', -- 'android' | 'ios'
    version_code INTEGER NOT NULL,
    version_name TEXT NOT NULL,
    release_notes TEXT NOT NULL DEFAULT '',
    download_url TEXT NOT NULL DEFAULT '',
    mandatory BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_versions_platform_active_idx ON public.app_versions(platform, active);

-- ─── 6. Profiles: Update default coins to 50.0 for new accounts ─────────────
ALTER TABLE public.profiles ALTER COLUMN coins SET DEFAULT 50.0;

