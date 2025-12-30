# BLACK BOX TESTING - SISTEM MARILES

## Informasi Dokumen
- **Aplikasi**: Mariles - Platform Pencarian Tempat Les
- **Tanggal**: 30 Desember 2025
- **Versi**: 1.0

---

# BAGIAN 1: PUBLIC (14 Halaman)

## 1.1 HomePage (Halaman Utama)

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-001 | Tampilan homepage | Buka halaman utama | Banner, kategori, tempat les populer tampil | |
| PUB-002 | Klik kategori | Klik salah satu kategori | Redirect ke SearchPage dengan filter kategori | |
| PUB-003 | Klik tempat les | Klik card tempat les | Redirect ke LesDetailPage | |
| PUB-004 | Search dari homepage | Input kata kunci, klik cari | Redirect ke SearchPage dengan query | |

## 1.2 LoginPage (Halaman Login)

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-005 | Login valid | Input email & password valid, klik login | Redirect ke dashboard sesuai role | |
| PUB-006 | Login email salah | Input email tidak terdaftar | Tampil pesan error "Email tidak ditemukan" | |
| PUB-007 | Login password salah | Input password salah | Tampil pesan error "Password salah" | |
| PUB-008 | Login field kosong | Klik login tanpa input | Tampil validasi "Field wajib diisi" | |
| PUB-009 | Login dengan Google | Klik tombol Google | Redirect ke Google OAuth, lalu ke dashboard | |
| PUB-010 | Link ke register | Klik "Belum punya akun" | Redirect ke RegisterPage | |
| PUB-011 | Link lupa password | Klik "Lupa password" | Tampil form reset password | |

## 1.3 RegisterPage (Halaman Registrasi)

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-012 | Register Student valid | Isi semua field valid, role Student | Akun dibuat, redirect ke login | |
| PUB-013 | Register Teacher valid | Isi semua field valid, role Teacher | Akun dibuat, redirect ke login | |
| PUB-014 | Register Owner valid | Isi semua field valid, role Owner | Akun dibuat, redirect ke login | |
| PUB-015 | Email sudah terdaftar | Input email yang sudah ada | Tampil error "Email sudah terdaftar" | |
| PUB-016 | Password tidak match | Password & konfirmasi berbeda | Tampil error "Password tidak sama" | |
| PUB-017 | Password terlalu pendek | Input password < 6 karakter | Tampil error "Password minimal 6 karakter" | |
| PUB-018 | Email format invalid | Input email tanpa @ | Tampil validasi email | |
| PUB-019 | Field kosong | Submit tanpa isi field wajib | Tampil validasi untuk setiap field | |
| PUB-020 | Register dengan Google | Klik tombol Google | Redirect ke Google OAuth | |

## 1.4 SearchPage (Halaman Pencarian)

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-021 | Search by keyword | Input nama tempat les | Tampil hasil yang sesuai | |
| PUB-022 | Filter by provinsi | Pilih provinsi | Tampil tempat les di provinsi tersebut | |
| PUB-023 | Filter by kota | Pilih provinsi lalu kota | Tampil tempat les di kota tersebut | |
| PUB-024 | Filter by kategori | Pilih kategori | Tampil tempat les kategori tersebut | |
| PUB-025 | Filter by tipe | Pilih Umum/Pribadi | Tampil sesuai tipe | |
| PUB-026 | Filter by harga | Pilih range harga | Tampil sesuai range | |
| PUB-027 | Filter by rating | Pilih minimal rating | Tampil rating >= pilihan | |
| PUB-028 | Sort by popular | Pilih sort popular | Urut berdasarkan jumlah siswa | |
| PUB-029 | Sort by newest | Pilih sort terbaru | Urut berdasarkan tanggal | |
| PUB-030 | Reset filter | Klik reset | Semua filter dikosongkan | |
| PUB-031 | Hasil kosong | Search yang tidak ada | Tampil "Tidak ada hasil" | |
| PUB-032 | Klik card hasil | Klik salah satu hasil | Redirect ke LesDetailPage | |

