-- =====================================================
-- FIX ALL INSERT/UPDATE POLICIES - SIMPLE VERSION
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- owners INSERT/UPDATE
DROP POLICY IF EXISTS "owners_insert" ON owners;
DROP POLICY IF EXISTS "owners_insert_simple" ON owners;
DROP POLICY IF EXISTS "owners_update" ON owners;
DROP POLICY IF EXISTS "owners_update_simple" ON owners;
CREATE POLICY "owners_insert_simple" ON owners FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners_update_simple" ON owners FOR UPDATE USING (auth.uid() = user_id);

-- les_places INSERT/UPDATE
DROP POLICY IF EXISTS "les_places_insert" ON les_places;
DROP POLICY IF EXISTS "les_places_insert_simple" ON les_places;
DROP POLICY IF EXISTS "les_places_update" ON les_places;
DROP POLICY IF EXISTS "les_places_update_simple" ON les_places;
CREATE POLICY "les_places_insert_simple" ON les_places FOR INSERT WITH CHECK (true);
CREATE POLICY "les_places_update_simple" ON les_places FOR UPDATE USING (true);

-- students INSERT/UPDATE
DROP POLICY IF EXISTS "students_insert" ON students;
DROP POLICY IF EXISTS "students_insert_simple" ON students;
DROP POLICY IF EXISTS "students_update" ON students;
DROP POLICY IF EXISTS "students_update_simple" ON students;
CREATE POLICY "students_insert_simple" ON students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "students_update_simple" ON students FOR UPDATE USING (auth.uid() = user_id);

-- teachers INSERT/UPDATE
DROP POLICY IF EXISTS "teachers_insert" ON teachers;
DROP POLICY IF EXISTS "teachers_insert_simple" ON teachers;
DROP POLICY IF EXISTS "teachers_update" ON teachers;
DROP POLICY IF EXISTS "teachers_update_simple" ON teachers;
CREATE POLICY "teachers_insert_simple" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "teachers_update_simple" ON teachers FOR UPDATE USING (true);

-- users INSERT/UPDATE (untuk semua role)
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_insert_simple" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_update_simple" ON users;
CREATE POLICY "users_insert_simple" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_simple" ON users FOR UPDATE USING (auth.uid() = id);

-- programs INSERT/UPDATE
DROP POLICY IF EXISTS "programs_insert" ON programs;
DROP POLICY IF EXISTS "programs_update" ON programs;
CREATE POLICY "programs_insert_simple" ON programs FOR INSERT WITH CHECK (true);
CREATE POLICY "programs_update_simple" ON programs FOR UPDATE USING (true);

-- bookings INSERT/UPDATE
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_insert_simple" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update_simple" ON bookings FOR UPDATE USING (true);

-- teacher_invite_codes INSERT/UPDATE  
DROP POLICY IF EXISTS "teacher_invite_codes_insert" ON teacher_invite_codes;
DROP POLICY IF EXISTS "teacher_invite_codes_update" ON teacher_invite_codes;
CREATE POLICY "teacher_invite_codes_insert_simple" ON teacher_invite_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "teacher_invite_codes_update_simple" ON teacher_invite_codes FOR UPDATE USING (true);

SELECT 'ALL INSERT/UPDATE POLICIES SIMPLIFIED!' as status;
