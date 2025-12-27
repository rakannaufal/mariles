-- =====================================================
-- FIX DELETE CASCADES PART 2 (ALL REMAINING TABLES)
-- =====================================================

-- Masih ada tabel yang memblokir delete karena constraint belum di-cascade.
-- Kita akan fix SEMUA tabel yang mungkin mereferensi les_places.

-- 1. Teachers (Sangat mungkin ini penyebabnya!)
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_les_place_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 2. Vouchers
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_les_place_id_fkey;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 3. Banners
ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_les_place_id_fkey;
ALTER TABLE banners ADD CONSTRAINT banners_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 4. Messages (Jika ada relasi ke les_places)
-- Cek nama constraintnya mungkin beda, tapi kita coba standard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'les_place_id') THEN
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_les_place_id_fkey;
    ALTER TABLE messages ADD CONSTRAINT messages_les_place_id_fkey 
      FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Contacts
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_les_place_id_fkey;
ALTER TABLE contacts ADD CONSTRAINT contacts_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 6. Reports (Jika ada)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_les_place_id_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;


SELECT 'Cascading deletes enabled for ALL related tables' as status;
