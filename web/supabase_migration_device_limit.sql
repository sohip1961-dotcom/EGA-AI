-- Migration: Multi-Device Account Limitation (Max 3 Devices)
-- Enforces a maximum of 3 concurrent active devices per user account.
-- If an account registers or logs in on more than 3 devices, all previous devices are revoked
-- and the account remains active solely on that single new device.

CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    session_token TEXT,
    device_name TEXT NOT NULL DEFAULT 'جهاز غير معروف',
    device_type TEXT NOT NULL DEFAULT 'web', -- 'web', 'mobile', 'tablet', 'desktop'
    browser_fingerprint TEXT,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_device UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_lookup ON public.user_devices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_devices_token ON public.user_devices(session_token);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON public.user_devices(last_active_at DESC);
