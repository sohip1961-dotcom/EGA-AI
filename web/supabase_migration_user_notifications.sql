-- Migration: Support user-specific targeted notifications (e.g. subscription activations) alongside general broadcast notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
