-- =====================================================
-- MARILES DATABASE - COMPLETE SCHEMA (CONSOLIDATED)
-- 32 Tables with Complete RLS Policies
-- Run this ONCE on a fresh Supabase database
-- =====================================================

-- =====================================================
-- SECTION 1: EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SECTION 2: HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_les_place_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE les_places
    SET 
        rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE les_place_id = NEW.les_place_id AND is_visible = true),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE les_place_id = NEW.les_place_id AND is_visible = true)
    WHERE id = NEW.les_place_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (NEW.id, NEW.email, user_name, user_role)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = NOW();
    
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
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_teacher_for_pribadi_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.owner_type = 'pribadi' THEN
        INSERT INTO teachers (user_id, owner_id, is_available)
        VALUES (NEW.user_id, NEW.id, true)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 3: CORE TABLES (32 Tables)
-- =====================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id uuid NOT NULL,
    email character varying NOT NULL UNIQUE,
    name character varying NOT NULL,
    role character varying NOT NULL CHECK (role IN ('student', 'owner', 'teacher', 'admin')),
    phone character varying,
    avatar_url text,
    is_active boolean DEFAULT true,
    gender text,
    birth_date date,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 2. STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL UNIQUE,
    address text,
    date_of_birth date,
    school character varying,
    grade character varying,
    parent_name character varying,
    parent_phone character varying,
    nickname character varying,
    education_level character varying,
    curriculum character varying,
    major character varying,
    school_name character varying,
    province_id character varying,
    province_name character varying,
    city_id character varying,
    city_name character varying,
    postal_code character varying,
    gender character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT students_pkey PRIMARY KEY (id),
    CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. OWNERS
