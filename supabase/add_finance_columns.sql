-- Add missing columns for Owner Finance feature
-- Run this in Supabase SQL Editor

-- Add balance column to les_places table
ALTER TABLE les_places 
ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0;

-- Add salary column to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS salary DECIMAL(15, 2) DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_les_places_balance ON les_places(balance);
CREATE INDEX IF NOT EXISTS idx_teachers_salary ON teachers(salary);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'les_places' AND column_name = 'balance';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teachers' AND column_name = 'salary';
