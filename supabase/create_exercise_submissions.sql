-- =====================================================
-- EXERCISE SUBMISSIONS TABLE
-- Untuk menyimpan jawaban siswa dan nilai latihan
-- =====================================================

-- Drop if exists
DROP TABLE IF EXISTS exercise_submissions CASCADE;

-- Create exercise_submissions table
CREATE TABLE exercise_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  submission_url TEXT,          -- URL file jawaban (dari storage)
  submission_notes TEXT,        -- Catatan dari siswa
  score INT CHECK (score >= 0 AND score <= 100),  -- Nilai 0-100
  feedback TEXT,                -- Feedback dari teacher
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(material_id, student_id)  -- 1 submission per student per exercise
);

-- Indexes
CREATE INDEX idx_exercise_submissions_material ON exercise_submissions(material_id);
CREATE INDEX idx_exercise_submissions_student ON exercise_submissions(student_id);
CREATE INDEX idx_exercise_submissions_graded ON exercise_submissions(graded_at) WHERE graded_at IS NULL;

-- Enable RLS
ALTER TABLE exercise_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions" ON exercise_submissions
FOR SELECT USING (student_id = auth.uid());

-- Students can insert their own submissions
CREATE POLICY "Students can submit" ON exercise_submissions
FOR INSERT WITH CHECK (student_id = auth.uid());

-- Students can update their own ungraded submissions
CREATE POLICY "Students can update ungraded submissions" ON exercise_submissions
FOR UPDATE USING (student_id = auth.uid() AND graded_at IS NULL);

-- Teachers can view submissions for their les_place
CREATE POLICY "Teachers can view submissions" ON exercise_submissions
FOR SELECT USING (
  material_id IN (
    SELECT cm.id FROM course_materials cm
    JOIN programs p ON cm.program_id = p.id
    JOIN teachers t ON p.les_place_id = t.les_place_id
    WHERE t.user_id = auth.uid()
  )
);

-- Teachers can update (grade) submissions
CREATE POLICY "Teachers can grade submissions" ON exercise_submissions
FOR UPDATE USING (
  material_id IN (
    SELECT cm.id FROM course_materials cm
    JOIN programs p ON cm.program_id = p.id
    JOIN teachers t ON p.les_place_id = t.les_place_id
    WHERE t.user_id = auth.uid()
  )
);

-- Owners can view all submissions for their les_place
CREATE POLICY "Owners can view submissions" ON exercise_submissions
FOR SELECT USING (
  material_id IN (
    SELECT cm.id FROM course_materials cm
    JOIN programs p ON cm.program_id = p.id
    JOIN les_places lp ON p.les_place_id = lp.id
    WHERE lp.owner_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_exercise_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercise_submissions_updated_at
BEFORE UPDATE ON exercise_submissions
FOR EACH ROW EXECUTE FUNCTION update_exercise_submission_updated_at();

-- Grant permissions
GRANT ALL ON exercise_submissions TO authenticated;
GRANT ALL ON exercise_submissions TO service_role;
