-- =====================================================
-- UPDATE ADMIN VIEW WITH ALL OWNER PROFILE FIELDS
-- Run this in Supabase SQL Editor to sync data
-- =====================================================

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
    lp.type,
    lp.is_verified,
    lp.verification_status,
    lp.rejection_reason,
    lp.is_active,
    lp.rating,
    lp.total_reviews,
    lp.created_at,
    lp.updated_at,
    lp.is_private,
    -- Owner info from users table
    u.name as owner_name,
    u.email as owner_email,
    u.phone as owner_phone,
    u.id as owner_user_id,
    -- ALL Owner profile fields from owners table
    o.business_name,
    o.business_type,
    o.nik,
    o.npwp,
    o.province_id as owner_province_id,
    o.province_name as owner_province_name,
    o.city_id as owner_city_id,
    o.city_name as owner_city_name,
    o.payment_type,
    o.bank_name,
    o.bank_account,
    o.bank_holder,
    o.ewallet_type,
    o.ewallet_number
FROM les_places lp
JOIN owners o ON lp.owner_id = o.id
JOIN users u ON o.user_id = u.id;

GRANT SELECT ON les_places_with_owner TO authenticated, service_role;

SELECT 'View les_places_with_owner updated with ALL owner profile fields' as status;
