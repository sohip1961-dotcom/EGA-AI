-- EGS AI — Account Deletion Requests Migration
-- Run in the Supabase SQL Editor after supabase_migration_security.sql

CREATE TABLE IF NOT EXISTS public.account_deletions (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletions_email ON public.account_deletions(email);
