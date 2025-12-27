-- =====================================================
-- FIX ADMIN VIEW
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
    lp.postal_code,
    lp.latitude,
    lp.longitude,
    lp.phone,
    lp.email,
    lp.website,
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
    u.name as owner_name,
    u.email as owner_email,
    u.phone as owner_phone,
    u.id as owner_user_id,
    o.business_name
FROM les_places lp
JOIN owners o ON lp.owner_id = o.id
JOIN users u ON o.user_id = u.id;

GRANT SELECT ON les_places_with_owner TO authenticated, service_role;

SELECT 'View les_places_with_owner created successfully' as status;