## 1.5 LesDetailPage (Detail Tempat Les)

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-033 | Tampilan detail | Buka halaman detail | Info lengkap, program, foto tampil | |
| PUB-034 | Lihat program | Scroll ke bagian program | Daftar program dengan harga tampil | |
| PUB-035 | Klik detail program | Klik salah satu program | Modal detail program terbuka | |
| PUB-036 | Daftar tanpa login | Klik daftar tanpa login | Redirect ke login atau tampil alert | |
| PUB-037 | Daftar dengan login | Login sebagai student, klik daftar | Modal booking terbuka | |
| PUB-038 | Lihat ulasan | Scroll ke bagian ulasan | Daftar ulasan tampil | |
| PUB-039 | Lihat lokasi peta | Scroll ke peta | Peta dengan marker tampil | |
| PUB-040 | Bagikan | Klik tombol share | Opsi share tampil | |

## 1.6 AboutPage, ContactPage, FAQPage, HowItWorksPage

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-041 | About page | Buka halaman About | Konten tentang Mariles tampil | |
| PUB-042 | Contact page | Buka halaman Contact | Form kontak dan info tampil | |
| PUB-043 | Submit contact form | Isi form kontak, submit | Pesan terkirim, tampil konfirmasi | |
| PUB-044 | FAQ page | Buka halaman FAQ | Daftar FAQ tampil | |
| PUB-045 | Expand FAQ | Klik salah satu FAQ | Jawaban expand/collapse | |
| PUB-046 | How it works | Buka halaman cara kerja | Langkah-langkah tampil | |

## 1.7 PartnerGuidePage, TeacherGuidePage

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-047 | Partner guide | Buka panduan partner | Panduan untuk owner tampil | |
| PUB-048 | Teacher guide | Buka panduan guru | Panduan untuk teacher tampil | |
| PUB-049 | Link daftar dari guide | Klik tombol daftar | Redirect ke RegisterPage | |

## 1.8 PrivacyPolicyPage, TermsPage

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-050 | Privacy policy | Buka halaman kebijakan privasi | Konten kebijakan tampil | |
| PUB-051 | Terms page | Buka halaman syarat ketentuan | Konten syarat ketentuan tampil | |

## 1.9 AuthCallback

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| PUB-052 | OAuth callback valid | Login via Google berhasil | User diarahkan ke dashboard | |
| PUB-053 | OAuth callback gagal | Token expired/invalid | Tampil error, redirect ke login | |

---

# BAGIAN 2: STUDENT (14 Halaman)

## 2.1 StudentDashboard

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-001 | Tampilan dashboard | Login sebagai student | Dashboard dengan statistik tampil | |
| STU-002 | Widget kelas aktif | Lihat widget kelas | Jumlah kelas aktif benar | |
| STU-003 | Widget progress | Lihat widget progress | Persentase progress tampil | |
| STU-004 | Klik shortcut | Klik menu cepat | Redirect ke halaman terkait | |

## 2.2 StudentMyClass & MyClassDetail

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-005 | Lihat kelas saya | Buka menu Kelas Saya | Daftar kelas yang diikuti tampil | |
| STU-006 | Filter kelas aktif | Pilih filter aktif | Tampil kelas yang masih aktif | |
| STU-007 | Filter kelas selesai | Pilih filter selesai | Tampil kelas yang sudah selesai | |
| STU-008 | Buka detail kelas | Klik salah satu kelas | Halaman detail kelas terbuka | |
| STU-009 | Lihat modul | Di detail, lihat modul | Daftar modul tampil | |
| STU-010 | Buka video | Klik video di modul | Video player terbuka | |
| STU-011 | Tandai selesai video | Tonton video sampai habis | Video ditandai selesai, progress update | |
| STU-012 | Buka quiz | Klik quiz di modul | Modal quiz terbuka | |
| STU-013 | Submit quiz | Jawab quiz, submit | Nilai tampil, jawaban tersimpan | |
| STU-014 | Lihat nilai | Buka tab nilai | Daftar nilai quiz dan tugas tampil | |

