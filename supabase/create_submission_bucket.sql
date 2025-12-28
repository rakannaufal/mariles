-- =====================================================
-- STORAGE BUCKET FOR EXERCISE SUBMISSIONS
-- Jalankan ini untuk membuat bucket 'submissions' dan policynya
-- =====================================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies for 'submissions' bucket

-- Give public access to files (so teacher can view)
CREATE POLICY "submissions_public_access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'submissions' );

-- Allow authenticated users to upload their own files
CREATE POLICY "submissions_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'submissions' );

-- Allow owners of the file to update/delete their own files
CREATE POLICY "submissions_individual_update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'submissions' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = owner::text) );

CREATE POLICY "submissions_individual_delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'submissions' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = owner::text) );
