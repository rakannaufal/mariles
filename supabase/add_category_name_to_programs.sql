-- Add category_name column to programs table
-- This allows storing custom category names that may not exist in categories table

ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);

-- Update existing programs to populate category_name from categories relation
UPDATE programs 
SET category_name = categories.name
FROM categories 
WHERE programs.category_id = categories.id 
AND programs.category_name IS NULL;
