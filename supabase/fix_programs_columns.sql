-- =====================================================
-- STEP 4: ENSURE PROGRAMS TABLE COLUMNS
-- =====================================================

ALTER TABLE programs ADD COLUMN IF NOT EXISTS total_modules integer DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS total_videos integer DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS total_exercises integer DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS total_sessions integer DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 10;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT '{}'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS price_type text DEFAULT 'package';
ALTER TABLE programs ADD COLUMN IF NOT EXISTS session_duration_minutes integer DEFAULT 120;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS sessions_per_week integer DEFAULT 0;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 0;

SELECT 'Programs columns verified!' as status;
