-- Phase 1 migration: chat interaction modes
-- Apply after supabase_migration_security.sql

ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'detailed';

COMMENT ON COLUMN public.chat_sessions.mode IS 'AI interaction mode: socratic | detailed | summary';
