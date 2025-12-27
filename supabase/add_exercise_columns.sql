-- =====================================================
-- ADD EXERCISE TYPE AND DEADLINE COLUMNS TO COURSE_MATERIALS
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- Add exercise_type column
ALTER TABLE course_materials 
ADD COLUMN IF NOT EXISTS exercise_type VARCHAR(50) DEFAULT NULL;

-- Add deadline column
ALTER TABLE course_materials 
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ DEFAULT NULL;

-- Update existing duration_minutes column if needed (already exists but ensure it's there)
ALTER TABLE course_materials 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN course_materials.exercise_type IS 'Type of exercise: latihan, ulangan_harian, kuis, tugas';
COMMENT ON COLUMN course_materials.deadline IS 'Deadline for exercises with deadlines';
COMMENT ON COLUMN course_materials.duration_minutes IS 'Duration in minutes for timed exercises';

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'course_materials' 
AND column_name IN ('exercise_type', 'deadline', 'duration_minutes');
