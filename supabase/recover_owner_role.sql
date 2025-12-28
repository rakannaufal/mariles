-- =======================================================
-- SCRIPT PEMULIHAN AKUN OWNER
-- Jalankan script ini di SQL Editor di Dashboard Supabase
-- =======================================================

-- 1. Kembalikan Role menjadi Owner untuk email Anda
UPDATE public.users 
SET role = 'owner' 
WHERE email = 'naufalrakan432@gmail.com';

-- 2. Pastikan data di tabel 'owners' ada
INSERT INTO public.owners (user_id, business_name, owner_type)
SELECT id, 'Bisnis Saya', 'umum'
FROM public.users
WHERE email = 'naufalrakan432@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3. Pastikan data di tabel 'les_places' ada
INSERT INTO public.les_places (owner_id, name, description, type, is_active)
SELECT id, 'Tempat Les Saya', 'Deskripsi tempat les...', 'offline', true
FROM public.owners
WHERE user_id = (SELECT id FROM public.users WHERE email = 'naufalrakan432@gmail.com')
ON CONFLICT (owner_id) DO NOTHING;

-- 4. Cek hasilnya
SELECT * FROM public.users WHERE email = 'naufalrakan432@gmail.com';
