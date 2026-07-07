-- EGS AI — Email & Google Auth Migration
-- Run this in your Supabase SQL Editor to update the database schema

-- 1. Update Profiles: Add email column and make phone nullable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- 2. Update Pending Registrations: Recreate table with email as primary key
DROP TABLE IF EXISTS public.pending_registrations CASCADE;
CREATE TABLE IF NOT EXISTS public.pending_registrations (
    email TEXT PRIMARY KEY,
    phone TEXT,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    otp TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terms_accepted_at TIMESTAMP WITH TIME ZONE
);
