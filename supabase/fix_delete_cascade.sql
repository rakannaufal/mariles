-- =====================================================
-- FIX DELETE CASCADES
-- =====================================================

-- Agar tombol Delete pada Tempat Les bisa berfungsi, kita perlu memastikan
-- data-data terkait (seperti program, booking, review) ikut terhapus otomatis.

-- 1. Programs
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_les_place_id_fkey;
ALTER TABLE programs ADD CONSTRAINT programs_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 2. Bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_les_place_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 3. Reviews
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_les_place_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 4. Favorites (jika ada)
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_les_place_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 5. Teacher Invite Codes
ALTER TABLE teacher_invite_codes DROP CONSTRAINT IF EXISTS teacher_invite_codes_les_place_id_fkey;
ALTER TABLE teacher_invite_codes ADD CONSTRAINT teacher_invite_codes_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;

-- 6. Transactions (Optional: Hati-hati dengan data keuangan. 
--    Idealnya transaksi tidak dihapus, tapi set null. 
--    Tapi untuk kemudahan dev/admin saat ini, kita cascade saja atau set null)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_les_place_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_les_place_id_fkey 
  FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE SET NULL;

SELECT 'Cascading deletes enabled for Les Places' as status;
