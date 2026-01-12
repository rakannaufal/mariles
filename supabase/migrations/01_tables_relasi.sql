-- =============================================================================
-- 01_tables_relasi.sql
-- Description: Full Legacy Schema (39 Tables) - Loose Schema (No Defaults, Nullable)
-- Created: 2026-01-12
-- =============================================================================

-- 1. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY,
    booking_id UUID,
    teacher_id UUID,
    session_date DATE,
    status VARCHAR(50) CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes TEXT,
    created_at TIMESTAMPTZ
);

-- 2. USERS (Base Table)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('student', 'owner', 'teacher', 'admin')),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN,
    gender VARCHAR(20),
    birth_date DATE,
    address TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 3. OWNERS
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY,
    user_id UUID,
    business_name VARCHAR(255),
    business_address TEXT,
    business_phone VARCHAR(50),
    verification_status VARCHAR(50) CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ,
    documents JSONB,
    bank_name VARCHAR(100),
    bank_account VARCHAR(100),
    bank_holder VARCHAR(100),
    owner_type VARCHAR(50) CHECK (owner_type IN ('pribadi', 'umum')),
    company_name VARCHAR(255),
    business_type VARCHAR(100),
    npwp VARCHAR(50),
    nik VARCHAR(50),
    province_id VARCHAR(50),
    province_name VARCHAR(100),
    city_id VARCHAR(50),
    city_name VARCHAR(100),
    payment_type VARCHAR(50),
    ewallet_type VARCHAR(50),
    ewallet_number VARCHAR(50),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. LES PLACES
CREATE TABLE IF NOT EXISTS les_places (
    id UUID PRIMARY KEY,
    owner_id UUID,
    name VARCHAR(255),
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    latitude NUMERIC,
    longitude NUMERIC,
    type VARCHAR(50) CHECK (type IN ('online', 'offline', 'hybrid')),
    photos JSONB,
    facilities TEXT[],
    rating NUMERIC,
    total_reviews INTEGER,
    total_students INTEGER,
    is_active BOOLEAN,
    is_verified BOOLEAN,
    is_private BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    highlights TEXT[],
    verification_status VARCHAR(50),
    rejection_reason TEXT,
    balance NUMERIC,
    CONSTRAINT les_places_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(id)
);

-- 5. BALANCES
CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY,
    user_id UUID,
    les_place_id UUID,
    total_balance NUMERIC,
    available_balance NUMERIC,
    pending_balance NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT balances_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. BANNERS
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    image_url TEXT,
    link VARCHAR(255),
    is_active BOOLEAN,
    sort_order INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- 7. STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY,
    user_id UUID,
    address TEXT,
    date_of_birth DATE,
    school VARCHAR(255),
    grade VARCHAR(50),
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    nickname VARCHAR(100),
    education_level VARCHAR(100),
    curriculum VARCHAR(100),
    major VARCHAR(100),
    school_name VARCHAR(255),
    province_id VARCHAR(50),
    province_name VARCHAR(100),
    city_id VARCHAR(50),
    city_name VARCHAR(100),
    postal_code VARCHAR(20),
    gender VARCHAR(20),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 8. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
);

