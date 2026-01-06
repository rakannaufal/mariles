-- =====================================================
-- MARILES - Platform Revenue Schema
-- Tracks platform earnings from fees
-- Run this on Supabase database
-- =====================================================

-- 1. Create platform_revenue table
CREATE TABLE IF NOT EXISTS platform_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    withdrawal_id UUID REFERENCES withdrawals(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('platform_fee', 'withdrawal_fee', 'refund_fee', 'other')),
    description TEXT,
    les_place_id UUID REFERENCES les_places(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created ON platform_revenue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source ON platform_revenue(source);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_les_place ON platform_revenue(les_place_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_transaction ON platform_revenue(transaction_id);

-- 3. Create view for admin dashboard summary
CREATE OR REPLACE VIEW platform_revenue_summary AS
SELECT 
    source,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    DATE_TRUNC('month', created_at) as month
FROM platform_revenue
GROUP BY source, DATE_TRUNC('month', created_at)
ORDER BY month DESC, source;

-- 4. Create function to get total revenue
CREATE OR REPLACE FUNCTION get_platform_revenue_stats()
RETURNS TABLE (
    total_revenue NUMERIC,
    month_revenue NUMERIC,
    today_revenue NUMERIC,
    fee_breakdown JSONB
) AS $$
DECLARE
    fee_data JSONB;
BEGIN
    -- Get breakdown by source
    SELECT jsonb_object_agg(source, total)
    INTO fee_data
    FROM (
        SELECT source, SUM(amount) as total
        FROM platform_revenue
        GROUP BY source
    ) sub;

    RETURN QUERY
    SELECT 
        COALESCE((SELECT SUM(amount) FROM platform_revenue), 0) as total_revenue,
        COALESCE((SELECT SUM(amount) FROM platform_revenue 
            WHERE created_at >= DATE_TRUNC('month', NOW())), 0) as month_revenue,
        COALESCE((SELECT SUM(amount) FROM platform_revenue 
            WHERE created_at >= DATE_TRUNC('day', NOW())), 0) as today_revenue,
        COALESCE(fee_data, '{}'::jsonb) as fee_breakdown;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get monthly revenue chart data
CREATE OR REPLACE FUNCTION get_monthly_revenue_chart(months_count INTEGER DEFAULT 6)
RETURNS TABLE (
    month TEXT,
    platform_fee NUMERIC,
    withdrawal_fee NUMERIC,
    total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', m.month_date), 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN pr.source = 'platform_fee' THEN pr.amount ELSE 0 END), 0) as platform_fee,
        COALESCE(SUM(CASE WHEN pr.source = 'withdrawal_fee' THEN pr.amount ELSE 0 END), 0) as withdrawal_fee,
        COALESCE(SUM(pr.amount), 0) as total
    FROM (
        SELECT generate_series(
            DATE_TRUNC('month', NOW() - (months_count || ' months')::INTERVAL),
            DATE_TRUNC('month', NOW()),
            '1 month'::INTERVAL
        ) as month_date
    ) m
    LEFT JOIN platform_revenue pr ON DATE_TRUNC('month', pr.created_at) = m.month_date
    GROUP BY m.month_date
    ORDER BY m.month_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. RLS Policies
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "Admin can read platform_revenue"
    ON platform_revenue FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Only system (service role) can insert
CREATE POLICY "System can insert platform_revenue"
    ON platform_revenue FOR INSERT
    WITH CHECK (true);

-- Grant access
GRANT SELECT ON platform_revenue TO authenticated;
GRANT SELECT ON platform_revenue_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_revenue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_revenue_chart(INTEGER) TO authenticated;

-- 7. Backfill existing platform fees from transactions
INSERT INTO platform_revenue (transaction_id, amount, source, description, les_place_id, created_at)
SELECT 
    id as transaction_id,
    platform_fee as amount,
    'platform_fee' as source,
    'Backfill dari transaksi existing: ' || COALESCE(description, 'N/A') as description,
    les_place_id,
    COALESCE(payment_date, created_at) as created_at
FROM transactions
WHERE payment_status = 'completed' 
  AND platform_fee > 0
  AND NOT EXISTS (
      SELECT 1 FROM platform_revenue pr WHERE pr.transaction_id = transactions.id
  );

-- 8. Backfill existing withdrawal fees
INSERT INTO platform_revenue (withdrawal_id, amount, source, description, les_place_id, created_at)
SELECT 
    id as withdrawal_id,
    fee as amount,
    'withdrawal_fee' as source,
    'Backfill dari pencairan existing' as description,
    les_place_id,
    COALESCE(completed_at, created_at) as created_at
FROM withdrawals
WHERE status = 'completed' 
  AND fee > 0
  AND NOT EXISTS (
      SELECT 1 FROM platform_revenue pr WHERE pr.withdrawal_id = withdrawals.id
  );

COMMENT ON TABLE platform_revenue IS 'Tracks all platform revenue from fees (platform commission, withdrawal fees, etc.)';
