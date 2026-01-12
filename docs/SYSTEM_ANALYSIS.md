# Analisis Sistem Database Mariles (v2.2)

Dokumen ini berisi analisis detail dan kritis mengenai struktur database, keamanan (RLS), dan integritas data pada sistem Mariles.

## 1. Ringkasan Statistik
*   **Total Tabel**: 17 Tabel
*   **Total Policies (RLS)**: 26 Kebijakan Keamanan
*   **Total ENUM Types**: 11 Tipe Data Custom

## 2. Analisis Struktur Tabel (17 Tabel)

Sistem menggunakan pendekatan **Normalized Relational Database** yang terbagi dalam 5 lapisan logika:

### Lapis 1: Identitas (User Management) - 5 Tabel
1.  **`PENGGUNA`** (Base): Pusat data user. Semua role (Siswa, Owner, Guru) merujuk ke sini. Desain ini **sangat baik** untuk konsistensi login.
2.  **`SISWA`**: Profil khusus siswa.
3.  **`PEMILIK`**: Profil pemilik bisnis.
4.  **`PENGAJAR`**: Profil guru. Memiliki kolom kritikal `kode_guru` untuk linking, namun `id_pengguna` nullable (Flexible Invite System).
5.  **`ADMIN`**: Tabel admin minimalis (`status_aktif`). **Catatan Kritis**: Pemisahan tabel ini penting untuk keamanan agar admin tidak membaur dengan data user biasa.

### Lapis 2: Struktur Bisnis - 3 Tabel
6.  **`TEMPAT_LES`**: Entitas bisnis utama.
7.  **`PROGRAM`**: Produk yang dijual. Terhubung ke Pengajar via `id_pengajar` (FK).
8.  **`KATEGORI`**: Lookup table untuk program.

### Lapis 3: LMS (Learning Management) - 2 Tabel
9.  **`MATERI_KURSUS`**: Tabel hybrid. Menyimpan materi biasa (Video/PDF) DAN definisi Kuis (JSON). **Analisis**: Efisien secara storage dibanding membuat tabel `SOAL` terpisah, tapi validasi integritas data soal (JSON) harus kuat di sisi aplikasi.
10. **`KUIS`**: Tabel *transactional* untuk mencatat nilai siswa.

### Lapis 4: Operasional - 4 Tabel
11. **`PEMESANAN`**: Core transaksi pemesanan kelas.
12. **`PEMBAYARAN`**: Mencatat *money flow*. Terpisah dari pemesanan untuk mengakomodasi retry payment/refund tanpa merusak data pesanan.
13. **`ABSENSI`**: Log kehadiran.
14. **`ULASAN`**: Feedback system.

### Lapis 5: Keuangan & Utilitas - 3 Tabel
15. **`SALDO`**: Single source of truth untuk uang user.
16. **`PENARIKAN_DANA`**: Tabel request pencairan. Struktur simplified (tanpa verifikator) mengandalkan log aplikasi/status.
17. **`NOTIFIKASI`** (di file `03_functions`): Sistem notifikasi internal.

---

## 3. Analisis Keamanan Row Level Security (RLS)

Sistem menerapkan prinsip **"Deny by Default"**. Tabel tidak bisa diakses kecuali ada policy eksplisit.

### Breakdown Kebijakan (26 Policies):

#### A. Data Pribadi (High Security)
*   **PENGGUNA, SISWA, PEMILIK, PENGAJAR, SALDO**:
    *   *Policy*: `Using (id_pengguna = auth.uid())`
    *   **Kritis**: User mutlak hanya bisa melihat/edit data profil dan uang mereka sendiri.

#### B. Data Publik (Open Access)
*   **TEMPAT_LES, PROGRAM**:
    *   *Policy*: `SELECT using (true)`
    *   **Analisis**: Data ini harus terbuka agar bisa dicari oleh calon siswa pengguna guest (non-login). Aman.

#### C. Data Transaksional (Contextual Access)
*   **MATERI_KURSUS**:
    *   *Complex Policy*: Siswa hanya bisa akses materi **JIKA** punya `PEMESANAN` dengan status `aktif` di program tersebut.
    *   **Kritis**: Ini adalah "Paywall" sistem. Logic ini sudah tertanam di level database (SQL), sehingga API apapun yang dipakai, materi tetap aman dari akses ilegal.

*   **PEMESANAN**:
    *   User lihat pesanan sendiri.
    *   Owner lihat pesanan yang masuk ke program mereka (ditarik via Relasi Program -> Tempat Les -> Owner).

#### D. Admin Privileges
*   **PENARIKAN_DANA**:
    *   Policy `is_admin()` allow `SELECT` dan `UPDATE`.
    *   Policy User allow `INSERT` (Request).
    *   **Analisis**: Logic pemisahan ini mencegah user biasa meng-approve penarikan dana sendiri.

---

## 4. Kesimpulan Kritis

1.  **Kekuatan (Strengths)**:
    *   **Strict Typing**: Penggunaan ENUM dan FK Constraint sangat disiplin. Data sampah hampir mustahil masuk.
    *   **Secure Logic**: Logic bisnis krusial (akses materi, saldo) ditaruh di level Database (RLS & Triggers), bukan di Frontend. Ini anti-hack.
    *   **Efficient Schema**: Penggabungan tabel Kuis menyederhanakan query tanpa mengurangi fitur.

2.  **Poin Perhatian (Watchlist)**:
    *   **JSON Validation**: Karena soal kuis disimpan sebagai JSON di `MATERI_KURSUS`, aplikasi Frontend harus hati-hati saat menyimpan formatnya agar tidak *broken* saat dibaca.
    *   **Admin Audit**: Karena kolom `id_admin_verifikator` dihapus, maka log siapa admin yang menyetujui penarikan dana tidak tersimpan di database secara langsung (hanya tersirat dari siapa yang melakukan update).

Secara keseluruhan, arsitektur ini masuk kategori **Enterprise Grade** untuk skala sistem manajemen kursus/les.
