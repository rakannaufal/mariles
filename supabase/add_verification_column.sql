-- =====================================================
-- STEP: ADD MISSING COLUMNS
-- =====================================================

-- Tambahkan kolom verification_status jika belum ada
ALTER TABLE les_places ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';

-- Tambahkan kolom rejection_reason jika belum ada
ALTER TABLE les_places ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update data yang sudah ada
UPDATE les_places SET verification_status = 'pending' WHERE verification_status IS NULL;

-- SEKARANG baru bisa buat view
DROP VIEW IF EXISTS les_places_with_owner;

CREATE OR REPLACE VIEW les_places_with_owner AS
SELECT 
    lp.*,
    u.name as owner_name,
    u.email as owner_email,
    u.phone as owner_phone,
    u.id as owner_user_id,
    o.business_name
FROM les_places lp
JOIN owners o ON lp.owner_id = o.id
JOIN users u ON o.user_id = u.id;

GRANT SELECT ON les_places_with_owner TO authenticated, service_role;

SELECT 'Columns verification_status added and View fixed' as status;
