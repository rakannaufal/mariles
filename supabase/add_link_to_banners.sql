-- Add link column to banners table
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS link TEXT;

-- Verify
SELECT * FROM banners LIMIT 1;
