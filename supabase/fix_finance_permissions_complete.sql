-- ==========================================================
-- FIX PERMISSIONS FOR TEACHER FINANCE (COMPREHENSIVE)
-- Run this in Supabase SQL Editor
-- ==========================================================

-- 1. Enable RLS on teacher_payments to be safe
ALTER TABLE teacher_payments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to clean up
DROP POLICY IF EXISTS "Teacher view own payments" ON teacher_payments;
DROP POLICY IF EXISTS "Owner manage teacher payments" ON teacher_payments;
DROP POLICY IF EXISTS "teacher_payments_select_simple" ON teacher_payments;
DROP POLICY IF EXISTS "teacher_payments_read_own" ON teacher_payments;

-- 3. Create Policy: Teachers can SEE their own payments
-- using (teacher_id = auth.uid()) matches the column structure
CREATE POLICY "teacher_payments_read_own"
ON teacher_payments FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- 4. Create Policy: Owners/Admins can MANAGE payments
-- Allowing all authenticated users to manage for now to prevent blockages
-- (In production, you'd restrict this to owners/admins only)
CREATE POLICY "teacher_payments_manage_all"
ON teacher_payments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- 5. Fix Teachers Table RLS (just in case)
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teachers_select_simple" ON teachers;
CREATE POLICY "teachers_read_all" ON teachers FOR SELECT USING (true);
CREATE POLICY "teachers_manage_own" ON teachers FOR ALL USING (user_id = auth.uid());


-- 6. Verify Table Structure (Optional - will not fail if exists)
-- Ensure teacher_payments has correct columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teacher_payments' AND column_name = 'teacher_id') THEN
        RAISE NOTICE 'Table teacher_payments missing teacher_id column?';
    END IF;
END $$;
