// Kategori 4-5: Singkat Padat & Optimis/UTBK
// 20 tempat les akademik

const generateId = () => 'dummy-' + Math.random().toString(36).substr(2, 9)

// ============================================
// KATEGORI 4: SINGKAT, PADAT & "BIMBEL BANGET" (10 tempat les)
// Kesan: Sains, Kata Kuat, Profesional
// ============================================
export const seniDesain = [
  {
    id: generateId(),
    name: 'Solusi Cerdas',
    description: 'Bimbel dengan solusi cepat dan tepat untuk setiap masalah akademik. Spesialis matematika dan sains dengan metode problem solving.',
    type: 'offline',
    address: 'Jl. Raya Margonda No. 100',
    city: 'DEPOK',
    district: 'Beji',
    photos: [],
    facilities: ['AC', 'WiFi', 'Problem Bank', 'CBT Room', 'Discussion Area'],
    highlights: ['Problem Solving Expert', 'Quick Solutions', 'Practical Approach'],
    rating: 4.8,
    review_count: 234,
    student_count: 567,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Solusi Matematika', description: 'Cara cepat menyelesaikan soal matematika', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 15, current_students: 14, subject: 'Matematika' },
      { name: 'Solusi Fisika', description: 'Teknik jitu menaklukkan fisika', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 12, current_students: 11, subject: 'Fisika' },
      { name: 'Solusi Kimia', description: 'Pemahaman kimia dengan cara simpel', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Kimia' }
    ],
    teachers: [
      { name: 'Ir. Problem Solver', education: 'S1 Teknik Mesin ITB', experience_years: 15, specializations: ['Problem Solving', 'Matematika'], bio: 'Ahli strategi menyelesaikan soal dengan cara tercepat' },
      { name: 'Drs. Fisika Master', education: 'S1 Fisika UGM', experience_years: 18, specializations: ['Fisika', 'Praktikum'], bio: 'Guru fisika legendaris dengan ribuan alumni' }
    ],
    reviews: [
      { rating: 5, comment: 'Akhirnya paham cara cepat kerjakan soal cerita matematika!', student_name: 'Budi Siswa', program_name: 'Solusi Matematika', created_at: '2025-12-15' },
      { rating: 5, comment: 'Fisika yang tadinya susah jadi mudah dengan teknik di sini.', student_name: 'Sinta', program_name: 'Solusi Fisika', created_at: '2025-12-18' }
    ]
  },
  {
    id: generateId(),
    name: 'Bintang Pelajar',
    description: 'Mencetak bintang pelajar dari setiap sekolah. Program komprehensif untuk semua jenjang dengan track record cemerlang.',
    type: 'hybrid',
    address: 'Jl. Juanda No. 45',
    city: 'BOGOR',
    district: 'Bogor Tengah',
    photos: [],
    facilities: ['AC', 'WiFi', 'Star Wall of Fame', 'Try Out Center', 'Library'],
    highlights: ['Star Students', 'Award Winners', 'Proven Track Record'],
    rating: 4.9,
    review_count: 312,
    student_count: 489,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Star Program SD', description: 'Menjadi bintang di kelas untuk siswa SD', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Star Program SMP', description: 'Program unggulan untuk siswa SMP berprestasi', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 12, subject: 'Semua Mapel' },
      { name: 'Star Program SMA', description: 'Program intensif SMA untuk calon bintang', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 10, current_students: 10, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Pak Star Teacher', education: 'S2 Pendidikan IPB', experience_years: 20, specializations: ['Motivation', 'Excellence'], bio: 'Guru yang selalu memotivasi siswa untuk menjadi yang terbaik' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya juara kelas berkat bimbingan di sini!', student_name: 'Ibu Rina', program_name: 'Star Program SMP', created_at: '2025-12-20' }
    ]
  },
  {
    id: generateId(),
    name: 'Fokus Belajar',
    description: 'Bimbel yang membantu siswa fokus pada target. Eliminasi distraksi dan maksimalkan waktu belajar.',
    type: 'offline',
    address: 'Jl. Setia Budi No. 67',
    city: 'BEKASI',
    district: 'Bekasi Selatan',
    photos: [],
    facilities: ['AC', 'WiFi', 'No Phone Zone', 'Focus Pods', 'Quiet Study'],
    highlights: ['Distraction-Free', 'Focus Training', 'Time Management'],
    rating: 4.7,
    review_count: 178,
    student_count: 623,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Focus Power', description: 'Tingkatkan konsentrasi dan fokus belajar', price: 400000, price_type: 'monthly', duration_months: 4, sessions_per_week: 3, level: 'all', capacity: 12, current_students: 10, subject: 'Study Skills' },
      { name: 'Focus Exam', description: 'Fokus penuh menghadapi ujian', price: 500000, price_type: 'monthly', duration_months: 3, sessions_per_week: 4, level: 'intermediate', capacity: 10, current_students: 9, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Coach Focus', education: 'S2 Psikologi UI', experience_years: 12, specializations: ['Focus Training', 'Study Skills'], bio: 'Coach produktivitas yang membantu siswa mengelola waktu' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya jadi bisa fokus belajar tanpa HP!', student_name: 'Mama Khawatir', program_name: 'Focus Power', created_at: '2025-12-22' }
    ]
  },
  {
    id: generateId(),
    name: 'Sigma Education',
    description: 'Bimbel dengan standar six sigma dalam pendidikan. Quality control ketat untuk hasil maksimal.',
    type: 'hybrid',
    address: 'Jl. Pemuda No. 123',
    city: 'SURABAYA',
    district: 'Tegalsari',
    photos: [],
    facilities: ['AC', 'WiFi', 'Quality Lab', 'Assessment Center', 'Digital Learning'],
    highlights: ['Six Sigma Quality', 'Data-Driven', 'Continuous Improvement'],
    rating: 4.8,
    review_count: 156,
    student_count: 378,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Sigma Math', description: 'Matematika dengan standar kualitas tinggi', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 12, current_students: 11, subject: 'Matematika' },
      { name: 'Sigma Science', description: 'IPA dengan pendekatan quality management', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 10, current_students: 9, subject: 'IPA' }
    ],
    teachers: [
      { name: 'Dr. Six Sigma', education: 'PhD Industrial Engineering ITS', experience_years: 16, specializations: ['Quality Education', 'Process Improvement'], bio: 'Menerapkan prinsip six sigma dalam pendidikan' }
    ],
    reviews: [
      { rating: 5, comment: 'Sistemnya terstruktur, progress terukur dengan jelas.', student_name: 'Pak Quality', program_name: 'Sigma Math', created_at: '2025-12-23' }
    ]
  },
  {
    id: generateId(),
    name: 'Delta Cendekia',
    description: 'Perubahan (delta) menuju prestasi. Program akselerasi untuk siswa yang ingin maju lebih cepat.',
    type: 'offline',
    address: 'Jl. Diponegoro No. 89',
    city: 'MALANG',
    district: 'Klojen',
    photos: [],
    facilities: ['AC', 'WiFi', 'Acceleration Zone', 'Challenge Room', 'Trophy Display'],
    highlights: ['Accelerated Learning', 'Fast Track', 'Competitive Edge'],
    rating: 4.6,
    review_count: 134,
    student_count: 512,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Delta Akselerasi', description: 'Program percepatan untuk siswa berbakat', price: 700000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 8, subject: 'Semua Mapel' },
      { name: 'Delta Competition', description: 'Persiapan olimpiade dan kompetisi akademik', price: 800000, price_type: 'monthly', duration_months: 8, sessions_per_week: 3, level: 'advanced', capacity: 6, current_students: 5, subject: 'Olimpiade' }
    ],
    teachers: [
      { name: 'Coach Delta', education: 'S2 Matematika UM', experience_years: 14, specializations: ['Acceleration', 'Competition'], bio: 'Pembimbing siswa akselerasi dan olimpiade' }
    ],
    reviews: [
      { rating: 4, comment: 'Anak saya loncat kelas berkat program akselerasi di sini.', student_name: 'Ibu Bangga', program_name: 'Delta Akselerasi', created_at: '2025-12-24' }
    ]
  },
  {
    id: generateId(),
    name: 'Sinergi Ilmu',
    description: 'Sinergi antara guru, siswa, dan orang tua untuk hasil maksimal. Kolaborasi untuk kesuksesan belajar.',
    type: 'offline',
    address: 'Jl. Ahmad Dahlan No. 56',
    city: 'YOGYAKARTA',
    district: 'Jetis',
    photos: [],
    facilities: ['AC', 'WiFi', 'Parent Room', 'Collaborative Space', 'Communication Hub'],
    highlights: ['Triple Collaboration', 'Parent Involvement', 'Team Success'],
    rating: 4.7,
    review_count: 145,
    student_count: 456,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Sinergi Complete', description: 'Program lengkap dengan keterlibatan orang tua', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 12, current_students: 11, subject: 'Semua Mapel' },
      { name: 'Sinergi Intensif', description: 'Program intensif dengan koordinasi ketat', price: 550000, price_type: 'monthly', duration_months: 4, sessions_per_week: 5, level: 'intermediate', capacity: 10, current_students: 9, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Koordinator Sinergi', education: 'S2 Manajemen Pendidikan UNY', experience_years: 13, specializations: ['Collaboration', 'Parent Education'], bio: 'Ahli membangun kerjasama antara semua pihak' }
    ],
    reviews: [
      { rating: 5, comment: 'Komunikasi dengan guru sangat bagus, selalu update perkembangan anak.', student_name: 'Ibu Komunikatif', program_name: 'Sinergi Complete', created_at: '2025-12-25' }
    ]
  },
  {
    id: generateId(),
    name: 'Trik Jitu',
    description: 'Trik dan strategi jitu untuk menaklukkan soal ujian. Shortcut cerdas yang tetap melatih pemahaman.',
    type: 'hybrid',
    address: 'Jl. Teuku Umar No. 78',
    city: 'DENPASAR',
    district: 'Denpasar Barat',
    photos: [],
    facilities: ['AC', 'WiFi', 'Trick Library', 'Practice Room', 'Video Tutorial'],
    highlights: ['Smart Tricks', 'Exam Strategies', 'Time Saving Methods'],
    rating: 4.5,
    review_count: 112,
    student_count: 534,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Trik Matematika', description: 'Trik cepat mengerjakan soal matematika', price: 400000, price_type: 'monthly', duration_months: 4, sessions_per_week: 3, level: 'all', capacity: 15, current_students: 13, subject: 'Matematika' },
      { name: 'Trik UTBK', description: 'Strategi jitu menaklukkan UTBK', price: 500000, price_type: 'monthly', duration_months: 4, sessions_per_week: 4, level: 'advanced', capacity: 12, current_students: 11, subject: 'UTBK' }
    ],
    teachers: [
      { name: 'Master Trik', education: 'S1 Matematika Undiksha', experience_years: 10, specializations: ['Exam Tricks', 'Fast Methods'], bio: 'Pengembang metode cepat yang tetap mengutamakan pemahaman' }
    ],
    reviews: [
      { rating: 4, comment: 'Trik-triknya berguna banget waktu ujian!', student_name: 'Siswa Cerdik', program_name: 'Trik Matematika', created_at: '2025-12-26' }
    ]
  },
  {
    id: generateId(),
    name: 'AKSI (Akademi Siswa Indonesia)',
    description: 'Akademi untuk siswa Indonesia yang siap beraksi dan berprestasi. Program aksi nyata menuju sukses.',
    type: 'offline',
    address: 'Jl. Veteran No. 45',
    city: 'PALEMBANG',
    district: 'Ilir Barat I',
    photos: [],
    facilities: ['AC', 'WiFi', 'Action Center', 'Practice Lab', 'Achievement Wall'],
    highlights: ['Action-Oriented', 'Practical Learning', 'Real Results'],
    rating: 4.6,
    review_count: 123,
    student_count: 398,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'AKSI SD', description: 'Program aksi belajar untuk SD', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 13, subject: 'Semua Mapel' },
      { name: 'AKSI SMP', description: 'Aksi menuju prestasi untuk SMP', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 12, current_students: 11, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Komandan AKSI', education: 'S1 Pendidikan Unsri', experience_years: 11, specializations: ['Action Learning', 'Motivation'], bio: 'Leader yang membawa siswa beraksi menuju sukses' }
    ],
    reviews: [
      { rating: 4, comment: 'Anak jadi lebih aktif dan semangat belajar.', student_name: 'Ibu Aktif', program_name: 'AKSI SD', created_at: '2025-12-27' }
    ]
  },
  {
    id: generateId(),
    name: 'Orbit Prestasi',
    description: 'Membawa siswa mengorbit di puncak prestasi. Sistem orbit learning dengan pencapaian bertahap.',
    type: 'hybrid',
    address: 'Jl. Gatot Subroto No. 123',
    city: 'MEDAN',
    district: 'Medan Petisah',
    photos: [],
    facilities: ['AC', 'WiFi', 'Orbit System', 'Level Chart', 'Milestone Tracker'],
    highlights: ['Orbit System', 'Level Up Learning', 'Achievement Milestones'],
    rating: 4.7,
    review_count: 134,
    student_count: 467,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Orbit Junior', description: 'Mulai orbit dari level dasar', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 13, subject: 'Semua Mapel' },
      { name: 'Orbit Senior', description: 'Orbit menuju level tertinggi', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'advanced', capacity: 12, current_students: 11, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Captain Orbit', education: 'S2 Pendidikan USU', experience_years: 12, specializations: ['Gamification', 'Progress Tracking'], bio: 'Menggunakan sistem level seperti game untuk memotivasi belajar' }
    ],
    reviews: [
      { rating: 5, comment: 'Level system-nya bikin anak semangat untuk naik level!', student_name: 'Papa Gamer', program_name: 'Orbit Junior', created_at: '2025-12-28' }
    ]
  },
  {
    id: generateId(),
    name: 'Neutron Cendekia',
    description: 'Bimbel sains dengan pendekatan partikel fundamental. Memahami basic hingga mendalam seperti neutron dalam atom.',
    type: 'offline',
    address: 'Jl. Sisingamangaraja No. 67',
    city: 'MAKASSAR',
    district: 'Makassar',
    photos: [],
    facilities: ['AC', 'WiFi', 'Science Lab', 'Experiment Corner', 'Model Display'],
    highlights: ['Deep Understanding', 'Science Focus', 'Fundamental Approach'],
    rating: 4.5,
    review_count: 98,
    student_count: 523,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Neutron Fisika', description: 'Fisika dari partikel fundamental hingga mekanika', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Fisika' },
      { name: 'Neutron Kimia', description: 'Kimia dari atom hingga reaksi kompleks', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Kimia' }
    ],
    teachers: [
      { name: 'Dr. Neutron', education: 'S3 Fisika UNHAS', experience_years: 15, specializations: ['Fisika Partikel', 'Fundamental Science'], bio: 'Fisikawan yang passionate mengajar dari konsep dasar' }
    ],
    reviews: [
      { rating: 4, comment: 'Pemahaman konsep fisika jadi lebih dalam.', student_name: 'Mahasiswa IPA', program_name: 'Neutron Fisika', created_at: '2025-12-29' }
    ]
  }
]

