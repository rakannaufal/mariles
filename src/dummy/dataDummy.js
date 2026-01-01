// Dummy Data 50 Tempat Les AKADEMIK
// Menggunakan nama-nama yang diberikan user

const generateId = () => 'dummy-' + Math.random().toString(36).substr(2, 9)

// Thumbnail URLs unik untuk setiap tempat les (50 gambar pendidikan berbeda)
// Sumber: Unsplash (free to use)
export const uniqueThumbnails = [
  // Kategori 1: Formal & Akademis (1-10) - Kelas, gedung sekolah, perpustakaan
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', // Graduation
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', // Classroom
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800', // Teacher classroom
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800', // Books stacked
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800', // Students studying
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', // Library
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', // Kids learning
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800', // Study desk
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800', // Writing notes
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800', // Lecture hall
  
  // Kategori 2: Modern (11-20) - Teknologi, laptop, modern classroom
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800', // Coding laptop
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800', // Macbook coding
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800', // Digital learning
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800', // Math equations
  'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=800', // Math class
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800', // Science lab
  'https://images.unsplash.com/photo-1453733190371-0a9bedd82893?w=800', // Desk setup
  'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800', // Math board
  'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800', // Computer screen
  'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800', // Programming
  
  // Kategori 3: Bersahabat (21-30) - Anak-anak, homey, warm
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', // Happy kids
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800', // Kids classroom
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800', // Warm study
  'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=800', // Kids drawing
  'https://images.unsplash.com/photo-1448932223592-d1fc686e76ea?w=800', // Child reading
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800', // Girl studying
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800', // Friendly class
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800', // Study together
  'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=800', // Online learning
  'https://images.unsplash.com/photo-1610484826967-09c5720778c7?w=800', // Home study
  
  // Kategori 4: Singkat/Bimbel (31-40) - Matematika, sains, fokus
  'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=800', // Math formulas
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800', // Equations
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800', // Lab work
  'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=800', // Focus study
  'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800', // Whiteboard
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800', // Class focus
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800', // Teaching
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800', // Study books
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800', // Group study
  'https://images.unsplash.com/photo-1513128034602-7571a373fc19?w=800', // Science
  
  // Kategori 5: Optimis/UTBK (41-50) - Universitas, sukses, wisuda
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800', // Graduation caps
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800', // University hall
  'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800', // Online class
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800', // Note taking
  'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800', // Open book
  'https://images.unsplash.com/photo-1560785496-3c9d27877182?w=800', // Library study
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800', // Group project
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', // Team work
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800', // Students happy
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'  // Success team
]

// 50 Student counts UNIK
export const uniqueStudentCounts = [
  // Kategori 1 (1-10)
  847, 623, 912, 456, 789,
  534, 678, 423, 567, 891,
  // Kategori 2 (11-20)
  1234, 987, 654, 432, 765,
  543, 876, 321, 654, 498,
  // Kategori 3 (21-30)
  234, 189, 312, 156, 278,
  345, 267, 198, 223, 187,
  // Kategori 4 (31-40)
  567, 489, 623, 378, 512,
  456, 534, 398, 467, 523,
  // Kategori 5 (41-50)
  1456, 1123, 978, 856, 1089,
  934, 1267, 789, 867, 1345
]

// Kota-kota Indonesia
const cities = [
  'JAKARTA SELATAN', 'JAKARTA PUSAT', 'JAKARTA BARAT', 'JAKARTA TIMUR', 'JAKARTA UTARA',
  'BANDUNG', 'SURABAYA', 'YOGYAKARTA', 'SEMARANG', 'MALANG', 
  'MEDAN', 'MAKASSAR', 'DENPASAR', 'PALEMBANG', 'BEKASI', 
  'TANGERANG', 'DEPOK', 'BOGOR', 'SOLO', 'PEKANBARU'
]