-- 9. PROGRAMS
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY,
    les_place_id UUID,
    category_id UUID,
    name VARCHAR(255),
    description TEXT,
    subject VARCHAR(255),
    price NUMERIC,
    price_type VARCHAR(50) CHECK (price_type IN ('hourly', 'daily', 'weekly', 'monthly', 'package')),
    duration_months INTEGER,
    sessions_per_week INTEGER,
    session_duration_minutes INTEGER,
    schedule JSONB,
    capacity INTEGER,
    current_students INTEGER,
    level VARCHAR(50),
    is_active BOOLEAN,
    total_modules INTEGER,
    total_videos INTEGER,
    total_exercises INTEGER,
    total_sessions INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    type VARCHAR(50) CHECK (type IN ('Offline', 'Online', 'Hybrid')),
    meeting_url TEXT,
    category_name TEXT,
    class_type VARCHAR(50) CHECK (class_type IN ('online', 'offline')),
    completion_config JSONB,
    CONSTRAINT programs_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT programs_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 10. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY,
    student_id UUID,
    program_id UUID,
    les_place_id UUID,
    status VARCHAR(50) CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'terminated', 'expired', 'cancelled')),
    payment_status VARCHAR(50) CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed', 'settlement', 'capture')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    booked_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completion_type VARCHAR(50) CHECK (completion_type IN ('auto', 'manual', 'expired', 'terminate')),
    completion_result VARCHAR(50) CHECK (completion_result IN ('passed', 'failed', 'dropout', 'manual')),
    completion_notes TEXT,
    terminated_by UUID,
    terminated_reason TEXT,
    CONSTRAINT bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT bookings_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id),
    CONSTRAINT bookings_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT bookings_terminated_by_fkey FOREIGN KEY (terminated_by) REFERENCES users(id)
);

ALTER TABLE attendance ADD CONSTRAINT attendance_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id);

-- 11. CHAT ROOMS
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY,
    participant_1 UUID,
    participant_2 UUID,
    les_place_id UUID,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- 12. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    room_id UUID,
    sender_id UUID,
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES chat_rooms(id)
);

