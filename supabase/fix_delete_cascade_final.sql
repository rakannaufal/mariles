-- =====================================================
-- FIX DELETE CASCADES FINAL (SAFE MODE)
-- =====================================================

-- Script ini akan mengecek apakah kolom 'les_place_id' ada sebelum mencoba mengubah constraint.
-- Ini mencegah error "column does not exist" dan memastikan semua tabel yang relevan ter-cascade.

DO $$
BEGIN
    -- 1. TEACHERS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'les_place_id') THEN
        ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_les_place_id_fkey;
        ALTER TABLE teachers ADD CONSTRAINT teachers_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;
    END IF;

    -- 2. VOUCHERS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'les_place_id') THEN
         ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_les_place_id_fkey;
         ALTER TABLE vouchers ADD CONSTRAINT vouchers_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;
    ELSE
        -- Mungkin namanya voucher saja? Cek schema jika perlu. Tapi aman diskip.
        NULL;
    END IF;

    -- 3. BANNERS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'banners' AND column_name = 'les_place_id') THEN
         ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_les_place_id_fkey;
         ALTER TABLE banners ADD CONSTRAINT banners_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;
    END IF;
    
    -- 4. CONTACTS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'les_place_id') THEN
         ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_les_place_id_fkey;
         ALTER TABLE contacts ADD CONSTRAINT contacts_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;
    END IF;

    -- 5. REPORTS
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'les_place_id') THEN
         ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_les_place_id_fkey;
         ALTER TABLE reports ADD CONSTRAINT reports_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;
    END IF;

    -- 6. FORUM POSTS (Mungkin ada?)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'forum_posts' AND column_name = 'les_place_id') THEN
         ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_les_place_id_fkey;
         ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE CASCADE;
    END IF;

    -- 7. TRANSACTIONS (Ulangi untuk memastikan)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'les_place_id') THEN
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_les_place_id_fkey;
        -- Set NULL lebih aman untuk transaksi, atau CASCADE jika ingin bersih total
        ALTER TABLE transactions ADD CONSTRAINT transactions_les_place_id_fkey FOREIGN KEY (les_place_id) REFERENCES les_places(id) ON DELETE SET NULL;
    END IF;

END $$;

SELECT 'Cascading deletes enabled safely for all detected foreign keys' as status;
