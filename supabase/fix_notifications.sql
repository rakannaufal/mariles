-- =====================================================
-- FIX NOTIFICATIONS RLS & STRUCTURE
-- =====================================================

-- 1. Create table if not exists (just in case)
CREATE TABLE IF NOT EXISTS notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    type text,
    title text,
    message text,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;

-- 4. Create Policies

-- READ: User hanya bisa lihat notif miliknya
CREATE POLICY "notifications_select" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- UPDATE: User bisa tandai sudah dibaca (update is_read)
CREATE POLICY "notifications_update" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- INSERT: Admin (dan sistem) perlu bisa kirim notif ke siapa saja
-- Untuk kemudahan dan fitur masa depan (chat/review), kita izinkan authenticated user insert
CREATE POLICY "notifications_insert" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Fix users trigger if needed (optional)
-- (Tidak perlu triggger otomatis untuk issue ini, yang penting INSERT manual dari Admin jalan)

SELECT 'Notifications table and policies fixed' as status;
