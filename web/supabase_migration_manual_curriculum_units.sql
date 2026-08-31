-- Migration: Manual Curriculum Units & Lessons Index
-- Adds a units JSONB column to public.curriculums table to store manually configured units and lessons

ALTER TABLE public.curriculums 
ADD COLUMN IF NOT EXISTS units JSONB NOT NULL DEFAULT '[]'::jsonb;
