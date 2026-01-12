-- =============================================================================
-- 02_rls_policies.sql
-- Description: Detailed RLS Policies for 39-Table Schema (Native SQL)
-- Created: 2026-01-12
-- Updated: FINAL HARDENING (Teacher Access, Student Fraud Prevention, Moderation)
-- =============================================================================

-- =============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =============================================================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE les_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. HELPER FUNCTIONS
-- =============================================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is the Owner of an entity (via les_place linkage)
CREATE OR REPLACE FUNCTION is_owner_of_les(target_les_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM les_places lp
    JOIN owners o ON lp.owner_id = o.id
    WHERE lp.id = target_les_id AND o.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a Teacher at a specific les_place
CREATE OR REPLACE FUNCTION is_teacher_at_les(target_les_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.les_place_id = target_les_id 
    AND t.user_id = auth.uid()
    AND t.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 3. POLICIES PER TABLE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- USERS & PROFILES
-- -----------------------------------------------------------------------------
-- users
CREATE POLICY "Users view own profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Public view basic user info" ON users FOR SELECT USING (true);
CREATE POLICY "Admin manage users" ON users FOR ALL USING (is_admin());

-- students
CREATE POLICY "Student view own profile" ON students FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Student update own profile" ON students FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admin/Owner/Teacher view students" ON students FOR SELECT USING (
  is_admin() OR 
  EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()) OR 
  EXISTS (SELECT 1 FROM teachers WHERE user_id = auth.uid())
);

-- owners
CREATE POLICY "Owner view own profile" ON owners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner update own profile" ON owners FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Public view owner info" ON owners FOR SELECT USING (true);
CREATE POLICY "Admin manage owners" ON owners FOR ALL USING (is_admin());

-- teachers
CREATE POLICY "Teacher view own profile" ON teachers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Teacher update own profile" ON teachers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Public view active teachers" ON teachers FOR SELECT USING (is_active = true);
CREATE POLICY "Owner manage teachers" ON teachers FOR ALL USING (
  owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid()) OR is_admin()
);

-- -----------------------------------------------------------------------------
-- CORE CONTENT (Les Places, Programs, Materials)
-- -----------------------------------------------------------------------------
-- les_places
CREATE POLICY "Public view verified les_places" ON les_places FOR SELECT USING (true);
CREATE POLICY "Owner manage own les_places" ON les_places FOR ALL USING (
  owner_id IN (SELECT id FROM owners WHERE user_id = auth.uid()) OR is_admin()
);

-- programs
CREATE POLICY "Public view programs" ON programs FOR SELECT USING (true);
CREATE POLICY "Owner manage programs" ON programs FOR ALL USING (
  is_owner_of_les(les_place_id) OR is_admin()
);
CREATE POLICY "Teacher view programs" ON programs FOR SELECT USING (
  is_teacher_at_les(les_place_id)
);

-- categories
CREATE POLICY "Public view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON categories FOR ALL USING (is_admin());

-- banners
CREATE POLICY "Public view banners" ON banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manage banners" ON banners FOR ALL USING (is_admin());

-- course_materials
CREATE POLICY "Owner/Teacher/Admin view materials" ON course_materials FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM programs p 
    WHERE p.id = program_id AND (is_owner_of_les(p.les_place_id) OR is_teacher_at_les(p.les_place_id))
  ) OR is_admin()
);
CREATE POLICY "Owner manage materials" ON course_materials FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM programs p 
    WHERE p.id = program_id AND is_owner_of_les(p.les_place_id)
  ) OR is_admin()
);
CREATE POLICY "Owner update materials" ON course_materials FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM programs p 
    WHERE p.id = program_id AND is_owner_of_les(p.les_place_id)
  ) OR is_admin()
);
CREATE POLICY "Owner delete materials" ON course_materials FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM programs p 
    WHERE p.id = program_id AND is_owner_of_les(p.les_place_id)
  ) OR is_admin()
);

CREATE POLICY "Student view materials" ON course_materials FOR SELECT USING (
  program_id IN (
    SELECT program_id FROM bookings 
    WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid()) 
    AND status IN ('active', 'completed')
  )
);

-- -----------------------------------------------------------------------------
-- BOOKINGS & TRANSACTIONS
-- -----------------------------------------------------------------------------
-- bookings
CREATE POLICY "Student view own bookings" ON bookings FOR SELECT USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
-- HARDENING: Enforce status='pending' on booking creation by student
CREATE POLICY "Student create bookings" ON bookings FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid()) AND
  status = 'pending'
);
CREATE POLICY "Owner manage bookings" ON bookings FOR ALL USING (
  is_owner_of_les(les_place_id) OR is_admin()
);
CREATE POLICY "Teacher view bookings" ON bookings FOR SELECT USING (
  is_teacher_at_les(les_place_id)
);

