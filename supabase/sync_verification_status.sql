-- =====================================================
-- SYNC VERIFICATION STATUS
-- Sinkronkan is_verified dengan verification_status
-- =====================================================

-- Update is_verified = true untuk semua yang sudah verified
UPDATE les_places 
SET is_verified = true 
WHERE verification_status = 'verified' AND (is_verified = false OR is_verified IS NULL);

-- Update is_verified = false untuk yang pending atau rejected  
UPDATE les_places 
SET is_verified = false 
WHERE verification_status IN ('pending', 'rejected') AND is_verified = true;

-- Verifikasi hasil
SELECT id, name, verification_status, is_verified 
FROM les_places 
ORDER BY created_at DESC;
