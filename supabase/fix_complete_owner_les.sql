-- =====================================================
-- FIX OWNER LES MANAGEMENT - COMPLETE SOLUTION
-- Jalankan SEMUA query ini di Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: FIX ALL RLS POLICIES
-- =====================================================

-- Drop semua policy lama yang mungkin masih ada
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Enable RLS on all tables (pastikan aktif)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE les_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Buat policy SIMPLE untuk SEMUA operasi
-- users
CREATE POLICY "users_all" ON users FOR ALL USING (true) WITH CHECK (true);

-- students
CREATE POLICY "students_all" ON students FOR ALL USING (true) WITH CHECK (true);

-- owners
CREATE POLICY "owners_all" ON owners FOR ALL USING (true) WITH CHECK (true);

-- teachers
CREATE POLICY "teachers_all" ON teachers FOR ALL USING (true) WITH CHECK (true);

-- categories
CREATE POLICY "categories_all" ON categories FOR ALL USING (true) WITH CHECK (true);

-- les_places
CREATE POLICY "les_places_all" ON les_places FOR ALL USING (true) WITH CHECK (true);

-- programs
CREATE POLICY "programs_all" ON programs FOR ALL USING (true) WITH CHECK (true);

-- bookings
CREATE POLICY "bookings_all" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_all" ON payments FOR ALL USING (true) WITH CHECK (true);

-- reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_all" ON reviews FOR ALL USING (true) WITH CHECK (true);

-- favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_all" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_all" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_all" ON conversations FOR ALL USING (true) WITH CHECK (true);

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_all" ON messages FOR ALL USING (true) WITH CHECK (true);

-- attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_all" ON attendance FOR ALL USING (true) WITH CHECK (true);

-- grades
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grades_all" ON grades FOR ALL USING (true) WITH CHECK (true);

-- forum_posts
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_posts_all" ON forum_posts FOR ALL USING (true) WITH CHECK (true);

-- forum_comments
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_comments_all" ON forum_comments FOR ALL USING (true) WITH CHECK (true);

-- course_materials
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_materials_all" ON course_materials FOR ALL USING (true) WITH CHECK (true);

-- material_progress
ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_progress_all" ON material_progress FOR ALL USING (true) WITH CHECK (true);

-- quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_all" ON quizzes FOR ALL USING (true) WITH CHECK (true);

-- quiz_attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_attempts_all" ON quiz_attempts FOR ALL USING (true) WITH CHECK (true);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_all" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- teacher_payments
ALTER TABLE teacher_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_payments_all" ON teacher_payments FOR ALL USING (true) WITH CHECK (true);

-- payment_schedules
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_schedules_all" ON payment_schedules FOR ALL USING (true) WITH CHECK (true);

-- withdrawals
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals_all" ON withdrawals FOR ALL USING (true) WITH CHECK (true);

-- balances
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balances_all" ON balances FOR ALL USING (true) WITH CHECK (true);

-- refunds
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refunds_all" ON refunds FOR ALL USING (true) WITH CHECK (true);

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_all" ON contacts FOR ALL USING (true) WITH CHECK (true);

-- reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_all" ON reports FOR ALL USING (true) WITH CHECK (true);

-- teacher_invite_codes
ALTER TABLE teacher_invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_invite_codes_all" ON teacher_invite_codes FOR ALL USING (true) WITH CHECK (true);

-- banners
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners_all" ON banners FOR ALL USING (true) WITH CHECK (true);

-- vouchers
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vouchers_all" ON vouchers FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STEP 2: CREATE LES_PLACE FOR EXISTING OWNER
-- =====================================================

-- Insert les_place untuk owner yang belum punya
INSERT INTO les_places (owner_id, name, description, address, type, is_verified, is_active, photos, facilities, total_students, rating, total_reviews)
SELECT 
  o.id,
  COALESCE(u.name, 'Tempat Les') || '''s Les',
  'Selamat datang di tempat les kami! Silakan edit informasi ini.',
  'Alamat belum diisi',
  'offline',
  false,
  true,
  '[]'::jsonb,
  ARRAY[]::text[],
  0,
  0,
  0
FROM owners o
JOIN users u ON o.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM les_places lp WHERE lp.owner_id = o.id);

-- =====================================================
-- STEP 3: VERIFY DATA
-- =====================================================

SELECT 'RLS Policies created' as step;
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';

SELECT 'Owners with les_places:' as step;
SELECT o.id as owner_id, u.email, lp.id as les_place_id, lp.name as les_place_name
FROM owners o
JOIN users u ON o.user_id = u.id
LEFT JOIN les_places lp ON lp.owner_id = o.id;