CREATE TABLE IF NOT EXISTS owners (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL UNIQUE,
    business_name character varying,
    business_address text,
    business_phone character varying,
    verification_status character varying DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at timestamp with time zone,
    documents jsonb DEFAULT '[]'::jsonb,
    bank_name character varying,
    bank_account character varying,
    bank_holder character varying,
    owner_type VARCHAR(20) DEFAULT 'umum' CHECK (owner_type IN ('pribadi', 'umum')),
    company_name VARCHAR,
    business_type VARCHAR,
    npwp VARCHAR(20),
    nik VARCHAR(16),
    province_id VARCHAR,
    province_name VARCHAR,
    city_id VARCHAR,
    city_name VARCHAR,
    payment_type VARCHAR(20) DEFAULT 'bank',
    ewallet_type VARCHAR(50),
    ewallet_number VARCHAR(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT owners_pkey PRIMARY KEY (id),
    CONSTRAINT owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL UNIQUE,
    icon character varying,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- 5. LES_PLACES
CREATE TABLE IF NOT EXISTS les_places (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    owner_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    address text NOT NULL,
    city character varying,
    province character varying,
    postal_code character varying,
    latitude numeric,
    longitude numeric,
    type character varying CHECK (type IN ('online', 'offline', 'hybrid')),
    photos jsonb DEFAULT '[]'::jsonb,
    facilities text[],
    rating numeric DEFAULT 0,
    total_reviews integer DEFAULT 0,
    total_students integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    is_private boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT les_places_pkey PRIMARY KEY (id),
    CONSTRAINT les_places_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(id)
);

-- 6. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL UNIQUE,
    owner_id uuid,
    les_place_id uuid,
    specialization text[],
    specializations TEXT[],
    certificates jsonb DEFAULT '[]'::jsonb,
    experience_years integer DEFAULT 0,
    education character varying,
    qualification VARCHAR,
    bio text,
    is_available boolean DEFAULT true,
    is_profile_complete BOOLEAN DEFAULT FALSE,
    nik VARCHAR(16),
    province_id VARCHAR,
    province_name VARCHAR,
    city_id VARCHAR,
    city_name VARCHAR,
    bank_name VARCHAR,
    bank_account VARCHAR,
    bank_holder VARCHAR,
    payment_type VARCHAR(20) DEFAULT 'bank',
    ewallet_type VARCHAR(50),
    ewallet_number VARCHAR(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT teachers_pkey PRIMARY KEY (id),
    CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT teachers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(id),
    CONSTRAINT teachers_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 7. PROGRAMS
CREATE TABLE IF NOT EXISTS programs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    les_place_id uuid NOT NULL,
    category_id uuid,
    name character varying NOT NULL,
    description text,
    subject character varying,
    price numeric NOT NULL,
    price_type character varying DEFAULT 'monthly' CHECK (price_type IN ('hourly', 'daily', 'weekly', 'monthly', 'package')),
    duration_months integer,
    sessions_per_week integer,
    session_duration_minutes integer DEFAULT 90,
    schedule jsonb,
    capacity integer DEFAULT 10,
    current_students integer DEFAULT 0,
    level character varying,
    is_active boolean DEFAULT true,
    total_modules INTEGER DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    total_exercises INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT programs_pkey PRIMARY KEY (id),
    CONSTRAINT programs_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT programs_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 8. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    student_id uuid NOT NULL,
    program_id uuid NOT NULL,
    les_place_id uuid NOT NULL,
    status character varying DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
    payment_status character varying DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed', 'settlement', 'capture')),
    start_date date,
    end_date date,
    notes text,
    booked_at timestamp with time zone DEFAULT now(),
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bookings_pkey PRIMARY KEY (id),
    CONSTRAINT bookings_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT bookings_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id),
    CONSTRAINT bookings_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 9. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    booking_id uuid NOT NULL,
    order_id character varying NOT NULL UNIQUE,
    gross_amount numeric NOT NULL,
    payment_type character varying,
    transaction_status character varying DEFAULT 'pending' CHECK (transaction_status IN ('pending', 'capture', 'settlement', 'deny', 'cancel', 'expire', 'refund')),
    payment_code character varying,
    qr_code_url text,
    va_number character varying,
    bank character varying,
    paid_at timestamp with time zone,
    expired_at timestamp with time zone,
    midtrans_response jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- 10. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    student_id uuid NOT NULL,
    les_place_id uuid NOT NULL,
    booking_id uuid,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    reply text,
    replied_at timestamp with time zone,
    is_visible boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_pkey PRIMARY KEY (id),
    CONSTRAINT reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id),
    CONSTRAINT reviews_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- 11. FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    les_place_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT favorites_pkey PRIMARY KEY (id),
    CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT favorites_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    type character varying,
    data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 13. CONVERSATIONS (Consolidated chat)
CREATE TABLE IF NOT EXISTS conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    student_id uuid,
    teacher_id uuid,
    les_place_id uuid,
    last_message text,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conversations_pkey PRIMARY KEY (id),
    CONSTRAINT conversations_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT conversations_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT conversations_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 14. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- 15. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    booking_id uuid NOT NULL,
    teacher_id uuid,
    session_date date NOT NULL,
    status character varying DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attendance_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT attendance_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 16. GRADES
CREATE TABLE IF NOT EXISTS grades (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    booking_id uuid NOT NULL,
    teacher_id uuid,
    subject character varying,
    score numeric,
    max_score numeric DEFAULT 100,
    grade_type character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT grades_pkey PRIMARY KEY (id),
    CONSTRAINT grades_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT grades_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 17. FORUM_POSTS
CREATE TABLE IF NOT EXISTS forum_posts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    title character varying NOT NULL,
    content text NOT NULL,
    category character varying,
    tags text[],
    views integer DEFAULT 0,
    likes integer DEFAULT 0,
    is_pinned boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT forum_posts_pkey PRIMARY KEY (id),
    CONSTRAINT forum_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 18. FORUM_COMMENTS
CREATE TABLE IF NOT EXISTS forum_comments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    likes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT forum_comments_pkey PRIMARY KEY (id),
    CONSTRAINT forum_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES forum_posts(id),
    CONSTRAINT forum_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT forum_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES forum_comments(id)
);

-- 19. COURSE_MATERIALS
CREATE TABLE IF NOT EXISTS course_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('module', 'video', 'exercise')),
    exercise_type VARCHAR(30),
    deadline TIMESTAMPTZ,
    content TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    duration_minutes INTEGER,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. MATERIAL_PROGRESS
CREATE TABLE IF NOT EXISTS material_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    progress_percent INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(material_id, student_id)
);

-- 21. QUIZZES (Consolidated assessments)
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    les_place_id UUID REFERENCES les_places(id) ON DELETE CASCADE,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    quiz_type VARCHAR(30) DEFAULT 'quiz' CHECK (quiz_type IN ('quiz', 'practice', 'exam', 'assignment')),
    questions JSONB NOT NULL DEFAULT '[]',
    duration_minutes INTEGER DEFAULT 30,
    time_limit_minutes INTEGER,
    passing_score INTEGER DEFAULT 70,
    max_attempts INTEGER DEFAULT 3,
    is_published BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. QUIZ_ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    answers JSONB DEFAULT '{}',
    results JSONB,
    score INTEGER,
    is_passed BOOLEAN,
    passed BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    les_place_id uuid,
    student_id uuid,
    booking_id uuid,
    program_id uuid,
    amount numeric NOT NULL,
    platform_fee numeric DEFAULT 0,
    net_amount numeric NOT NULL,
    payment_method text,
    payment_status text DEFAULT 'pending',
    payment_date timestamp with time zone,
    midtrans_order_id text UNIQUE,
    midtrans_transaction_id text,
    midtrans_payment_type text,
    midtrans_status_code text,
    snap_token text,
    snap_redirect_url text,
    description text,
    reference_id text UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT transactions_student_id_fkey FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CONSTRAINT transactions_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- 24. TEACHER_PAYMENTS
