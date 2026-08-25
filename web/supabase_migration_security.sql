-- EGS AI — Security Migration (OTP hardening + password resets)
-- Run in the Supabase SQL Editor after supabase_migration_email_auth.sql

-- 1. OTP expiry for pending registrations
ALTER TABLE public.pending_registrations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Password reset OTPs (one active reset per user)
CREATE TABLE IF NOT EXISTS public.password_resets (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