## 2.3 StudentBookings

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-015 | Lihat booking | Buka menu Booking | Daftar booking tampil | |
| STU-016 | Filter pending | Pilih filter pending | Tampil booking menunggu bayar | |
| STU-017 | Filter aktif | Pilih filter aktif | Tampil booking yang sudah aktif | |
| STU-018 | Lanjutkan bayar | Klik lanjutkan bayar di booking pending | Redirect ke payment gateway | |
| STU-019 | Batalkan booking | Klik batal di booking pending | Konfirmasi muncul, booking dibatalkan | |
| STU-020 | Detail booking | Klik detail booking | Modal detail booking terbuka | |

## 2.4 StudentPayment, PaymentPending, PaymentSuccess

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-021 | Proses payment | Pilih program, klik daftar | Form pembayaran tampil | |
| STU-022 | Pilih metode bayar | Pilih metode pembayaran | Detail pembayaran sesuai metode | |
| STU-023 | Apply voucher valid | Input kode voucher valid | Diskon diterapkan | |
| STU-024 | Apply voucher invalid | Input kode voucher salah | Tampil error "Voucher tidak valid" | |
| STU-025 | Submit payment | Submit pembayaran | Redirect ke payment gateway | |
| STU-026 | Payment pending | Setelah bayar di gateway | Redirect ke halaman pending | |
| STU-027 | Payment success | Pembayaran berhasil | Redirect ke halaman success, kelas aktif | |

## 2.5 StudentFavorites

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-028 | Lihat favorit | Buka menu Favorit | Daftar tempat les favorit tampil | |
| STU-029 | Tambah favorit | Di LesDetail, klik favorit | Tempat les ditambahkan ke favorit | |
| STU-030 | Hapus favorit | Klik hapus di daftar favorit | Tempat les dihapus dari favorit | |

## 2.6 StudentProgress

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-031 | Lihat progress | Buka menu Progress | Grafik progress belajar tampil | |
| STU-032 | Progress per kelas | Lihat detail per kelas | Persentase penyelesaian tampil | |
| STU-033 | Statistik keseluruhan | Lihat statistik | Total video, quiz, jam belajar tampil | |

## 2.7 StudentChat

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-034 | Buka chat | Buka menu Chat | Daftar percakapan tampil | |
| STU-035 | Pilih percakapan | Klik salah satu chat | Chat history tampil | |
| STU-036 | Kirim pesan | Ketik pesan, kirim | Pesan terkirim dan tampil | |
| STU-037 | Chat baru dengan guru | Klik chat dari detail kelas | Percakapan baru dengan guru dibuat | |

## 2.8 StudentForum

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-038 | Lihat forum | Buka menu Forum | Daftar post forum tampil | |
| STU-039 | Buat post baru | Klik buat post, isi, submit | Post baru tampil di forum | |
| STU-040 | Post tanpa judul | Submit tanpa judul | Tampil validasi "Judul harus diisi" | |
| STU-041 | Komentar post | Klik post, tulis komentar | Komentar tersimpan | |
| STU-042 | Hapus post sendiri | Klik hapus di post sendiri | Post dihapus | |

## 2.9 StudentQuiz

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-043 | Lihat quiz tersedia | Buka menu Quiz | Daftar quiz tampil | |
| STU-044 | Mulai quiz | Klik mulai quiz | Quiz dimulai, timer jalan | |
| STU-045 | Submit quiz | Jawab semua, submit | Nilai ditampilkan | |
| STU-046 | Quiz timeout | Biarkan timer habis | Quiz auto-submit | |

## 2.10 StudentProfile

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-047 | Lihat profil | Buka menu Profil | Data profil tampil | |
| STU-048 | Edit nama | Ubah nama, simpan | Nama berhasil diupdate | |
| STU-049 | Edit foto | Upload foto baru | Foto berhasil diupdate | |
| STU-050 | Edit pendidikan | Ubah jenjang & kelas | Data tersimpan | |
| STU-051 | Edit alamat | Ubah provinsi, kota, alamat | Data tersimpan | |
| STU-052 | Field wajib kosong | Kosongkan nama, simpan | Tampil validasi | |

