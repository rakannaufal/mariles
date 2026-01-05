-- Migration: Add class_type column to programs table
-- Purpose: Allow programs to have their own class type (online/offline) independent of les_place type
-- For Hybrid les places, owner chooses per-program

-- 1. Add class_type column
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS class_type VARCHAR(20);

-- 2. Set default values based on existing les_place type
UPDATE programs p
SET class_type = CASE 
  WHEN lp.type ILIKE 'online' THEN 'online'
  WHEN lp.type ILIKE 'offline' THEN 'offline'
  WHEN lp.type ILIKE 'hybrid' THEN 'online' -- Default hybrid to online, owner can change later
  ELSE 'offline'
END
FROM les_places lp
WHERE p.les_place_id = lp.id 
AND p.class_type IS NULL;

-- 3. Add CHECK constraint for valid values
ALTER TABLE programs 
ADD CONSTRAINT programs_class_type_check 
CHECK (class_type IN ('online', 'offline') OR class_type IS NULL);

-- 4. Add comment for documentation
COMMENT ON COLUMN programs.class_type IS 'Program class type: online or offline. For Hybrid les_places, owner must explicitly set this.';
