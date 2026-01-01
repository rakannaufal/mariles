-- =====================================================
-- FIX MISSING TEACHER LINKS
-- Run this to fix teachers who registered but weren't linked properly
-- =====================================================

-- 1. First, check the current state of teachers table
SELECT 
    t.id as teacher_id,
    t.user_id,
    u.name,
    u.email,
    t.owner_id,
    t.les_place_id,
    t.created_at
FROM teachers t
JOIN users u ON t.user_id = u.id
WHERE u.role = 'teacher';

-- 2. Check invite codes status
SELECT 
    tic.id,
    tic.code,
    tic.is_used,
    tic.used_by,
    tic.owner_id,
    tic.les_place_id,
    tic.expires_at,
    o.business_name as owner_name
FROM teacher_invite_codes tic
JOIN owners o ON tic.owner_id = o.id
ORDER BY tic.created_at DESC;

-- 3. Find teachers without owner_id (orphaned teachers)
SELECT 
    t.id as teacher_id,
    t.user_id,
    u.name,
    u.email,
    t.owner_id,
    t.les_place_id
FROM teachers t
JOIN users u ON t.user_id = u.id
WHERE t.owner_id IS NULL;

-- =====================================================
-- MANUAL FIX: Link zea Kurnia to the correct owner
-- Replace the values below with actual IDs from your database
-- =====================================================

-- First, find the owner_id and les_place_id from an existing working teacher or invite code
-- Then update the orphaned teacher

-- Example fix (you need to replace with actual IDs):
-- UPDATE teachers 
-- SET owner_id = 'your-owner-uuid-here',
--     les_place_id = 'your-les-place-uuid-here',
--     updated_at = NOW()
-- WHERE user_id = (SELECT id FROM users WHERE email = 'ucen54048@gmail.com');

-- Also mark the invite code as used:
-- UPDATE teacher_invite_codes
-- SET is_used = TRUE,
--     used_by = (SELECT id FROM teachers WHERE user_id = (SELECT id FROM users WHERE email = 'ucen54048@gmail.com')),
--     used_at = NOW(),
--     updated_at = NOW()
-- WHERE code = 'EEA416';

-- =====================================================
-- AUTOMATIC FIX: Link all orphaned teachers to active codes
-- This will try to find unused codes and link orphaned teachers
-- =====================================================

-- Get owner_id from invite code EEA416 and use it to fix the orphaned teacher
DO $$
DECLARE
    v_owner_id UUID;
    v_les_place_id UUID;
    v_teacher_id UUID;
    v_orphaned_user_id UUID;
BEGIN
    -- Get owner_id and les_place_id from the EEA416 code
    SELECT owner_id, les_place_id INTO v_owner_id, v_les_place_id
    FROM teacher_invite_codes
    WHERE code = 'EEA416';
    
    IF v_owner_id IS NOT NULL THEN
        -- Find the orphaned teacher (zea Kurnia - ucen54048@gmail.com)
        SELECT id INTO v_orphaned_user_id
        FROM users 
        WHERE email = 'ucen54048@gmail.com';
        
        IF v_orphaned_user_id IS NOT NULL THEN
            -- Get the teacher id
            SELECT id INTO v_teacher_id
            FROM teachers
            WHERE user_id = v_orphaned_user_id;
            
            IF v_teacher_id IS NOT NULL THEN
                -- Update teacher with correct owner_id and les_place_id
                UPDATE teachers 
                SET owner_id = v_owner_id,
                    les_place_id = v_les_place_id,
                    updated_at = NOW()
                WHERE id = v_teacher_id;
                
                -- Mark the invite code as used
                UPDATE teacher_invite_codes
                SET is_used = TRUE,
                    used_by = v_teacher_id,
                    used_at = NOW(),
                    updated_at = NOW()
                WHERE code = 'EEA416';
                
                RAISE NOTICE 'Successfully linked teacher % to owner %', v_teacher_id, v_owner_id;
            ELSE
                RAISE NOTICE 'Teacher record not found for user %', v_orphaned_user_id;
            END IF;
        ELSE
            RAISE NOTICE 'User ucen54048@gmail.com not found';
        END IF;
    ELSE
        RAISE NOTICE 'Invite code EEA416 not found';
    END IF;
END $$;

-- Verify the fix
SELECT 
    t.id as teacher_id,
    u.name,
    u.email,
    t.owner_id,
    t.les_place_id,
    o.business_name as owner_name
FROM teachers t
JOIN users u ON t.user_id = u.id
LEFT JOIN owners o ON t.owner_id = o.id
WHERE u.role = 'teacher';

SELECT 'Fix completed. Please refresh the Kelola Guru page.' as status;
