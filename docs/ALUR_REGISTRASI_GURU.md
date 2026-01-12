# Alur Registrasi Guru via Kode

Dokumen ini menjelaskan mekanisme teknis bagaimana Guru mendaftar dan terhubung otomatis ke Tempat Les menggunakan `kode_guru`.

## Konsep: Pre-Registration (Pendataan Awal)

### 1. Owner Action (Dashboard)
*   Owner masuk ke menu "Kelola Pengajar".
*   Owner klik **"Tambah Pengajar"**.
*   Owner input nama (opsional) dan sistem men-generate (atau Owner input manual) **Kode Guru** (misal: `GR-8821`).
*   **Database**: Sistem membuat row baru di tabel `PENGAJAR`:
    *   `id_pemilik`: [ID Owner]
    *   `kode_guru`: `GR-8821`
    *   `id_pengguna`: `NULL` (Belum ada akun)

### 2. Distribusi
*   Owner memberikan kode `GR-8821` kepada calon guru secara manual (Chat/Email).

### 3. Teacher Action (Register)
*   Guru membuka halaman Register sistem.
*   Guru mengisi data diri (Email, Password, dll).
*   Guru memasukkan **Kode Guru** pada kolom yang tersedia: `GR-8821`.

### 4. System Action (Validasi & Link)
*   Backend mengecek tabel `PENGAJAR`:
    ```sql
    SELECT * FROM PENGAJAR WHERE kode_guru = 'GR-8821' AND id_pengguna IS NULL;
    ```
*   **Jika Ditemukan**:
    *   Akun User Guru dibuat.
    *   Row `PENGAJAR` tersebut di-update: `id_pengguna` diisi dengan UUID User baru.
*   **Hasil**: Saat Guru login pertama kali, mereka langsung terhubung ke Owner tersebut dan bisa melihat jadwal/tugas dari Owner.
