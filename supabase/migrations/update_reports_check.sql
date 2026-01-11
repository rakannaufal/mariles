-- Update reports table check constraint to support forum_comment
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_target_type_check;

ALTER TABLE reports ADD CONSTRAINT reports_target_type_check 
    CHECK (target_type IN ('les_place', 'review', 'user', 'forum_post', 'forum_comment', 'message'));
