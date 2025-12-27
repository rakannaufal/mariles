-- =====================================================
-- RLS POLICY FOR COURSE_MATERIALS TABLE
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- Pastikan RLS enabled
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (untuk menghindari duplicate)
DROP POLICY IF EXISTS "Allow public read access for course_materials" ON course_materials;
DROP POLICY IF EXISTS "Allow authenticated insert for course_materials" ON course_materials;
DROP POLICY IF EXISTS "Allow authenticated update for course_materials" ON course_materials;
DROP POLICY IF EXISTS "Allow authenticated delete for course_materials" ON course_materials;

-- Policy untuk SELECT (baca) - semua user bisa baca
CREATE POLICY "Allow public read access for course_materials"
ON course_materials FOR SELECT
USING (true);

-- Policy untuk INSERT - authenticated user bisa insert
CREATE POLICY "Allow authenticated insert for course_materials"
ON course_materials FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy untuk UPDATE - authenticated user bisa update
CREATE POLICY "Allow authenticated update for course_materials"
ON course_materials FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy untuk DELETE - authenticated user bisa delete
CREATE POLICY "Allow authenticated delete for course_materials"
ON course_materials FOR DELETE
USING (auth.role() = 'authenticated');

-- Verifikasi
SELECT * FROM pg_policies WHERE tablename = 'course_materials';
