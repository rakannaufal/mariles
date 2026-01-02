-- =====================================================
-- GRANT PERMISSIONS FOR PLATFORM SETTINGS
-- Jalankan ini di Supabase SQL Editor
-- =====================================================

-- Grant SELECT permission to anon and authenticated roles
GRANT SELECT ON platform_settings TO anon;
GRANT SELECT ON platform_settings TO authenticated;

-- Grant UPDATE permission to authenticated (for admin to update)
GRANT UPDATE ON platform_settings TO authenticated;

-- Grant INSERT permission to authenticated (for upsert)
GRANT INSERT ON platform_settings TO authenticated;

-- Verify permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'platform_settings';
