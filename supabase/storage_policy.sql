-- =====================================================
-- STORAGE POLICY FOR COURSE-MATERIALS BUCKET
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- Allow public read access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-materials');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');

-- Allow users to delete their own files
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-materials' AND auth.role() = 'authenticated');
