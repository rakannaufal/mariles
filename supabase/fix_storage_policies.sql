-- =====================================================
-- STORAGE SETUP - RUN AFTER CREATING BUCKET
-- =====================================================
-- PENTING: Buat bucket "les-photos" dulu di dashboard!
-- Storage > New bucket > Name: les-photos > Public: YES

-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "les_photos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "les_photos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "les_photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "les_photos_auth_delete" ON storage.objects;

-- Allow everyone to view photos
CREATE POLICY "les_photos_public_select" ON storage.objects 
FOR SELECT USING (bucket_id = 'les-photos');

-- Allow authenticated users to upload
CREATE POLICY "les_photos_auth_insert" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'les-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY "les_photos_auth_update" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'les-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "les_photos_auth_delete" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'les-photos' 
  AND auth.role() = 'authenticated'
);

SELECT 'Storage policies created!' as status;
