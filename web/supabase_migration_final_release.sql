-- EGS AI — Final Release Migration: Anti-Abuse & Trial Points System
-- Run in Supabase SQL editor

-- 1. Create table for tracking free trial grants (IP, Browser, Device ID anti-abuse)
CREATE TABLE IF NOT EXISTS public.free_trial_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    browser_fingerprint TEXT,
    device_id TEXT,
    platform TEXT NOT NULL DEFAULT 'web', -- 'web' or 'mobile'
    coins_granted NUMERIC NOT NULL DEFAULT 15.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for fast lookups during registration
CREATE INDEX IF NOT EXISTS idx_trial_grants_ip ON public.free_trial_grants(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_grants_fingerprint ON public.free_trial_grants(browser_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trial_grants_device ON public.free_trial_grants(device_id);
CREATE INDEX IF NOT EXISTS idx_trial_grants_user ON public.free_trial_grants(user_id);

-- 3. Update default coins for new registrations to 15.0 (non-renewable trial points)
ALTER TABLE public.profiles ALTER COLUMN coins SET DEFAULT 15.0;
