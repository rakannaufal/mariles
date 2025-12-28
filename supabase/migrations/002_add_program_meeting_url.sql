-- Add type and meeting_url to programs table
ALTER TABLE programs 
ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'Offline' CHECK (type IN ('Offline', 'Online', 'Hybrid')),
ADD COLUMN IF NOT EXISTS meeting_url TEXT;
