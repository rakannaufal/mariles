-- =============================================================================
-- 03_functions_crud.sql
-- Deskripsi: RPC, Trigger, dan Logika Bisnis untuk Skema 34 Tabel yang Dibersihkan
-- Dibuat: 2026-01-13
-- Diperbarui: DISESUAIKAN DENGAN SKEMA DIBERSIHKAN (Strict UUID & 34 Tablet)
-- =============================================================================

-- =============================================================================
-- 1. SISTEM NOTIFIKASI
-- =============================================================================

-- Helper: Buat Notifikasi
-- Penggunaan: Digunakan oleh triggers dan logika internal untuk membuat alert.
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

-- Trigger: Notifikasi saat Status Booking Berubah
-- Logika: Memberi tahu siswa ketika status booking mereka berubah.
CREATE OR REPLACE FUNCTION notify_on_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_student_user_id UUID;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Ambil User ID dari Student ID
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


-- Trigger: Notifikasi saat Ada Ulasan Baru
-- Logika: Memberi tahu Pemilik ketika ulasan baru diposting untuk Tempat Les mereka.
CREATE OR REPLACE FUNCTION notify_on_new_review()
RETURNS TRIGGER AS $$
DECLARE
    v_owner_user_id UUID;
BEGIN
    -- Cari User ID Pemilik via Les Place -> Owner -> User
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
-- 2. MANAJEMEN PENGGUNA (AUTH HOOK)
-- =============================================================================

-- Logika: Menangani pendaftaran baru.
-- KRITIS: Untuk Pengajar, ini melakukan "Pre-check" tetapi secara ketat membuat profil dasar
-- untuk memfasilitasi "Gabung via Kode" nanti. Ini TIDAK secara otomatis menghubungkan mereka.
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_name TEXT;
BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- 1. Masukkan ke Public Users (Tabel Dasar)
    INSERT INTO users (id, email, name, role, created_at, updated_at, is_active)
    VALUES (NEW.id, NEW.email, v_name, v_role, NOW(), NOW(), true);

    -- 2. Pembuatan Profil Spesifik Role
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
        -- Untuk 'teacher', kita buat profil standar dulu. 
        -- Menghubungkan ke owner terjadi via RPC 'join_teacher_via_code'.
        INSERT INTO teachers (id, user_id, created_at, is_active) 
        VALUES (gen_random_uuid(), NEW.id, NOW(), true);
        
        -- Juga berikan mereka akun saldo untuk Gaji
        INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
        VALUES (gen_random_uuid(), NEW.id, 0, 0, 0, NOW());
    
    ELSIF v_role = 'admin' THEN
        -- Admin biasanya didefinisikan via insert DB langsung atau alur khusus, tapi aman untuk mengizinkan entri user
        -- jika Auth mengizinkan. Tidak perlu profil tambahan.
        NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 3. LOGIKA KEUANGAN (Penarikan & Pembayaran)
-- =============================================================================

-- RPC: Proses Permintaan Penarikan
-- Logika: Secara atomik memeriksa saldo, memvalidasi jumlah, mengunci dana (mengurangi), dan membuat catatan penarikan.
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
    -- 1. Kunci Baris Saldo
    SELECT * INTO v_balance FROM balances WHERE user_id = v_user_id FOR UPDATE;
    
    IF v_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Balance account not found');
    END IF;

    IF v_balance.available_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient available balance');
    END IF;

    -- 2. Tentukan Tipe User
    IF EXISTS (SELECT 1 FROM owners WHERE user_id = v_user_id) THEN
        v_requester_type := 'owner';
        -- Opsional: Hubungkan ke Les Place tertentu jika perlu, saat ini link longgar
        SELECT id INTO v_les_id FROM les_places WHERE owner_id = (SELECT id FROM owners WHERE user_id = v_user_id) LIMIT 1;
    ELSIF EXISTS (SELECT 1 FROM teachers WHERE user_id = v_user_id) THEN
        v_requester_type := 'teacher';
        SELECT les_place_id INTO v_les_id FROM teachers WHERE user_id = v_user_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized role for withdrawal');
    END IF;

    -- 3. Masukkan Catatan Penarikan
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

    -- 4. Kurangi Saldo Secara Atomik
    UPDATE balances 
    SET available_balance = available_balance - p_amount,
        pending_balance = pending_balance + p_amount
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'id', v_wd_id);
END;
$$;


