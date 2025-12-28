-- =====================================================
-- CHAT TABLES MIGRATION
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. CHAT ROOMS TABLE
CREATE TABLE IF NOT EXISTS chat_rooms (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_2 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    les_place_id uuid REFERENCES les_places(id) ON DELETE SET NULL,
    last_message text,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(participant_1, participant_2)
);

-- 2. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participant_1 ON chat_rooms(participant_1);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participant_2 ON chat_rooms(participant_2);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 4. UPDATE TRIGGER FOR chat_rooms
CREATE OR REPLACE FUNCTION update_chat_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER chat_rooms_updated_at
    BEFORE UPDATE ON chat_rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_rooms_updated_at();

-- 5. ROW LEVEL SECURITY
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies: Users can only see rooms they are part of
DROP POLICY IF EXISTS "Users can view their own chat rooms" ON chat_rooms;
CREATE POLICY "Users can view their own chat rooms" ON chat_rooms
    FOR SELECT USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_rooms;
CREATE POLICY "Users can create chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
CREATE POLICY "Users can update their own chat rooms" ON chat_rooms
    FOR UPDATE USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

-- Chat messages policies: Users can only see messages in their rooms
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = room_id
            AND (chat_rooms.participant_1 = auth.uid() OR chat_rooms.participant_2 = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;
CREATE POLICY "Users can send messages to their rooms" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = room_id
            AND (chat_rooms.participant_1 = auth.uid() OR chat_rooms.participant_2 = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update messages in their rooms" ON chat_messages;
CREATE POLICY "Users can update messages in their rooms" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = room_id
            AND (chat_rooms.participant_1 = auth.uid() OR chat_rooms.participant_2 = auth.uid())
        )
    );

-- 6. ENABLE REALTIME (for live chat updates)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Done!
SELECT 'Chat tables created successfully!' as status;
