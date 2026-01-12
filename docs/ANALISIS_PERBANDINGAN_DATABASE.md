# Analisis Kritis Perbedaan Database (Legacy vs New V2)

Analisis ini menjawab pertanyaan: **"Kenapa V2 hanya 17 Tabel, sedangkan Legacy ada 39 Tabel?"**

## 1. Statistik
*   **Legacy System (Data Lama)**: 39 Tabel
*   **New V2 System (Data Baru)**: 17 Tabel
*   **Selisih**: 22 Tabel Hilang/Dihapus/Dikonsolidasi.

## 2. Kemana Perginya 22 Tabel Tersebut?

Berikut adalah breakdown kemana perginya tabel-tabel tersebut dalam desain baru:

### A. Fitur yang Anda Minta HAPUS (Sesuai Request)
Tabel-tabel ini dihapus karena instruksi "Hapus Chat dan Forum":
1.  `chat_rooms` (Hapus)
2.  `chat_messages` (Hapus)
3.  `conversations` (Hapus - Redundan dengan chat_rooms)
4.  `messages` (Hapus - Redundan dengan chat_messages)
5.  `forum_posts` (Hapus)
6.  `forum_comments` (Hapus)
    *   **Total**: 6 Tabel

### B. Fitur yang DIKONSOLIDASI (Penyederhanaan Cerdas)
Tabel-tabel ini tidak hilang fiturnya, tapi strukturnya digabung agar lebih efisien:
7.  `quizzes` → Masuk ke kolom `konten` (JSON) di tabel `MATERI_KURSUS`.
8.  `quiz_attempts` → Menjadi tabel `KUIS`.
9.  `exercise_submissions` → Digabung logic-nya ke `KUIS`/Materi.
10. `grades` → Digabung ke `KUIS` (skor_akhir).
11. `material_progress` → Bisa digabung ke log `ABSENSI` atau perlu dibuat jika butuh tracking detail per video.
12. `completion_logs` → Disederhanakan via `status` di tabel `PEMESANAN`.
13. `transactions` + `payments` + `refunds` → Disatukan menjadi alur di tabel `PEMBAYARAN` & `PEMESANAN`.
    *   **Total**: ~7 Tabel

### C. Fitur Pendukung yang BELUM ADA di V2 (Missing Features?)
Tabel-tabel ini ada di sistem lama tapi **belum** kita masukkan ke ERD V2 (karena fokus V2 kemarin adalah Core Flow). **Anda perlu memutuskan apakah ini mau dikembalikan?**
14. `banners` (Banner promosi di Home)
15. `vouchers` (Diskon/Promo code)
16. `favorites` (Wishlist siswa)
17. `reports` (Fitur Report User/Review jahat)
18. `notifications` (Ada di script function, tapi tabel fisiknya opsional)
19. `contacts` (Form "Hubungi Kami")
20. `platform_settings` (Config dinamis admin)
21. `platform_revenue` (Pencatatan untung rugi platform terpisah)
22. `course_materials` (Ada, jadi MATERI_KURSUS)
    *   **Total**: ~8-9 Tabel Fitur Tambahan.

----

## 3. Kesimpulan Kritis

Alasan kenapa jadi 17 tabel adalah karena ERD V2 yang kita buat bersifat **"Lean Core"** (Hanya fitur inti: User, Kursus, Bayar, Belajar).

**Rekomendasi Tindakan:**
Jika sistem Anda yang sekarang ("Supabase Legacy") sudah memiliki fitur **Banner, Voucher, dan Wishlist** yang aktif dipakai, maka **kita HARUS menambahkannya kembali** ke ERD V2 agar fitur tersebut tidak hilang saat migrasi.

Apakah Anda ingin saya menambahkan fitur-fitur pendukung (Banner, Voucher, Favorites, dll) ke skema V2 agar setara dengan fitur lama?