-- transactions
CREATE POLICY "View own transactions" ON transactions FOR SELECT USING (
  student_id = auth.uid() OR
  is_owner_of_les(les_place_id) OR 
  is_admin()
);

-- payments
CREATE POLICY "View own payments" ON payments FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings WHERE 
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid()) OR
    is_owner_of_les(les_place_id)
  ) OR is_admin()
);

-- refunds
CREATE POLICY "View own refunds" ON refunds FOR SELECT USING (
  student_id = auth.uid() OR 
  is_owner_of_les(les_place_id) OR 
  is_admin()
);

-- completion_logs
CREATE POLICY "Admin view logs" ON completion_logs FOR SELECT USING (is_admin());
CREATE POLICY "Owner view logs" ON completion_logs FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings WHERE is_owner_of_les(les_place_id)
  )
);
CREATE POLICY "Teacher view logs" ON completion_logs FOR SELECT USING (
  booking_id IN (
    SELECT id FROM bookings WHERE is_teacher_at_les(les_place_id)
  )
);

-- -----------------------------------------------------------------------------
-- ACADEMIC & PROGRESS
-- -----------------------------------------------------------------------------
-- attendance
CREATE POLICY "View attendance" ON attendance FOR SELECT USING (
  booking_id IN (SELECT id FROM bookings WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())) OR
  EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid()) OR
  is_admin()
);
CREATE POLICY "Teacher/Owner manage attendance" ON attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid()) OR 
  is_owner_of_les((SELECT les_place_id FROM bookings WHERE id = booking_id)) OR
  is_admin()
);

-- grades
CREATE POLICY "View grades" ON grades FOR SELECT USING (
  booking_id IN (SELECT id FROM bookings WHERE student_id IN (SELECT id FROM students WHERE user_id = auth.uid())) OR
  EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid()) OR
  is_admin()
);
CREATE POLICY "Teacher/Owner manage grades" ON grades FOR ALL USING (
  EXISTS (SELECT 1 FROM teachers t WHERE t.id = teacher_id AND t.user_id = auth.uid()) OR 
  is_owner_of_les((SELECT les_place_id FROM bookings WHERE id = booking_id)) OR
  is_admin()
);

-- material_progress
CREATE POLICY "Student manage progress" ON material_progress FOR ALL USING (
  student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
);
CREATE POLICY "Teacher/Owner view progress" ON material_progress FOR SELECT USING (
  material_id IN (
    SELECT id FROM course_materials WHERE program_id IN (
       SELECT id FROM programs WHERE is_owner_of_les(les_place_id) OR is_teacher_at_les(les_place_id)
    )
  ) OR is_admin()
);

-- exercise_submissions
CREATE POLICY "Student manage submissions" ON exercise_submissions FOR ALL USING (
  student_id = auth.uid()
);
CREATE POLICY "Teacher assess submissions" ON exercise_submissions FOR SELECT USING (
  material_id IN (
    SELECT id FROM course_materials WHERE program_id IN (
       SELECT id FROM programs WHERE is_teacher_at_les(les_place_id)
    )
  ) OR is_admin()
);
CREATE POLICY "Teacher grade submissions" ON exercise_submissions FOR UPDATE USING (
  material_id IN (
    SELECT id FROM course_materials WHERE program_id IN (
       SELECT id FROM programs WHERE is_teacher_at_les(les_place_id)
    )
  ) OR is_admin()
);
CREATE POLICY "Owner manage submissions" ON exercise_submissions FOR ALL USING (
   material_id IN (
    SELECT id FROM course_materials WHERE program_id IN (
       SELECT id FROM programs WHERE is_owner_of_les(les_place_id)
    )
  ) OR is_admin()
);

-- quizzes & attempts
CREATE POLICY "Owner manage quizzes" ON quizzes FOR ALL USING (
  is_owner_of_les(les_place_id) OR is_admin()
);
CREATE POLICY "Teacher manage quizzes" ON quizzes FOR ALL USING (
  (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())) OR is_admin()
);
CREATE POLICY "Student view quizzes" ON quizzes FOR SELECT USING (is_published = true);
CREATE POLICY "Student manage quiz attempts" ON quiz_attempts FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Teacher/Owner view attempts" ON quiz_attempts FOR SELECT USING (
  quiz_id IN (
     SELECT id FROM quizzes WHERE is_owner_of_les(les_place_id) OR (teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
  )
);

