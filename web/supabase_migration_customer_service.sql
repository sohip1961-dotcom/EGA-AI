-- EGS AI — Customer Service & Support System Migration
-- Run this in your Supabase SQL Editor to support the Customer Service system

-- 1. Create Contact Messages Table (Technical Support / Contact Form)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'استفسار عام',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'replied', 'resolved', 'dismissed'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON public.contact_messages(category);

-- 2. Add action_taken column to reports table for AI complaints resolution tracking
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS action_taken TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 3. Additional status index on reports
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON public.reports(status, created_at DESC);