CREATE TABLE IF NOT EXISTS teacher_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    les_place_id uuid,
    teacher_id uuid,
    owner_id uuid,
    amount numeric NOT NULL,
    payment_type text DEFAULT 'salary',
    payment_period text,
    payment_status text DEFAULT 'pending',
    scheduled_date date,
    paid_date timestamp with time zone,
    bank_name text,
    bank_account text,
    bank_holder text,
    disbursement_id text,
    disbursement_status text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT teacher_payments_pkey PRIMARY KEY (id),
    CONSTRAINT teacher_payments_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT teacher_payments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id),
    CONSTRAINT teacher_payments_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- 25. PAYMENT_SCHEDULES
CREATE TABLE IF NOT EXISTS payment_schedules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    les_place_id uuid,
    teacher_id uuid,
    salary_amount numeric NOT NULL,
    payment_day integer DEFAULT 1,
    payment_frequency text DEFAULT 'monthly',
    is_active boolean DEFAULT true,
    last_payment_date date,
    next_payment_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_schedules_pkey PRIMARY KEY (id),
    CONSTRAINT payment_schedules_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id),
    CONSTRAINT payment_schedules_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- 26. WITHDRAWALS
CREATE TABLE IF NOT EXISTS withdrawals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    les_place_id uuid,
    amount numeric NOT NULL,
    fee numeric DEFAULT 0,
    net_amount numeric NOT NULL,
    bank_name text NOT NULL,
    bank_account text NOT NULL,
    bank_holder text NOT NULL,
    status text DEFAULT 'pending',
    requested_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    completed_at timestamp with time zone,
    disbursement_id text,
    disbursement_status text,
    disbursement_response jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT withdrawals_pkey PRIMARY KEY (id),
    CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT withdrawals_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 27. BALANCES