-- -----------------------------------------------------------------------------
-- COMMUNICATION (Chat, Forum, Reviews)
-- -----------------------------------------------------------------------------
-- chat_rooms & messages
CREATE POLICY "Room participants view" ON chat_rooms FOR SELECT USING (
  participant_1 = auth.uid() OR participant_2 = auth.uid() OR is_admin()
);
CREATE POLICY "Admin manage rooms" ON chat_rooms FOR ALL USING (is_admin());

CREATE POLICY "Participants view messages" ON chat_messages FOR SELECT USING (
  room_id IN (SELECT id FROM chat_rooms WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()) OR is_admin()
);
CREATE POLICY "Participants send messages" ON chat_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  room_id IN (SELECT id FROM chat_rooms WHERE participant_1 = auth.uid() OR participant_2 = auth.uid())
);
CREATE POLICY "Admin manage messages" ON chat_messages FOR ALL USING (is_admin());

-- conversations & messages (Alternative)
CREATE POLICY "Conv participants view" ON conversations FOR SELECT USING (
  student_id = auth.uid() OR teacher_id = auth.uid() OR is_admin()
);
CREATE POLICY "Conv messages view" ON messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "Conv messages send" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);

-- forum_posts
CREATE POLICY "Public view posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "User create posts" ON forum_posts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User edit own posts" ON forum_posts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "User delete own posts" ON forum_posts FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- forum_comments
CREATE POLICY "Public view comments" ON forum_comments FOR SELECT USING (true);
CREATE POLICY "User create comments" ON forum_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "User edit own comments" ON forum_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admin/User delete comments" ON forum_comments FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- reviews
CREATE POLICY "Public view reviews" ON reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "Student create review" ON reviews FOR INSERT WITH CHECK (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Student edit own review" ON reviews FOR UPDATE USING (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()));
CREATE POLICY "Owner reply review" ON reviews FOR UPDATE USING (
  is_owner_of_les(les_place_id)
);
CREATE POLICY "Admin manage reviews" ON reviews FOR ALL USING (is_admin());

-- contacts
CREATE POLICY "Admin manage contacts" ON contacts FOR ALL USING (is_admin());
CREATE POLICY "Public create contact" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "View own contacts" ON contacts FOR SELECT USING (email IN (SELECT email FROM users WHERE id = auth.uid()));

-- -----------------------------------------------------------------------------
-- FINANCE & SETTINGS
-- -----------------------------------------------------------------------------
-- balances
CREATE POLICY "View own balance" ON balances FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System update balance" ON balances FOR ALL USING (is_admin()); 

-- withdrawals
CREATE POLICY "View own withdrawals" ON withdrawals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Create withdrawal" ON withdrawals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage withdrawals" ON withdrawals FOR ALL USING (is_admin());

-- platform_revenue
CREATE POLICY "Admin view revenue" ON platform_revenue FOR SELECT USING (is_admin());

-- platform_settings
CREATE POLICY "Public view settings" ON platform_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage settings" ON platform_settings FOR ALL USING (is_admin());

-- teacher_payments
CREATE POLICY "Teacher/Owner view payments" ON teacher_payments FOR SELECT USING (
  teacher_id = auth.uid() OR 
  owner_id = auth.uid() OR 
  is_admin()
);

-- payment_schedules
CREATE POLICY "Owner manage schedules" ON payment_schedules FOR ALL USING (
  is_owner_of_les(les_place_id) OR is_admin()
);
CREATE POLICY "Teacher view schedules" ON payment_schedules FOR SELECT USING (
  teacher_id = auth.uid()
);

-- vouchers
CREATE POLICY "Public view vouchers" ON vouchers FOR SELECT USING (is_active = true);
CREATE POLICY "Owner manage vouchers" ON vouchers FOR ALL USING (
  is_owner_of_les(les_place_id) OR is_admin()
);

-- notifications
CREATE POLICY "View own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- favorites
CREATE POLICY "User manage favorites" ON favorites FOR ALL USING (user_id = auth.uid());

-- reports
CREATE POLICY "User create reports" ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admin manage reports" ON reports FOR ALL USING (is_admin());

-- teacher_invite_codes
CREATE POLICY "Owner manage codes" ON teacher_invite_codes FOR ALL USING (
  is_owner_of_les(les_place_id) OR is_admin()
);
