-- =============================================================================
-- 03_functions_crud.sql
-- Description: RPCs, Triggers, and Business Logic for 39-Table Schema
-- Created: 2026-01-12
-- Detail: STRICT Compliance with ALUR_REGISTRASI_GURU.md & 01_tables_relasi.sql
-- =============================================================================

-- =============================================================================
-- 1. NOTIFICATION SYSTEM
-- =============================================================================

-- Helper: Create Notification
-- Usage: Used by triggers and internal logic to create alerts.
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_data JSONB DEFAULT '{}'::jsonb,
    p_link TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO notifications (id, user_id, title, message, type, data, link, created_at, is_read)
    VALUES (gen_random_uuid(), p_user_id, p_title, p_message, p_type, p_data, p_link, NOW(), false)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify on Booking Status Change
-- Logic: Alerts the student when their booking status changes (e.g., active -> completed, pending -> active).
CREATE OR REPLACE FUNCTION notify_on_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Notify Student
        PERFORM create_notification(
            NEW.student_id, -- student_id in bookings maps to students.id, need USER_ID
            'Booking Status Update',
            'Your booking status is now: ' || NEW.status,
            'booking',
            jsonb_build_object('booking_id', NEW.id),
            '/student/bookings'
        );
        -- WAIT: bookings.student_id is UUID referencing students(id). We need USERS.id for notification.
        -- FIX: Join to get user_id.
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXING THE TRIGGER LOGIC ABOVE TO BE CORRECT WITH SCHEMA
CREATE OR REPLACE FUNCTION notify_on_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_student_user_id UUID;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Get User ID from Student ID
        SELECT user_id INTO v_student_user_id FROM students WHERE id = NEW.student_id;
        
        IF v_student_user_id IS NOT NULL THEN
            PERFORM create_notification(
                v_student_user_id,
                'Booking Status Update',
                'Your booking status is now: ' || NEW.status,
                'booking',
                jsonb_build_object('booking_id', NEW.id),
                '/student/bookings'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_booking_status
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION notify_on_booking_status_change();


-- Trigger: Notify on New Review
-- Logic: Alerts the Owner when a new review is posted for their Les Place.
CREATE OR REPLACE FUNCTION notify_on_new_review()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_user_id UUID;
BEGIN
    -- Find Owner User ID via Les Place -> Owner -> User
    SELECT o.user_id INTO v_owner_user_id
    FROM les_places lp
    JOIN owners o ON lp.owner_id = o.id
    WHERE lp.id = NEW.les_place_id;

    IF v_owner_user_id IS NOT NULL THEN
        PERFORM create_notification(
            v_owner_user_id,
            'New Review Received',
            'You have a new review rating: ' || NEW.rating,
            'review',
            jsonb_build_object('review_id', NEW.id),
            '/owner/reviews'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_new_review
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_review();


-- =============================================================================
-- 2. USER MANAGEMENT (AUTH HOOK)
-- =============================================================================

-- Logic: Handles new signup.
-- CRITICAL: For Teachers, it performs a "Pre-check" but strictly creates a basic profile
-- to facilitate the "Join via Code" later. It does NOT automatically link them.
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_name TEXT;
    v_existing_invite RECORD;
BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- 1. Insert into Public Users (Base Table)
    INSERT INTO users (id, email, name, role, created_at, updated_at, is_active)
    VALUES (NEW.id, NEW.email, v_name, v_role, NOW(), NOW(), true);

    -- 2. Role Specific Profile Creation
    IF v_role = 'student' THEN
        INSERT INTO students (id, user_id, created_at) VALUES (gen_random_uuid(), NEW.id, NOW());
        INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
        VALUES (gen_random_uuid(), NEW.id, 0, 0, 0, NOW());
        
    ELSIF v_role = 'owner' THEN
        INSERT INTO owners (id, user_id, created_at, verification_status) 
        VALUES (gen_random_uuid(), NEW.id, NOW(), 'pending');
        INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
        VALUES (gen_random_uuid(), NEW.id, 0, 0, 0, NOW());

    ELSIF v_role = 'teacher' THEN
        -- For 'teacher', we create a standard profile first. 
        -- Linking to an owner happens via 'join_teacher_via_code' RPC.
        INSERT INTO teachers (id, user_id, created_at, is_active) 
        VALUES (gen_random_uuid(), NEW.id, NOW(), true);
        
        -- Also give them a balance account for Salary
        INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
        VALUES (gen_random_uuid(), NEW.id, 0, 0, 0, NOW());
    
    ELSIF v_role = 'admin' THEN
        -- Admin usually defined via direct DB insert or specific flow, but safe to allow user entry 
        -- if Auth permits. No extra profile needed.
        NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 3. FINANCIAL LOGIC (Withdrawals & Payments)
-- =============================================================================

-- RPC: Process Withdrawal Request
-- Logic: Atomically checks balance, validates amount, locks funds (deducts), and creates withdrawal record.
CREATE OR REPLACE FUNCTION process_withdrawal_request(
    p_amount NUMERIC,
    p_bank_name TEXT,
    p_bank_account TEXT,
    p_bank_holder TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_balance RECORD;
    v_wd_id UUID;
    v_les_id UUID;
    v_requester_type TEXT;
BEGIN
    -- 1. Lock Balance Row
    SELECT * INTO v_balance FROM balances WHERE user_id = v_user_id FOR UPDATE;
    
    IF v_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Balance account not found');
    END IF;

    IF v_balance.available_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient available balance');
    END IF;

    -- 2. Determine User Type
    IF EXISTS (SELECT 1 FROM owners WHERE user_id = v_user_id) THEN
        v_requester_type := 'owner';
        -- Optional: Link to a specific Les Place if needed, currently loose link
        SELECT id INTO v_les_id FROM les_places WHERE owner_id = (SELECT id FROM owners WHERE user_id = v_user_id) LIMIT 1;
    ELSIF EXISTS (SELECT 1 FROM teachers WHERE user_id = v_user_id) THEN
        v_requester_type := 'teacher';
        SELECT les_place_id INTO v_les_id FROM teachers WHERE user_id = v_user_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized role for withdrawal');
    END IF;

    -- 3. Insert Withdrawal Record
    INSERT INTO withdrawals (
        id, user_id, les_place_id, amount, fee, net_amount, 
        bank_name, bank_account, bank_holder, 
        status, requested_at, requester_type
    )
    VALUES (
        gen_random_uuid(), v_user_id, v_les_id, p_amount, 0, p_amount, 
        p_bank_name, p_bank_account, p_bank_holder, 
        'pending', NOW(), v_requester_type
    )
    RETURNING id INTO v_wd_id;

    -- 4. Atomic Deduct Balance
    UPDATE balances 
    SET available_balance = available_balance - p_amount,
        pending_balance = pending_balance + p_amount
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'id', v_wd_id);
END;
$$;


-- RPC: Pay Teacher Salary (Owner -> Teacher)
-- Logic: Moves funds from Owner Balance to Teacher Balance & Logs Transaction.
CREATE OR REPLACE FUNCTION pay_teacher_salary(
    p_teacher_id UUID, -- This is the 'teachers.id' UUID
    p_amount NUMERIC,
    p_period TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_owner_user_id UUID := auth.uid();
    v_owner_balance RECORD;
    v_teacher_user_id UUID;
    v_payment_id UUID;
    v_les_id UUID;
BEGIN
    -- 1. Verify Owner Funds
    SELECT * INTO v_owner_balance FROM balances WHERE user_id = v_owner_user_id FOR UPDATE;
    
    IF v_owner_balance.available_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- 2. Get Teacher Details (User ID for balance)
    SELECT user_id, les_place_id INTO v_teacher_user_id, v_les_id 
    FROM teachers WHERE id = p_teacher_id;
    
    IF v_teacher_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
    END IF;

    -- 3. Insert Payment Record
    INSERT INTO teacher_payments (
        id, les_place_id, teacher_id, owner_id, amount, payment_status, payment_period, paid_date, created_at
    )
    VALUES (
        gen_random_uuid(), v_les_id, v_teacher_user_id, v_owner_user_id, p_amount, 'completed', p_period, NOW(), NOW()
    )
    RETURNING id INTO v_payment_id;

    -- 4. Transfer Funds
    -- Deduct Owner
    UPDATE balances SET available_balance = available_balance - p_amount WHERE user_id = v_owner_user_id;
    -- Add to Teacher
    UPDATE balances SET available_balance = available_balance + p_amount, total_balance = total_balance + p_amount WHERE user_id = v_teacher_user_id;

    -- 5. Notify Teacher
    PERFORM create_notification(
        v_teacher_user_id,
        'Salary Payment Received',
        'You have received a salary payment of ' || p_amount,
        'payment',
        jsonb_build_object('payment_id', v_payment_id),
        '/teacher/finance'
    );

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$;


-- =============================================================================
-- 4. TEACHER JOIN LOGIC (INVITE CODE)
-- =============================================================================

-- RPC: Join Teacher via Code
-- Logic: Validate code from `teacher_invite_codes`, link teacher profile to owner/les_place, consume code.
CREATE OR REPLACE FUNCTION join_teacher_via_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_invite RECORD;
    v_teacher_id UUID;
BEGIN
    -- 1. Validate Invite Code
    SELECT * INTO v_invite FROM teacher_invite_codes 
    WHERE code = p_code AND is_used = false AND expires_at > NOW();

    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
    END IF;

    -- 2. Get Teacher Profile ID
    SELECT id INTO v_teacher_id FROM teachers WHERE user_id = v_user_id;
    
    IF v_teacher_id IS NULL THEN
        -- Fallback: Create profile if missing (should exist from handle_new_user)
        INSERT INTO teachers (id, user_id, created_at, is_active) 
        VALUES (gen_random_uuid(), v_user_id, NOW(), true)
        RETURNING id INTO v_teacher_id;
    END IF;

    -- 3. Consume Code
    UPDATE teacher_invite_codes 
    SET is_used = true, used_by = v_teacher_id, used_at = NOW() 
    WHERE id = v_invite.id;

    -- 4. Link Teacher to Owner & Les Place
    UPDATE teachers 
    SET owner_id = v_invite.owner_id, 
        les_place_id = v_invite.les_place_id,
        is_active = true
    WHERE id = v_teacher_id;

    -- 5. Notify Owner
    PERFORM create_notification(
        (SELECT user_id FROM owners WHERE id = v_invite.owner_id),
        'New Teacher Joined',
        'A new teacher has joined your team via invite code.',
        'teacher_join',
        jsonb_build_object('teacher_id', v_teacher_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined team');
END;
$$;


-- =============================================================================
-- 5. UTILITY & MAINTENANCE
-- =============================================================================

-- RPC: Upgrade User Role
-- Logic: Validates permissions (if any needed, usually handled by Gateway or Paywall), updates role, creates profile.
CREATE OR REPLACE FUNCTION upgrade_user_role(
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Start Transaction (implied)
    
    -- 2. Update User Role
    UPDATE users SET role = p_new_role WHERE id = v_user_id;

    -- 3. Create Missing Profiles
    IF p_new_role = 'owner' AND NOT EXISTS (SELECT 1 FROM owners WHERE user_id = v_user_id) THEN
        INSERT INTO owners (id, user_id, created_at, verification_status) 
        VALUES (gen_random_uuid(), v_user_id, NOW(), 'pending');
        -- Ensure balance exists
        IF NOT EXISTS (SELECT 1 FROM balances WHERE user_id = v_user_id) THEN
            INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
            VALUES (gen_random_uuid(), v_user_id, 0, 0, 0, NOW());
        END IF;

    ELSIF p_new_role = 'teacher' AND NOT EXISTS (SELECT 1 FROM teachers WHERE user_id = v_user_id) THEN
        INSERT INTO teachers (id, user_id, created_at, is_active) 
        VALUES (gen_random_uuid(), v_user_id, NOW(), true);
         -- Ensure balance exists
        IF NOT EXISTS (SELECT 1 FROM balances WHERE user_id = v_user_id) THEN
            INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
            VALUES (gen_random_uuid(), v_user_id, 0, 0, 0, NOW());
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'role', p_new_role);
END;
$$;
