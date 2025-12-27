-- =====================================================
-- FIX NOTIFICATIONS COLUMNS
-- =====================================================

-- Tambahkan kolom 'link' jika belum ada
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text;

-- Tambahkan kolom 'type' jika belum ada (sekedar jaga-jaga)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text;

-- Tambahkan kolom 'title' jika belum ada
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text;

-- Reload Schema Cache (biasanya otomatis, tapi untuk memastikan)
NOTIFY pgrst, 'reload schema';

SELECT 'Columns added successfully' as status;