// ============================================
// KATEGORI 1: FORMAL & AKADEMIS (10 tempat les)
// Kesan: Serius, Terpercaya, Institusi Mapan
// ============================================
export const kategori1Formal = [
  {
    id: generateId(),
    name: 'Ganesha Cendekia',
    description: 'Lembaga bimbingan belajar terkemuka dengan tradisi panjang dalam mencetak prestasi akademik. Menggunakan kurikulum terstruktur yang telah terbukti efektif selama lebih dari 15 tahun. Fokus pada pemahaman konsep mendalam dan persiapan ujian nasional.',
    type: 'offline',
    address: 'Jl. Sudirman No. 45',
    city: 'JAKARTA SELATAN',
    district: 'Kebayoran Baru',
    photos: [],
    facilities: ['AC', 'WiFi', 'Perpustakaan', 'Ruang Diskusi', 'Lab Komputer'],
    highlights: ['Guru Berpengalaman 10+ Tahun', 'Kurikulum Nasional Plus', 'Tryout Berkala'],
    rating: 4.9,
    review_count: 234,
    student_count: 847,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Bimbel SD Reguler', description: 'Bimbingan belajar lengkap untuk siswa SD kelas 1-6', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 12, subject: 'Semua Mapel' },
      { name: 'Bimbel SMP Intensif', description: 'Program intensif SMP dengan fokus UN dan persiapan SMA', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Semua Mapel' },
      { name: 'Persiapan UN SMA', description: 'Program super intensif menghadapi Ujian Nasional SMA', price: 750000, price_type: 'monthly', duration_months: 4, sessions_per_week: 5, level: 'advanced', capacity: 10, current_students: 9, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Dr. Bambang Sutrisno', education: 'S3 Pendidikan Matematika UPI', experience_years: 18, specializations: ['Matematika', 'Olimpiade'], bio: 'Pembimbing OSN Matematika tingkat nasional dengan 12 medalis emas' },
      { name: 'Ir. Susi Handayani, M.Pd', education: 'S2 Pendidikan IPA ITB', experience_years: 15, specializations: ['Fisika', 'Kimia'], bio: 'Mantan guru SMA Negeri 3 Bandung dengan track record luar biasa' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya diterima di SMA unggulan berkat bimbingan di sini. Sangat terstruktur dan guru-gurunya kompeten!', student_name: 'Ibu Ratna Dewi', program_name: 'Bimbel SMP Intensif', created_at: '2025-12-15' },
      { rating: 5, comment: 'Metode pengajarannya sangat bagus, anak jadi paham konsep bukan sekadar hafal.', student_name: 'Bapak Ahmad', program_name: 'Bimbel SD Reguler', created_at: '2025-12-20' },
      { rating: 4, comment: 'Fasilitas lengkap dan nyaman. Harga sebanding dengan kualitas.', student_name: 'Ibu Kartini', program_name: 'Persiapan UN SMA', created_at: '2025-12-28' }
    ]
  },
  {
    id: generateId(),
    name: 'Bina Prestasi Mandiri',
    description: 'Pusat pendidikan yang berfokus pada pengembangan potensi akademik siswa secara mandiri. Metode pembelajaran active learning yang mendorong siswa untuk berpikir kritis dan problem solving.',
    type: 'hybrid',
    address: 'Jl. Dago No. 128',
    city: 'BANDUNG',
    district: 'Coblong',
    photos: [],
    facilities: ['AC', 'WiFi', 'Smart Board', 'E-Learning Platform', 'Perpustakaan Digital'],
    highlights: ['Active Learning Method', 'Progress Report Mingguan', 'Konsultasi Orang Tua'],
    rating: 4.8,
    review_count: 189,
    student_count: 623,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Matematika SD-SMP', description: 'Pendalaman matematika dengan metode Singapore Math', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'beginner', capacity: 12, current_students: 10, subject: 'Matematika' },
      { name: 'IPA Terpadu SMP', description: 'Fisika, Kimia, Biologi terintegrasi dengan praktikum', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 10, current_students: 8, subject: 'IPA' }
    ],
    teachers: [
      { name: 'Drs. Hendra Wijaya, M.Si', education: 'S2 Matematika ITB', experience_years: 20, specializations: ['Matematika', 'Statistika'], bio: 'Dosen matematika dengan pengalaman mengajar di universitas dan bimbel' }
    ],
    reviews: [
      { rating: 5, comment: 'Metode Singapore Math-nya sangat efektif! Nilai anak meningkat drastis.', student_name: 'Ibu Melani', program_name: 'Matematika SD-SMP', created_at: '2025-12-18' }
    ]
  },
  {
    id: generateId(),
    name: 'Insan Unggul Education',
    description: 'Lembaga pendidikan yang bertujuan mencetak generasi unggul dengan karakter dan prestasi akademik yang seimbang. Program komprehensif dari SD hingga persiapan PTN.',
    type: 'offline',
    address: 'Jl. Pemuda No. 67',
    city: 'SURABAYA',
    district: 'Genteng',
    photos: [],
    facilities: ['AC', 'WiFi', 'Lab IPA', 'Ruang Ujian CBT', 'Kantin Sehat'],
    highlights: ['Pendidikan Karakter', 'Program Beasiswa', 'Alumni Network Kuat'],
    rating: 4.7,
    review_count: 167,
    student_count: 912,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Program Unggulan SMA', description: 'Persiapan maksimal untuk siswa SMA menuju PTN favorit', price: 650000, price_type: 'monthly', duration_months: 12, sessions_per_week: 4, level: 'advanced', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Bahasa Inggris Akademik', description: 'TOEFL dan IELTS preparation untuk pelajar', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Bahasa Inggris' }
    ],
    teachers: [
      { name: 'Prof. Dr. Agus Salim', education: 'S3 Pendidikan UNAIR', experience_years: 25, specializations: ['Kurikulum', 'Assessment'], bio: 'Pakar pendidikan dengan pengalaman 25 tahun di dunia akademik' }
    ],
    reviews: [
      { rating: 5, comment: 'Program beasiswanya sangat membantu! Anak saya bisa belajar gratis karena prestasi.', student_name: 'Bapak Kurniawan', program_name: 'Program Unggulan SMA', created_at: '2025-12-22' }
    ]
  },
  {
    id: generateId(),
    name: 'Graha Ilmu Nusantara',
    description: 'Institusi bimbingan belajar dengan jangkauan nasional. Standar pendidikan tinggi dengan kurikulum yang disesuaikan dengan kebutuhan lokal setiap daerah.',
    type: 'hybrid',
    address: 'Jl. Malioboro No. 45',
    city: 'YOGYAKARTA',
    district: 'Gondokusuman',
    photos: [],
    facilities: ['AC', 'WiFi', 'Video Conference', 'LMS Online', 'Tryout Center'],
    highlights: ['Jaringan Nasional', 'Kurikulum Adaptif', 'Guru Tersertifikasi'],
    rating: 4.6,
    review_count: 145,
    student_count: 456,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Bimbel SD Cerdas', description: 'Program bimbel SD dengan pendekatan fun learning', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 13, subject: 'Semua Mapel' },
      { name: 'Bimbel SMP Plus', description: 'Bimbingan lengkap SMP dengan enrichment program', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 11, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Dra. Widyastuti, M.Pd', education: 'S2 Pendidikan UNY', experience_years: 16, specializations: ['Bahasa Indonesia', 'Sastra'], bio: 'Guru bahasa dengan metode pengajaran kreatif dan menyenangkan' }
    ],
    reviews: [
      { rating: 4, comment: 'Bagus untuk anak SD, metodenya tidak membosankan.', student_name: 'Ibu Wati', program_name: 'Bimbel SD Cerdas', created_at: '2025-12-19' }
    ]
  },
  {
    id: generateId(),
    name: 'Wiyata Mandala',
    description: 'Bimbingan belajar dengan filosofi pendidikan holistik. Mengembangkan kemampuan akademik sekaligus soft skills yang dibutuhkan di abad 21.',
    type: 'offline',
    address: 'Jl. Diponegoro No. 89',
    city: 'SEMARANG',
    district: 'Semarang Tengah',
    photos: [],
    facilities: ['AC', 'WiFi', 'Ruang Presentasi', 'Lab Bahasa', 'Perpustakaan'],
    highlights: ['Pendidikan Holistik', '21st Century Skills', 'Small Class Size'],
    rating: 4.8,
    review_count: 156,
    student_count: 789,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Kelas Olimpiade Sains', description: 'Persiapan OSN bidang Matematika, Fisika, Kimia, Biologi', price: 750000, price_type: 'monthly', duration_months: 8, sessions_per_week: 3, level: 'advanced', capacity: 8, current_students: 7, subject: 'Sains' },
      { name: 'English Mastery', description: 'Program bahasa Inggris dari basic sampai advanced', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 10, current_students: 9, subject: 'Bahasa Inggris' }
    ],
    teachers: [
      { name: 'Dr. Rina Maharani', education: 'S3 Biologi UNDIP', experience_years: 14, specializations: ['Biologi', 'OSN'], bio: 'Pembimbing OSN Biologi dengan banyak medalis tingkat nasional' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya juara 2 OSN Biologi tingkat provinsi!', student_name: 'Ibu Sinta', program_name: 'Kelas Olimpiade Sains', created_at: '2025-12-25' }
    ]
  },
  {
    id: generateId(),
    name: 'Cahaya Intelektual',
    description: 'Pusat bimbingan belajar yang menekankan pada pengembangan kecerdasan intelektual dan emosional. Metode pembelajaran yang disesuaikan dengan gaya belajar masing-masing siswa.',
    type: 'offline',
    address: 'Jl. Ahmad Yani No. 56',
    city: 'MALANG',
    district: 'Klojen',
    photos: [],
    facilities: ['AC', 'WiFi', 'Ruang Konseling', 'Area Belajar Outdoor', 'Kantin'],
    highlights: ['Personalized Learning', 'Psikolog Pendidikan', 'Outdoor Learning'],
    rating: 4.7,
    review_count: 134,
    student_count: 534,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Persada Edukasi',
    description: 'Lembaga bimbingan belajar dengan standar nasional. Fokus pada persiapan ujian dan kompetisi akademik dengan metode drilling yang efektif.',
    type: 'offline',
    address: 'Jl. Gatot Subroto No. 100',
    city: 'MEDAN',
    district: 'Medan Petisah',
    photos: [],
    facilities: ['AC', 'WiFi', 'Bank Soal Digital', 'Ruang CBT', 'Parkir Luas'],
    highlights: ['Drilling Method', 'Bank Soal 100.000+', 'Simulasi UN/UTBK'],
    rating: 4.6,
    review_count: 123,
    student_count: 678,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Duta Pelajar Indonesia',
    description: 'Bimbingan belajar yang fokus pada pengembangan siswa Indonesia berkualitas global. Program bilingual dan persiapan sekolah internasional.',
    type: 'hybrid',
    address: 'Jl. Panglima Sudirman No. 78',
    city: 'MAKASSAR',
    district: 'Makassar',
    photos: [],
    facilities: ['AC', 'WiFi', 'International Curriculum Materials', 'Video Conference', 'Library'],
    highlights: ['Bilingual Program', 'International Standard', 'Cambridge Prep'],
    rating: 4.8,
    review_count: 112,
    student_count: 423,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Cambridge Primary', description: 'Persiapan Cambridge Primary Checkpoint', price: 850000, price_type: 'monthly', duration_months: 12, sessions_per_week: 3, level: 'beginner', capacity: 10, current_students: 8, subject: 'Kurikulum Cambridge' },
      { name: 'IGCSE Preparation', description: 'Persiapan ujian IGCSE untuk berbagai mata pelajaran', price: 950000, price_type: 'monthly', duration_months: 12, sessions_per_week: 4, level: 'intermediate', capacity: 8, current_students: 7, subject: 'IGCSE Subjects' }
    ],
    teachers: [
      { name: 'Ms. Sarah Johnson', education: 'MA Education, University of Melbourne', experience_years: 12, specializations: ['Cambridge Curriculum', 'IGCSE'], bio: 'Certified Cambridge teacher dengan pengalaman di sekolah internasional' }
    ],
    reviews: [
      { rating: 5, comment: 'Program Cambridge-nya berkualitas! Anak saya diterima di sekolah internasional.', student_name: 'Ibu Fatimah', program_name: 'Cambridge Primary', created_at: '2025-12-21' }
    ]
  },
  {
    id: generateId(),
    name: 'Mitra Cendekia',
    description: 'Bimbel yang menjadi mitra terpercaya orang tua dalam mendampingi pendidikan anak. Komunikasi intensif dengan orang tua dan laporan perkembangan berkala.',
    type: 'offline',
    address: 'Jl. Pahlawan No. 34',
    city: 'DENPASAR',
    district: 'Denpasar Selatan',
    photos: [],
    facilities: ['AC', 'WiFi', 'Parent Lounge', 'Report System Online', 'CCTV'],
    highlights: ['Parent Partnership', 'Progress Tracking', 'Safe Environment'],
    rating: 4.5,
    review_count: 98,
    student_count: 567,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Lembaga Pendidikan Tunas Bangsa',
    description: 'Lembaga pendidikan dengan visi mencetak tunas bangsa yang cerdas dan berkarakter. Program lengkap dari jenjang SD hingga persiapan kuliah.',
    type: 'offline',
    address: 'Jl. Veteran No. 90',
    city: 'PALEMBANG',
    district: 'Ilir Timur I',
    photos: [],
    facilities: ['AC', 'WiFi', 'Gedung 3 Lantai', 'Aula', 'Perpustakaan', 'Lab Komputer'],
    highlights: ['Gedung Representatif', 'Guru Senior', 'Track Record 20 Tahun'],
    rating: 4.7,
    review_count: 178,
    student_count: 891,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Program Reguler SD', description: 'Bimbingan belajar SD dengan kurikulum nasional plus', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Program Reguler SMP', description: 'Bimbingan belajar SMP persiapan UN dan SMA favorit', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 11, subject: 'Semua Mapel' },
      { name: 'Program Reguler SMA', description: 'Bimbingan belajar SMA dan persiapan PTN', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 10, current_students: 10, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Drs. Harun Yahya, M.Pd', education: 'S2 Pendidikan Unsri', experience_years: 28, specializations: ['Manajemen Pendidikan', 'IPS'], bio: 'Pendiri lembaga dengan pengalaman 28 tahun di dunia pendidikan' },
      { name: 'Ir. Andi Wijaya, M.T', education: 'S2 Teknik Mesin ITB', experience_years: 15, specializations: ['Fisika', 'Matematika SMA'], bio: 'Insinyur yang passionate mengajar sains' }
    ],
    reviews: [
      { rating: 5, comment: 'Bimbel legendaris di Palembang! Banyak alumni yang sukses.', student_name: 'Bapak Rudi', program_name: 'Program Reguler SMA', created_at: '2025-12-26' },
      { rating: 4, comment: 'Gedungnya bagus dan guru-gurunya berpengalaman.', student_name: 'Ibu Mala', program_name: 'Program Reguler SMP', created_at: '2025-12-27' }
    ]
  }
]

export const matematikaSains = kategori1Formal
