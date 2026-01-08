-- =============================================
-- PROGRAM COMPLETION SYSTEM - Database Schema
-- =============================================
-- This migration adds support for:
-- 1. Extended booking status (terminated, expired)
-- 2. Completion tracking (type, result, notes)
-- 3. Gated content per session
-- 4. Program completion configuration

-- =============================================
-- 1. UPDATE BOOKINGS TABLE
-- =============================================

-- Drop existing constraint if exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new status constraint with terminated and expired
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN (
    'pending',      -- Menunggu pembayaran
    'confirmed',    -- Sudah bayar, menunggu mulai
    'active',       -- Sedang berjalan
    'completed',    -- Selesai (lulus/tidak lulus)
    'terminated',   -- Dihentikan (dropout/3x absen)
    'expired',      -- Kadaluarsa (end_date lewat)
    'cancelled'     -- Dibatalkan/refund
  ));

-- Add completion tracking columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS 
  completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS 
  completion_type VARCHAR(20);

-- Add constraint for completion_type
DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_completion_type_check
    CHECK (completion_type IS NULL OR completion_type IN ('auto', 'manual', 'expired', 'terminate'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS 
  completion_result VARCHAR(20);

-- Add constraint for completion_result  
DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_completion_result_check
    CHECK (completion_result IS NULL OR completion_result IN ('passed', 'failed', 'dropout', 'manual'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS 
  completion_notes TEXT;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS 
  terminated_by UUID REFERENCES users(id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS 
  terminated_reason TEXT;

-- =============================================
-- 2. UPDATE COURSE_MATERIALS TABLE (Gated Content)
-- =============================================

-- Session number for gating
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS 
  session_number INTEGER DEFAULT 1;

-- Unlock type
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS 
  unlock_type VARCHAR(20) DEFAULT 'always';

-- Add constraint for unlock_type
DO $$ BEGIN
  ALTER TABLE course_materials ADD CONSTRAINT course_materials_unlock_type_check
    CHECK (unlock_type IN ('always', 'after_session', 'after_date', 'manual'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Unlock after specific date (for after_date type)
ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS 
  unlock_after_date DATE;

-- =============================================
-- 3. UPDATE PROGRAMS TABLE (Completion Config)
-- =============================================

ALTER TABLE programs ADD COLUMN IF NOT EXISTS 
  completion_config JSONB DEFAULT '{
    "enable_gated_content": false,
    "require_attendance": true,
    "min_attendance_percent": 80,
    "require_passing_grade": false,
    "passing_grade": 70,
    "allow_early_completion": false,
    "terminate_after_absent": 3,
    "terminate_after_inactive_weeks": 3
  }';

-- =============================================
-- 4. CREATE COMPLETION LOG TABLE (Audit Trail)
-- =============================================

CREATE TABLE IF NOT EXISTS completion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'auto_complete', 'manual_complete', 'terminate', 'reactivate'
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  performed_by UUID REFERENCES users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_completion_logs_booking 
  ON completion_logs(booking_id);

CREATE INDEX IF NOT EXISTS idx_completion_logs_created 
  ON completion_logs(created_at);

-- =============================================
-- 5. HELPER FUNCTION: Check if content is unlocked
-- =============================================

CREATE OR REPLACE FUNCTION is_content_unlocked(
  p_material_id UUID,
  p_booking_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_material RECORD;
  v_attendance_count INTEGER;
BEGIN
  -- Get material info
  SELECT unlock_type, session_number, unlock_after_date
  INTO v_material
  FROM course_materials
  WHERE id = p_material_id;
  
  -- Always unlocked
  IF v_material.unlock_type = 'always' THEN
    RETURN TRUE;
  END IF;
  
  -- After specific date
  IF v_material.unlock_type = 'after_date' THEN
    RETURN CURRENT_DATE >= v_material.unlock_after_date;
  END IF;
  
  -- After attending session
  IF v_material.unlock_type = 'after_session' THEN
    SELECT COUNT(*) INTO v_attendance_count
    FROM attendance
    WHERE booking_id = p_booking_id
    AND status IN ('present', 'late', 'excused');
    
    RETURN v_attendance_count >= v_material.session_number;
  END IF;
  
  -- Manual - check if explicitly unlocked (not implemented yet)
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. HELPER FUNCTION: Calculate completion eligibility
-- =============================================

CREATE OR REPLACE FUNCTION check_completion_eligibility(
  p_booking_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_program RECORD;
  v_config JSONB;
  v_total_sessions INTEGER;
  v_attended_sessions INTEGER;
  v_attendance_percent NUMERIC;
  v_total_materials INTEGER;
  v_completed_materials INTEGER;
  v_progress_percent NUMERIC;
  v_can_complete BOOLEAN;
  v_reasons TEXT[];
BEGIN
  -- Get booking info
  SELECT b.*, p.id as program_id, p.completion_config, p.total_sessions
  INTO v_booking
  FROM bookings b
  JOIN programs p ON b.program_id = p.id
  WHERE b.id = p_booking_id;
  
  v_config := COALESCE(v_booking.completion_config, '{}'::jsonb);
  
  -- Calculate attendance
  SELECT COUNT(*) INTO v_total_sessions
  FROM attendance WHERE booking_id = p_booking_id;
  
  SELECT COUNT(*) INTO v_attended_sessions
  FROM attendance 
  WHERE booking_id = p_booking_id 
  AND status IN ('present', 'late');
  
  IF v_total_sessions > 0 THEN
    v_attendance_percent := (v_attended_sessions::NUMERIC / v_total_sessions) * 100;
  ELSE
    v_attendance_percent := 0;
  END IF;
  
  -- Calculate material progress
  SELECT COUNT(*) INTO v_total_materials
  FROM course_materials
  WHERE program_id = v_booking.program_id AND is_active = TRUE;
  
  SELECT COUNT(DISTINCT mp.material_id) INTO v_completed_materials
  FROM material_progress mp
  JOIN course_materials cm ON mp.material_id = cm.id
  WHERE cm.program_id = v_booking.program_id
  AND mp.is_completed = TRUE;
  
  IF v_total_materials > 0 THEN
    v_progress_percent := (v_completed_materials::NUMERIC / v_total_materials) * 100;
  ELSE
    v_progress_percent := 100; -- No materials = 100% progress
  END IF;
  
  -- Check requirements
  v_can_complete := TRUE;
  v_reasons := ARRAY[]::TEXT[];
  
  -- Check attendance requirement
  IF (v_config->>'require_attendance')::BOOLEAN = TRUE THEN
    IF v_attendance_percent < (v_config->>'min_attendance_percent')::NUMERIC THEN
      v_can_complete := FALSE;
      v_reasons := array_append(v_reasons, 
        format('Kehadiran %s%% < minimal %s%%', 
          ROUND(v_attendance_percent), 
          v_config->>'min_attendance_percent'));
    END IF;
  END IF;
  
  -- Check early completion
  IF (v_config->>'allow_early_completion')::BOOLEAN = FALSE THEN
    IF v_booking.end_date IS NOT NULL AND CURRENT_DATE < v_booking.end_date THEN
      v_can_complete := FALSE;
      v_reasons := array_append(v_reasons, 'Program belum mencapai end_date');
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'can_complete', v_can_complete,
    'attendance_percent', ROUND(v_attendance_percent, 1),
    'progress_percent', ROUND(v_progress_percent, 1),
    'attended_sessions', v_attended_sessions,
    'total_sessions', v_total_sessions,
    'reasons', v_reasons
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. RPC: Complete booking
-- =============================================

CREATE OR REPLACE FUNCTION complete_booking(
  p_booking_id UUID,
  p_completion_type VARCHAR(20),
  p_completion_result VARCHAR(20),
  p_notes TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_old_status VARCHAR(20);
  v_eligibility JSONB;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM bookings WHERE id = p_booking_id;
  
  -- Check if already completed
  IF v_old_status IN ('completed', 'terminated', 'expired', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Booking sudah dalam status final: ' || v_old_status
    );
  END IF;
  
  -- Update booking
  UPDATE bookings
  SET 
    status = 'completed',
    completed_at = NOW(),
    completion_type = p_completion_type,
    completion_result = p_completion_result,
    completion_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Log the action
  INSERT INTO completion_logs (booking_id, action, old_status, new_status, performed_by, reason)
  VALUES (p_booking_id, 'complete', v_old_status, 'completed', p_performed_by, p_notes);
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'old_status', v_old_status,
    'new_status', 'completed',
    'completion_type', p_completion_type,
    'completion_result', p_completion_result
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. RPC: Terminate booking
-- =============================================

CREATE OR REPLACE FUNCTION terminate_booking(
  p_booking_id UUID,
  p_reason TEXT,
  p_performed_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_old_status VARCHAR(20);
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM bookings WHERE id = p_booking_id;
  
  -- Check if can be terminated
  IF v_old_status NOT IN ('active', 'confirmed') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Hanya booking active/confirmed yang bisa di-terminate'
    );
  END IF;
  
  -- Update booking
  UPDATE bookings
  SET 
    status = 'terminated',
    completed_at = NOW(),
    completion_type = 'terminate',
    completion_result = 'dropout',
    terminated_by = p_performed_by,
    terminated_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Log the action
  INSERT INTO completion_logs (booking_id, action, old_status, new_status, performed_by, reason)
  VALUES (p_booking_id, 'terminate', v_old_status, 'terminated', p_performed_by, p_reason);
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'old_status', v_old_status,
    'new_status', 'terminated'
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================  
-- DONE
-- =============================================