## 2.11 StudentSettings

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| STU-053 | Ubah password | Input password lama & baru | Password berhasil diubah | |
| STU-054 | Password lama salah | Input password lama salah | Tampil error | |
| STU-055 | Notifikasi setting | Toggle notifikasi | Pengaturan tersimpan | |
| STU-056 | Logout | Klik logout | Redirect ke login page | |

---

# BAGIAN 3: TEACHER (12 Halaman)

## 3.1 TeacherDashboard

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-001 | Tampilan dashboard | Login sebagai teacher | Dashboard dengan statistik tampil | |
| TEA-002 | Widget jadwal hari ini | Lihat widget jadwal | Jadwal hari ini tampil | |
| TEA-003 | Widget siswa | Lihat widget siswa | Jumlah siswa benar | |
| TEA-004 | Widget pendapatan | Lihat widget pendapatan | Total pendapatan tampil | |

## 3.2 TeacherSchedule

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-005 | Lihat jadwal | Buka menu Jadwal | Kalender jadwal tampil | |
| TEA-006 | Tambah jadwal | Klik tambah, isi form | Jadwal baru tersimpan | |
| TEA-007 | Edit jadwal | Klik jadwal, edit | Perubahan tersimpan | |
| TEA-008 | Hapus jadwal | Klik hapus jadwal | Jadwal dihapus | |
| TEA-009 | Konflik jadwal | Buat jadwal yang overlap | Tampil warning konflik | |

## 3.3 TeacherStudents

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-010 | Lihat siswa | Buka menu Siswa | Daftar siswa tampil | |
| TEA-011 | Filter by kelas | Pilih filter kelas | Tampil siswa kelas tersebut | |
| TEA-012 | Search siswa | Cari nama siswa | Hasil pencarian tampil | |
| TEA-013 | Detail siswa | Klik siswa | Modal detail siswa terbuka | |
| TEA-014 | Lihat progress siswa | Di detail, lihat progress | Progress belajar siswa tampil | |

## 3.4 TeacherMaterials

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-015 | Lihat materi | Buka menu Materi | Daftar materi tampil | |
| TEA-016 | Tambah materi | Klik tambah, upload file | Materi tersimpan | |
| TEA-017 | Upload video | Upload file video | Video berhasil diupload | |
| TEA-018 | Upload dokumen | Upload file PDF/DOC | Dokumen berhasil diupload | |
| TEA-019 | Edit materi | Edit judul/deskripsi materi | Perubahan tersimpan | |
| TEA-020 | Hapus materi | Klik hapus materi | Materi dihapus | |
| TEA-021 | File size limit | Upload file > limit | Tampil error size limit | |

## 3.5 TeacherQuiz

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-022 | Lihat quiz | Buka menu Quiz | Daftar quiz tampil | |
| TEA-023 | Buat quiz baru | Klik tambah, isi form | Quiz tersimpan | |
| TEA-024 | Tambah pertanyaan | Tambah soal ke quiz | Soal tersimpan | |
| TEA-025 | Edit quiz | Edit quiz existing | Perubahan tersimpan | |
| TEA-026 | Hapus quiz | Klik hapus quiz | Quiz dihapus | |
| TEA-027 | Publish quiz | Aktifkan quiz | Quiz bisa diakses siswa | |
| TEA-028 | Unpublish quiz | Nonaktifkan quiz | Quiz tidak bisa diakses siswa | |

## 3.6 TeacherGrades

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-029 | Lihat nilai | Buka menu Nilai | Daftar nilai siswa tampil | |
| TEA-030 | Filter by quiz | Pilih quiz tertentu | Tampil nilai quiz tersebut | |
| TEA-031 | Detail nilai siswa | Klik nilai siswa | Detail jawaban tampil | |
| TEA-032 | Export nilai | Klik export | File Excel terdownload | |

## 3.7 TeacherAttendance

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-033 | Lihat absensi | Buka menu Absensi | Daftar absensi tampil | |
| TEA-034 | Tandai hadir | Klik hadir untuk siswa | Status absensi tersimpan | |
| TEA-035 | Tandai tidak hadir | Klik tidak hadir | Status absensi tersimpan | |
| TEA-036 | Rekap absensi | Lihat rekap bulanan | Statistik kehadiran tampil | |

