-- =====================================================
-- MARILES - SEED ADMIN USER
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- LANGKAH 1: Buat user di Authentication dulu via Dashboard
-- 1. Go to Authentication > Users
-- 2. Click "Add user" > "Create new user"
-- 3. Email: mariles@gmail.com
-- 4. Password: mariles123
-- 5. Check "Auto Confirm User"
-- 6. Click "Create user"
-- 7. COPY the User UID yang muncul

-- LANGKAH 2: Setelah dapat UUID, ganti 'YOUR-UUID-HERE' dengan UUID tersebut dan run SQL di bawah:

-- Uncomment dan ganti UUID setelah create auth user:
/*
INSERT INTO public.users (id, email, name, phone, role, avatar, created_at)
VALUES (
  '49cd3070-bae2-4ee2-a361-26f0583d514e',
  'mariles@gmail.com',
  'Admin Mariles',
  '081234567890',
  'admin',
  NULL,
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  role = 'admin', 
  name = 'Admin Mariles',
  email = 'mariles@gmail.com';

SELECT 'Admin user created!' as status;
SELECT * FROM public.users WHERE email = 'mariles@gmail.com';
*/

-- =====================================================
-- ALTERNATIF: Jika ingin auto-create tanpa Dashboard
-- Ini menggunakan Supabase Auth Admin API
-- =====================================================
-- Ini memerlukan service_role key dan tidak bisa dijalankan dari SQL Editor biasa
-- Gunakan Supabase Dashboard untuk membuat user
