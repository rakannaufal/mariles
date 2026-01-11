-- FIX: Allow role and owner_type updates on re-registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_owner_type TEXT;
    existing_role TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    user_owner_type := COALESCE(NEW.raw_user_meta_data->>'owner_type', 'umum');

    -- Check if user exists and get current role
    SELECT role INTO existing_role FROM public.users WHERE id = NEW.id;

    -- Update user: allow Role update if different (Re-registration scenario)
    INSERT INTO public.users (id, email, name, role)
    VALUES (NEW.id, NEW.email, user_name, user_role)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        -- CRITICAL FIX: If user re-registers with new intent, update the role
        role = EXCLUDED.role, 
        updated_at = NOW();

    -- Role-specific logic
    -- Now we must handle the case where the role CHANGED or stayed same
    
    IF user_role = 'student' THEN
        INSERT INTO public.students (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;

    ELSIF user_role = 'owner' THEN
        INSERT INTO public.owners (user_id, business_name, owner_type)
        VALUES (NEW.id, user_name || '''s Business', user_owner_type)
        ON CONFLICT (user_id) DO UPDATE SET
            owner_type = EXCLUDED.owner_type; -- Update owner_type on conflict
            
    ELSIF user_role = 'teacher' THEN
        INSERT INTO public.teachers (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
