-- Add is_flagged column to reviews table for moderation feature
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- Add is_visible column if not exists (for hiding flagged reviews from public)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_reviews_is_flagged ON reviews(is_flagged) WHERE is_flagged = true;

COMMENT ON COLUMN reviews.is_flagged IS 'Marked by admin as inappropriate or needing review';
COMMENT ON COLUMN reviews.is_visible IS 'Whether this review is visible to public';
