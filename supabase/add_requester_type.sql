-- Add requester_type column to withdrawals table
-- This distinguishes between owner and teacher withdrawals

ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS requester_type TEXT DEFAULT 'owner';

-- Add check constraint for valid values
ALTER TABLE withdrawals 
ADD CONSTRAINT valid_requester_type 
CHECK (requester_type IN ('owner', 'teacher'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_requester_type 
ON withdrawals(requester_type);

-- Verify column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'withdrawals' AND column_name = 'requester_type';