CREATE TABLE IF NOT EXISTS balances (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE,
    les_place_id uuid,
    total_balance numeric DEFAULT 0,
    available_balance numeric DEFAULT 0,
    pending_balance numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT balances_pkey PRIMARY KEY (id),
    CONSTRAINT balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT balances_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 28. REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    les_place_id UUID REFERENCES les_places(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
    admin_note TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    replied_at TIMESTAMPTZ,
    reply_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. REPORTS
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('les_place', 'review', 'user')),
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    admin_note TEXT,
    admin_response TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 31. TEACHER_INVITE_CODES
CREATE TABLE IF NOT EXISTS teacher_invite_codes (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    les_place_id UUID,
    code VARCHAR(6) NOT NULL UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES teachers(id),
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT teacher_invite_codes_pkey PRIMARY KEY (id),
    CONSTRAINT teacher_invite_codes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
    CONSTRAINT teacher_invite_codes_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE SET NULL
);

-- 32. BANNERS
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    image_url TEXT NOT NULL,
    link VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 33. VOUCHERS
CREATE TABLE IF NOT EXISTS vouchers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    les_place_id uuid REFERENCES les_places(id),
    code text NOT NULL UNIQUE,
    description text,
    type text NOT NULL CHECK (type IN ('percent', 'fixed')),
    discount numeric NOT NULL CHECK (discount > 0),
    max_discount numeric,
    min_purchase numeric DEFAULT 0,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    usage_limit int,
    usage_count int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- SECTION 4: INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_province ON students(province_id);
CREATE INDEX IF NOT EXISTS idx_students_city ON students(city_id);
CREATE INDEX IF NOT EXISTS idx_owners_user ON owners(user_id);
CREATE INDEX IF NOT EXISTS idx_owners_type ON owners(owner_type);
CREATE INDEX IF NOT EXISTS idx_owners_province ON owners(province_id);
CREATE INDEX IF NOT EXISTS idx_owners_city ON owners(city_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_les_place ON teachers(les_place_id);
CREATE INDEX IF NOT EXISTS idx_teachers_province ON teachers(province_id);
CREATE INDEX IF NOT EXISTS idx_teachers_city ON teachers(city_id);
CREATE INDEX IF NOT EXISTS idx_teachers_profile_complete ON teachers(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_les_places_owner ON les_places(owner_id);
CREATE INDEX IF NOT EXISTS idx_les_places_city ON les_places(city);
CREATE INDEX IF NOT EXISTS idx_les_places_type ON les_places(type);
CREATE INDEX IF NOT EXISTS idx_les_places_rating ON les_places(rating DESC);
CREATE INDEX IF NOT EXISTS idx_programs_les_place ON programs(les_place_id);
CREATE INDEX IF NOT EXISTS idx_programs_category ON programs(category_id);
CREATE INDEX IF NOT EXISTS idx_programs_level ON programs(level);
CREATE INDEX IF NOT EXISTS idx_programs_price ON programs(price);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_program ON bookings(program_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(transaction_status);
CREATE INDEX IF NOT EXISTS idx_reviews_les_place ON reviews(les_place_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_program ON course_materials(program_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_type ON course_materials(type);
CREATE INDEX IF NOT EXISTS idx_material_progress_student ON material_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_material_progress_material ON material_progress(material_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_program_id ON quizzes(program_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON quizzes(is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_les_place ON transactions(les_place_id);
CREATE INDEX IF NOT EXISTS idx_transactions_student ON transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_midtrans_order ON transactions(midtrans_order_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_teacher ON teacher_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_les_place ON teacher_payments(les_place_id);
CREATE INDEX IF NOT EXISTS idx_teacher_payments_status ON teacher_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_teacher ON payment_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_les_place ON payment_schedules(les_place_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_student_id ON refunds(student_id);
CREATE INDEX IF NOT EXISTS idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_teacher_invite_codes_owner ON teacher_invite_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invite_codes_code ON teacher_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_banners_active_order ON banners(is_active, sort_order);

-- =====================================================
-- SECTION 5: TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
DROP TRIGGER IF EXISTS update_owners_updated_at ON owners;
DROP TRIGGER IF EXISTS update_teachers_updated_at ON teachers;
DROP TRIGGER IF EXISTS update_les_places_updated_at ON les_places;
DROP TRIGGER IF EXISTS update_programs_updated_at ON programs;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_rating_on_review ON reviews;
DROP TRIGGER IF EXISTS update_course_materials_updated_at ON course_materials;
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
DROP TRIGGER IF EXISTS on_pribadi_owner_created ON owners;
DROP TRIGGER IF EXISTS on_owner_type_changed ON owners;
DROP TRIGGER IF EXISTS update_teacher_invite_codes_updated_at ON teacher_invite_codes;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_les_places_updated_at BEFORE UPDATE ON les_places FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_rating_on_review AFTER INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_les_place_rating();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER update_course_materials_updated_at BEFORE UPDATE ON course_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER on_pribadi_owner_created AFTER INSERT ON owners FOR EACH ROW WHEN (NEW.owner_type = 'pribadi') EXECUTE FUNCTION create_teacher_for_pribadi_owner();
CREATE TRIGGER on_owner_type_changed AFTER UPDATE OF owner_type ON owners FOR EACH ROW WHEN (NEW.owner_type = 'pribadi' AND OLD.owner_type != 'pribadi') EXECUTE FUNCTION create_teacher_for_pribadi_owner();
CREATE TRIGGER update_teacher_invite_codes_updated_at BEFORE UPDATE ON teacher_invite_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- SECTION 6: ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE les_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 7: RLS POLICIES
-- =====================================================

-- USERS POLICIES
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Owners can view student profiles" ON users;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON users;
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Owners can view student profiles" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()) AND role = 'student');
CREATE POLICY "Teachers can view student profiles" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid()) AND role = 'student');

-- STUDENTS POLICIES
DROP POLICY IF EXISTS "Students can insert own profile" ON students;
DROP POLICY IF EXISTS "Students can view own profile" ON students;
DROP POLICY IF EXISTS "Students can update own profile" ON students;
DROP POLICY IF EXISTS "Owners can view student info" ON students;
DROP POLICY IF EXISTS "Teachers can view student info" ON students;
CREATE POLICY "Students can insert own profile" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students can view own profile" ON students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Students can update own profile" ON students FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can view student info" ON students FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));
CREATE POLICY "Teachers can view student info" ON students FOR SELECT USING (EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid()));

-- OWNERS POLICIES
DROP POLICY IF EXISTS "Owners can insert own profile" ON owners;
DROP POLICY IF EXISTS "Owners can view own profile" ON owners;
DROP POLICY IF EXISTS "Owners can update own profile" ON owners;
CREATE POLICY "Owners can insert own profile" ON owners FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view own profile" ON owners FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can update own profile" ON owners FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TEACHERS POLICIES
DROP POLICY IF EXISTS "Teachers can insert own profile" ON teachers;
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;
DROP POLICY IF EXISTS "Teachers can update own profile" ON teachers;
DROP POLICY IF EXISTS "Owners can view their teachers" ON teachers;
CREATE POLICY "Teachers can insert own profile" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Teachers can view own profile" ON teachers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Teachers can update own profile" ON teachers FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can view their teachers" ON teachers FOR SELECT USING (les_place_id IN (SELECT id FROM les_places WHERE owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid())));

-- CATEGORIES POLICIES
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (is_active = true);

-- LES_PLACES POLICIES
DROP POLICY IF EXISTS "Public can view les places" ON les_places;
DROP POLICY IF EXISTS "Owners can manage own les places" ON les_places;
DROP POLICY IF EXISTS "Teachers can view their les place" ON les_places;
CREATE POLICY "Public can view les places" ON les_places FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage own les places" ON les_places FOR ALL USING (owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid()));
CREATE POLICY "Teachers can view their les place" ON les_places FOR SELECT USING (id IN (SELECT les_place_id FROM teachers WHERE user_id = auth.uid()));

-- PROGRAMS POLICIES
DROP POLICY IF EXISTS "Public can view programs" ON programs;
DROP POLICY IF EXISTS "Owners can manage own programs" ON programs;
CREATE POLICY "Public can view programs" ON programs FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage own programs" ON programs FOR ALL USING (les_place_id IN (SELECT lp.id FROM les_places lp JOIN owners o ON lp.owner_id = o.id WHERE o.user_id = auth.uid()));

-- BOOKINGS POLICIES
DROP POLICY IF EXISTS "Students can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Students can create bookings" ON bookings;
DROP POLICY IF EXISTS "Owners can view bookings" ON bookings;
DROP POLICY IF EXISTS "Teachers can view bookings" ON bookings;
CREATE POLICY "Students can view own bookings" ON bookings FOR SELECT USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Students can create bookings" ON bookings FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Owners can view bookings" ON bookings FOR SELECT USING (program_id IN (SELECT p.id FROM programs p JOIN les_places lp ON p.les_place_id = lp.id JOIN owners o ON lp.owner_id = o.id WHERE o.user_id = auth.uid()));
CREATE POLICY "Teachers can view bookings" ON bookings FOR SELECT USING (program_id IN (SELECT p.id FROM programs p JOIN les_places lp ON p.les_place_id = lp.id JOIN teachers t ON t.les_place_id = lp.id WHERE t.user_id = auth.uid()));

-- PAYMENTS POLICIES
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (booking_id IN (SELECT id FROM bookings WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())));

-- REVIEWS POLICIES
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
DROP POLICY IF EXISTS "Students can create reviews" ON reviews;
CREATE POLICY "Public can view reviews" ON reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "Students can create reviews" ON reviews FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));

-- FAVORITES POLICIES
DROP POLICY IF EXISTS "Users can manage favorites" ON favorites;
CREATE POLICY "Users can manage favorites" ON favorites FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON notifications;
CREATE POLICY "Users can view notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- CONVERSATIONS POLICIES
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = student_id OR auth.uid() = teacher_id);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = student_id OR auth.uid() = teacher_id);

-- MESSAGES POLICIES
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ATTENDANCE POLICIES
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
CREATE POLICY "Teachers can manage attendance" ON attendance FOR ALL USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Students can view own attendance" ON attendance FOR SELECT USING (booking_id IN (SELECT id FROM bookings WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())));

-- GRADES POLICIES
DROP POLICY IF EXISTS "Teachers can manage grades" ON grades;
DROP POLICY IF EXISTS "Students can view own grades" ON grades;
CREATE POLICY "Teachers can manage grades" ON grades FOR ALL USING (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()));
CREATE POLICY "Students can view own grades" ON grades FOR SELECT USING (booking_id IN (SELECT id FROM bookings WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())));

-- FORUM POLICIES
DROP POLICY IF EXISTS "Anyone can view forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can create forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can edit own posts" ON forum_posts;
DROP POLICY IF EXISTS "Anyone can view forum comments" ON forum_comments;
DROP POLICY IF EXISTS "Users can create comments" ON forum_comments;
CREATE POLICY "Anyone can view forum posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create forum posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit own posts" ON forum_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view forum comments" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON forum_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- COURSE_MATERIALS POLICIES
DROP POLICY IF EXISTS "Anyone can view active materials" ON course_materials;
DROP POLICY IF EXISTS "Owners can manage their materials" ON course_materials;
CREATE POLICY "Anyone can view active materials" ON course_materials FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage their materials" ON course_materials FOR ALL USING (EXISTS (SELECT 1 FROM programs p JOIN les_places lp ON p.les_place_id = lp.id JOIN owners o ON lp.owner_id = o.id WHERE p.id = course_materials.program_id AND o.user_id = auth.uid()));

-- MATERIAL_PROGRESS POLICIES
DROP POLICY IF EXISTS "Students can manage own progress" ON material_progress;
DROP POLICY IF EXISTS "Owners can view material progress" ON material_progress;
CREATE POLICY "Students can manage own progress" ON material_progress FOR ALL USING (EXISTS (SELECT 1 FROM students s WHERE s.id = material_progress.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Owners can view material progress" ON material_progress FOR SELECT USING (EXISTS (SELECT 1 FROM course_materials cm JOIN programs p ON cm.program_id = p.id JOIN les_places lp ON p.les_place_id = lp.id JOIN owners o ON lp.owner_id = o.id WHERE cm.id = material_progress.material_id AND o.user_id = auth.uid()));

-- QUIZZES POLICIES
DROP POLICY IF EXISTS "Teachers can manage own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Students can view published quizzes" ON quizzes;
CREATE POLICY "Teachers can manage own quizzes" ON quizzes FOR ALL USING (auth.uid() = teacher_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can view published quizzes" ON quizzes FOR SELECT USING (is_published = true OR auth.uid() = teacher_id);

-- QUIZ_ATTEMPTS POLICIES
DROP POLICY IF EXISTS "Students can manage own attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Teachers can view quiz attempts" ON quiz_attempts;
CREATE POLICY "Students can manage own attempts" ON quiz_attempts FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view quiz attempts" ON quiz_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM quizzes WHERE id = quiz_id AND teacher_id = auth.uid()));

-- TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "Owner can view transactions" ON transactions;
DROP POLICY IF EXISTS "Student can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Student can create transactions" ON transactions;
DROP POLICY IF EXISTS "Student can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role full access" ON transactions;
CREATE POLICY "Owner can view transactions" ON transactions FOR SELECT USING (les_place_id IN (SELECT id FROM les_places WHERE owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid())));
CREATE POLICY "Student can view own transactions" ON transactions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Student can create transactions" ON transactions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Student can update own transactions" ON transactions FOR UPDATE USING (student_id = auth.uid() AND payment_status = 'pending');
CREATE POLICY "Service role full access" ON transactions FOR ALL USING (auth.role() = 'service_role');

-- TEACHER_PAYMENTS POLICIES
DROP POLICY IF EXISTS "Teacher can view own payments" ON teacher_payments;
DROP POLICY IF EXISTS "Owner can manage teacher payments" ON teacher_payments;
CREATE POLICY "Teacher can view own payments" ON teacher_payments FOR SELECT USING (teacher_id = auth.uid());
CREATE POLICY "Owner can manage teacher payments" ON teacher_payments FOR ALL USING (les_place_id IN (SELECT id FROM les_places WHERE owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid())));

-- PAYMENT_SCHEDULES POLICIES
DROP POLICY IF EXISTS "Owner can manage schedules" ON payment_schedules;
CREATE POLICY "Owner can manage schedules" ON payment_schedules FOR ALL USING (les_place_id IN (SELECT id FROM les_places WHERE owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid())));

-- WITHDRAWALS POLICIES
DROP POLICY IF EXISTS "User can view own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "User can create own withdrawals" ON withdrawals;
CREATE POLICY "User can view own withdrawals" ON withdrawals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "User can create own withdrawals" ON withdrawals FOR INSERT WITH CHECK (user_id = auth.uid());

-- BALANCES POLICIES
DROP POLICY IF EXISTS "User can view own balance" ON balances;
CREATE POLICY "User can view own balance" ON balances FOR SELECT USING (user_id = auth.uid());

-- REFUNDS POLICIES
DROP POLICY IF EXISTS "Students can view own refunds" ON refunds;
DROP POLICY IF EXISTS "Students can create refund requests" ON refunds;
DROP POLICY IF EXISTS "Admins can view all refunds" ON refunds;
DROP POLICY IF EXISTS "Admins can update refunds" ON refunds;
CREATE POLICY "Students can view own refunds" ON refunds FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can create refund requests" ON refunds FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins can view all refunds" ON refunds FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update refunds" ON refunds FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- CONTACTS POLICIES
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can update contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON contacts;
CREATE POLICY "Anyone can submit contact form" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all contacts" ON contacts FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update contacts" ON contacts FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete contacts" ON contacts FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- REPORTS POLICIES
DROP POLICY IF EXISTS "Reporters can view own reports" ON reports;
DROP POLICY IF EXISTS "Reporters can create reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Reporters can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Reporters can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all reports" ON reports FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update reports" ON reports FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- TEACHER_INVITE_CODES POLICIES
DROP POLICY IF EXISTS "Owners can manage own invite codes" ON teacher_invite_codes;
DROP POLICY IF EXISTS "Public can validate invite codes" ON teacher_invite_codes;
CREATE POLICY "Owners can manage own invite codes" ON teacher_invite_codes FOR ALL USING (owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid()));
CREATE POLICY "Public can validate invite codes" ON teacher_invite_codes FOR SELECT USING (is_used = FALSE AND (expires_at IS NULL OR expires_at > NOW()));

