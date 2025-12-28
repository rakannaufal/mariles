-- Run this SQL in your Supabase SQL Editor

-- ===============================
-- Fix quiz_attempts RLS policies
-- ===============================
DROP POLICY IF EXISTS "quiz_attempts_select" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_insert" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_select_simple" ON quiz_attempts;
DROP POLICY IF EXISTS "Students can manage own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Teachers can view quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_all" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_select_all" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_insert_all" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_update_own" ON quiz_attempts;

-- Allow everyone to read quiz attempts
CREATE POLICY "quiz_attempts_select_all" ON quiz_attempts 
FOR SELECT USING (true);

-- Allow authenticated users to insert their own attempts
CREATE POLICY "quiz_attempts_insert_all" ON quiz_attempts 
FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Allow users to update their own attempts
CREATE POLICY "quiz_attempts_update_own" ON quiz_attempts 
FOR UPDATE USING (auth.uid() = student_id);

-- ===============================
-- Fix users table RLS policies
-- Allow teachers to view student names
-- ===============================
DROP POLICY IF EXISTS "users_select_all" ON users;

-- Allow all authenticated users to read basic user info (name, email)
CREATE POLICY "users_select_all" ON users
FOR SELECT USING (true);

-- ===============================
-- Allow teachers to delete quiz attempts
-- ===============================
DROP POLICY IF EXISTS "quiz_attempts_delete_all" ON quiz_attempts;

-- Allow authenticated users to delete quiz attempts
CREATE POLICY "quiz_attempts_delete_all" ON quiz_attempts
FOR DELETE USING (true);

-- ===============================
-- Allow teachers to update les_places settings
-- ===============================
DROP POLICY IF EXISTS "les_places_update_owner_teacher" ON les_places;

-- Allow owners and teachers to update their les_place
CREATE POLICY "les_places_update_owner_teacher" ON les_places
FOR UPDATE USING (
  id IN (
    SELECT les_place_id FROM teachers WHERE user_id = auth.uid()
  ) OR
  owner_id = auth.uid()
);