## 3.8 TeacherPerformance

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-037 | Lihat performa | Buka menu Performa | Grafik performa tampil | |
| TEA-038 | Rating dari siswa | Lihat rating | Rating rata-rata tampil | |
| TEA-039 | Statistik mengajar | Lihat statistik | Jam mengajar, jumlah kelas tampil | |

## 3.9 TeacherFinance

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-040 | Lihat keuangan | Buka menu Keuangan | Ringkasan keuangan tampil | |
| TEA-041 | Riwayat transaksi | Lihat daftar transaksi | Daftar pembayaran tampil | |
| TEA-042 | Filter by periode | Pilih periode | Transaksi periode tersebut tampil | |

## 3.10 TeacherChat

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-043 | Buka chat | Buka menu Chat | Daftar percakapan tampil | |
| TEA-044 | Reply chat siswa | Balas pesan siswa | Pesan terkirim | |
| TEA-045 | Chat dengan owner | Buka chat owner | Percakapan dengan owner tampil | |

## 3.11 TeacherNotifications

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-046 | Lihat notifikasi | Buka menu Notifikasi | Daftar notifikasi tampil | |
| TEA-047 | Tandai dibaca | Klik notifikasi | Status berubah jadi dibaca | |
| TEA-048 | Hapus notifikasi | Klik hapus | Notifikasi dihapus | |

## 3.12 TeacherProfile

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| TEA-049 | Lihat profil | Buka menu Profil | Data profil tampil | |
| TEA-050 | Edit identitas | Ubah nama, telepon | Data tersimpan | |
| TEA-051 | Edit spesialisasi | Tambah/hapus bidang keahlian | Data tersimpan | |
| TEA-052 | Edit pendidikan | Ubah kualifikasi | Data tersimpan | |
| TEA-053 | Edit rekening | Ubah info bank | Data tersimpan | |
| TEA-054 | Kelengkapan 100% | Isi semua field | Persentase kelengkapan 100% | |

---

# BAGIAN 4: OWNER (13 Halaman)

## 4.1 OwnerDashboard

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-001 | Tampilan dashboard | Login sebagai owner | Dashboard dengan statistik tampil | |
| OWN-002 | Widget pendapatan | Lihat widget pendapatan | Total pendapatan tampil | |
| OWN-003 | Widget siswa | Lihat widget siswa | Jumlah siswa tampil | |
| OWN-004 | Widget guru | Lihat widget guru | Jumlah guru tampil | |
| OWN-005 | Grafik transaksi | Lihat grafik | Grafik pendapatan tampil | |

## 4.2 OwnerLesManagement

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-006 | Lihat tempat les | Buka menu Kelola Tempat Les | Detail tempat les tampil | |
| OWN-007 | Edit info tempat les | Ubah nama, deskripsi | Perubahan tersimpan | |
| OWN-008 | Edit alamat | Ubah alamat, kota, provinsi | Perubahan tersimpan | |
| OWN-009 | Upload logo | Upload gambar logo | Logo berhasil diupload | |
| OWN-010 | Upload foto | Upload foto tempat les | Foto berhasil diupload | |

## 4.3 OwnerPrograms

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-011 | Lihat program | Buka menu Program | Daftar program tampil | |
| OWN-012 | Tambah program | Klik tambah, isi form | Program tersimpan | |
| OWN-013 | Set harga program | Input harga | Harga tersimpan | |
| OWN-014 | Set jadwal program | Pilih hari dan jam | Jadwal tersimpan | |
| OWN-015 | Assign guru | Pilih guru untuk program | Guru ter-assign | |
| OWN-016 | Edit program | Edit program existing | Perubahan tersimpan | |
| OWN-017 | Hapus program | Klik hapus | Program dihapus | |
| OWN-018 | Aktifkan program | Toggle aktif | Program tampil di public | |
| OWN-019 | Nonaktifkan program | Toggle nonaktif | Program tidak tampil di public | |

