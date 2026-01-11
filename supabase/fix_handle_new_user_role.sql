-- CRITICAL FIX: Ensure Role Updates on Registration (Even for existing users)
-- This fixes the bug where registering as "Owner" for an existing email (with "Student" role) 
-- caused the system to ignore the new role and keep them as Student.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
BEGIN
    -- 1. Extract Role and Name from Metadata (Auth Sign Up)
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    -- 2. Insert or Update Public User
    -- CRITICAL CHANGE: Added "role = EXCLUDED.role" to force update if role changes
    INSERT INTO public.users (id, email, name, role)
    VALUES (NEW.id, NEW.email, user_name, user_role)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,  -- <--- THIS WAS MISSING
        updated_at = NOW();
    
    -- 3. Ensure User Exists in Specific Role Table
    -- Even if they existed before, we now make sure they have a record in the new role table
    
    IF user_role = 'student' THEN
        INSERT INTO public.students (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
        
    ELSIF user_role = 'owner' THEN
        INSERT INTO public.owners (user_id, business_name)
        VALUES (NEW.id, user_name || '''s Business')
        ON CONFLICT (user_id) DO NOTHING;
        
    ELSIF user_role = 'teacher' THEN
        INSERT INTO public.teachers (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail transaction if possible (or fail to alert user)
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
