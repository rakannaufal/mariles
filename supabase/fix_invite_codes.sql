-- =====================================================
-- FIX INVITE CODES RLS
-- =====================================================

-- 1. Pastikan tabel ada
CREATE TABLE IF NOT EXISTS teacher_invite_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  owner_id uuid REFERENCES owners(id),
  les_place_id uuid REFERENCES les_places(id),
  expires_at timestamptz,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE teacher_invite_codes ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies
DROP POLICY IF EXISTS "teacher_invite_codes_all" ON teacher_invite_codes;
DROP POLICY IF EXISTS "public_read_invites" ON teacher_invite_codes;
DROP POLICY IF EXISTS "owners_manage_invites" ON teacher_invite_codes;

-- 4. Create Policies

-- READ: Public (Anon & Authenticated) boleh baca untuk validasi
CREATE POLICY "public_read_invites" ON teacher_invite_codes
FOR SELECT TO anon, authenticated USING (true);

-- WRITE: Authenticated users (Owners) boleh create/update/delete
CREATE POLICY "owners_manage_invites" ON teacher_invite_codes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT 'Invite codes RLS fixed for public access' as status;
