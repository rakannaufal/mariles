-- Migration to fix 409 Conflict on User Deletion
-- Checks all Foreign Keys pointing to 'users' and related tables, ensuring they have ON DELETE CASCADE

BEGIN;

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

-- 6. USERS -> FORUM POSTS/COMMENTS
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey;
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE forum_comments DROP CONSTRAINT IF EXISTS forum_comments_user_id_fkey;
ALTER TABLE forum_comments ADD CONSTRAINT forum_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 7. TRANSACTIONS
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_student_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL; -- Preserve financial records? Usually SET NULL is safer for history, but if user is gone, maybe purge?
    -- DECISION: Transactions are financial records. If user is deleted, we should probably Keep them (SET NULL) or Anonymize. 
    -- BUT the user wants "delete". Strict delete means cascade. 
    -- Standard practice for "Delete Account" is total wipe. 
    -- However, 409 conflict means existing is RESTRICT.
    -- Let's change to SET NULL for transactions to keep ledger intact, OR CASCADE if strict.
    -- Given it's a "Mariles" app, user might want total removal.
    -- Let's go with SET NULL for financial stuff to avoid losing order history completely if they want audit.
    -- Wait, if student_id is NULL, we lose who paid.
    -- Let's stick to CASCADE for now to ensure "Delete" actually works without blocking. 
    -- Actually, usually you Soft Delete users. But here we are doing Hard Delete.
    -- I will use SET NULL for critical financial tables to avoid wiping revenue data.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_student_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL;

-- 8. WITHDRAWALS
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 9. BALANCES
ALTER TABLE balances DROP CONSTRAINT IF EXISTS balances_user_id_fkey;
ALTER TABLE balances ADD CONSTRAINT balances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE; -- Balance goes with user

-- 10. REVIEWS (Should go)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_student_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE; -- Note: References STUDENTS not USERS directly mostly

-- 11. MESSAGES 
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;

-- 12. CONVERSATIONS
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_student_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_teacher_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- 13. REPORTS
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
