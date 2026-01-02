-- =====================================================
-- AUTO NOTIFICATION TRIGGERS
-- Jalankan ini di Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTION: Create Notification
-- =====================================================
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id uuid,
    p_title text,
    p_message text,
    p_type text DEFAULT 'info'
)
RETURNS uuid AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (p_user_id, p_title, p_message, p_type)
    RETURNING id INTO v_id;
    RETURN v_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create notification: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. TRIGGER: Booking Created (Notify Owner & Student)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_booking_created()
RETURNS TRIGGER AS $$
DECLARE
    v_student_name text;
    v_program_name text;
    v_les_name text;
    v_owner_id uuid;
BEGIN
    -- Get student name
    SELECT u.name INTO v_student_name
    FROM users u
    JOIN students s ON s.user_id = u.id
    WHERE s.id = NEW.student_id;

    -- Get program and les place info
    SELECT p.name, lp.name, lp.owner_id 
    INTO v_program_name, v_les_name, v_owner_id
    FROM programs p
    JOIN les_places lp ON lp.id = p.les_place_id
    WHERE p.id = NEW.program_id;

    -- Notify Owner: New registration
    IF v_owner_id IS NOT NULL THEN
        PERFORM create_notification(
            (SELECT user_id FROM owners WHERE id = v_owner_id),
            'Pendaftaran Baru',
            v_student_name || ' mendaftar untuk program ' || v_program_name,
            'info'
        );
    END IF;

    -- Notify Student: Booking confirmation
    PERFORM create_notification(
        (SELECT user_id FROM students WHERE id = NEW.student_id),
        'Pendaftaran Berhasil',
        'Anda berhasil mendaftar di ' || v_les_name || ' - ' || v_program_name || '. Silakan lakukan pembayaran.',
        'success'
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_booking_created: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_booking_created ON bookings;
CREATE TRIGGER trg_notify_booking_created
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_booking_created();

-- =====================================================
-- 3. TRIGGER: Payment Status Changed (Notify Student & Owner)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_student_user_id uuid;
    v_owner_user_id uuid;
    v_program_name text;
    v_les_name text;
    v_amount numeric;
BEGIN
    -- Only trigger on status change
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Get booking info
    SELECT 
        (SELECT user_id FROM students WHERE id = b.student_id),
        (SELECT user_id FROM owners WHERE id = lp.owner_id),
        p.name,
        lp.name,
        NEW.amount
    INTO v_student_user_id, v_owner_user_id, v_program_name, v_les_name, v_amount
    FROM bookings b
    JOIN programs p ON p.id = b.program_id
    JOIN les_places lp ON lp.id = p.les_place_id
    WHERE b.id = NEW.booking_id;

    -- Payment SUCCESS
    IF NEW.status = 'completed' OR NEW.status = 'paid' THEN
        -- Notify Student
        IF v_student_user_id IS NOT NULL THEN
            PERFORM create_notification(
                v_student_user_id,
                'Pembayaran Berhasil',
                'Pembayaran Rp ' || TO_CHAR(v_amount, 'FM999,999,999') || ' untuk ' || v_program_name || ' berhasil. Selamat belajar!',
                'success'
            );
        END IF;

        -- Notify Owner
        IF v_owner_user_id IS NOT NULL THEN
            PERFORM create_notification(
                v_owner_user_id,
                'Pembayaran Masuk',
                'Pembayaran Rp ' || TO_CHAR(v_amount, 'FM999,999,999') || ' untuk ' || v_program_name || ' telah diterima.',
                'payment'
            );
        END IF;
    END IF;

    -- Payment FAILED
    IF NEW.status = 'failed' OR NEW.status = 'cancelled' THEN
        IF v_student_user_id IS NOT NULL THEN
            PERFORM create_notification(
                v_student_user_id,
                'Pembayaran Gagal',
                'Pembayaran untuk ' || v_program_name || ' gagal. Silakan coba lagi.',
                'error'
            );
        END IF;
    END IF;

    -- Payment PENDING
    IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
        IF v_student_user_id IS NOT NULL THEN
            PERFORM create_notification(
                v_student_user_id,
                'Menunggu Pembayaran',
                'Silakan selesaikan pembayaran untuk ' || v_program_name || ' sebelum batas waktu.',
                'warning'
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_payment_status_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_payment_status ON payments;
CREATE TRIGGER trg_notify_payment_status
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_payment_status_change();

-- =====================================================
-- 4. TRIGGER: Les Place Status Changed (Notify Owner)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_les_place_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_user_id uuid;
BEGIN
    IF OLD.is_verified = NEW.is_verified THEN
        RETURN NEW;
    END IF;

    SELECT user_id INTO v_owner_user_id FROM owners WHERE id = NEW.owner_id;

    IF NEW.is_verified = true THEN
        PERFORM create_notification(
            v_owner_user_id,
            'Tempat Les Diverifikasi',
            NEW.name || ' telah diverifikasi dan sekarang dapat dilihat oleh siswa.',
            'success'
        );
    ELSE
        PERFORM create_notification(
            v_owner_user_id,
            'Status Verifikasi Dicabut',
            'Verifikasi ' || NEW.name || ' telah dicabut. Hubungi admin untuk informasi.',
            'warning'
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_les_place_status_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_les_status ON les_places;
CREATE TRIGGER trg_notify_les_status
    AFTER UPDATE ON les_places
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_les_place_status_change();

-- =====================================================
-- 5. TRIGGER: New Review (Notify Owner)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_new_review()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_user_id uuid;
    v_student_name text;
    v_les_name text;
BEGIN
    -- Get owner and les info
    SELECT 
        (SELECT user_id FROM owners WHERE id = lp.owner_id),
        lp.name
    INTO v_owner_user_id, v_les_name
    FROM les_places lp
    WHERE lp.id = NEW.les_place_id;

    -- Get student name
    SELECT u.name INTO v_student_name
    FROM users u
    JOIN students s ON s.user_id = u.id
    WHERE s.id = NEW.student_id;

    IF v_owner_user_id IS NOT NULL THEN
        PERFORM create_notification(
            v_owner_user_id,
            'Review Baru (' || NEW.rating || '/5)',
            v_student_name || ' memberikan review untuk ' || v_les_name,
            CASE WHEN NEW.rating >= 4 THEN 'success' ELSE 'info' END
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_new_review: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_review ON reviews;
CREATE TRIGGER trg_notify_review
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_new_review();

-- =====================================================
-- 6. TRIGGER: Teacher Invite Code Used (Notify Owner)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_teacher_joined()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_user_id uuid;
    v_teacher_name text;
    v_les_name text;
BEGIN
    IF OLD.is_used = NEW.is_used THEN
        RETURN NEW;
    END IF;

    IF NEW.is_used = true THEN
        -- Get info
        SELECT 
            (SELECT user_id FROM owners WHERE id = NEW.owner_id),
            (SELECT name FROM users WHERE id = NEW.used_by),
            (SELECT name FROM les_places WHERE id = NEW.les_place_id)
        INTO v_owner_user_id, v_teacher_name, v_les_name;

        IF v_owner_user_id IS NOT NULL THEN
            PERFORM create_notification(
                v_owner_user_id,
                'Guru Baru Bergabung',
                v_teacher_name || ' telah bergabung sebagai guru di ' || v_les_name,
                'success'
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_teacher_joined: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_teacher_joined ON teacher_invite_codes;
CREATE TRIGGER trg_notify_teacher_joined
    AFTER UPDATE ON teacher_invite_codes
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_teacher_joined();

-- =====================================================
-- 7. TRIGGER: Schedule Created/Updated (Notify Teacher & Students)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_schedule_change()
RETURNS TRIGGER AS $$
DECLARE
    v_teacher_user_id uuid;
    v_program_name text;
    v_action text;
BEGIN
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        v_action := 'Jadwal Baru';
    ELSE
        v_action := 'Jadwal Diperbarui';
    END IF;

    -- Get teacher and program info
    SELECT 
        (SELECT user_id FROM teachers WHERE id = NEW.teacher_id),
        (SELECT name FROM programs WHERE id = NEW.program_id)
    INTO v_teacher_user_id, v_program_name;

    -- Notify Teacher
    IF v_teacher_user_id IS NOT NULL THEN
        PERFORM create_notification(
            v_teacher_user_id,
            v_action,
            'Jadwal untuk ' || v_program_name || ': ' || NEW.day_of_week || ' ' || NEW.start_time::text || '-' || NEW.end_time::text,
            'schedule'
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_schedule_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_schedule ON schedules;
CREATE TRIGGER trg_notify_schedule
    AFTER INSERT OR UPDATE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_schedule_change();

-- =====================================================
-- 8. TRIGGER: Booking Approved/Rejected (Notify Student)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_on_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_student_user_id uuid;
    v_program_name text;
    v_les_name text;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Get info
    SELECT 
        (SELECT user_id FROM students WHERE id = NEW.student_id),
        p.name,
        lp.name
    INTO v_student_user_id, v_program_name, v_les_name
    FROM programs p
    JOIN les_places lp ON lp.id = p.les_place_id
    WHERE p.id = NEW.program_id;

    -- Approved
    IF NEW.status = 'approved' OR NEW.status = 'active' THEN
        PERFORM create_notification(
            v_student_user_id,
            'Pendaftaran Disetujui',
            'Pendaftaran Anda di ' || v_les_name || ' - ' || v_program_name || ' telah disetujui!',
            'success'
        );
    END IF;

    -- Rejected
    IF NEW.status = 'rejected' OR NEW.status = 'cancelled' THEN
        PERFORM create_notification(
            v_student_user_id,
            'Pendaftaran Ditolak',
            'Pendaftaran Anda di ' || v_les_name || ' - ' || v_program_name || ' tidak dapat diproses.',
            'error'
        );
    END IF;

    -- Completed
    IF NEW.status = 'completed' THEN
        PERFORM create_notification(
            v_student_user_id,
            'Program Selesai',
            'Selamat! Anda telah menyelesaikan program ' || v_program_name || ' di ' || v_les_name,
            'success'
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_booking_status_change: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_booking_status ON bookings;
CREATE TRIGGER trg_notify_booking_status
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_booking_status_change();

-- =====================================================
-- 9. WELCOME NOTIFICATION for New Users
-- =====================================================
CREATE OR REPLACE FUNCTION notify_welcome_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'student' THEN
        PERFORM create_notification(
            NEW.id,
            'Selamat Datang di Mariles!',
            'Temukan tempat les terbaik untuk Anda. Mulai eksplorasi sekarang!',
            'info'
        );
    ELSIF NEW.role = 'owner' THEN
        PERFORM create_notification(
            NEW.id,
            'Selamat Datang, Partner!',
            'Daftarkan tempat les Anda dan mulai terima siswa baru.',
            'info'
        );
    ELSIF NEW.role = 'teacher' THEN
        PERFORM create_notification(
            NEW.id,
            'Selamat Datang, Guru!',
            'Kelola jadwal dan materi Anda dengan mudah di Mariles.',
            'info'
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_welcome_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_welcome_notification ON users;
CREATE TRIGGER trg_welcome_notification
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION notify_welcome_user();

-- =====================================================
-- VERIFICATION: Check triggers created
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'trg_notify%' OR trigger_name LIKE 'trg_welcome%'
ORDER BY event_object_table;
