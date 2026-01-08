-- Enhanced review moderation columns
-- Add is_visible column (to hide flagged reviews from public)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add flag_reason column (to store why review was flagged)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Add flagged_at timestamp
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

-- Add flagged_by (admin user id)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id);

-- Create index for faster public queries (only show visible reviews)
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(les_place_id) WHERE is_visible = true;

-- Comments
COMMENT ON COLUMN reviews.is_visible IS 'Whether this review is visible to public (false when flagged)';
COMMENT ON COLUMN reviews.flag_reason IS 'Admin reason for flagging this review';
COMMENT ON COLUMN reviews.flagged_at IS 'Timestamp when review was flagged';
COMMENT ON COLUMN reviews.flagged_by IS 'Admin user who flagged this review';