-- 13. COMPLETION LOGS
CREATE TABLE IF NOT EXISTS completion_logs (
    id UUID PRIMARY KEY,
    booking_id UUID,
    action VARCHAR(50),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    performed_by UUID,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    CONSTRAINT completion_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT completion_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- 14. CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(50) CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    replied_at TIMESTAMPTZ,
    reply_message TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- 15. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    student_id UUID,
    teacher_id UUID,
    les_place_id UUID,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT conversations_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT conversations_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT conversations_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 16. COURSE MATERIALS
CREATE TABLE IF NOT EXISTS course_materials (
    id UUID PRIMARY KEY,
    program_id UUID,
    title VARCHAR(255),
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('module', 'video', 'exercise', 'quiz')),
    exercise_type VARCHAR(50),
    deadline TIMESTAMPTZ,
    content TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    duration_minutes INTEGER,
    order_index INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    session_number INTEGER,
    unlock_type VARCHAR(50) CHECK (unlock_type IN ('always', 'after_session', 'after_date', 'manual')),
    unlock_after_date DATE,
    CONSTRAINT course_materials_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- 17. EXERCISE SUBMISSIONS
CREATE TABLE IF NOT EXISTS exercise_submissions (
    id UUID PRIMARY KEY,
    material_id UUID,
    student_id UUID,
    submission_url TEXT,
    submission_notes TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    graded_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT exercise_submissions_material_id_fkey FOREIGN KEY (material_id) REFERENCES course_materials(id),
    CONSTRAINT exercise_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT exercise_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES users(id)
);

-- 18. FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY,
    user_id UUID,
    les_place_id UUID,
    created_at TIMESTAMPTZ,
    CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT favorites_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 19. FORUM POSTS
CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY,
    user_id UUID,
    title VARCHAR(255),
    content TEXT,
    category VARCHAR(100),
    tags TEXT[],
    views INTEGER,
    likes INTEGER,
    is_pinned BOOLEAN,
    is_locked BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT forum_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 20. FORUM COMMENTS
CREATE TABLE IF NOT EXISTS forum_comments (
    id UUID PRIMARY KEY,
    post_id UUID,
    user_id UUID,
    parent_id UUID,
    content TEXT,
    likes INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT forum_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES forum_posts(id),
    CONSTRAINT forum_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES forum_comments(id),
    CONSTRAINT forum_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 21. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY,
    user_id UUID,
    owner_id UUID,
    les_place_id UUID,
    specialization TEXT[],
    specializations TEXT[],
    certificates JSONB,
    experience_years INTEGER,
    education VARCHAR(255),
    qualification VARCHAR(255),
    bio TEXT,
    is_available BOOLEAN,
    is_profile_complete BOOLEAN,
    nik VARCHAR(50),
    province_id VARCHAR(50),
    province_name VARCHAR(100),
    city_id VARCHAR(50),
    city_name VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account VARCHAR(100),
    bank_holder VARCHAR(100),
    payment_type VARCHAR(50),
    ewallet_type VARCHAR(50),
    ewallet_number VARCHAR(50),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN,
    salary NUMERIC,
    CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT teachers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(id),
    CONSTRAINT teachers_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

ALTER TABLE attendance ADD CONSTRAINT attendance_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id);

-- 22. GRADES
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY,
    booking_id UUID,
    teacher_id UUID,
    subject VARCHAR(255),
    score NUMERIC,
    max_score NUMERIC,
    grade_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ,
    CONSTRAINT grades_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT grades_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 23. MATERIAL PROGRESS
CREATE TABLE IF NOT EXISTS material_progress (
    id UUID PRIMARY KEY,
    material_id UUID,
    student_id UUID,
    is_completed BOOLEAN,
    progress_percent INTEGER,
    last_accessed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    CONSTRAINT material_progress_material_id_fkey FOREIGN KEY (material_id) REFERENCES course_materials(id),
    CONSTRAINT material_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 24. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY,
    conversation_id UUID,
    sender_id UUID,
    receiver_id UUID,
    content TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id),
    CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- 25. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    data JSONB,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    link TEXT,
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 26. PAYMENT SCHEDULES
CREATE TABLE IF NOT EXISTS payment_schedules (
    id UUID PRIMARY KEY,
    les_place_id UUID,
    teacher_id UUID,
    salary_amount NUMERIC,
    payment_day INTEGER,
    payment_frequency VARCHAR(50),
    is_active BOOLEAN,
    last_payment_date DATE,
    next_payment_date DATE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT payment_schedules_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT payment_schedules_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 27. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    booking_id UUID,
    order_id VARCHAR(100),
    gross_amount NUMERIC,
    payment_type VARCHAR(50),
    transaction_status VARCHAR(50) CHECK (transaction_status IN ('pending', 'capture', 'settlement', 'deny', 'cancel', 'expire', 'refund')),
    payment_code VARCHAR(100),
    qr_code_url TEXT,
    va_number VARCHAR(100),
    bank VARCHAR(100),
    paid_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    midtrans_response JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- 28. WITHDRAWALS
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY,
    user_id UUID,
    les_place_id UUID,
    amount NUMERIC,
    fee NUMERIC,
    net_amount NUMERIC,
    bank_name VARCHAR(100),
    bank_account VARCHAR(100),
    bank_holder VARCHAR(100),
    status VARCHAR(50),
    requested_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    disbursement_id TEXT,
    disbursement_status TEXT,
    disbursement_response JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    requester_type VARCHAR(20) CHECK (requester_type IN ('owner', 'teacher')),
    CONSTRAINT withdrawals_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 29. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    les_place_id UUID,
    student_id UUID,
    booking_id UUID,
    program_id UUID,
    amount NUMERIC,
    platform_fee NUMERIC,
    net_amount NUMERIC,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    payment_date TIMESTAMPTZ,
    midtrans_order_id TEXT,
    midtrans_transaction_id TEXT,
    midtrans_payment_type TEXT,
    midtrans_status_code TEXT,
    snap_token TEXT,
    snap_redirect_url TEXT,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    hold_until TIMESTAMP,
    refund_deadline TIMESTAMP,
    lock_status VARCHAR(20),
    CONSTRAINT transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT transactions_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id),
    CONSTRAINT transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT transactions_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 30. PLATFORM REVENUE
CREATE TABLE IF NOT EXISTS platform_revenue (
    id UUID PRIMARY KEY,
    transaction_id UUID,
    withdrawal_id UUID,
    amount NUMERIC,
    source VARCHAR(50) CHECK (source IN ('platform_fee', 'withdrawal_fee', 'refund_fee', 'other')),
    description TEXT,
    les_place_id UUID,
    created_at TIMESTAMPTZ,
    CONSTRAINT platform_revenue_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    CONSTRAINT platform_revenue_withdrawal_id_fkey FOREIGN KEY (withdrawal_id) REFERENCES withdrawals(id),
    CONSTRAINT platform_revenue_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 31. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB,
    description TEXT,
    updated_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- 32. QUIZZES
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY,
    les_place_id UUID,
    program_id UUID,
    teacher_id UUID,
    title VARCHAR(255),
    description TEXT,
    quiz_type VARCHAR(50) CHECK (quiz_type IN ('quiz', 'practice', 'exam', 'assignment')),
    questions JSONB,
    duration_minutes INTEGER,
    time_limit_minutes INTEGER,
    passing_score INTEGER,
    max_attempts INTEGER,
    is_published BOOLEAN,
    is_active BOOLEAN,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT quizzes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT quizzes_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT quizzes_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- 33. QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY,
    quiz_id UUID,
    student_id UUID,
    started_at TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    answers JSONB,
    results JSONB,
    score INTEGER,
    is_passed BOOLEAN,
    passed BOOLEAN,
    created_at TIMESTAMPTZ,
    CONSTRAINT quiz_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

-- 34. REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY,
    transaction_id UUID,
    student_id UUID,
    les_place_id UUID,
    amount NUMERIC,
    reason TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
    admin_note TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT refunds_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT refunds_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    CONSTRAINT refunds_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 35. REPORTS
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY,
    reporter_id UUID,
    target_type VARCHAR(50) CHECK (target_type IN ('les_place', 'review', 'user', 'forum_post', 'forum_comment', 'message')),
    target_id UUID,
    reason VARCHAR(255),
    description TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    admin_note TEXT,
    admin_response TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES users(id),
    CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- 36. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY,
    student_id UUID,
    les_place_id UUID,
    booking_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    reply TEXT,
    replied_at TIMESTAMPTZ,
    is_visible BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_flagged BOOLEAN,
    flag_reason TEXT,
    flagged_at TIMESTAMPTZ,
    flagged_by UUID,
    CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT reviews_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT reviews_flagged_by_fkey FOREIGN KEY (flagged_by) REFERENCES auth.users(id)
);

-- 37. TEACHER INVITE CODES
CREATE TABLE IF NOT EXISTS teacher_invite_codes (
    id UUID PRIMARY KEY,
    owner_id UUID,
    les_place_id UUID,
    code VARCHAR(100),
    is_used BOOLEAN,
    used_by UUID,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT teacher_invite_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES teachers(id),
    CONSTRAINT teacher_invite_codes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(id),
    CONSTRAINT teacher_invite_codes_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 38. TEACHER PAYMENTS
CREATE TABLE IF NOT EXISTS teacher_payments (
    id UUID PRIMARY KEY,
    les_place_id UUID,
    teacher_id UUID,
    owner_id UUID,
    amount NUMERIC,
    payment_type VARCHAR(50),
    payment_period TEXT,
    payment_status VARCHAR(50),
    scheduled_date DATE,
    paid_date TIMESTAMPTZ,
    bank_name VARCHAR(100),
    bank_account VARCHAR(100),
    bank_holder VARCHAR(100),
    disbursement_id TEXT,
    disbursement_status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT teacher_payments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT teacher_payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id),
    CONSTRAINT teacher_payments_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 39. VOUCHERS
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY,
    les_place_id UUID,
    code VARCHAR(100),
    description TEXT,
    type VARCHAR(50) CHECK (type IN ('percent', 'fixed')),
    discount NUMERIC CHECK (discount > 0),
    max_discount NUMERIC,
    min_purchase NUMERIC,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    CONSTRAINT vouchers_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);
