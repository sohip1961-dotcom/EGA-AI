-- EGS AI — Subscriptions Tracking & Expiry Migration
-- Run this in your Supabase SQL Editor to support subscription status and duration tracking

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive'; -- 'active', 'inactive', 'expired'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_end ON public.profiles(subscription_end_date);
