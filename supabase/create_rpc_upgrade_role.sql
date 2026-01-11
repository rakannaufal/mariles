-- Function to upgrade/change user role
CREATE OR REPLACE FUNCTION upgrade_user_role(
    target_user_id UUID,
    new_role TEXT,
    new_owner_type TEXT DEFAULT NULL,
    teacher_invite_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Update the public.users table
    UPDATE public.users 
    SET role = new_role, updated_at = NOW()
    WHERE id = target_user_id;

    -- Handle specific role creation
    IF new_role = 'owner' THEN
        -- Create owner profile if not exists
        INSERT INTO public.owners (user_id, business_name, owner_type)
        SELECT 
            id, 
            COALESCE(name, 'My Business') || '''s Business', 
            COALESCE(new_owner_type, 'umum')
        FROM public.users WHERE id = target_user_id
        ON CONFLICT (user_id) DO UPDATE 
        SET owner_type = COALESCE(new_owner_type, owners.owner_type);
        
        -- Create default les_place for owner
        INSERT INTO public.les_places (owner_id, name, address, type)
        SELECT 
            id, 
            COALESCE(business_name, 'My Les Place'), 
            'Alamat belum diatur', 
            'offline'
        FROM public.owners WHERE user_id = target_user_id
        ON CONFLICT DO NOTHING;
        
        -- If pribaddi, create teacher profile too
        IF new_owner_type = 'pribadi' THEN
             INSERT INTO public.teachers (user_id, owner_id, is_available)
             SELECT target_user_id, id, true
             FROM public.owners WHERE user_id = target_user_id
             ON CONFLICT (user_id) DO NOTHING;
        END IF;

    ELSIF new_role = 'teacher' THEN
        -- Create teacher profile
        INSERT INTO public.teachers (user_id, is_available)
        VALUES (target_user_id, true)
        ON CONFLICT (user_id) DO NOTHING;
        
    ELSIF new_role = 'student' THEN
        -- Create student profile
        INSERT INTO public.students (user_id)
        VALUES (target_user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
