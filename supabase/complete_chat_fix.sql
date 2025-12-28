-- =====================================================
-- COMPLETE CHAT FIX - RUN THIS IN SUPABASE SQL EDITOR
-- This will completely recreate the chat tables with working RLS
-- =====================================================

-- Step 1: Drop existing tables (if any)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Step 2: Create chat_rooms table
CREATE TABLE chat_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 uuid NOT NULL,
    participant_2 uuid NOT NULL,
    les_place_id uuid,
    last_message text,
    last_message_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Step 3: Create chat_messages table
CREATE TABLE chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Step 4: Add foreign keys to users (optional - comment out if users table doesn't exist)
-- ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_p1_fkey FOREIGN KEY (participant_1) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_p2_fkey FOREIGN KEY (participant_2) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 5: Create indexes
CREATE INDEX idx_chat_rooms_p1 ON chat_rooms(participant_1);
CREATE INDEX idx_chat_rooms_p2 ON chat_rooms(participant_2);
CREATE INDEX idx_chat_rooms_last_msg ON chat_rooms(last_message_at DESC NULLS LAST);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Step 6: Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Step 7: Create SIMPLE and PERMISSIVE policies for chat_rooms

-- Policy: Allow all authenticated users to SELECT chat rooms where they are a participant
CREATE POLICY "chat_rooms_select_policy" ON chat_rooms
    FOR SELECT
    TO authenticated
    USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Policy: Allow all authenticated users to INSERT chat rooms where they are a participant
CREATE POLICY "chat_rooms_insert_policy" ON chat_rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Policy: Allow all authenticated users to UPDATE chat rooms where they are a participant
CREATE POLICY "chat_rooms_update_policy" ON chat_rooms
    FOR UPDATE
    TO authenticated
    USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Step 8: Create SIMPLE and PERMISSIVE policies for chat_messages

-- Policy: Allow SELECT messages in rooms user is part of
CREATE POLICY "chat_messages_select_policy" ON chat_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_rooms 
            WHERE chat_rooms.id = chat_messages.room_id 
            AND (chat_rooms.participant_1 = auth.uid() OR chat_rooms.participant_2 = auth.uid())
        )
    );

-- Policy: Allow INSERT messages if user is sender and in room
CREATE POLICY "chat_messages_insert_policy" ON chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_rooms 
            WHERE chat_rooms.id = chat_messages.room_id 
            AND (chat_rooms.participant_1 = auth.uid() OR chat_rooms.participant_2 = auth.uid())
        )
    );

-- Policy: Allow UPDATE messages in rooms user is part of (for marking as read)
CREATE POLICY "chat_messages_update_policy" ON chat_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM chat_rooms 
            WHERE chat_rooms.id = chat_messages.room_id 
            AND (chat_rooms.participant_1 = auth.uid() OR chat_rooms.participant_2 = auth.uid())
        )
    );

-- Step 9: Grant permissions to authenticated role
GRANT ALL ON chat_rooms TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_rooms TO anon;
GRANT ALL ON chat_messages TO anon;

-- Step 10: Enable realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
END $$;

-- Done!
SELECT 'Chat tables created and configured successfully!' as result;
