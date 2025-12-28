-- =====================================================
-- FIX CHAT PERMISSIONS - Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can update messages in their rooms" ON chat_messages;

-- =====================================================
-- CHAT ROOMS POLICIES - More permissive for authenticated users
-- =====================================================

-- SELECT: Authenticated users can see rooms they're part of
CREATE POLICY "chat_rooms_select" ON chat_rooms
    FOR SELECT TO authenticated
    USING (
        participant_1 = auth.uid() OR participant_2 = auth.uid()
    );

-- INSERT: Authenticated users can create rooms where they are a participant
CREATE POLICY "chat_rooms_insert" ON chat_rooms
    FOR INSERT TO authenticated
    WITH CHECK (
        participant_1 = auth.uid() OR participant_2 = auth.uid()
    );

-- UPDATE: Authenticated users can update rooms they're part of
CREATE POLICY "chat_rooms_update" ON chat_rooms
    FOR UPDATE TO authenticated
    USING (
        participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
    WITH CHECK (
        participant_1 = auth.uid() OR participant_2 = auth.uid()
    );

-- =====================================================
-- CHAT MESSAGES POLICIES
-- =====================================================

-- SELECT: Users can see messages in rooms they're part of
CREATE POLICY "chat_messages_select" ON chat_messages
    FOR SELECT TO authenticated
    USING (
        room_id IN (
            SELECT id FROM chat_rooms 
            WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
    );

-- INSERT: Users can send messages to rooms they're part of
CREATE POLICY "chat_messages_insert" ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND
        room_id IN (
            SELECT id FROM chat_rooms 
            WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
    );

-- UPDATE: Users can update (mark as read) messages in their rooms
CREATE POLICY "chat_messages_update" ON chat_messages
    FOR UPDATE TO authenticated
    USING (
        room_id IN (
            SELECT id FROM chat_rooms 
            WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
    );

-- =====================================================
-- Verify RLS is enabled
-- =====================================================
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Done!
SELECT 'Chat permissions fixed!' as status;
