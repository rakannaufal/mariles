-- =====================================================
-- FIX ALL RLS - SIMPLE SELECT FOR ALL TABLES
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- Make ALL select policies simple (allow read for authenticated)
-- This fixes 500 errors on admin dashboard

-- users already fixed

-- les_places
DROP POLICY IF EXISTS "les_places_select" ON les_places;
DROP POLICY IF EXISTS "les_places_select_simple" ON les_places;
CREATE POLICY "les_places_select_simple" ON les_places FOR SELECT USING (true);

-- transactions  
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_select_simple" ON transactions;
CREATE POLICY "transactions_select_simple" ON transactions FOR SELECT USING (true);

-- owners
DROP POLICY IF EXISTS "owners_select" ON owners;
DROP POLICY IF EXISTS "owners_select_simple" ON owners;
CREATE POLICY "owners_select_simple" ON owners FOR SELECT USING (true);

-- students
DROP POLICY IF EXISTS "students_select" ON students;
DROP POLICY IF EXISTS "students_select_simple" ON students;
CREATE POLICY "students_select_simple" ON students FOR SELECT USING (true);

-- teachers
DROP POLICY IF EXISTS "teachers_select" ON teachers;
DROP POLICY IF EXISTS "teachers_select_simple" ON teachers;
CREATE POLICY "teachers_select_simple" ON teachers FOR SELECT USING (true);

-- categories
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_select_simple" ON categories;
CREATE POLICY "categories_select_simple" ON categories FOR SELECT USING (true);

-- programs
DROP POLICY IF EXISTS "programs_select" ON programs;
DROP POLICY IF EXISTS "programs_select_simple" ON programs;
CREATE POLICY "programs_select_simple" ON programs FOR SELECT USING (true);

-- bookings
DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_select_simple" ON bookings;
CREATE POLICY "bookings_select_simple" ON bookings FOR SELECT USING (true);

-- payments
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_select_simple" ON payments;
CREATE POLICY "payments_select_simple" ON payments FOR SELECT USING (true);

-- reviews
DROP POLICY IF EXISTS "reviews_select" ON reviews;
DROP POLICY IF EXISTS "reviews_select_simple" ON reviews;
CREATE POLICY "reviews_select_simple" ON reviews FOR SELECT USING (true);

-- favorites
DROP POLICY IF EXISTS "favorites_select" ON favorites;
DROP POLICY IF EXISTS "favorites_select_simple" ON favorites;
CREATE POLICY "favorites_select_simple" ON favorites FOR SELECT USING (true);

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_select_simple" ON notifications;
CREATE POLICY "notifications_select_simple" ON notifications FOR SELECT USING (true);

-- conversations
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_select_simple" ON conversations;
CREATE POLICY "conversations_select_simple" ON conversations FOR SELECT USING (true);

-- messages
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_select_simple" ON messages;
CREATE POLICY "messages_select_simple" ON messages FOR SELECT USING (true);

-- attendance
DROP POLICY IF EXISTS "attendance_select" ON attendance;
DROP POLICY IF EXISTS "attendance_select_simple" ON attendance;
CREATE POLICY "attendance_select_simple" ON attendance FOR SELECT USING (true);

-- grades
DROP POLICY IF EXISTS "grades_select" ON grades;
DROP POLICY IF EXISTS "grades_select_simple" ON grades;
CREATE POLICY "grades_select_simple" ON grades FOR SELECT USING (true);

-- forum_posts
DROP POLICY IF EXISTS "forum_posts_select" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_select_simple" ON forum_posts;
CREATE POLICY "forum_posts_select_simple" ON forum_posts FOR SELECT USING (true);

-- forum_comments
DROP POLICY IF EXISTS "forum_comments_select" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_select_simple" ON forum_comments;
CREATE POLICY "forum_comments_select_simple" ON forum_comments FOR SELECT USING (true);

-- course_materials
DROP POLICY IF EXISTS "course_materials_select" ON course_materials;
DROP POLICY IF EXISTS "course_materials_select_simple" ON course_materials;
CREATE POLICY "course_materials_select_simple" ON course_materials FOR SELECT USING (true);

-- material_progress
DROP POLICY IF EXISTS "material_progress_select" ON material_progress;
DROP POLICY IF EXISTS "material_progress_select_simple" ON material_progress;
CREATE POLICY "material_progress_select_simple" ON material_progress FOR SELECT USING (true);

-- quizzes
DROP POLICY IF EXISTS "quizzes_select" ON quizzes;
DROP POLICY IF EXISTS "quizzes_select_simple" ON quizzes;
CREATE POLICY "quizzes_select_simple" ON quizzes FOR SELECT USING (true);

-- quiz_attempts
DROP POLICY IF EXISTS "quiz_attempts_select" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts_select_simple" ON quiz_attempts;
CREATE POLICY "quiz_attempts_select_simple" ON quiz_attempts FOR SELECT USING (true);

-- teacher_payments
DROP POLICY IF EXISTS "teacher_payments_select" ON teacher_payments;
DROP POLICY IF EXISTS "teacher_payments_select_simple" ON teacher_payments;
CREATE POLICY "teacher_payments_select_simple" ON teacher_payments FOR SELECT USING (true);

-- payment_schedules
DROP POLICY IF EXISTS "payment_schedules_select" ON payment_schedules;
DROP POLICY IF EXISTS "payment_schedules_select_simple" ON payment_schedules;
CREATE POLICY "payment_schedules_select_simple" ON payment_schedules FOR SELECT USING (true);

-- withdrawals
DROP POLICY IF EXISTS "withdrawals_select" ON withdrawals;
DROP POLICY IF EXISTS "withdrawals_select_simple" ON withdrawals;
CREATE POLICY "withdrawals_select_simple" ON withdrawals FOR SELECT USING (true);

-- balances
DROP POLICY IF EXISTS "balances_select" ON balances;
DROP POLICY IF EXISTS "balances_select_simple" ON balances;
CREATE POLICY "balances_select_simple" ON balances FOR SELECT USING (true);

-- refunds
DROP POLICY IF EXISTS "refunds_select" ON refunds;
DROP POLICY IF EXISTS "refunds_select_simple" ON refunds;
CREATE POLICY "refunds_select_simple" ON refunds FOR SELECT USING (true);

-- contacts
DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_select_simple" ON contacts;
CREATE POLICY "contacts_select_simple" ON contacts FOR SELECT USING (true);

-- reports
DROP POLICY IF EXISTS "reports_select" ON reports;
DROP POLICY IF EXISTS "reports_select_simple" ON reports;
CREATE POLICY "reports_select_simple" ON reports FOR SELECT USING (true);

-- teacher_invite_codes
DROP POLICY IF EXISTS "teacher_invite_codes_select" ON teacher_invite_codes;
DROP POLICY IF EXISTS "teacher_invite_codes_select_simple" ON teacher_invite_codes;
CREATE POLICY "teacher_invite_codes_select_simple" ON teacher_invite_codes FOR SELECT USING (true);

-- banners
DROP POLICY IF EXISTS "banners_select" ON banners;
DROP POLICY IF EXISTS "banners_select_simple" ON banners;
CREATE POLICY "banners_select_simple" ON banners FOR SELECT USING (true);

-- vouchers
DROP POLICY IF EXISTS "vouchers_select" ON vouchers;
DROP POLICY IF EXISTS "vouchers_select_simple" ON vouchers;
CREATE POLICY "vouchers_select_simple" ON vouchers FOR SELECT USING (true);

SELECT 'ALL SELECT POLICIES SIMPLIFIED!' as status;
