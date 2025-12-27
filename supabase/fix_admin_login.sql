-- =====================================================
-- FIX ADMIN LOGIN - DROP DUPLICATE POLICIES
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- Drop ALL old policies on users table
DROP POLICY IF EXISTS "Owners can view student profiles" ON users;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

-- Recreate SIMPLE policies (tanpa is_admin untuk SELECT - hindari circular)
CREATE POLICY "users_select" ON users FOR SELECT USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
);

CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (
    auth.uid() = id
);

CREATE POLICY "users_update" ON users FOR UPDATE USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
);

CREATE POLICY "users_delete" ON users FOR DELETE USING (
    EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
);

-- Verify
SELECT 'Users policies fixed!' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';
