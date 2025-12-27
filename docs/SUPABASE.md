# 📦 Supabase Database Setup

Panduan setup database Supabase untuk Mariles.

---

## Quick Start

### 1. Buka Supabase Dashboard
1. Buka https://supabase.com/dashboard
2. Login dan pilih project Anda

### 2. Jalankan SQL Migrations (Urut!)
1. Klik **SQL Editor** → **New Query**
2. Jalankan file secara berurutan:

| #  | File | Konten |
|----|------|--------|
| 1  | `001_core_setup.sql` | Tables, functions, triggers, RLS, categories |
| 2  | `002_myclass_tables.sql` | Course materials, tests, progress |
| 3  | `003_financial_tables.sql` | Transactions, payments, withdrawals |

---

## Struktur Database

```
users (akun utama)
├── students (profil siswa)
├── owners (profil pemilik les)
│   └── les_places (tempat les)
│       ├── programs (program les)
│       │   └── bookings (pendaftaran)
│       ├── course_materials (materi)
│       └── tests (ujian)
└── teachers (profil guru)
    └── attendance & grades
```

---

## Tables

### Core (001)
- `users` - Akun utama
- `students` - Profil siswa
- `owners` - Profil pemilik les
- `teachers` - Profil guru
- `categories` - Kategori les
- `les_places` - Tempat les
- `programs` - Program les
- `bookings` - Pendaftaran
- `payments` - Pembayaran lama (legacy)
- `reviews` - Ulasan
- `favorites` - Favorit
- `notifications` - Notifikasi
- `chat_rooms` & `chat_messages` - Chat
- `attendance` - Absensi
- `grades` - Nilai
- `forum_posts` & `forum_comments` - Forum

### MyClass (002)
- `course_materials` - Materi pelajaran
- `tests` - Ujian/quiz
- `test_attempts` - Percobaan ujian
- `material_progress` - Progress materi

### Financial (003)
- `transactions` - Transaksi Midtrans
- `teacher_payments` - Pembayaran ke guru
- `payment_schedules` - Jadwal bayar
- `withdrawals` - Pencairan dana
- `balances` - Saldo

---

## Row Level Security (RLS)

Semua table dilindungi RLS:
- User hanya bisa akses data sendiri
- Public bisa lihat les places & programs aktif
- Owner bisa kelola tempat les miliknya
- Teacher bisa kelola absensi & nilai

---

## Auto Triggers

1. **Auth signup** → Auto create user profile
2. **Review added** → Auto update rating
3. **Any update** → Auto update `updated_at`

---

## Reset Database

Jika perlu reset, jalankan di SQL Editor:
```sql
-- Drop semua tables (hati-hati!)
DROP TABLE IF EXISTS forum_comments CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
-- ... (lanjutkan sesuai kebutuhan)
```

Lalu jalankan ulang migration files.

---

## Verifikasi

Jalankan query ini untuk cek struktur:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```
