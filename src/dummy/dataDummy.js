// Dummy Data 20 Tempat Les AKADEMIK
// Gambar dari folder public/Gambar

const generateId = () => 'dummy-' + Math.random().toString(36).substr(2, 9)

// Data 20 tempat les dengan nama dan nomor gambar spesifik
const lesPlacesData = [
  // 1. Ganesha Cendekia - Gambar 23
  {
    id: generateId(),
    name: 'Ganesha Cendekia',
    thumbnail: '/Gambar/gambar_23.png',
    description: 'Lembaga bimbingan belajar terkemuka dengan tradisi panjang dalam mencetak prestasi akademik. Menggunakan kurikulum terstruktur yang telah terbukti efektif selama lebih dari 15 tahun. Fokus pada pemahaman konsep mendalam dan persiapan ujian nasional.',
    type: 'offline',
    address: 'Jl. Sudirman No. 45',
    city: 'JAKARTA SELATAN',
    district: 'Kebayoran Baru',
    facilities: ['AC', 'WiFi', 'Perpustakaan', 'Ruang Diskusi', 'Lab Komputer'],
    highlights: ['Guru Berpengalaman 10+ Tahun', 'Kurikulum Nasional Plus', 'Tryout Berkala'],
    rating: 4.9,
    review_count: 234,
    student_count: 847,
    programs: [
      { name: 'Bimbel SD Reguler', description: 'Bimbingan belajar lengkap untuk siswa SD kelas 1-6', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 12, subject: 'Semua Mapel' },
      { name: 'Bimbel SMP Intensif', description: 'Program intensif SMP dengan fokus UN dan persiapan SMA', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Semua Mapel' },
      { name: 'Persiapan UN SMA', description: 'Program super intensif menghadapi Ujian Nasional SMA', price: 750000, price_type: 'monthly', duration_months: 4, sessions_per_week: 5, level: 'advanced', capacity: 10, current_students: 9, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Dr. Bambang Sutrisno', education: 'S3 Pendidikan Matematika UPI', experience_years: 18, specializations: ['Matematika', 'Olimpiade'], bio: 'Pembimbing OSN Matematika tingkat nasional' },
      { name: 'Ir. Susi Handayani, M.Pd', education: 'S2 Pendidikan IPA ITB', experience_years: 15, specializations: ['Fisika', 'Kimia'], bio: 'Mantan guru SMA Negeri unggulan' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya diterima di SMA unggulan berkat bimbingan di sini!', student_name: 'Ibu Ratna', program_name: 'Bimbel SMP Intensif', created_at: '2025-12-15' },
      { rating: 5, comment: 'Metode pengajarannya sangat bagus, anak jadi paham konsep.', student_name: 'Bapak Ahmad', program_name: 'Bimbel SD Reguler', created_at: '2025-12-20' }
    ]
  },

  // 2. Bina Prestasi Mandiri - Gambar 30
  {
    id: generateId(),
    name: 'Bina Prestasi Mandiri',
    thumbnail: '/Gambar/gambar_30.png',
    description: 'Pusat pendidikan yang berfokus pada pengembangan potensi akademik siswa secara mandiri. Metode pembelajaran active learning yang mendorong siswa untuk berpikir kritis.',
    type: 'hybrid',
    address: 'Jl. Dago No. 128',
    city: 'BANDUNG',
    district: 'Coblong',
    facilities: ['AC', 'WiFi', 'Smart Board', 'E-Learning Platform', 'Perpustakaan Digital'],
    highlights: ['Active Learning Method', 'Progress Report Mingguan', 'Konsultasi Orang Tua'],
    rating: 4.8,
    review_count: 189,
    student_count: 623,
    programs: [
      { name: 'Matematika SD-SMP', description: 'Pendalaman matematika dengan metode Singapore Math', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'beginner', capacity: 12, current_students: 10, subject: 'Matematika' },
      { name: 'IPA Terpadu SMP', description: 'Fisika, Kimia, Biologi terintegrasi dengan praktikum', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 10, current_students: 8, subject: 'IPA' }
    ],
    teachers: [
      { name: 'Drs. Hendra Wijaya, M.Si', education: 'S2 Matematika ITB', experience_years: 20, specializations: ['Matematika', 'Statistika'], bio: 'Dosen matematika berpengalaman' }
    ],
    reviews: [
      { rating: 5, comment: 'Metode Singapore Math-nya sangat efektif!', student_name: 'Ibu Melani', program_name: 'Matematika SD-SMP', created_at: '2025-12-18' }
    ]
  },

  // 3. Insan Unggul Education - Gambar 28
  {
    id: generateId(),
    name: 'Insan Unggul Education',
    thumbnail: '/Gambar/gambar_28.png',
    description: 'Lembaga pendidikan yang bertujuan mencetak generasi unggul dengan karakter dan prestasi akademik yang seimbang. Program komprehensif dari SD hingga persiapan PTN.',
    type: 'offline',
    address: 'Jl. Pemuda No. 67',
    city: 'SURABAYA',
    district: 'Genteng',
    facilities: ['AC', 'WiFi', 'Lab IPA', 'Ruang Ujian CBT', 'Kantin Sehat'],
    highlights: ['Pendidikan Karakter', 'Program Beasiswa', 'Alumni Network Kuat'],
    rating: 4.7,
    review_count: 167,
    student_count: 912,
    programs: [
      { name: 'Program Unggulan SMA', description: 'Persiapan maksimal untuk siswa SMA menuju PTN favorit', price: 650000, price_type: 'monthly', duration_months: 12, sessions_per_week: 4, level: 'advanced', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Bahasa Inggris Akademik', description: 'TOEFL dan IELTS preparation untuk pelajar', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Bahasa Inggris' }
    ],
    teachers: [
      { name: 'Prof. Dr. Agus Salim', education: 'S3 Pendidikan UNAIR', experience_years: 25, specializations: ['Kurikulum', 'Assessment'], bio: 'Pakar pendidikan dengan pengalaman 25 tahun' }
    ],
    reviews: [
      { rating: 5, comment: 'Program beasiswanya sangat membantu!', student_name: 'Bapak Kurniawan', program_name: 'Program Unggulan SMA', created_at: '2025-12-22' }
    ]
  },

  // 4. Graha Ilmu Nusantara - Gambar 1
  {
    id: generateId(),
    name: 'Graha Ilmu Nusantara',
    thumbnail: '/Gambar/gambar_1.png',
    description: 'Institusi bimbingan belajar dengan jangkauan nasional. Standar pendidikan tinggi dengan kurikulum yang disesuaikan dengan kebutuhan lokal setiap daerah.',
    type: 'hybrid',
    address: 'Jl. Malioboro No. 45',
    city: 'YOGYAKARTA',
    district: 'Gondokusuman',
    facilities: ['AC', 'WiFi', 'Video Conference', 'LMS Online', 'Tryout Center'],
    highlights: ['Jaringan Nasional', 'Kurikulum Adaptif', 'Guru Tersertifikasi'],
    rating: 4.6,
    review_count: 145,
    student_count: 456,
    programs: [
      { name: 'Bimbel SD Cerdas', description: 'Program bimbel SD dengan pendekatan fun learning', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 13, subject: 'Semua Mapel' },
      { name: 'Bimbel SMP Plus', description: 'Bimbingan lengkap SMP dengan enrichment program', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 11, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Dra. Widyastuti, M.Pd', education: 'S2 Pendidikan UNY', experience_years: 16, specializations: ['Bahasa Indonesia', 'Sastra'], bio: 'Guru bahasa dengan metode pengajaran kreatif' }
    ],
    reviews: [
      { rating: 4, comment: 'Bagus untuk anak SD, metodenya tidak membosankan.', student_name: 'Ibu Wati', program_name: 'Bimbel SD Cerdas', created_at: '2025-12-19' }
    ]
  },

  // 5. Wiyata Mandala - Gambar 5
  {
    id: generateId(),
    name: 'Wiyata Mandala',
    thumbnail: '/Gambar/gambar_5.png',
    description: 'Bimbingan belajar dengan filosofi pendidikan holistik. Mengembangkan kemampuan akademik sekaligus soft skills yang dibutuhkan di abad 21.',
    type: 'offline',
    address: 'Jl. Diponegoro No. 89',
    city: 'SEMARANG',
    district: 'Semarang Tengah',
    facilities: ['AC', 'WiFi', 'Ruang Presentasi', 'Lab Bahasa', 'Perpustakaan'],
    highlights: ['Pendidikan Holistik', '21st Century Skills', 'Small Class Size'],
    rating: 4.8,
    review_count: 156,
    student_count: 789,
    programs: [
      { name: 'Kelas Olimpiade Sains', description: 'Persiapan OSN bidang Matematika, Fisika, Kimia, Biologi', price: 750000, price_type: 'monthly', duration_months: 8, sessions_per_week: 3, level: 'advanced', capacity: 8, current_students: 7, subject: 'Sains' },
      { name: 'English Mastery', description: 'Program bahasa Inggris dari basic sampai advanced', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 10, current_students: 9, subject: 'Bahasa Inggris' }
    ],
    teachers: [
      { name: 'Dr. Rina Maharani', education: 'S3 Biologi UNDIP', experience_years: 14, specializations: ['Biologi', 'OSN'], bio: 'Pembimbing OSN Biologi dengan banyak medalis' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya juara 2 OSN Biologi tingkat provinsi!', student_name: 'Ibu Sinta', program_name: 'Kelas Olimpiade Sains', created_at: '2025-12-25' }
    ]
  },

  // 6. Cahaya Intelektual - Gambar 22
  {
    id: generateId(),
    name: 'Cahaya Intelektual',
    thumbnail: '/Gambar/gambar_22.png',
    description: 'Pusat bimbingan belajar yang menekankan pada pengembangan kecerdasan intelektual dan emosional. Metode pembelajaran disesuaikan dengan gaya belajar masing-masing siswa.',
    type: 'offline',
    address: 'Jl. Ahmad Yani No. 56',
    city: 'MALANG',
    district: 'Klojen',
    facilities: ['AC', 'WiFi', 'Ruang Konseling', 'Area Belajar Outdoor', 'Kantin'],
    highlights: ['Personalized Learning', 'Psikolog Pendidikan', 'Outdoor Learning'],
    rating: 4.7,
    review_count: 134,
    student_count: 534,
    programs: [
      { name: 'Bimbel Privat Excellence', description: 'Les privat 1-on-1 dengan program yang dipersonalisasi', price: 300000, price_type: 'per_session', duration_months: 3, sessions_per_week: 2, level: 'all', capacity: 1, current_students: 1, subject: 'Semua Mapel' },
      { name: 'Kelas Remedial', description: 'Program khusus untuk siswa yang membutuhkan penguatan materi', price: 400000, price_type: 'monthly', duration_months: 3, sessions_per_week: 3, level: 'beginner', capacity: 8, current_students: 6, subject: 'Matematika & IPA' }
    ],
    teachers: [
      { name: 'Psikolog Andini, M.Psi', education: 'S2 Psikologi Pendidikan UM', experience_years: 10, specializations: ['Learning Style', 'Konseling'], bio: 'Psikolog pendidikan yang memahami kebutuhan belajar setiap anak' }
    ],
    reviews: [
      { rating: 5, comment: 'Program remedialnya sangat membantu anak saya yang sempat tertinggal.', student_name: 'Ibu Dewi', program_name: 'Kelas Remedial', created_at: '2025-12-23' }
    ]
  },

  // 7. Persada Edukasi - Gambar 26
  {
    id: generateId(),
    name: 'Persada Edukasi',
    thumbnail: '/Gambar/gambar_26.png',
    description: 'Lembaga bimbingan belajar dengan standar nasional. Fokus pada persiapan ujian dan kompetisi akademik dengan metode drilling yang efektif.',
    type: 'offline',
    address: 'Jl. Gatot Subroto No. 100',
    city: 'MEDAN',
    district: 'Medan Petisah',
    facilities: ['AC', 'WiFi', 'Bank Soal Digital', 'Ruang CBT', 'Parkir Luas'],
    highlights: ['Drilling Method', 'Bank Soal 100.000+', 'Simulasi UN/UTBK'],
    rating: 4.6,
    review_count: 123,
    student_count: 678,
    programs: [
      { name: 'Drilling UN SMP', description: 'Latihan soal intensif persiapan UN SMP', price: 500000, price_type: 'monthly', duration_months: 4, sessions_per_week: 4, level: 'intermediate', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Drilling UN SMA', description: 'Latihan soal super intensif UN SMA', price: 600000, price_type: 'monthly', duration_months: 4, sessions_per_week: 5, level: 'advanced', capacity: 12, current_students: 12, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Drs. Parlindungan, M.Pd', education: 'S2 Pendidikan USU', experience_years: 22, specializations: ['Assessment', 'Evaluasi'], bio: 'Ahli penyusunan soal dengan pengalaman 20+ tahun' }
    ],
    reviews: [
      { rating: 4, comment: 'Bank soalnya lengkap banget! Sangat membantu persiapan UN.', student_name: 'Bapak Siregar', program_name: 'Drilling UN SMA', created_at: '2025-12-20' }
    ]
  },

  // 8. Duta Pelajar Indonesia - Gambar 21
  {
    id: generateId(),
    name: 'Duta Pelajar Indonesia',
    thumbnail: '/Gambar/gambar_21.png',
    description: 'Bimbingan belajar yang fokus pada pengembangan siswa Indonesia berkualitas global. Program bilingual dan persiapan sekolah internasional.',
    type: 'hybrid',
    address: 'Jl. Panglima Sudirman No. 78',
    city: 'MAKASSAR',
    district: 'Makassar',
    facilities: ['AC', 'WiFi', 'International Curriculum Materials', 'Video Conference', 'Library'],
    highlights: ['Bilingual Program', 'International Standard', 'Cambridge Prep'],
    rating: 4.8,
    review_count: 112,
    student_count: 423,
    programs: [
      { name: 'Cambridge Primary', description: 'Persiapan Cambridge Primary Checkpoint', price: 850000, price_type: 'monthly', duration_months: 12, sessions_per_week: 3, level: 'beginner', capacity: 10, current_students: 8, subject: 'Kurikulum Cambridge' },
      { name: 'IGCSE Preparation', description: 'Persiapan ujian IGCSE untuk berbagai mata pelajaran', price: 950000, price_type: 'monthly', duration_months: 12, sessions_per_week: 4, level: 'intermediate', capacity: 8, current_students: 7, subject: 'IGCSE Subjects' }
    ],
    teachers: [
      { name: 'Ms. Sarah Johnson', education: 'MA Education, University of Melbourne', experience_years: 12, specializations: ['Cambridge Curriculum', 'IGCSE'], bio: 'Certified Cambridge teacher dengan pengalaman internasional' }
    ],
    reviews: [
      { rating: 5, comment: 'Program Cambridge-nya berkualitas! Anak saya diterima di sekolah internasional.', student_name: 'Ibu Fatimah', program_name: 'Cambridge Primary', created_at: '2025-12-21' }
    ]
  },

  // 9. Mitra Cendekia - Gambar 7
  {
    id: generateId(),
    name: 'Mitra Cendekia',
    thumbnail: '/Gambar/gambar_7.png',
    description: 'Bimbel yang menjadi mitra terpercaya orang tua dalam mendampingi pendidikan anak. Komunikasi intensif dengan orang tua dan laporan perkembangan berkala.',
    type: 'offline',
    address: 'Jl. Pahlawan No. 34',
    city: 'DENPASAR',
    district: 'Denpasar Selatan',
    facilities: ['AC', 'WiFi', 'Parent Lounge', 'Report System Online', 'CCTV'],
    highlights: ['Parent Partnership', 'Progress Tracking', 'Safe Environment'],
    rating: 4.5,
    review_count: 98,
    student_count: 567,
    programs: [
      { name: 'Bimbel SD Terpadu', description: 'Bimbingan semua mata pelajaran SD dengan report mingguan', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 12, current_students: 10, subject: 'Semua Mapel' },
      { name: 'Bimbel SMP Terpadu', description: 'Bimbingan lengkap SMP dengan konsultasi orang tua rutin', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 10, current_students: 9, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Ni Ketut Ayu, S.Pd', education: 'S1 Pendidikan Matematika Undiksha', experience_years: 11, specializations: ['Matematika SD-SMP', 'Parenting Education'], bio: 'Guru yang aktif berkomunikasi dengan orang tua siswa' }
    ],
    reviews: [
      { rating: 4, comment: 'Senang sekali ada laporan mingguan, jadi tahu perkembangan anak.', student_name: 'Ibu Putu', program_name: 'Bimbel SD Terpadu', created_at: '2025-12-24' }
    ]
  },

  // 10. Lembaga Pendidikan Tunas Bangsa - Gambar 2
  {
    id: generateId(),
    name: 'Lembaga Pendidikan Tunas Bangsa',
    thumbnail: '/Gambar/gambar_2.png',
    description: 'Lembaga pendidikan dengan visi mencetak tunas bangsa yang cerdas dan berkarakter. Program lengkap dari jenjang SD hingga persiapan kuliah.',
    type: 'offline',
    address: 'Jl. Veteran No. 90',
    city: 'PALEMBANG',
    district: 'Ilir Timur I',
    facilities: ['AC', 'WiFi', 'Gedung 3 Lantai', 'Aula', 'Perpustakaan', 'Lab Komputer'],
    highlights: ['Gedung Representatif', 'Guru Senior', 'Track Record 20 Tahun'],
    rating: 4.7,
    review_count: 178,
    student_count: 891,
    programs: [
      { name: 'Program Reguler SD', description: 'Bimbingan belajar SD dengan kurikulum nasional plus', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Program Reguler SMP', description: 'Bimbingan belajar SMP persiapan UN dan SMA favorit', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 11, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Drs. Harun Yahya, M.Pd', education: 'S2 Pendidikan Unsri', experience_years: 28, specializations: ['Manajemen Pendidikan', 'IPS'], bio: 'Pendiri lembaga dengan pengalaman 28 tahun di dunia pendidikan' }
    ],
    reviews: [
      { rating: 5, comment: 'Bimbel legendaris di Palembang! Banyak alumni yang sukses.', student_name: 'Bapak Rudi', program_name: 'Program Reguler SMP', created_at: '2025-12-26' }
    ]
  },

  // 11. Bright Future Learning Center - Gambar 20
  {
    id: generateId(),
    name: 'Bright Future Learning Center',
    thumbnail: '/Gambar/gambar_20.png',
    description: 'Pusat pembelajaran bahasa Inggris premium dengan native speaker dan certified teachers. Program TOEFL, IELTS, dan English for Academic Purposes.',
    type: 'offline',
    address: 'Jl. Kemang Raya No. 45',
    city: 'JAKARTA SELATAN',
    district: 'Kemang',
    facilities: ['AC', 'WiFi', 'Language Lab', 'Recording Studio', 'Library'],
    highlights: ['Native Speaker', 'IELTS Official Partner', 'Small Class 6 Siswa'],
    rating: 4.8,
    review_count: 198,
    student_count: 987,
    programs: [
      { name: 'IELTS Preparation', description: 'Program intensif IELTS dengan target band 7.0+', price: 950000, price_type: 'monthly', duration_months: 3, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 7, subject: 'IELTS' },
      { name: 'TOEFL iBT Mastery', description: 'Persiapan TOEFL iBT dengan target 100+', price: 850000, price_type: 'monthly', duration_months: 3, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 6, subject: 'TOEFL' }
    ],
    teachers: [
      { name: 'James Mitchell', education: 'MA TESOL, University of Cambridge', experience_years: 15, specializations: ['IELTS', 'Academic Writing'], bio: 'Native speaker dengan sertifikasi CELTA' }
    ],
    reviews: [
      { rating: 5, comment: 'IELTS saya naik dari 6.0 ke 7.5 dalam 3 bulan! Amazing!', student_name: 'Ricky Setiawan', program_name: 'IELTS Preparation', created_at: '2025-12-18' }
    ]
  },

  // 12. EduFocus - Gambar 29
  {
    id: generateId(),
    name: 'EduFocus',
    thumbnail: '/Gambar/gambar_29.png',
    description: 'Bimbingan belajar dengan fokus maksimal pada hasil. Drilling system dan tryout berkala untuk memastikan kesiapan siswa menghadapi ujian.',
    type: 'hybrid',
    address: 'Jl. Asia Afrika No. 100',
    city: 'BANDUNG',
    district: 'Sumur Bandung',
    facilities: ['AC', 'WiFi', 'CBT Lab', 'Study Pod Individual', 'Consultation Room'],
    highlights: ['Fokus pada Hasil', 'Weekly Tryout', 'Personal Consultation'],
    rating: 4.7,
    review_count: 167,
    student_count: 654,
    programs: [
      { name: 'Focus UTBK', description: 'Program super fokus persiapan UTBK dengan drilling intensif', price: 750000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 15, current_students: 14, subject: 'UTBK' },
      { name: 'Focus UN SMA', description: 'Drilling UN SMA dengan target nilai maksimal', price: 600000, price_type: 'monthly', duration_months: 4, sessions_per_week: 4, level: 'advanced', capacity: 15, current_students: 13, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Drs. Eko Susanto, M.Pd', education: 'S2 Pendidikan ITB', experience_years: 18, specializations: ['UTBK', 'Assessment'], bio: 'Ahli strategi menjawab soal UTBK dengan metode cepat dan akurat' }
    ],
    reviews: [
      { rating: 5, comment: 'Tryout mingguannya bikin saya terbiasa dengan tekanan ujian!', student_name: 'Dinda', program_name: 'Focus UTBK', created_at: '2025-12-19' }
    ]
  },

  // 13. Quantum Cerdas - Gambar 24
  {
    id: generateId(),
    name: 'Quantum Cerdas',
    thumbnail: '/Gambar/gambar_24.png',
    description: 'Bimbel matematika dan sains dengan pendekatan quantum learning. Memaksimalkan potensi otak melalui teknik belajar yang scientifically proven.',
    type: 'offline',
    address: 'Jl. Raya Darmo No. 56',
    city: 'SURABAYA',
    district: 'Wonokromo',
    facilities: ['AC', 'WiFi', 'Brain Gym Room', 'Lab Sains', 'Relaxation Corner'],
    highlights: ['Quantum Learning', 'Brain Optimization', 'Stress-Free Learning'],
    rating: 4.8,
    review_count: 145,
    student_count: 432,
    programs: [
      { name: 'Quantum Math', description: 'Matematika dengan teknik quantum learning untuk pemahaman cepat', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 12, current_students: 11, subject: 'Matematika' },
      { name: 'Quantum Physics', description: 'Fisika dengan visualisasi dan eksperimen interaktif', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 10, current_students: 9, subject: 'Fisika' }
    ],
    teachers: [
      { name: 'Dr. Ferry Santoso', education: 'S3 Fisika ITS', experience_years: 14, specializations: ['Quantum Learning', 'Fisika'], bio: 'Trainer NLP dan quantum learning untuk pendidikan' }
    ],
    reviews: [
      { rating: 5, comment: 'Metode belajarnya unik! Matematika jadi tidak menakutkan.', student_name: 'Ibu Lina', program_name: 'Quantum Math', created_at: '2025-12-21' }
    ]
  },

  // 14. Prime Generation - Gambar 8
  {
    id: generateId(),
    name: 'Prime Generation',
    thumbnail: '/Gambar/gambar_8.png',
    description: 'Membentuk generasi prima yang siap bersaing di era global. Program bilingual dan persiapan sekolah luar negeri.',
    type: 'hybrid',
    address: 'Jl. Gejayan No. 78',
    city: 'YOGYAKARTA',
    district: 'Sleman',
    facilities: ['AC', 'WiFi', 'International Corner', 'Video Conference', 'E-Library'],
    highlights: ['Bilingual Program', 'Study Abroad Prep', 'Global Mindset'],
    rating: 4.6,
    review_count: 123,
    student_count: 765,
    programs: [
      { name: 'SAT Preparation', description: 'Persiapan SAT untuk kuliah di Amerika', price: 1200000, price_type: 'monthly', duration_months: 4, sessions_per_week: 4, level: 'advanced', capacity: 10, current_students: 8, subject: 'SAT' },
      { name: 'A-Level Prep', description: 'Persiapan ujian A-Level berbagai mata pelajaran', price: 1100000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 7, subject: 'A-Level' }
    ],
    teachers: [
      { name: 'Dr. Melissa Stanford', education: 'PhD Education, Stanford', experience_years: 16, specializations: ['SAT', 'College Admission'], bio: 'Konsultan pendidikan luar negeri dengan jaringan universitas global' }
    ],
    reviews: [
      { rating: 5, comment: 'SAT score 1480! Sekarang kuliah di UCLA berkat Prime Generation.', student_name: 'Randy', program_name: 'SAT Preparation', created_at: '2025-12-23' }
    ]
  },

  // 15. Alpha Education - Gambar 4
  {
    id: generateId(),
    name: 'Alpha Education',
    thumbnail: '/Gambar/gambar_4.png',
    description: 'Bimbel untuk calon alpha generation. Mengintegrasikan STEM education dengan soft skills untuk abad 21.',
    type: 'offline',
    address: 'Jl. Candi Prambanan No. 45',
    city: 'SEMARANG',
    district: 'Pedurungan',
    facilities: ['AC', 'WiFi', 'STEM Lab', 'Maker Space', 'Presentation Room'],
    highlights: ['STEM Education', '21st Century Skills', 'Project-Based Learning'],
    rating: 4.7,
    review_count: 134,
    student_count: 543,
    programs: [
      { name: 'STEM Explorer', description: 'Eksplorasi sains, teknologi, engineering, dan matematika', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'beginner', capacity: 12, current_students: 10, subject: 'STEM' },
      { name: 'Coding for Kids', description: 'Pengenalan coding dan computational thinking', price: 500000, price_type: 'monthly', duration_months: 4, sessions_per_week: 2, level: 'beginner', capacity: 10, current_students: 9, subject: 'Coding' }
    ],
    teachers: [
      { name: 'Ir. Raka Putra', education: 'S1 Teknik Informatika UNDIP', experience_years: 8, specializations: ['Coding', 'Robotics'], bio: 'Software engineer yang passionate mengajar anak-anak coding' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya jadi suka sains dan teknologi! Project-nya seru-seru.', student_name: 'Ibu Diana', program_name: 'STEM Explorer', created_at: '2025-12-24' }
    ]
  },

  // 16. Master Class Academy - Gambar 9
  {
    id: generateId(),
    name: 'Master Class Academy',
    thumbnail: '/Gambar/gambar_9.png',
    description: 'Bimbel premium dengan pengajar master di bidangnya. Kelas eksklusif dengan rasio guru-murid 1:5.',
    type: 'offline',
    address: 'Jl. Ijen No. 23',
    city: 'MALANG',
    district: 'Klojen',
    facilities: ['AC', 'WiFi', 'VIP Study Room', 'Private Library', 'Refreshment'],
    highlights: ['Master Teachers', 'Exclusive Class', 'Personal Mentor'],
    rating: 4.9,
    review_count: 89,
    student_count: 876,
    programs: [
      { name: 'Master Olympiad', description: 'Program olimpiade dengan pembimbing medalis internasional', price: 1500000, price_type: 'monthly', duration_months: 8, sessions_per_week: 3, level: 'advanced', capacity: 5, current_students: 5, subject: 'Olimpiade' },
      { name: 'Master UTBK', description: 'UTBK dengan mentor yang lolos PTN top 3', price: 1000000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'advanced', capacity: 6, current_students: 6, subject: 'UTBK' }
    ],
    teachers: [
      { name: 'Dr. Genius Olimpiader', education: 'S3 Matematika MIT', experience_years: 20, specializations: ['IMO', 'Olimpiade Matematika'], bio: 'Peraih medali emas IMO dan pembimbing tim nasional Indonesia' }
    ],
    reviews: [
      { rating: 5, comment: 'Dibimbing langsung oleh medalis IMO! Experience luar biasa!', student_name: 'Kevin', program_name: 'Master Olympiad', created_at: '2025-12-25' }
    ]
  },

  // 17. Logic House - Gambar 3
  {
    id: generateId(),
    name: 'Logic House',
    thumbnail: '/Gambar/gambar_3.png',
    description: 'Pusat pengembangan logika dan penalaran. Fokus pada matematika, logika, dan critical thinking.',
    type: 'online',
    address: 'Jl. Teuku Umar No. 67',
    city: 'DENPASAR',
    district: 'Denpasar Barat',
    facilities: ['Video Conference', 'Logic Games Digital', 'Online Puzzle Library', 'Discussion Forum'],
    highlights: ['Logic Training', 'Critical Thinking', 'Problem Solving'],
    rating: 4.6,
    review_count: 112,
    student_count: 321,
    programs: [
      { name: 'Logic Master', description: 'Pelatihan logika dan penalaran untuk tes potensi', price: 500000, price_type: 'monthly', duration_months: 4, sessions_per_week: 2, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Logika' },
      { name: 'Math Reasoning', description: 'Matematika dengan fokus pada penalaran bukan rumus', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 10, current_students: 9, subject: 'Matematika' }
    ],
    teachers: [
      { name: 'Prof. Logic Master', education: 'S3 Filsafat UGM', experience_years: 22, specializations: ['Logika', 'Filosofi'], bio: 'Profesor logika dengan pendekatan unik dalam pengajaran matematika' }
    ],
    reviews: [
      { rating: 4, comment: 'Belajar logika di sini bikin TPA saya naik drastis!', student_name: 'Agus', program_name: 'Logic Master', created_at: '2025-12-26' }
    ]
  },

  // 18. Brilliant Mind Center - Gambar 27
  {
    id: generateId(),
    name: 'Brilliant Mind Center',
    thumbnail: '/Gambar/gambar_27.png',
    description: 'Mengasah kecerdasan melalui metode mind mapping dan accelerated learning. Program untuk anak gifted dan talented.',
    type: 'offline',
    address: 'Jl. Setiabudi No. 89',
    city: 'BANDUNG',
    district: 'Cidadap',
    facilities: ['AC', 'WiFi', 'Mind Mapping Studio', 'Creative Room', 'Quiet Zone'],
    highlights: ['Gifted Program', 'Mind Mapping', 'Accelerated Learning'],
    rating: 4.8,
    review_count: 98,
    student_count: 654,
    programs: [
      { name: 'Gifted & Talented', description: 'Program khusus anak berbakat dengan enrichment curriculum', price: 800000, price_type: 'monthly', duration_months: 12, sessions_per_week: 2, level: 'advanced', capacity: 8, current_students: 7, subject: 'Enrichment' },
      { name: 'Speed Learning', description: 'Teknik belajar cepat dengan memory palace dan mind mapping', price: 600000, price_type: 'monthly', duration_months: 3, sessions_per_week: 2, level: 'all', capacity: 10, current_students: 8, subject: 'Learning Skills' }
    ],
    teachers: [
      { name: 'Dr. Mind Expert', education: 'S3 Psikologi Kognitif UI', experience_years: 15, specializations: ['Gifted Education', 'Cognitive Training'], bio: 'Psikolog kognitif spesialis pengembangan anak berbakat' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya teridentifikasi gifted di sini dan mendapat program yang tepat!', student_name: 'Ibu Sandra', program_name: 'Gifted & Talented', created_at: '2025-12-27' }
    ]
  },

  // 19. Global Prestasi - Gambar 10
  {
    id: generateId(),
    name: 'Global Prestasi',
    thumbnail: '/Gambar/gambar_10.png',
    description: 'Bimbel dengan standar internasional untuk siswa yang mengincar prestasi global. Partner dengan berbagai universitas luar negeri.',
    type: 'hybrid',
    address: 'Jl. HR Muhammad No. 123',
    city: 'SURABAYA',
    district: 'Sukomanunggal',
    facilities: ['AC', 'WiFi', 'Global Resource Center', 'Video Conference', 'Alumni Network'],
    highlights: ['International Standard', 'University Partners', 'Global Network'],
    rating: 4.7,
    review_count: 145,
    student_count: 498,
    programs: [
      { name: 'IB Diploma Prep', description: 'Persiapan International Baccalaureate Diploma', price: 1300000, price_type: 'monthly', duration_months: 12, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 7, subject: 'IB' },
      { name: 'University Admission', description: 'Konsultasi dan persiapan masuk universitas luar negeri', price: 2000000, price_type: 'package', duration_months: 6, sessions_per_week: 2, level: 'advanced', capacity: 5, current_students: 4, subject: 'Admission' }
    ],
    teachers: [
      { name: 'Dr. Global Educator', education: 'EdD Harvard', experience_years: 18, specializations: ['IB', 'International Education'], bio: 'Mantan IB examiner dengan experience di 10+ negara' }
    ],
    reviews: [
      { rating: 5, comment: 'Berkat Global Prestasi, anak saya diterima di NUS!', student_name: 'Bapak Hartono', program_name: 'University Admission', created_at: '2025-12-28' }
    ]
  },

  // 20. Rumah Belajar Ceria - Gambar 6
  {
    id: generateId(),
    name: 'Rumah Belajar Ceria',
    thumbnail: '/Gambar/gambar_6.png',
    description: 'Suasana belajar seperti di rumah sendiri. Metode fun learning yang membuat anak-anak senang belajar tanpa tekanan.',
    type: 'offline',
    address: 'Jl. Tebet Timur Raya No. 12',
    city: 'JAKARTA SELATAN',
    district: 'Tebet',
    facilities: ['AC', 'WiFi', 'Play Area', 'Snack Corner', 'Garden'],
    highlights: ['Fun Learning', 'Homey Atmosphere', 'Snack Included'],
    rating: 4.8,
    review_count: 178,
    student_count: 234,
    programs: [
      { name: 'Calistung Ceria', description: 'Baca Tulis Hitung untuk usia 4-7 tahun dengan metode bermain', price: 300000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 8, current_students: 7, subject: 'Calistung' },
      { name: 'SD Ceria', description: 'Les semua mapel SD dengan cara menyenangkan', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 10, current_students: 9, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Kak Rani', education: 'S1 PAUD UNJ', experience_years: 8, specializations: ['PAUD', 'Fun Learning'], bio: 'Guru yang dicintai anak-anak dengan metode bermain sambil belajar' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya yang tadinya takut belajar jadi senang datang ke sini!', student_name: 'Mama Dian', program_name: 'Calistung Ceria', created_at: '2025-12-15' }
    ]
  }
]

// Export lesPlacesData
export { lesPlacesData }