## 4.4 OwnerTeachers

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-020 | Lihat guru | Buka menu Guru | Daftar guru tampil | |
| OWN-021 | Buat kode undangan | Klik buat kode | Kode undangan digenerate | |
| OWN-022 | Copy kode | Klik copy kode | Kode tercopy ke clipboard | |
| OWN-023 | Detail guru | Klik guru | Modal detail guru terbuka | |
| OWN-024 | Aktifkan guru | Toggle aktif | Guru aktif mengajar | |
| OWN-025 | Nonaktifkan guru | Toggle nonaktif | Guru tidak aktif | |

## 4.5 OwnerRegistrations

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-026 | Lihat pendaftaran | Buka menu Pendaftaran | Daftar registrasi tampil | |
| OWN-027 | Filter by status | Pilih status pending/aktif | Tampil sesuai filter | |
| OWN-028 | Filter by program | Pilih program | Tampil registrasi program tersebut | |
| OWN-029 | Detail registrasi | Klik registrasi | Detail pembayaran tampil | |

## 4.6 OwnerFinance

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-030 | Lihat keuangan | Buka menu Keuangan | Ringkasan keuangan tampil | |
| OWN-031 | Total pendapatan | Lihat kartu pendapatan | Total akurat | |
| OWN-032 | Filter by periode | Pilih bulan/tahun | Data periode tersebut tampil | |
| OWN-033 | Riwayat transaksi | Lihat tabel transaksi | Daftar transaksi tampil | |
| OWN-034 | Export laporan | Klik export | File Excel terdownload | |

## 4.7 OwnerStatistics

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-035 | Lihat statistik | Buka menu Statistik | Grafik dan angka tampil | |
| OWN-036 | Statistik siswa | Lihat data siswa | Trend pendaftaran tampil | |
| OWN-037 | Statistik pendapatan | Lihat grafik pendapatan | Trend pendapatan tampil | |
| OWN-038 | Statistik program | Lihat performa program | Program terpopuler tampil | |

## 4.8 OwnerReviews

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-039 | Lihat ulasan | Buka menu Ulasan | Daftar ulasan tampil | |
| OWN-040 | Rating rata-rata | Lihat rating | Rating akurat | |
| OWN-041 | Reply ulasan | Balas ulasan siswa | Balasan tersimpan | |
| OWN-042 | Filter by rating | Filter 1-5 bintang | Ulasan sesuai rating tampil | |

## 4.9 OwnerVouchers

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-043 | Lihat voucher | Buka menu Voucher | Daftar voucher tampil | |
| OWN-044 | Buat voucher | Klik tambah, isi form | Voucher tersimpan | |
| OWN-045 | Set diskon persen | Input diskon % | Diskon tersimpan | |
| OWN-046 | Set diskon nominal | Input diskon Rp | Diskon tersimpan | |
| OWN-047 | Set periode voucher | Input tanggal mulai-selesai | Periode tersimpan | |
| OWN-048 | Set kuota voucher | Input max penggunaan | Kuota tersimpan | |
| OWN-049 | Aktifkan voucher | Toggle aktif | Voucher bisa digunakan | |
| OWN-050 | Nonaktifkan voucher | Toggle nonaktif | Voucher tidak bisa digunakan | |
| OWN-051 | Hapus voucher | Klik hapus | Voucher dihapus | |

## 4.10 OwnerChat

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-052 | Buka chat | Buka menu Chat | Daftar percakapan tampil | |
| OWN-053 | Chat dengan guru | Pilih guru | Chat history tampil | |
| OWN-054 | Chat dengan siswa | Pilih siswa | Chat history tampil | |
| OWN-055 | Kirim pesan | Ketik dan kirim | Pesan terkirim | |

## 4.11 OwnerNotifications

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-056 | Lihat notifikasi | Buka menu Notifikasi | Daftar notifikasi tampil | |
| OWN-057 | Notif pendaftaran baru | Ada siswa daftar | Notif muncul | |
| OWN-058 | Notif pembayaran | Pembayaran sukses | Notif muncul | |
| OWN-059 | Tandai dibaca | Klik notifikasi | Status jadi dibaca | |

