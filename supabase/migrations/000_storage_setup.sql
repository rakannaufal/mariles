-- =====================================================
-- MARILES STORAGE SETUP & POLICIES
-- Panduan Lengkap Setup Storage untuk Foto Les Place
-- =====================================================

-- =====================================================
-- LANGKAH 1: MEMBUAT BUCKET (WAJIB MANUAL)
-- =====================================================
-- Supabase menyarankan membuat bucket melalui Dashboard untuk menghindari masalah permission.
-- Ikuti langkah ini di Dashboard Supabase:
-- 1. Masuk ke menu "Storage" (ikon folder di sidebar kiri).
-- 2. Klik tombol "New bucket".
-- 3. Isi "Name of bucket" dengan: les-photos
-- 4. PENTING: Centang opsi "Public bucket" (agar foto bisa dilihat publik).
-- 5. Klik "Save".

-- =====================================================
-- LANGKAH 2: MENJALANKAN POLICY (JALANKAN SQL DI BAWAH)
-- =====================================================
-- Setelah bucket 'les-photos' dibuat di dashboard,
-- jalankan script SQL di bawah ini di SQL Editor untuk mengatur izin aksesnya.

-- 1. Pastikan RLS aktif di tabel storage.objects
-- NOTE: If you get "must be owner of table objects", skip this line (it is usually enabled by default)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Publik bisa MELIHAT foto (SELECT)
-- Siapapun (termasuk user yang belum login) bisa melihat foto les.
DROP POLICY IF EXISTS "Public can view les photos" ON storage.objects;
CREATE POLICY "Public can view les photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'les-photos');

-- 3. Policy: Owner bisa UPLOAD foto (INSERT)
-- Hanya owner yang login DAN memiliki les place terkait yang bisa upload.
-- Validasi memastikan folder foto sesuai dengan ID les place milik owner.
DROP POLICY IF EXISTS "Owners can upload les photos" ON storage.objects;
CREATE POLICY "Owners can upload les photos" ON storage.objects
    FOR INSERT 
    WITH CHECK (
        bucket_id = 'les-photos' 
        AND auth.role() = 'authenticated'
        AND (
            -- Skenario 1: Admin boleh upload kemana saja
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
            OR 
            -- Skenario 2: Owner hanya boleh upload ke folder les place miliknya
            -- Format folder di storage biasanya: [les_place_id]/filename.jpg
            -- Fungsi storage.foldername(name) mengambil nama folder pertama dari path file
            auth.uid() IN (
                SELECT o.user_id FROM public.owners o 
                JOIN public.les_places lp ON lp.owner_id = o.id 
                WHERE lp.id::text = (storage.foldername(name))[1]
            )
        )
    );

-- 4. Policy: Owner bisa UPDATE foto (UPDATE)
-- Mengizinkan owner mengganti foto lama dengan yang baru.
DROP POLICY IF EXISTS "Owners can update les photos" ON storage.objects;
CREATE POLICY "Owners can update les photos" ON storage.objects
    FOR UPDATE 
    WITH CHECK (
        bucket_id = 'les-photos' 
        AND auth.role() = 'authenticated'
        AND (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
            OR 
            auth.uid() IN (
                SELECT o.user_id FROM public.owners o 
                JOIN public.les_places lp ON lp.owner_id = o.id 
                WHERE lp.id::text = (storage.foldername(name))[1]
            )
        )
    );

-- 5. Policy: Owner bisa HAPUS foto (DELETE)
-- Mengizinkan owner menghapus foto yang sudah tidak dipakai.
DROP POLICY IF EXISTS "Owners can delete les photos" ON storage.objects;
CREATE POLICY "Owners can delete les photos" ON storage.objects
    FOR DELETE 
    USING (
        bucket_id = 'les-photos' 
        AND auth.role() = 'authenticated'
        AND (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
            OR 
            auth.uid() IN (
                SELECT o.user_id FROM public.owners o 
                JOIN public.les_places lp ON lp.owner_id = o.id 
                WHERE lp.id::text = (storage.foldername(name))[1]
            )
        )
    );

-- =====================================================
-- SELESAI
-- =====================================================
