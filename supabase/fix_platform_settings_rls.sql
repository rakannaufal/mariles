-- =====================================================
-- FIX RLS FOR PLATFORM SETTINGS
-- Jalankan ini di Supabase SQL Editor
-- =====================================================

-- 1. Check if data exists
SELECT * FROM platform_settings;

-- 2. If empty, insert default data
INSERT INTO platform_settings (key, value, description) VALUES
(
    'platform_info', 
    '{"platform_name": "Mariles", "tagline": "Platform Les Terbaik di Indonesia", "support_email": "support@mariles.id", "support_phone": "+62 812 3456 7890", "whatsapp_number": "+6281234567890"}', 
    'Informasi dasar platform'
),
(
    'platform_fees', 
    '{"platform_fee_percent": 10, "withdrawal_fee": 5000, "min_withdrawal": 50000, "max_withdrawal": 10000000}', 
    'Pengaturan biaya transaksi'
),
(
    'maintenance_mode', 
    '{"enabled": false, "message": "Platform sedang dalam perbaikan. Silakan coba beberapa saat lagi."}', 
    'Mode maintenance website'
),
(
    'dummy_data_mode',
    '{"enabled": true}',
    'Mode data dummy untuk demo'
)
ON CONFLICT (key) DO NOTHING;

-- 3. Fix RLS - Drop existing policies
DROP POLICY IF EXISTS "Admin can manage platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Public can read platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Anon can read platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Anyone can read platform_settings" ON platform_settings;

-- 4. Create new RLS policies that work properly
-- Allow anyone (including anonymous) to read
CREATE POLICY "Anyone can read platform_settings" ON platform_settings
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Allow admin to update
CREATE POLICY "Admin can update platform_settings" ON platform_settings
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Allow admin to insert (for upsert)
CREATE POLICY "Admin can insert platform_settings" ON platform_settings
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. Verify data
SELECT * FROM platform_settings;
