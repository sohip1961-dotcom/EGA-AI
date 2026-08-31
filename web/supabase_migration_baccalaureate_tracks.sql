-- ==============================================================================
-- EGS AI — Migration: Baccalaureate Tracks, Electives & Placeholder Curricula
-- ==============================================================================

-- 1. Add track and elective fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS track_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS elective_subject TEXT NULL;

-- Index for track queries
CREATE INDEX IF NOT EXISTS idx_profiles_track ON profiles(track_id);

-- 2. Add track and elective fields to pending_registrations
ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS track_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS elective_subject TEXT NULL;

-- 3. Add placeholder and track metadata to curriculums
ALTER TABLE curriculums
  ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS track_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_elective BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_curriculums_placeholder ON curriculums(is_placeholder);
CREATE INDEX IF NOT EXISTS idx_curriculums_track ON curriculums(track_id);
