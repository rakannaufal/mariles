# Entity-Specific Diagrams

Berikut adalah diagram alur (Flowchart) dan struktur menu (Hierarchy) yang dipisahkan untuk setiap entitas pengguna.

---

## 1. STUDENT (Siswa)

### Flowchart: Alur Pembelajaran Siswa
```mermaid
flowchart TD
    Start([Mulai]) --> Dashboard[Dashboard Student]
    
    Dashboard --> Choice{Pilih Aksi}
    
    %% Cari Les
    Choice --> Search[Cari Tempat Les]
    Search --> Filter[Filter Kategori/Lokasi]
    Filter --> SelectLes[Pilih Les]
    SelectLes --> ViewDetail[Lihat Detail & Harga]
    ViewDetail --> Book{Booking?}
    Book -- Ya --> Payment[Pembayaran (Midtrans)]
    Payment --> Success{Berhasil?}
    Success -- Ya --> MyClass[Masuk ke Kelas Saya]
    
    %% Belajar
    Choice --> MyClassAccess[Akses Kelas Saya]
    MyClassAccess --> MatList[Lihat Materi]
    MatList --> Study[Belajar (Video/Modul)]
    Study --> Quiz[Kerjakan Kuis]
    Quiz --> Result[Lihat Hasil & Nilai]
    
    %% Lainnya
    Choice --> Forum[Akses Forum]
    Choice --> Profile[Edit Profil]
```

### Hierarchy Chart: Menu Siswa
```mermaid
graph TD
    Student[Panel Siswa]
    
    Student --> Dash[Dashboard]
    Dash --> Stats[Statistik Belajar]
    Dash --> Active[Kelas Aktif]
    
    Student --> Class[Kelas Saya]
    Class --> Materials[Materi]
    Class --> Grades[Nilai]
    Class --> Cert[Sertifikat]
    
    Student --> Trans[Transaksi]
    Trans --> History[Riwayat Bayar]
    Trans --> Pending[Menunggu Bayar]
    
    Student --> Set[Pengaturan]
    Set --> Profile[Profil]
    Set --> Pass[Password]
```

---

## 2. OWNER (Pemilik Les)

### Flowchart: Alur Bisnis Owner
```mermaid
flowchart TD
    Start([Mulai]) --> Dashboard[Dashboard Owner]
    
    Dashboard --> Verify{Status Terverifikasi?}
    Verify -- Tidak --> UploadDoc[Upload Dokumen Usaha]
    Verify -- Ya --> Menu{Menu Utama}
    
    %% Manage Les
    Menu --> LesMgmt[Manajemen Tempat Les]
    LesMgmt --> EditInfo[Edit Info & Foto]
    LesMgmt --> AddProg[Tambah Program/Paket]
    
    %% Manage Guru
    Menu --> TeachMgmt[Manajemen Guru]
    TeachMgmt --> Invite[Generate Invite Code]
    Invite --> Share[Bagikan ke Guru]
    TeachMgmt --> Payroll[Gaji Guru]
    
    %% Keuangan
    Menu --> Finance[Keuangan]
    Finance --> CekSaldo[Cek Saldo Wallet]
    CekSaldo --> Withdraw[Tarik Dana]
    Withdraw --> AdminProcess[Menunggu Admin]
```

### Hierarchy Chart: Menu Owner
```mermaid
graph TD
    Owner[Panel Owner]
    
    Owner --> Les[Tempat Les]
    Les --> Info[Info Dasar]
    Les --> Prog[Program Layanan]
    
    Owner --> Teacher[Guru]
    Teacher --> List[Daftar Guru]
    Teacher --> Salary[Penggajian]
    
    Owner --> Stud[Siswa]
    Stud --> Data[Data Siswa]
    Stud --> Book[Booking Masuk]
    
    Owner --> Fin[Keuangan]
    Fin --> Income[Pemasukan]
    Fin --> WD[Penarikan Dana]
```

---

## 3. TEACHER (Guru)

### Flowchart: Alur Mengajar
```mermaid
flowchart TD
    Start([Mulai]) --> Login[Login Guru]
    Login --> Join{Punya Tempat Les?}
    
    Join -- Tidak --> InputCode[Masukkan Kode Invite]
    Join -- Ya --> Dashboard[Dashboard Teacher]
    
    Dashboard --> Task{Tugas Guru}
    
    %% Mengajar
    Task --> Schedule[Cek Jadwal]
    Schedule --> Teach[Mengajar]
    Teach --> Presensi[Isi Kehadiran Siswa]
    
    %% Materi
    Task --> Materials[Upload Materi]
    Materials --> AddVideo[Tambah Video/Modul]
    Materials --> CreateQuiz[Buat Kuis/Soal]
    
    %% Evaluasi
    Task --> Grading[Input Nilai]
    Grading --> Report[Laporan Siswa]
```

### Hierarchy Chart: Menu Guru
```mermaid
graph TD
    Teacher[Panel Guru]
    
    Teacher --> Sched[Jadwal]
    Sched --> Calendar[Kalender]
    Sched --> Today[Kelas Hari Ini]
    
    Teacher --> Class[Manajemen Kelas]
    Class --> Mat[Materi]
    Class --> Quiz[Kuis]
    Class --> Att[Absensi]
    
    Teacher --> Earn[Pendapatan]
    Earn --> History[Riwayat Gaji]
```

---

## 4. ADMIN (Administrator)

### Flowchart: Alur Kontrol Admin
```mermaid
flowchart TD
    Start([Mulai]) --> Dash[Dashboard Admin]
    
    Dash --> Monitor{Monitoring}
    
    %% Verifikasi
    Monitor --> Verif[Verifikasi]
    Verif --> CheckDoc[Cek Dokumen Owner]
    CheckDoc --> Approve{Valid?}
    Approve -- Ya --> Acc[Terima & Aktifkan]
    Approve -- Tidak --> Reject[Tolak]
    
    %% Keuangan
    Monitor --> Fin[Keuangan Pusat]
    Fin --> CheckWD[Cek Request Withdraw]
    CheckWD --> Transfer[Transfer Manual]
    Transfer --> Confirm[Konfirmasi Sistem]
    
    %% Konten
    Monitor --> Content[Moderasi Konten]
    Content --> Ban[Banned User/Review]
```

### Hierarchy Chart: Menu Admin
```mermaid
graph TD
    Admin[Panel Admin]
    
    Admin --> Users[User Management]
    Users --> ListS[Siswa]
    Users --> ListO[Owner]
    Users --> ListT[Guru]
    
    Admin --> Ops[Operasional]
    Ops --> Verif[Verifikasi Les]
    Ops --> Report[Laporan Isu]
    
    Admin --> Fin[Keuangan]
    Fin --> WD[Withdrawal]
    Fin --> Refund[Refund]
    
    Admin --> Content[Konten]
    Content --> Banner[Banner Iklan]
    Content --> Voucher[Voucher]
```
