-- EXHAUSTIVE Migration to fix 409 Conflict on User Deletion in Bahasa Indonesia Context
-- Ensures all Foreign Keys pointing to 'users' AND indirect dependencies have ON DELETE CASCADE
-- Updated to include les_places, programs, bookings, etc.

BEGIN;

-- ===========================
-- 0. PUBLIC.USERS LINK (CRITICAL)
-- ===========================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ===========================
-- 1. DIRECT USER RELATIONS
-- ===========================

-- STUDENTS
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_user_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- TEACHERS
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_user_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- OWNERS
ALTER TABLE owners DROP CONSTRAINT IF EXISTS owners_user_id_fkey;
ALTER TABLE owners ADD CONSTRAINT owners_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- FAVORITES
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- NOTIFICATIONS
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


-- ===========================
-- 2. INDIRECT DEPENDENCIES (L2)
-- Chains like: User -> Owner -> LesPlace -> Program -> Booking
-- ===========================

-- 2.1 LES_PLACES (References owners)
ALTER TABLE les_places DROP CONSTRAINT IF EXISTS les_places_owner_id_fkey;
ALTER TABLE les_places ADD CONSTRAINT les_places_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE;

-- 2.2 PROGRAMS (References les_places)
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_les_place_id_fkey;
ALTER TABLE programs ADD CONSTRAINT programs_les_place_id_fkey
    FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 2.3 BOOKINGS (References students, programs, les_places)
-- Critical: Deleting a student must delete their bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_student_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Also if program/place is deleted, delete bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_program_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_les_place_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_les_place_id_fkey
    FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 2.4 REVIEWS (References students, les_places)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_student_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_les_place_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_les_place_id_fkey
    FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 2.5 TEACHER_ASSIGNMENTS / CLASSES (If exist, usually link Teacher <-> LesPlace)
-- Assuming teachers table links to owner_id / les_place_id
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_owner_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE; -- Or Set Null? Cascade is cleaner for full wipe.

ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_les_place_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_les_place_id_fkey
    FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE SET NULL; -- Keep teacher profile but detach? Or Cascade? Let's SET NULL to be safe for teacher account preservation if place closes.


-- ===========================
-- 3. FINANCIAL & OTHER
-- ===========================

-- TRANSACTIONS
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_student_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL; -- Keep financial records

-- WITHDRAWALS
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL; -- Keep financial records

-- BALANCES
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_fkey;
ALTER TABLE balances ADD CONSTRAINT balances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- MESSAGES
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- CONVERSATIONS
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_student_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_teacher_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- FORUM
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey;
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_comments DROP CONSTRAINT IF EXISTS forum_comments_user_id_fkey;
ALTER TABLE forum_comments ADD CONSTRAINT forum_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
