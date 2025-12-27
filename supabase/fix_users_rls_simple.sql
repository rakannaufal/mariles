-- =====================================================
-- FIX USERS RLS - SANGAT SEDERHANA
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- 1. Drop SEMUA policy di users table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
    END LOOP;
END $$;

-- 2. Buat policy baru yang SANGAT SEDERHANA
-- User bisa lihat profile sendiri TANPA pengecekan admin
CREATE POLICY "users_select_simple" ON users FOR SELECT USING (true);
-- Semua authenticated user bisa lihat semua user (untuk chat, dll)

CREATE POLICY "users_insert_simple" ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_simple" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_delete_simple" ON users FOR DELETE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 3. Verify
SELECT 'USERS RLS FIXED!' as status;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public';