## 4.12 OwnerProfile

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-060 | Lihat profil | Buka menu Profil | Data profil tampil | |
| OWN-061 | Edit identitas | Ubah nama, telepon, NIK | Data tersimpan | |
| OWN-062 | Edit bisnis | Ubah nama usaha, tipe | Data tersimpan | |
| OWN-063 | Edit alamat | Ubah alamat lengkap | Data tersimpan | |
| OWN-064 | Edit rekening | Ubah info bank/e-wallet | Data tersimpan | |
| OWN-065 | Toggle aktif les | Toggle aktif/nonaktif | Status les berubah | |
| OWN-066 | Les nonaktif tidak tampil | Toggle nonaktif | Les tidak muncul di public | |

## 4.13 OwnerSettings

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| OWN-067 | Ubah password | Input password lama & baru | Password berubah | |
| OWN-068 | Setting notifikasi | Toggle pengaturan | Setting tersimpan | |
| OWN-069 | Hapus akun | Klik hapus akun | Konfirmasi muncul | |
| OWN-070 | Logout | Klik logout | Redirect ke login | |

---

# BAGIAN 5: ADMIN (11 Halaman)

## 5.1 AdminDashboard

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-001 | Tampilan dashboard | Login sebagai admin | Dashboard statistik tampil | |
| ADM-002 | Total users | Lihat widget users | Jumlah user akurat | |
| ADM-003 | Total tempat les | Lihat widget tempat les | Jumlah tempat les akurat | |
| ADM-004 | Pending verifikasi | Lihat pending | Jumlah menunggu verifikasi tampil | |
| ADM-005 | Grafik pertumbuhan | Lihat grafik | Trend tampil | |

## 5.2 AdminUsers

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-006 | Lihat users | Buka menu Pengguna | Daftar user tampil | |
| ADM-007 | Filter by role | Pilih role (student/teacher/owner) | User sesuai role tampil | |
| ADM-008 | Search user | Cari nama/email | Hasil pencarian tampil | |
| ADM-009 | Detail user | Klik user | Modal detail terbuka | |
| ADM-010 | Edit user | Edit data user | Perubahan tersimpan | |
| ADM-011 | Suspend user | Klik suspend | User tidak bisa login | |
| ADM-012 | Aktifkan user | Klik aktifkan | User bisa login kembali | |
| ADM-013 | Hapus user | Klik hapus | User dihapus | |

## 5.3 AdminLesPlaces

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-014 | Lihat tempat les | Buka menu Tempat Les | Daftar tempat les tampil | |
| ADM-015 | Filter verified | Pilih filter terverifikasi | Yang terverifikasi tampil | |
| ADM-016 | Filter pending | Pilih filter pending | Yang pending tampil | |
| ADM-017 | Filter rejected | Pilih filter ditolak | Yang ditolak tampil | |
| ADM-018 | Detail tempat les | Klik tempat les | Modal detail terbuka | |
| ADM-019 | Verifikasi tempat les | Klik verifikasi | Status jadi terverifikasi | |
| ADM-020 | Tolak verifikasi | Klik tolak, isi alasan | Status jadi ditolak | |
| ADM-021 | Tolak tanpa alasan | Klik tolak tanpa alasan | Tampil validasi wajib isi alasan | |
| ADM-022 | Hapus tempat les | Klik hapus | Tempat les dihapus | |

## 5.4 AdminCategories

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-023 | Lihat kategori | Buka menu Kategori | Daftar kategori tampil | |
| ADM-024 | Tambah kategori | Klik tambah, isi form | Kategori tersimpan | |
| ADM-025 | Upload icon | Upload gambar icon | Icon tersimpan | |
| ADM-026 | Edit kategori | Edit kategori existing | Perubahan tersimpan | |
| ADM-027 | Aktifkan kategori | Toggle aktif | Kategori tampil di public | |
| ADM-028 | Nonaktifkan kategori | Toggle nonaktif | Kategori tidak tampil | |
| ADM-029 | Hapus kategori | Klik hapus | Kategori dihapus | |