-- RPC: Bayar Gaji Pengajar (Pemilik -> Pengajar)
-- Logika: Memindahkan dana dari Saldo Pemilik ke Saldo Pengajar & Mencatat Transaksi.
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
    -- 1. Verifikasi Dana Pemilik
    SELECT * INTO v_owner_balance FROM balances WHERE user_id = v_owner_user_id FOR UPDATE;
    
    IF v_owner_balance.available_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient funds');
    END IF;

    -- 2. Ambil Detail Pengajar (User ID untuk saldo)
    SELECT user_id, les_place_id INTO v_teacher_user_id, v_les_id 
    FROM teachers WHERE id = p_teacher_id;
    
    IF v_teacher_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
    END IF;

    -- 3. Masukkan Catatan Pembayaran
    INSERT INTO teacher_payments (
        id, les_place_id, teacher_id, owner_id, amount, payment_status, payment_period, paid_date, created_at
    )
    VALUES (
        gen_random_uuid(), v_les_id, v_teacher_user_id, v_owner_user_id, p_amount, 'completed', p_period, NOW(), NOW()
    )
    RETURNING id INTO v_payment_id;

    -- 4. Transfer Dana
    -- Kurangi Pemilik
    UPDATE balances SET available_balance = available_balance - p_amount WHERE user_id = v_owner_user_id;
    -- Tambah ke Pengajar
    UPDATE balances SET available_balance = available_balance + p_amount, total_balance = total_balance + p_amount WHERE user_id = v_teacher_user_id;

    -- 5. Beri Tahu Pengajar
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
-- 4. LOGIKA GABUNG PENGAJAR (KODE UNDANGAN)
-- =============================================================================

-- RPC: Gabung Pengajar via Kode
-- Logika: Validasi kode dari `teacher_invite_codes`, hubungkan profil pengajar ke pemilik/les_place, gunakan kode.
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
    -- 1. Validasi Kode Undangan
    SELECT * INTO v_invite FROM teacher_invite_codes 
    WHERE code = p_code AND is_used = false AND expires_at > NOW();

    IF v_invite IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
    END IF;

    -- 2. Ambil ID Profil Pengajar
    SELECT id INTO v_teacher_id FROM teachers WHERE user_id = v_user_id;
    
    IF v_teacher_id IS NULL THEN
        -- Fallback: Buat profil jika hilang (seharusnya ada dari handle_new_user)
        INSERT INTO teachers (id, user_id, created_at, is_active) 
        VALUES (gen_random_uuid(), v_user_id, NOW(), true)
        RETURNING id INTO v_teacher_id;
    END IF;

    -- 3. Gunakan Kode
    UPDATE teacher_invite_codes 
    SET is_used = true, used_by = v_teacher_id, used_at = NOW() 
    WHERE id = v_invite.id;

    -- 4. Hubungkan Pengajar ke Pemilik & Les Place
    UPDATE teachers 
    SET owner_id = v_invite.owner_id, 
        les_place_id = v_invite.les_place_id,
        is_active = true
    WHERE id = v_teacher_id;

    -- 5. Beri Tahu Pemilik
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
-- 5. UTILITAS & PEMELIHARAAN
-- =============================================================================

-- RPC: Upgrade User Role
-- Logika: Memvalidasi izin (jika ada yang diperlukan, biasanya ditangani oleh Gateway atau Paywall), update role, buat profil.
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
    -- 1. Mulai Transaksi (implisit)
    
    -- 2. Update User Role
    UPDATE users SET role = p_new_role WHERE id = v_user_id;

    -- 3. Buat Profil yang Hilang
    IF p_new_role = 'owner' AND NOT EXISTS (SELECT 1 FROM owners WHERE user_id = v_user_id) THEN
        INSERT INTO owners (id, user_id, created_at, verification_status) 
        VALUES (gen_random_uuid(), v_user_id, NOW(), 'pending');
        -- Pastikan saldo ada
        IF NOT EXISTS (SELECT 1 FROM balances WHERE user_id = v_user_id) THEN
            INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
            VALUES (gen_random_uuid(), v_user_id, 0, 0, 0, NOW());
        END IF;

    ELSIF p_new_role = 'teacher' AND NOT EXISTS (SELECT 1 FROM teachers WHERE user_id = v_user_id) THEN
        INSERT INTO teachers (id, user_id, created_at, is_active) 
        VALUES (gen_random_uuid(), v_user_id, NOW(), true);
         -- Pastikan saldo ada
        IF NOT EXISTS (SELECT 1 FROM balances WHERE user_id = v_user_id) THEN
            INSERT INTO balances (id, user_id, total_balance, available_balance, pending_balance, created_at) 
            VALUES (gen_random_uuid(), v_user_id, 0, 0, 0, NOW());
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'role', p_new_role);
END;
$$;

-- RPC: Hentikan Booking (Batalkan Langganan)
-- Digunakan oleh: Pemilik atau Pengajar untuk menghentikan booking siswa secara manual.
CREATE OR REPLACE FUNCTION terminate_booking(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  
  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Booking not found');
  END IF;

  UPDATE bookings 
  SET status = 'terminated',
      notes = COALESCE(notes, '') || E'\n[Terminated]: ' || p_reason,
      updated_at = NOW()
  WHERE id = p_booking_id;
  
  -- Beri Tahu Siswa
  PERFORM create_notification(
    (SELECT user_id FROM students WHERE id = v_booking.student_id),
    'Booking Terminated',
    'Your learning program subscription has been terminated. Reason: ' || p_reason,
    'booking_terminated',
    jsonb_build_object('booking_id', p_booking_id)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;