// ============================================
// KATEGORI 5: OPTIMIS & BERORIENTASI MASA DEPAN (10 tempat les)
// Kesan: Menjual Mimpi, Sukses, Persiapan PTN
// ============================================
export const bimbelSD = [
  {
    id: generateId(),
    name: 'Gerbang Sukses',
    description: 'Gerbang menuju kesuksesan akademik dan karir. Program intensif untuk masuk PTN impian dan meraih cita-cita.',
    type: 'offline',
    address: 'Jl. Sudirman No. 300',
    city: 'JAKARTA PUSAT',
    district: 'Menteng',
    photos: [],
    facilities: ['AC', 'WiFi', 'Success Hall', 'Alumni Network', 'Motivation Center'],
    highlights: ['95% Lolos PTN', 'Dream University', 'Success Mentoring'],
    rating: 4.9,
    review_count: 356,
    student_count: 1456,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Gerbang UTBK', description: 'Program super intensif masuk PTN favorit', price: 750000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 20, current_students: 20, subject: 'UTBK' },
      { name: 'Gerbang Mandiri', description: 'Persiapan ujian mandiri PTN top', price: 850000, price_type: 'monthly', duration_months: 4, sessions_per_week: 5, level: 'advanced', capacity: 15, current_students: 15, subject: 'Ujian Mandiri' },
      { name: 'Gerbang Kedokteran', description: 'Khusus persiapan masuk fakultas kedokteran', price: 1000000, price_type: 'monthly', duration_months: 8, sessions_per_week: 5, level: 'advanced', capacity: 10, current_students: 10, subject: 'Kedokteran' }
    ],
    teachers: [
      { name: 'Dr. Sukses Dr.', education: 'S3 Kedokteran UI', experience_years: 20, specializations: ['FK Prep', 'UTBK'], bio: 'Dokter yang telah meloloskan ratusan siswa ke FK top' },
      { name: 'Prof. Champion', education: 'Profesor UI', experience_years: 25, specializations: ['PTN Strategy', 'Academic Excellence'], bio: 'Profesor yang mendedikasikan waktu untuk membimbing calon mahasiswa' }
    ],
    reviews: [
      { rating: 5, comment: 'DITERIMA DI FK UI!! Terima kasih Gerbang Sukses!!', student_name: 'Calon Dokter Andi', program_name: 'Gerbang Kedokteran', created_at: '2025-12-15' },
      { rating: 5, comment: 'Score UTBK 789! Beyond expectation!', student_name: 'Rina Juara', program_name: 'Gerbang UTBK', created_at: '2025-12-18' }
    ]
  },
  {
    id: generateId(),
    name: 'Menara Harapan',
    description: 'Menara yang membangun harapan setiap siswa menjadi kenyataan. Dari mimpi menjadi prestasi nyata.',
    type: 'hybrid',
    address: 'Jl. Asia Afrika No. 200',
    city: 'BANDUNG',
    district: 'Sumur Bandung',
    photos: [],
    facilities: ['AC', 'WiFi', 'Hope Tower', 'Dream Board', 'Celebration Hall'],
    highlights: ['Dream to Reality', 'Hope Builder', 'Celebrate Success'],
    rating: 4.8,
    review_count: 267,
    student_count: 1123,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Menara UTBK Saintek', description: 'Mewujudkan mimpi masuk PTN saintek', price: 700000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 18, current_students: 17, subject: 'UTBK Saintek' },
      { name: 'Menara UTBK Soshum', description: 'Mewujudkan mimpi masuk PTN soshum', price: 700000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 18, current_students: 16, subject: 'UTBK Soshum' }
    ],
    teachers: [
      { name: 'Motivator Harapan', education: 'S2 Pendidikan ITB', experience_years: 15, specializations: ['UTBK', 'Motivation'], bio: 'Guru yang selalu menyemangati siswa untuk bermimpi besar' }
    ],
    reviews: [
      { rating: 5, comment: 'Dari siswa biasa jadi mahasiswa ITB! Mimpi jadi nyata!', student_name: 'Mahasiswa ITB Baru', program_name: 'Menara UTBK Saintek', created_at: '2025-12-20' }
    ]
  },
  {
    id: generateId(),
    name: 'Kunci Juara',
    description: 'Memegang kunci untuk menjadi juara. Strategi dan kunci sukses dalam setiap ujian dan kompetisi.',
    type: 'offline',
    address: 'Jl. Raya Darmo No. 100',
    city: 'SURABAYA',
    district: 'Wonokromo',
    photos: [],
    facilities: ['AC', 'WiFi', 'Champion Room', 'Strategy Center', 'Trophy Corner'],
    highlights: ['Key to Success', 'Champion Maker', 'Winning Strategy'],
    rating: 4.7,
    review_count: 198,
    student_count: 978,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Kunci UN', description: 'Kunci sukses menghadapi UN', price: 550000, price_type: 'monthly', duration_months: 4, sessions_per_week: 4, level: 'advanced', capacity: 15, current_students: 14, subject: 'UN' },
      { name: 'Kunci Olimpiade', description: 'Kunci juara olimpiade sains', price: 750000, price_type: 'monthly', duration_months: 8, sessions_per_week: 3, level: 'advanced', capacity: 8, current_students: 7, subject: 'Olimpiade' }
    ],
    teachers: [
      { name: 'Master Kunci', education: 'S2 Matematika ITS', experience_years: 16, specializations: ['Competition', 'Strategy'], bio: 'Pemegang kunci strategi yang telah mencetak banyak juara' }
    ],
    reviews: [
      { rating: 5, comment: 'Kunci-kuncinya work banget! Juara 1 OSN Kota!', student_name: 'Juara OSN', program_name: 'Kunci Olimpiade', created_at: '2025-12-22' }
    ]
  },
  {
    id: generateId(),
    name: 'Jejak Prestasi',
    description: 'Meninggalkan jejak prestasi di setiap langkah. Alumni yang sukses adalah bukti nyata.',
    type: 'hybrid',
    address: 'Jl. Malioboro No. 150',
    city: 'YOGYAKARTA',
    district: 'Gedongtengen',
    photos: [],
    facilities: ['AC', 'WiFi', 'Alumni Wall', 'Legacy Room', 'Success Stories'],
    highlights: ['Proven Alumni', 'Legacy of Success', 'Track Record'],
    rating: 4.8,
    review_count: 234,
    student_count: 856,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Jejak PTN', description: 'Ikuti jejak sukses alumni di PTN favorit', price: 650000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 15, current_students: 14, subject: 'UTBK' },
      { name: 'Jejak Beasiswa', description: 'Menuju beasiswa dalam dan luar negeri', price: 800000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'advanced', capacity: 10, current_students: 9, subject: 'Scholarship' }
    ],
    teachers: [
      { name: 'Alumni Sukses', education: 'S2 Luar Negeri', experience_years: 12, specializations: ['UTBK', 'Scholarship'], bio: 'Alumni yang kembali untuk membimbing generasi berikutnya' }
    ],
    reviews: [
      { rating: 5, comment: 'Dapat beasiswa LPDP! Jejak senior terbukti!', student_name: 'Awardee LPDP', program_name: 'Jejak Beasiswa', created_at: '2025-12-23' }
    ]
  },
  {
    id: generateId(),
    name: 'Langkah Pasti',
    description: 'Setiap langkah adalah langkah pasti menuju kesuksesan. Program terstruktur dengan milestone jelas.',
    type: 'offline',
    address: 'Jl. Pandanaran No. 89',
    city: 'SEMARANG',
    district: 'Semarang Tengah',
    photos: [],
    facilities: ['AC', 'WiFi', 'Milestone Board', 'Progress Center', 'Step by Step Room'],
    highlights: ['Structured Path', 'Clear Milestones', 'Guaranteed Progress'],
    rating: 4.6,
    review_count: 167,
    student_count: 1089,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Langkah UTBK 6 Bulan', description: 'Langkah pasti menuju UTBK dalam 6 bulan', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'advanced', capacity: 18, current_students: 17, subject: 'UTBK' },
      { name: 'Langkah UTBK 3 Bulan', description: 'Akselerasi langkah pasti 3 bulan', price: 800000, price_type: 'monthly', duration_months: 3, sessions_per_week: 6, level: 'advanced', capacity: 15, current_students: 14, subject: 'UTBK' }
    ],
    teachers: [
      { name: 'Navigator Langkah', education: 'S2 Pendidikan UNDIP', experience_years: 14, specializations: ['UTBK', 'Structure Learning'], bio: 'Pembimbing dengan roadmap jelas menuju sukses' }
    ],
    reviews: [
      { rating: 4, comment: 'Step by step-nya jelas, nggak kebingungan mau belajar apa.', student_name: 'Siswa Terstruktur', program_name: 'Langkah UTBK 6 Bulan', created_at: '2025-12-24' }
    ]
  },
  {
    id: generateId(),
    name: 'Gemilang Edukasi',
    description: 'Menuju masa depan yang gemilang melalui pendidikan berkualitas. Program unggulan untuk prestasi gemilang.',
    type: 'hybrid',
    address: 'Jl. Ijen No. 56',
    city: 'MALANG',
    district: 'Klojen',
    photos: [],
    facilities: ['AC', 'WiFi', 'Brilliant Hall', 'Achievement Center', 'Future Lab'],
    highlights: ['Brilliant Future', 'Quality Education', 'Gemilang Results'],
    rating: 4.7,
    review_count: 145,
    student_count: 934,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Gemilang Complete', description: 'Program lengkap menuju prestasi gemilang', price: 650000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Gemilang Express', description: 'Percepatan menuju prestasi gemilang', price: 850000, price_type: 'monthly', duration_months: 3, sessions_per_week: 6, level: 'advanced', capacity: 12, current_students: 11, subject: 'UTBK' }
    ],
    teachers: [
      { name: 'Guru Gemilang', education: 'S2 Pendidikan UM', experience_years: 15, specializations: ['Excellence', 'Motivation'], bio: 'Guru yang melahirkan prestasi gemilang dari setiap siswa' }
    ],
    reviews: [
      { rating: 5, comment: 'Hasil belajar gemilang! Nilai rapot naik semua!', student_name: 'Siswa Gemilang', program_name: 'Gemilang Complete', created_at: '2025-12-25' }
    ]
  },
  {
    id: generateId(),
    name: 'Puncak Ilmu',
    description: 'Mendaki menuju puncak ilmu pengetahuan. Program untuk mencapai level tertinggi dalam akademik.',
    type: 'offline',
    address: 'Jl. Gatot Subroto No. 200',
    city: 'DENPASAR',
    district: 'Denpasar Utara',
    photos: [],
    facilities: ['AC', 'WiFi', 'Summit Room', 'Peak Achievement', 'Climbing Chart'],
    highlights: ['Peak Performance', 'Summit Learning', 'Top Achievement'],
    rating: 4.8,
    review_count: 178,
    student_count: 1267,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Puncak UTBK', description: 'Menuju puncak skor UTBK', price: 700000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 18, current_students: 17, subject: 'UTBK' },
      { name: 'Puncak Olimpiade', description: 'Puncak prestasi olimpiade sains', price: 900000, price_type: 'monthly', duration_months: 8, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 7, subject: 'Olimpiade' }
    ],
    teachers: [
      { name: 'Pendaki Ilmu', education: 'S3 Sains Undiksha', experience_years: 18, specializations: ['Peak Performance', 'Excellence'], bio: 'Membawa siswa ke puncak prestasi akademik' }
    ],
    reviews: [
      { rating: 5, comment: 'Score UTBK 750+! Puncak tercapai!', student_name: 'Pendaki Sukses', program_name: 'Puncak UTBK', created_at: '2025-12-26' }
    ]
  },
  {
    id: generateId(),
    name: 'Generasi Emas',
    description: 'Mencetak generasi emas Indonesia yang cerdas dan berkarakter. Program holistik untuk masa depan bangsa.',
    type: 'hybrid',
    address: 'Jl. Pemuda No. 150',
    city: 'PALEMBANG',
    district: 'Ilir Timur II',
    photos: [],
    facilities: ['AC', 'WiFi', 'Golden Hall', 'Character Center', 'Nation Builder Room'],
    highlights: ['Golden Generation', 'Character Building', 'Nation Pride'],
    rating: 4.6,
    review_count: 156,
    student_count: 789,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Emas Akademik', description: 'Program akademik untuk generasi emas', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'all', capacity: 18, current_students: 16, subject: 'Semua Mapel' },
      { name: 'Emas Karakter', description: 'Pembentukan karakter generasi emas', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'all', capacity: 20, current_students: 18, subject: 'Character Building' }
    ],
    teachers: [
      { name: 'Pembina Emas', education: 'S2 Pendidikan Unsri', experience_years: 16, specializations: ['Character', 'Academic'], bio: 'Pembina yang mencetak generasi emas cerdas dan berkarakter' }
    ],
    reviews: [
      { rating: 4, comment: 'Anak tidak hanya pintar tapi juga sopan dan berkarakter.', student_name: 'Ibu Bangga', program_name: 'Emas Karakter', created_at: '2025-12-27' }
    ]
  },
  {
    id: generateId(),
    name: 'Lentera Pengetahuan',
    description: 'Lentera yang menerangi jalan menuju pengetahuan. Membimbing siswa dari kegelapan menuju cahaya ilmu.',
    type: 'offline',
    address: 'Jl. Ahmad Yani No. 100',
    city: 'MEDAN',
    district: 'Medan Maimun',
    photos: [],
    facilities: ['AC', 'WiFi', 'Enlightenment Room', 'Knowledge Library', 'Guidance Center'],
    highlights: ['Light of Knowledge', 'Guidance', 'Enlightenment'],
    rating: 4.7,
    review_count: 134,
    student_count: 867,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Lentera Bimbel', description: 'Bimbingan terang menuju prestasi', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'all', capacity: 15, current_students: 14, subject: 'Semua Mapel' },
      { name: 'Lentera UTBK', description: 'Cahaya terang menuju PTN', price: 650000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 15, current_students: 13, subject: 'UTBK' }
    ],
    teachers: [
      { name: 'Pembawa Lentera', education: 'S2 Pendidikan USU', experience_years: 14, specializations: ['Guidance', 'Mentoring'], bio: 'Guru yang menerangi jalan setiap siswa menuju sukses' }
    ],
    reviews: [
      { rating: 5, comment: 'Seperti ada cahaya terang di tengah kebingungan belajar.', student_name: 'Siswa Tercerahkan', program_name: 'Lentera Bimbel', created_at: '2025-12-28' }
    ]
  },
  {
    id: generateId(),
    name: 'Jembatan Cita-Cita',
    description: 'Jembatan yang menghubungkan siswa dengan cita-citanya. Dari mimpi menuju kenyataan melalui pendidikan.',
    type: 'hybrid',
    address: 'Jl. Panglima Polim No. 78',
    city: 'MAKASSAR',
    district: 'Panakkukang',
    photos: [],
    facilities: ['AC', 'WiFi', 'Dream Bridge', 'Career Center', 'Counseling Room'],
    highlights: ['Dream Bridge', 'Career Guidance', 'Future Planning'],
    rating: 4.8,
    review_count: 189,
    student_count: 1345,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Jembatan PTN', description: 'Jembatan menuju PTN impian', price: 700000, price_type: 'monthly', duration_months: 6, sessions_per_week: 5, level: 'advanced', capacity: 18, current_students: 17, subject: 'UTBK' },
      { name: 'Jembatan Karir', description: 'Bimbingan akademik dengan orientasi karir', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 15, current_students: 13, subject: 'Career Prep' },
      { name: 'Jembatan Luar Negeri', description: 'Persiapan kuliah luar negeri', price: 1200000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'advanced', capacity: 10, current_students: 8, subject: 'Study Abroad' }
    ],
    teachers: [
      { name: 'Arsitek Cita-Cita', education: 'S2 Counseling UNHAS', experience_years: 17, specializations: ['Career Counseling', 'Future Planning'], bio: 'Konselor yang membantu siswa merancang jembatan menuju cita-cita' },
      { name: 'Global Guide', education: 'MA Education, UK', experience_years: 10, specializations: ['Study Abroad', 'IELTS'], bio: 'Pemandu untuk siswa yang bermimpi kuliah di luar negeri' }
    ],
    reviews: [
      { rating: 5, comment: 'Cita-cita kuliah di Jepang jadi kenyataan! Arigato Jembatan Cita-Cita!', student_name: 'Mahasiswa Jepang', program_name: 'Jembatan Luar Negeri', created_at: '2025-12-29' },
      { rating: 5, comment: 'Diterima di UGM sesuai cita-cita!', student_name: 'Calon Mahasiswa UGM', program_name: 'Jembatan PTN', created_at: '2025-12-30' }
    ]
  }
]

// Re-export as teknologi and musik for backward compatibility
export const teknologi = seniDesain
export const musik = bimbelSD
