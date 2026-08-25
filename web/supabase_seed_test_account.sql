-- EGS AI — Seed Script for External Testing / Payment Gateway Account
-- Run this in your Supabase SQL Editor if you need to manually seed or recreate the test account.

INSERT INTO public.profiles (
  id,
  email,
  phone,
  name,
  grade_level,
  plan_type,
  role,
  password_hash,
  coins,
  unlimited_credit,
  created_at,
  terms_accepted_at
) VALUES (
  'f0000000-0000-4000-a000-000000000001',
  'test@egsaiedu.com',
  '01000000000',
  'حساب اختباري (Test Account)',
  '3_high',
  'max',
  'admin',
  'pbkdf2$100000$h0SjDuidjcSD8T3EPG1nRA==$pKLZrAFUqLdoMTyheDcKFq9o02smj/kIrJu03RWzHM8=',
  10000,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  plan_type = 'max',
  unlimited_credit = true,
  coins = 10000,
  password_hash = 'pbkdf2$100000$h0SjDuidjcSD8T3EPG1nRA==$pKLZrAFUqLdoMTyheDcKFq9o02smj/kIrJu03RWzHM8=';
