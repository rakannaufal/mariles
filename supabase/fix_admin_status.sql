-- =====================================================
-- FIX ADMIN STATUS & VERIFICATION
-- =====================================================

-- 1. Pastikan kolom verification_status punya default
ALTER TABLE les_places ALTER COLUMN verification_status SET DEFAULT 'pending';

-- 2. Update data lama yang null jadi 'pending'
UPDATE les_places SET verification_status = 'pending' WHERE verification_status IS NULL;

-- 3. Update view agar selalu return verification_status (fallback 'pending')
DROP VIEW IF EXISTS les_places_with_owner;

CREATE OR REPLACE VIEW les_places_with_owner AS
SELECT 
    lp.id,
    lp.owner_id,
    lp.name,
    lp.description,
    lp.address,
    lp.city,
    lp.province,
    lp.postal_code,
    lp.latitude,
    lp.longitude,
    lp.phone,
    lp.email,
    lp.website,
    lp.type,
    lp.is_verified,
    COALESCE(lp.verification_status, 'pending') as verification_status,
    lp.rejection_reason,
    lp.is_active,
    lp.rating,
    lp.total_reviews,
    lp.created_at,
    lp.updated_at,
    lp.is_private,
    u.name as owner_name,
    u.email as owner_email,
    u.phone as owner_phone,
    u.id as owner_user_id,
    o.business_name
FROM les_places lp
JOIN owners o ON lp.owner_id = o.id
JOIN users u ON o.user_id = u.id;

-- 4. Pastikan RLS Admin Update aman (users dengan role 'admin' bisa update apa saja)
-- Sebenarnya policy "les_places_all" sudah allow true, tapi kita perjelas update verifikasi
-- CREATE POLICY "admin_update_les_places" ON les_places FOR UPDATE USING (
--   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
-- );
-- (Tidak perlu jika sudah ada policy USING(true))

SELECT 'Status fixed and View updated' as status;