-- BANNERS POLICIES
DROP POLICY IF EXISTS "Anyone can read active banners" ON banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON banners;
CREATE POLICY "Anyone can read active banners" ON banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage banners" ON banners FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- VOUCHERS POLICIES
DROP POLICY IF EXISTS "Admins can manage all vouchers" ON vouchers;
DROP POLICY IF EXISTS "Owners can manage their vouchers" ON vouchers;
DROP POLICY IF EXISTS "Users can view active vouchers" ON vouchers;
CREATE POLICY "Admins can manage all vouchers" ON vouchers FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Owners can manage their vouchers" ON vouchers FOR ALL USING (EXISTS (SELECT 1 FROM les_places WHERE les_places.id = vouchers.les_place_id AND les_places.owner_id = (SELECT id FROM owners WHERE user_id = auth.uid())));
CREATE POLICY "Users can view active vouchers" ON vouchers FOR SELECT USING (is_active = true AND now() BETWEEN start_date AND end_date AND (usage_limit IS NULL OR usage_count < usage_limit));

-- =====================================================
-- SECTION 8: HELPER FUNCTIONS FOR INVITE CODES
-- =====================================================

CREATE OR REPLACE FUNCTION generate_teacher_invite_code(p_owner_id UUID, p_les_place_id UUID DEFAULT NULL)
RETURNS VARCHAR(6) AS $$
DECLARE
    new_code VARCHAR(6);
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
        SELECT EXISTS(SELECT 1 FROM teacher_invite_codes WHERE code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    INSERT INTO teacher_invite_codes (owner_id, les_place_id, code, expires_at)
    VALUES (p_owner_id, p_les_place_id, new_code, NOW() + INTERVAL '7 days');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION use_teacher_invite_code(p_code VARCHAR(6), p_teacher_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    invite_record teacher_invite_codes%ROWTYPE;
BEGIN
    SELECT * INTO invite_record
    FROM teacher_invite_codes
    WHERE code = p_code 
      AND is_used = FALSE 
      AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    UPDATE teacher_invite_codes
    SET is_used = TRUE,
        used_by = p_teacher_id,
        used_at = NOW(),
        updated_at = NOW()
    WHERE id = invite_record.id;
    
    UPDATE teachers
    SET owner_id = invite_record.owner_id,
        les_place_id = invite_record.les_place_id,
        updated_at = NOW()
    WHERE id = p_teacher_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 9: VIEWS
-- =====================================================

CREATE OR REPLACE VIEW owner_financial_summary AS
SELECT 
    lp.owner_id,
    lp.id as les_place_id,
    lp.name as les_place_name,
    lp.is_private,
    COALESCE(SUM(CASE WHEN t.payment_status = 'completed' THEN t.net_amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.payment_status = 'completed' 
        AND DATE_TRUNC('month', t.payment_date) = DATE_TRUNC('month', CURRENT_DATE) 
        THEN t.net_amount ELSE 0 END), 0) as monthly_income,
    COALESCE(SUM(CASE WHEN t.payment_status = 'pending' THEN t.net_amount ELSE 0 END), 0) as pending_income,
    COALESCE((SELECT SUM(amount) FROM teacher_payments tp 
        WHERE tp.les_place_id = lp.id AND tp.payment_status = 'completed'), 0) as total_paid_to_teachers,
    COALESCE((SELECT SUM(amount) FROM teacher_payments tp 
        WHERE tp.les_place_id = lp.id AND tp.payment_status = 'pending'), 0) as pending_teacher_payments
FROM les_places lp
LEFT JOIN transactions t ON t.les_place_id = lp.id
GROUP BY lp.owner_id, lp.id, lp.name, lp.is_private;

CREATE OR REPLACE VIEW teacher_financial_summary AS
SELECT 
    tc.user_id as teacher_id,
    tc.les_place_id,
    lp.name as les_place_name,
    COALESCE(SUM(CASE WHEN tp.payment_status = 'completed' THEN tp.amount ELSE 0 END), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN tp.payment_status = 'completed' 
        AND DATE_TRUNC('month', tp.paid_date) = DATE_TRUNC('month', CURRENT_DATE) 
        THEN tp.amount ELSE 0 END), 0) as monthly_earnings,
    COALESCE(SUM(CASE WHEN tp.payment_status = 'pending' THEN tp.amount ELSE 0 END), 0) as pending_earnings,
    COALESCE(b.available_balance, 0) as withdrawable_balance
FROM teachers tc
LEFT JOIN les_places lp ON tc.les_place_id = lp.id
LEFT JOIN teacher_payments tp ON tp.teacher_id = tc.user_id AND tp.les_place_id = tc.les_place_id
LEFT JOIN balances b ON b.user_id = tc.user_id
GROUP BY tc.user_id, tc.les_place_id, lp.name, b.available_balance;

-- =====================================================
-- SECTION 10: SEED DATA - CATEGORIES
-- =====================================================
INSERT INTO categories (name, icon, description, is_active) VALUES
-- SD (Sekolah Dasar)
('Tematik SD', 'book', 'Pembelajaran tematik untuk SD', true),
('Matematika SD', 'calculator', 'Matematika tingkat SD', true),
('Bahasa Indonesia SD', 'book-open', 'Bahasa Indonesia tingkat SD', true),
('Bahasa Inggris SD', 'globe', 'Bahasa Inggris dasar untuk SD', true),
('IPA SD', 'leaf', 'Ilmu Pengetahuan Alam SD', true),
('IPS SD', 'map-pin', 'Ilmu Pengetahuan Sosial SD', true),
('Calistung', 'edit-2', 'Baca, Tulis, Hitung untuk SD awal', true),
-- SMP (Sekolah Menengah Pertama)
('Matematika SMP', 'calculator', 'Matematika tingkat SMP', true),
('Bahasa Indonesia SMP', 'book-open', 'Bahasa Indonesia tingkat SMP', true),
('Bahasa Inggris SMP', 'globe', 'Bahasa Inggris tingkat SMP', true),
('IPA SMP', 'microscope', 'Ilmu Pengetahuan Alam SMP', true),
('IPS SMP', 'map-pin', 'Ilmu Pengetahuan Sosial SMP', true),
-- SMA/SMK (Sekolah Menengah Atas/Kejuruan)
('Matematika SMA', 'calculator', 'Matematika tingkat SMA/SMK', true),
('Bahasa Indonesia SMA', 'book-open', 'Bahasa Indonesia tingkat SMA', true),
('Bahasa Inggris SMA', 'globe', 'Bahasa Inggris tingkat SMA', true),
('Fisika', 'zap', 'Fisika SMA dan persiapan kuliah', true),
('Kimia', 'flask', 'Kimia SMA dan persiapan kuliah', true),
('Biologi', 'leaf', 'Biologi SMA dan persiapan kuliah', true),
('Ekonomi', 'trending-up', 'Ekonomi dan Akuntansi SMA', true),
('Geografi', 'map', 'Geografi SMA', true),
('Sejarah', 'clock', 'Sejarah Indonesia dan Dunia', true),
('Sosiologi', 'users', 'Sosiologi SMA', true),
('PKN', 'flag', 'Pendidikan Kewarganegaraan', true),
-- Persiapan Ujian
('UTBK/SNBT', 'graduation-cap', 'Persiapan masuk PTN', true),
('AKM', 'file-text', 'Asesmen Kompetensi Minimum', true),
('OSN', 'award', 'Olimpiade Sains Nasional', true),
-- Bahasa Asing (Akademis)
('TOEFL', 'file-text', 'Persiapan tes TOEFL', true),
('IELTS', 'award', 'Persiapan tes IELTS', true),
-- Kuliah / Perguruan Tinggi
('Kalkulus', 'calculator', 'Kalkulus untuk mahasiswa', true),
('Statistika', 'bar-chart', 'Statistika dan probabilitas', true),
('Fisika Dasar', 'zap', 'Fisika tingkat universitas', true),
('Kimia Dasar', 'flask', 'Kimia tingkat universitas', true),
('Biologi Umum', 'leaf', 'Biologi tingkat universitas', true),
('Akuntansi', 'book', 'Akuntansi dasar dan lanjutan', true),
('Manajemen', 'briefcase', 'Ilmu manajemen', true),
('Bahasa Inggris Akademik', 'globe', 'English for Academic Purposes', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SECTION 11: GRANTS
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.banners TO anon;

-- =====================================================
-- END OF COMPLETE SCHEMA
-- Total Tables: 33
-- Run this on a fresh Supabase database
-- =====================================================

-- =====================================================
-- SECTION 12: STORAGE BUCKET INSTRUCTIONS
-- =====================================================
-- IMPORTANT: You must create the storage bucket manually in Supabase Dashboard
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: "les-photos"
-- 4. Check "Public bucket"
-- 5. Click "Create bucket"
-- 6. Add Policies:
--    - SELECT: Enable for Public (All Users)
--    - INSERT: Enable for Authenticated Users
--    - UPDATE: Enable for Authenticated Users
--    - DELETE: Enable for Authenticated Users