## 5.5 AdminBanners

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-030 | Lihat banner | Buka menu Banner | Daftar banner tampil | |
| ADM-031 | Tambah banner | Klik tambah, upload gambar | Banner tersimpan | |
| ADM-032 | Set link banner | Input link tujuan | Link tersimpan | |
| ADM-033 | Edit banner | Edit banner existing | Perubahan tersimpan | |
| ADM-034 | Aktifkan banner | Toggle aktif | Banner tampil di homepage | |
| ADM-035 | Nonaktifkan banner | Toggle nonaktif | Banner tidak tampil | |
| ADM-036 | Hapus banner | Klik hapus | Banner dihapus | |

## 5.6 AdminVouchers

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-037 | Lihat voucher | Buka menu Voucher | Daftar voucher tampil | |
| ADM-038 | Tambah voucher global | Buat voucher untuk semua | Voucher tersimpan | |
| ADM-039 | Edit voucher | Edit voucher existing | Perubahan tersimpan | |
| ADM-040 | Lihat penggunaan | Lihat statistik pemakaian | Data pemakaian tampil | |
| ADM-041 | Hapus voucher | Klik hapus | Voucher dihapus | |

## 5.7 AdminReports

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-042 | Lihat laporan | Buka menu Laporan | Daftar laporan tampil | |
| ADM-043 | Filter by tipe | Pilih tipe laporan | Laporan sesuai tipe tampil | |
| ADM-044 | Detail laporan | Klik laporan | Detail dan bukti tampil | |
| ADM-045 | Proses laporan | Tandai sedang diproses | Status berubah | |
| ADM-046 | Selesaikan laporan | Tandai selesai | Status jadi resolved | |
| ADM-047 | Tindak lanjut | Suspend user yang dilaporkan | User ter-suspend | |

## 5.8 AdminAnalytics

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-048 | Lihat analytics | Buka menu Analitik | Grafik dan data tampil | |
| ADM-049 | User growth | Lihat pertumbuhan user | Grafik trend tampil | |
| ADM-050 | Revenue analytics | Lihat grafik pendapatan | Data pendapatan tampil | |
| ADM-051 | Filter by periode | Pilih periode | Data periode tersebut tampil | |
| ADM-052 | Export data | Klik export | File terdownload | |

## 5.9 AdminModeration

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-053 | Lihat konten | Buka menu Moderasi | Konten untuk direview tampil | |
| ADM-054 | Approve konten | Klik approve | Konten disetujui | |
| ADM-055 | Reject konten | Klik reject | Konten ditolak | |
| ADM-056 | Hapus konten | Hapus konten violating | Konten dihapus | |

## 5.10 AdminNotifications

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-057 | Lihat notifikasi | Buka menu Notifikasi | Daftar notifikasi tampil | |
| ADM-058 | Kirim notif ke semua | Buat broadcast notification | Notif terkirim ke semua user | |
| ADM-059 | Kirim notif ke role | Kirim ke role tertentu | Notif terkirim ke role tersebut | |
| ADM-060 | Kirim notif ke user | Kirim ke user spesifik | Notif terkirim ke user tersebut | |

## 5.11 AdminSettings

| ID | Judul Test Case | Langkah | Expected Result | Status |
|----|-----------------|---------|-----------------|--------|
| ADM-061 | Pengaturan sistem | Buka menu Pengaturan | Setting tampil | |
| ADM-062 | Ubah info aplikasi | Edit nama/deskripsi app | Perubahan tersimpan | |
| ADM-063 | Ubah kontak | Edit email/telepon support | Perubahan tersimpan | |
| ADM-064 | Toggle maintenance | Aktifkan mode maintenance | User tidak bisa akses | |
| ADM-065 | Logout | Klik logout | Redirect ke login | |

---

# RINGKASAN

| Bagian | Jumlah Test Case |
|--------|------------------|
| Public | 53 |
| Student | 56 |
| Teacher | 54 |
| Owner | 70 |
| Admin | 65 |
| **TOTAL** | **298** |
