-- =====================================================
-- SEED KATEGORI AKADEMIK UNTUK MARILES
-- 100+ Kategori Mata Pelajaran SD-SMA & Mata Kuliah
-- Run once to populate the categories table
-- =====================================================

-- Step 1: Drop existing categories table (CASCADE to remove dependencies)
DROP TABLE IF EXISTS categories CASCADE;

-- Step 2: Create new categories table
CREATE TABLE categories (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name character varying NOT NULL UNIQUE,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- Step 3: Insert academic categories
INSERT INTO categories (name, description, is_active) VALUES
-- =====================================================
-- SD-SMA: MATA PELAJARAN WAJIB INTI
-- =====================================================
('Matematika', 'Pelajaran matematika untuk semua jenjang SD-SMA', true),
('Bahasa Indonesia', 'Pelajaran Bahasa Indonesia untuk semua jenjang', true),
('Bahasa Inggris', 'Pelajaran Bahasa Inggris untuk semua jenjang', true),
('IPA', 'Ilmu Pengetahuan Alam terpadu untuk SD-SMP', true),
('IPS', 'Ilmu Pengetahuan Sosial terpadu untuk SD-SMP', true),
('Fisika', 'Pelajaran Fisika untuk SMP dan SMA', true),
('Kimia', 'Pelajaran Kimia untuk SMP dan SMA', true),
('Biologi', 'Pelajaran Biologi untuk SMP dan SMA', true),
('Ekonomi', 'Pelajaran Ekonomi untuk SMA jurusan IPS', true),
('Geografi', 'Pelajaran Geografi untuk SMA jurusan IPS', true),
('Sosiologi', 'Pelajaran Sosiologi untuk SMA jurusan IPS', true),
('Sejarah', 'Pelajaran Sejarah untuk SMP dan SMA', true),
('PKn', 'Pendidikan Kewarganegaraan untuk semua jenjang', true),

-- =====================================================
-- AGAMA
-- =====================================================
('Agama Islam', 'Pendidikan Agama Islam', true),
('Agama Kristen', 'Pendidikan Agama Kristen', true),
('Agama Katolik', 'Pendidikan Agama Katolik', true),
('Agama Hindu', 'Pendidikan Agama Hindu', true),
('Agama Buddha', 'Pendidikan Agama Buddha', true),
('Mengaji/Iqra', 'Belajar membaca Al-Quran untuk pemula', true),

-- =====================================================
-- MATA PELAJARAN LAINNYA
-- =====================================================
('Seni Budaya', 'Pelajaran Seni dan Budaya', true),
('Prakarya', 'Pelajaran Prakarya dan Kewirausahaan', true),
('TIK/Informatika', 'Teknologi Informasi dan Komunikasi', true),

-- =====================================================
-- BAHASA ASING
-- =====================================================
('Bahasa Mandarin', 'Pelajaran Bahasa Mandarin', true),
('Bahasa Jepang', 'Pelajaran Bahasa Jepang', true),
('Bahasa Korea', 'Pelajaran Bahasa Korea', true),
('Bahasa Jerman', 'Pelajaran Bahasa Jerman', true),
('Bahasa Prancis', 'Pelajaran Bahasa Prancis', true),
('Bahasa Arab', 'Pelajaran Bahasa Arab', true),
('Bahasa Spanyol', 'Pelajaran Bahasa Spanyol', true),

-- =====================================================
-- PERSIAPAN UJIAN
-- =====================================================
('UTBK/SBMPTN', 'Persiapan Ujian Tulis Berbasis Komputer', true),
('TOEFL', 'Persiapan Test of English as a Foreign Language', true),
('IELTS', 'Persiapan International English Language Testing System', true),
('SAT', 'Persiapan Scholastic Assessment Test', true),
('JLPT', 'Persiapan Japanese Language Proficiency Test', true),
('HSK', 'Persiapan Hanyu Shuiping Kaoshi (Mandarin)', true),
('TOPIK', 'Persiapan Test of Proficiency in Korean', true),

-- =====================================================
-- PROGRAM KHUSUS SD
-- =====================================================
('Calistung', 'Baca Tulis Hitung untuk anak SD kelas awal', true),

-- =====================================================
-- OLIMPIADE
-- =====================================================
('Olimpiade Matematika', 'Persiapan OSN Matematika', true),
('Olimpiade Fisika', 'Persiapan OSN Fisika', true),
('Olimpiade Kimia', 'Persiapan OSN Kimia', true),
('Olimpiade Biologi', 'Persiapan OSN Biologi', true),
('Olimpiade Informatika', 'Persiapan OSN Komputer', true),
('Olimpiade Ekonomi', 'Persiapan OSN Ekonomi', true),
('Olimpiade Astronomi', 'Persiapan OSN Astronomi', true),

-- =====================================================
-- MATA KULIAH UMUM UNIVERSITAS
-- =====================================================
('Kalkulus', 'Mata kuliah Kalkulus 1, 2, 3', true),
('Statistika', 'Mata kuliah Statistika dan Probabilitas', true),
('Fisika Dasar', 'Mata kuliah Fisika Dasar universitas', true),
('Kimia Dasar', 'Mata kuliah Kimia Dasar universitas', true),
('Biologi Umum', 'Mata kuliah Biologi Umum universitas', true),
('Aljabar Linear', 'Mata kuliah Aljabar Linear', true),
('Matematika Diskrit', 'Mata kuliah Matematika Diskrit', true),

-- =====================================================
-- TEKNIK & KOMPUTER
-- =====================================================
('Pemrograman', 'Pemrograman dasar Python, Java, C++', true),
('Algoritma', 'Algoritma dan Pemrograman', true),
('Struktur Data', 'Mata kuliah Struktur Data', true),
('Basis Data', 'Mata kuliah Database / SQL', true),
('Jaringan Komputer', 'Mata kuliah Jaringan Komputer', true),
('Sistem Operasi', 'Mata kuliah Sistem Operasi', true),
('Web Development', 'Pengembangan Web Frontend & Backend', true),
('Mobile Development', 'Pengembangan Aplikasi Mobile', true),
('Machine Learning', 'Kecerdasan Buatan dan Machine Learning', true),
('Data Science', 'Data Science dan Analisis Data', true),

-- =====================================================
-- TEKNIK ELEKTRO & MESIN
-- =====================================================
('Rangkaian Listrik', 'Mata kuliah Rangkaian Listrik', true),
('Elektronika', 'Mata kuliah Elektronika Analog/Digital', true),
('Sistem Kontrol', 'Mata kuliah Sistem Kontrol', true),
('Mekanika', 'Mata kuliah Mekanika Teknik', true),
('Termodinamika', 'Mata kuliah Termodinamika', true),
('Mekanika Fluida', 'Mata kuliah Mekanika Fluida', true),
('Matematika Teknik', 'Mata kuliah Matematika untuk Teknik', true),

-- =====================================================
-- EKONOMI & BISNIS
-- =====================================================
('Akuntansi', 'Mata kuliah Akuntansi Dasar dan Lanjutan', true),
('Akuntansi Keuangan', 'Mata kuliah Akuntansi Keuangan Menengah', true),
('Akuntansi Biaya', 'Mata kuliah Akuntansi Biaya', true),
('Manajemen', 'Mata kuliah Pengantar Manajemen', true),
('Manajemen Keuangan', 'Mata kuliah Manajemen Keuangan', true),
('Manajemen Pemasaran', 'Mata kuliah Manajemen Pemasaran', true),
('Ekonomi Mikro', 'Mata kuliah Ekonomi Mikro', true),
('Ekonomi Makro', 'Mata kuliah Ekonomi Makro', true),
('Ekonometrika', 'Mata kuliah Ekonometrika', true),
('Perpajakan', 'Mata kuliah Perpajakan', true),

-- =====================================================
-- KESEHATAN & KEDOKTERAN
-- =====================================================
('Anatomi', 'Mata kuliah Anatomi tubuh manusia', true),
('Fisiologi', 'Mata kuliah Fisiologi', true),
('Farmakologi', 'Mata kuliah Farmakologi', true),
('Biokimia', 'Mata kuliah Biokimia Kedokteran', true),
('Histologi', 'Mata kuliah Histologi', true),
('Patologi', 'Mata kuliah Patologi', true),
('Mikrobiologi', 'Mata kuliah Mikrobiologi', true),
('UKMPPD', 'Persiapan Uji Kompetensi Mahasiswa Kedokteran', true),

-- =====================================================
-- HUKUM
-- =====================================================
('Hukum', 'Mata kuliah Ilmu Hukum umum', true),
('Hukum Perdata', 'Mata kuliah Hukum Perdata', true),
('Hukum Pidana', 'Mata kuliah Hukum Pidana', true),

-- =====================================================
-- PSIKOLOGI & SOSIAL
-- =====================================================
('Psikologi', 'Mata kuliah Psikologi Umum', true),
('Psikologi Perkembangan', 'Mata kuliah Psikologi Perkembangan', true),
('Sosiologi Umum', 'Mata kuliah Sosiologi universitas', true),
('Filsafat', 'Mata kuliah Filsafat', true),

-- =====================================================
-- BAHASA & KOMUNIKASI
-- =====================================================
('Bahasa Inggris Akademik', 'Academic English untuk mahasiswa', true),
('Public Speaking', 'Keterampilan berbicara di depan umum', true),
('Academic Writing', 'Penulisan akademik dan ilmiah', true),

-- =====================================================
-- SERTIFIKASI PROFESIONAL
-- =====================================================
('CPA', 'Persiapan Certified Public Accountant', true),
('CPNS', 'Persiapan Seleksi CPNS', true);

-- Step 4: Re-add foreign key constraint to programs table
ALTER TABLE programs 
ADD CONSTRAINT programs_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id);

-- Step 5: DISABLE RLS for categories (public data)
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Grant SELECT permission to all roles
GRANT SELECT ON categories TO anon;
GRANT SELECT ON categories TO authenticated;
GRANT ALL ON categories TO service_role;

-- Verify insert count
SELECT COUNT(*) as total_categories FROM categories;
