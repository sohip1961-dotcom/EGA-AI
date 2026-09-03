-- Migration: Student Exam Isolation Indexes
-- Ensures fast querying and isolation of exams per student/device

CREATE INDEX IF NOT EXISTS exams_user_id_idx ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS exams_device_id_idx ON public.exams(device_id);
