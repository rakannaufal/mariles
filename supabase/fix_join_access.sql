-- =====================================================
-- FIX PUBLIC ACCESS FOR VALIDATION DEPENDENCIES
-- =====================================================

-- Supaya validasi kode undangan bisa melakukan JOIN ke tabel les_places, owners, dan users,
-- tabel-tabel tersebut harus bisa dibaca oleh user publik (anonim).

-- 1. Les Places (memang harus public untuk search)
DROP POLICY IF EXISTS "anon_read_les_places" ON les_places;
CREATE POLICY "anon_read_les_places" ON les_places FOR SELECT TO anon USING (true);

-- 2. Owners (memang harus public untuk info bisnis)
DROP POLICY IF EXISTS "anon_read_owners" ON owners;
CREATE POLICY "anon_read_owners" ON owners FOR SELECT TO anon USING (true);

-- 3. Users (untuk ambil nama owner)
-- Kita buka read akses ke public. Data sensitif (email, password) aman di auth.users, tabel public.users aman.
DROP POLICY IF EXISTS "anon_read_users" ON users;
CREATE POLICY "anon_read_users" ON users FOR SELECT TO anon USING (true);

-- 4. Teacher Invite Codes (sudah difix sebelumnya, tapi kita pastikan lagi)
DROP POLICY IF EXISTS "public_read_invites" ON teacher_invite_codes;
CREATE POLICY "public_read_invites" ON teacher_invite_codes FOR SELECT TO anon, authenticated USING (true);

SELECT 'Public READ access enabled for join tables' as status;
