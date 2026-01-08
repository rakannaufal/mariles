-- Migration: Add refund hold period and window to transactions
-- This enables 31-day hold period and 90-day refund window without needing separate tables

-- Add columns for hold period and refund window tracking
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS hold_until TIMESTAMP,
  ADD COLUMN IF NOT EXISTS refund_deadline TIMESTAMP,
  ADD COLUMN IF NOT EXISTS lock_status TEXT DEFAULT 'active';

-- Add comment for documentation
COMMENT ON COLUMN transactions.hold_until IS 'Owner cannot withdraw funds until this date (31 days after payment)';
COMMENT ON COLUMN transactions.refund_deadline IS 'Student can only request refund before this date (90 days after payment)';
COMMENT ON COLUMN transactions.lock_status IS 'Lock status: active (locked), released (hold expired), refunded (used for refund)';

-- Update existing completed transactions
UPDATE transactions 
SET 
  hold_until = created_at + INTERVAL '31 days',
  refund_deadline = created_at + INTERVAL '90 days',
  lock_status = CASE 
    WHEN payment_status = 'refunded' THEN 'refunded'
    WHEN created_at + INTERVAL '31 days' < NOW() THEN 'released'
    ELSE 'active'
  END
WHERE payment_status IN ('settlement', 'paid', 'completed', 'refunded')
  AND hold_until IS NULL;

-- Create index for efficient locked balance queries
CREATE INDEX IF NOT EXISTS idx_transactions_lock_check 
  ON transactions(les_place_id, lock_status, hold_until) 
  WHERE lock_status = 'active' AND payment_status IN ('settlement', 'paid', 'completed');

-- Create index for refund deadline queries
CREATE INDEX IF NOT EXISTS idx_transactions_refund_deadline 
  ON transactions(student_id, refund_deadline)
  WHERE payment_status IN ('settlement', 'paid', 'completed');

COMMENT ON INDEX idx_transactions_lock_check IS 'Optimize queries for calculating locked balance during withdrawals';
COMMENT ON INDEX idx_transactions_refund_deadline IS 'Optimize queries for filtering eligible refund transactions';

