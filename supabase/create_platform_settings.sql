-- =====================================================
-- Platform Settings Table Migration
-- ⚠️ PENTING: Jalankan ini di Supabase SQL Editor!
-- =====================================================

-- 1. Create platform_settings table (key sebagai primary key)
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_by uuid REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 3. Insert default settings
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

-- 4. Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can manage platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "Public can read platform_settings" ON platform_settings;

-- 6. Create RLS policies
-- Admin full access
CREATE POLICY "Admin can manage platform_settings" ON platform_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Public read access
CREATE POLICY "Public can read platform_settings" ON platform_settings
    FOR SELECT USING (true);

-- =====================================================
-- ✅ Verifikasi: Jalankan query ini setelah create table
-- =====================================================
-- SELECT * FROM platform_settings;
