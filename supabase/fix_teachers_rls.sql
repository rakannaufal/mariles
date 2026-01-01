-- Fix Teachers Permission for Anon Role
-- The issue is that even with RLS disabled, the 'anon' role needs explicit SELECT permission

-- Grant SELECT permission on teachers table to anon and authenticated roles
GRANT SELECT ON teachers TO anon;
GRANT SELECT ON teachers TO authenticated;

-- Also grant on users table since we join it
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;

-- Verify RLS is disabled (should show false)
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'teachers';

-- Verify the grant worked by checking table privileges
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'teachers';
