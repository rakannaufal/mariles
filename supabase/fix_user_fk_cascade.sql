-- EXHAUSTIVE Migration to fix 409 Conflict on User Deletion
-- Ensures all Foreign Keys pointing to 'users' have ON DELETE CASCADE or SET NULL
-- Updated to exclude potentially missing tables (voucher_usage, etc.)

BEGIN;

-- ===========================
-- BASIC USER RELATIONS
-- ===========================

-- 1. USERS -> STUDENTS
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_user_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. USERS -> TEACHERS
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_user_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3. USERS -> OWNERS
ALTER TABLE owners DROP CONSTRAINT IF EXISTS owners_user_id_fkey;
ALTER TABLE owners ADD CONSTRAINT owners_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. USERS -> FAVORITES
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 5. USERS -> NOTIFICATIONS
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


-- ===========================
-- FINANCIAL & PAYMENTS
-- ===========================

-- 6. TRANSACTIONS (student_id) - Keep record but allow deletion (SET NULL)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_student_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL;

-- 7. WITHDRAWALS (user_id)
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 8. BALANCES (user_id) - Delete with user
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_fkey;
ALTER TABLE balances ADD CONSTRAINT balances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 9. TEACHER_PAYMENTS (teacher_id, owner_id)
ALTER TABLE teacher_payments DROP CONSTRAINT IF EXISTS teacher_payments_teacher_id_fkey;
ALTER TABLE teacher_payments ADD CONSTRAINT teacher_payments_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE teacher_payments DROP CONSTRAINT IF EXISTS teacher_payments_owner_id_fkey;
ALTER TABLE teacher_payments ADD CONSTRAINT teacher_payments_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- 10. PAYMENT_SCHEDULES (teacher_id)
ALTER TABLE payment_schedules DROP CONSTRAINT IF EXISTS payment_schedules_teacher_id_fkey;
ALTER TABLE payment_schedules ADD CONSTRAINT payment_schedules_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- 11. REFUNDS (student_id)
ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_student_id_fkey;
ALTER TABLE refunds ADD CONSTRAINT refunds_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- 12. VOUCHER_USAGE (REMOVED - Might not exist yet)
-- DO $$ 
-- BEGIN 
--     IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'voucher_usage') THEN
--         ALTER TABLE voucher_usage DROP CONSTRAINT IF EXISTS voucher_usage_user_id_fkey;
--         ALTER TABLE voucher_usage ADD CONSTRAINT voucher_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
--     END IF;
-- END $$;


-- ===========================
-- COMMUNICATION
-- ===========================

-- 13. MESSAGES (sender, receiver)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- 14. CONVERSATIONS (student, teacher)
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_student_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_teacher_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- 15. FORUM POSTS/COMMENTS
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey;
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_comments DROP CONSTRAINT IF EXISTS forum_comments_user_id_fkey;
ALTER TABLE forum_comments ADD CONSTRAINT forum_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 16. REPORTS (reporter, resolved_by)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_resolved_by_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;


-- ===========================
-- LEARNING & CONTENT
-- ===========================

-- 17. QUIZZES (teacher_id)
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_teacher_id_fkey;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;

-- 18. QUIZ_ATTEMPTS (student_id -> users) 
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_student_id_fkey;
ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

-- 19. ACTIVITY_LOGS (REMOVED - Might not exist yet)
-- DO $$ 
-- BEGIN 
--     IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'activity_logs') THEN
--         ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
--         ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
--     END IF;
-- END $$;

-- 20. PLATFORM_SETTINGS (REMOVED - Might not exist yet)


COMMIT;
