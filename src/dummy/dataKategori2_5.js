// Kategori 2-3: Modern & Bersahabat
// 20 tempat les akademik

const generateId = () => 'dummy-' + Math.random().toString(36).substr(2, 9)

// ============================================
// KATEGORI 2: MODERN & INGGRIS-INDONESIA (10 tempat les)
// Kesan: Kekinian, Menyasar Menengah Keatas
// ============================================
export const bahasaInggris = [
  {
    id: generateId(),
    name: 'Smart Gen Indonesia',
    description: 'Bimbingan belajar modern dengan pendekatan teknologi terkini. Menggunakan AI-powered learning untuk personalisasi materi sesuai kemampuan siswa. Platform e-learning terintegrasi dengan kelas tatap muka.',
    type: 'hybrid',
    address: 'Jl. Sudirman No. 200',
    city: 'JAKARTA SELATAN',
    district: 'SCBD',
    photos: [],
    facilities: ['AC', 'WiFi', 'Tablet Learning', 'AI Tutor System', 'Cafeteria'],
    highlights: ['AI-Powered Learning', 'Personalized Curriculum', 'Real-time Progress'],
    rating: 4.9,
    review_count: 287,
    student_count: 1234,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Smart Math', description: 'Pembelajaran matematika dengan adaptive learning technology', price: 650000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 20, current_students: 18, subject: 'Matematika' },
      { name: 'Smart Science', description: 'IPA terintegrasi dengan virtual lab dan simulasi 3D', price: 700000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 15, current_students: 14, subject: 'IPA' },
      { name: 'Smart English', description: 'Bahasa Inggris dengan AI conversation partner', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 15, current_students: 13, subject: 'Bahasa Inggris' }
    ],
    teachers: [
      { name: 'Kevin Hartono, M.Sc', education: 'S2 Computer Science NUS', experience_years: 8, specializations: ['EdTech', 'AI in Education'], bio: 'Co-founder Smart Gen dengan background teknologi pendidikan' },
      { name: 'Dr. Anita Susilo', education: 'PhD Education MIT', experience_years: 12, specializations: ['Curriculum Design', 'Digital Learning'], bio: 'Pakar pembelajaran digital dengan pengalaman di Silicon Valley' }
    ],
    reviews: [
      { rating: 5, comment: 'Teknologinya keren banget! Anak saya jadi semangat belajar karena seperti main game.', student_name: 'Ibu Stephanie', program_name: 'Smart Math', created_at: '2025-12-15' },
      { rating: 5, comment: 'AI tutornya sangat membantu untuk latihan kapan saja.', student_name: 'Bapak Vincent', program_name: 'Smart English', created_at: '2025-12-20' }
    ]
  },
  {
    id: generateId(),
    name: 'Bright Future Learning Center',
    description: 'Pusat pembelajaran bahasa Inggris premium dengan native speaker dan certified teachers. Program TOEFL, IELTS, dan English for Academic Purposes.',
    type: 'offline',
    address: 'Jl. Kemang Raya No. 45',
    city: 'JAKARTA SELATAN',
    district: 'Kemang',
    photos: [],
    facilities: ['AC', 'WiFi', 'Language Lab', 'Recording Studio', 'Library'],
    highlights: ['Native Speaker', 'IELTS Official Partner', 'Small Class 6 Siswa'],
    rating: 4.8,
    review_count: 198,
    student_count: 987,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'IELTS Preparation', description: 'Program intensif IELTS dengan target band 7.0+', price: 950000, price_type: 'monthly', duration_months: 3, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 7, subject: 'IELTS' },
      { name: 'TOEFL iBT Mastery', description: 'Persiapan TOEFL iBT dengan target 100+', price: 850000, price_type: 'monthly', duration_months: 3, sessions_per_week: 4, level: 'advanced', capacity: 8, current_students: 6, subject: 'TOEFL' },
      { name: 'Academic English', description: 'Bahasa Inggris untuk keperluan akademik dan paper', price: 650000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'intermediate', capacity: 10, current_students: 8, subject: 'Academic Writing' }
    ],
    teachers: [
      { name: 'James Mitchell', education: 'MA TESOL, University of Cambridge', experience_years: 15, specializations: ['IELTS', 'Academic Writing'], bio: 'Native speaker dengan sertifikasi CELTA dan pengalaman global' },
      { name: 'Sarah Williams, M.Ed', education: 'M.Ed English, Boston University', experience_years: 10, specializations: ['TOEFL', 'Speaking'], bio: 'Certified TOEFL trainer dengan success rate 95%' }
    ],
    reviews: [
      { rating: 5, comment: 'IELTS saya naik dari 6.0 ke 7.5 dalam 3 bulan! Amazing!', student_name: 'Ricky Setiawan', program_name: 'IELTS Preparation', created_at: '2025-12-18' },
      { rating: 5, comment: 'Native speaker-nya sangat membantu pronunciation saya.', student_name: 'Angela', program_name: 'Academic English', created_at: '2025-12-22' }
    ]
  },
  {
    id: generateId(),
    name: 'EduFocus',
    description: 'Bimbingan belajar dengan fokus maksimal pada hasil. Drilling system dan tryout berkala untuk memastikan kesiapan siswa menghadapi ujian.',
    type: 'hybrid',
    address: 'Jl. Asia Afrika No. 100',
    city: 'BANDUNG',
    district: 'Sumur Bandung',
    photos: [],
    facilities: ['AC', 'WiFi', 'CBT Lab', 'Study Pod Individual', 'Consultation Room'],
    highlights: ['Fokus pada Hasil', 'Weekly Tryout', 'Personal Consultation'],
    rating: 4.7,
    review_count: 167,
    student_count: 654,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Quantum Cerdas',
    description: 'Bimbel matematika dan sains dengan pendekatan quantum learning. Memaksimalkan potensi otak melalui teknik belajar yang scientifically proven.',
    type: 'offline',
    address: 'Jl. Raya Darmo No. 56',
    city: 'SURABAYA',
    district: 'Wonokromo',
    photos: [],
    facilities: ['AC', 'WiFi', 'Brain Gym Room', 'Lab Sains', 'Relaxation Corner'],
    highlights: ['Quantum Learning', 'Brain Optimization', 'Stress-Free Learning'],
    rating: 4.8,
    review_count: 145,
    student_count: 432,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Quantum Math', description: 'Matematika dengan teknik quantum learning untuk pemahaman cepat', price: 550000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 12, current_students: 11, subject: 'Matematika' },
      { name: 'Quantum Physics', description: 'Fisika dengan visualisasi dan eksperimen interaktif', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 10, current_students: 9, subject: 'Fisika' }
    ],
    teachers: [
      { name: 'Dr. Ferry Quantum', education: 'S3 Fisika ITS', experience_years: 14, specializations: ['Quantum Learning', 'Fisika'], bio: 'Trainer NLP dan quantum learning untuk pendidikan' }
    ],
    reviews: [
      { rating: 5, comment: 'Metode belajarnya unik! Matematika jadi tidak menakutkan.', student_name: 'Ibu Lina', program_name: 'Quantum Math', created_at: '2025-12-21' }
    ]
  },
  {
    id: generateId(),
    name: 'Prime Generation',
    description: 'Membentuk generasi prima yang siap bersaing di era global. Program bilingual dan persiapan sekolah luar negeri.',
    type: 'hybrid',
    address: 'Jl. Gejayan No. 78',
    city: 'YOGYAKARTA',
    district: 'Sleman',
    photos: [],
    facilities: ['AC', 'WiFi', 'International Corner', 'Video Conference', 'E-Library'],
    highlights: ['Bilingual Program', 'Study Abroad Prep', 'Global Mindset'],
    rating: 4.6,
    review_count: 123,
    student_count: 765,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Alpha Education',
    description: 'Bimbel untuk calon alpha generation. Mengintegrasikan STEM education dengan soft skills untuk abad 21.',
    type: 'offline',
    address: 'Jl. Candi Prambanan No. 45',
    city: 'SEMARANG',
    district: 'Pedurungan',
    photos: [],
    facilities: ['AC', 'WiFi', 'STEM Lab', 'Maker Space', 'Presentation Room'],
    highlights: ['STEM Education', '21st Century Skills', 'Project-Based Learning'],
    rating: 4.7,
    review_count: 134,
    student_count: 543,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'STEM Explorer', description: 'Eksplorasi sains, teknologi, engineering, dan matematika', price: 600000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'beginner', capacity: 12, current_students: 10, subject: 'STEM' },
      { name: 'Coding for Kids', description: 'Pengenalan coding dan computational thinking', price: 500000, price_type: 'monthly', duration_months: 4, sessions_per_week: 2, level: 'beginner', capacity: 10, current_students: 9, subject: 'Coding' }
    ],
    teachers: [
      { name: 'Ir. Raka Programmer', education: 'S1 Teknik Informatika UNDIP', experience_years: 8, specializations: ['Coding', 'Robotics'], bio: 'Software engineer yang passionate mengajar anak-anak coding' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak saya jadi suka sains dan teknologi! Project-nya seru-seru.', student_name: 'Ibu Diana', program_name: 'STEM Explorer', created_at: '2025-12-24' }
    ]
  },
  {
    id: generateId(),
    name: 'Master Class Academy',
    description: 'Bimbel premium dengan pengajar master di bidangnya. Kelas eksklusif dengan rasio guru-murid 1:5.',
    type: 'offline',
    address: 'Jl. Ijen No. 23',
    city: 'MALANG',
    district: 'Klojen',
    photos: [],
    facilities: ['AC', 'WiFi', 'VIP Study Room', 'Private Library', 'Refreshment'],
    highlights: ['Master Teachers', 'Exclusive Class', 'Personal Mentor'],
    rating: 4.9,
    review_count: 89,
    student_count: 876,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Logic House',
    description: 'Pusat pengembangan logika dan penalaran. Fokus pada matematika, logika, dan critical thinking.',
    type: 'hybrid',
    address: 'Jl. Teuku Umar No. 67',
    city: 'DENPASAR',
    district: 'Denpasar Barat',
    photos: [],
    facilities: ['AC', 'WiFi', 'Logic Games Room', 'Puzzle Collection', 'Discussion Area'],
    highlights: ['Logic Training', 'Critical Thinking', 'Problem Solving'],
    rating: 4.6,
    review_count: 112,
    student_count: 321,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Brilliant Mind Center',
    description: 'Mengasah kecerdasan melalui metode mind mapping dan accelerated learning. Program untuk anak gifted dan talented.',
    type: 'offline',
    address: 'Jl. Setiabudi No. 89',
    city: 'BANDUNG',
    district: 'Cidadap',
    photos: [],
    facilities: ['AC', 'WiFi', 'Mind Mapping Studio', 'Creative Room', 'Quiet Zone'],
    highlights: ['Gifted Program', 'Mind Mapping', 'Accelerated Learning'],
    rating: 4.8,
    review_count: 98,
    student_count: 654,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  {
    id: generateId(),
    name: 'Global Prestasi',
    description: 'Bimbel dengan standar internasional untuk siswa yang mengincar prestasi global. Partner dengan berbagai universitas luar negeri.',
    type: 'hybrid',
    address: 'Jl. HR Muhammad No. 123',
    city: 'SURABAYA',
    district: 'Sukomanunggal',
    photos: [],
    facilities: ['AC', 'WiFi', 'Global Resource Center', 'Video Conference', 'Alumni Network'],
    highlights: ['International Standard', 'University Partners', 'Global Network'],
    rating: 4.7,
    review_count: 145,
    student_count: 498,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  }
]

// ============================================
// KATEGORI 3: BERSAHABAT & HOMEY (10 tempat les)
// Kesan: Personal, Les Privat, Kelompok Kecil
// ============================================
export const bahasaAsia = [
  {
    id: generateId(),
    name: 'Rumah Belajar Ceria',
    description: 'Suasana belajar seperti di rumah sendiri. Metode fun learning yang membuat anak-anak senang belajar tanpa tekanan.',
    type: 'offline',
    address: 'Jl. Tebet Timur Raya No. 12',
    city: 'JAKARTA SELATAN',
    district: 'Tebet',
    photos: [],
    facilities: ['AC', 'WiFi', 'Play Area', 'Snack Corner', 'Garden'],
    highlights: ['Fun Learning', 'Homey Atmosphere', 'Snack Included'],
    rating: 4.8,
    review_count: 178,
    student_count: 234,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
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
  },
  {
    id: generateId(),
    name: 'Sahabat Siswa',
    description: 'Menjadi sahabat belajar bagi setiap siswa. Pendekatan personal dengan memahami karakter dan gaya belajar masing-masing anak.',
    type: 'offline',
    address: 'Jl. Cipete Raya No. 45',
    city: 'JAKARTA SELATAN',
    district: 'Cipete',
    photos: [],
    facilities: ['AC', 'WiFi', 'Small Group Rooms', 'Consultation Area', 'Parking'],
    highlights: ['Personal Approach', 'Character Building', 'Small Group'],
    rating: 4.7,
    review_count: 156,
    student_count: 189,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Sahabat SD', description: 'Bimbingan SD dengan perhatian personal', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 6, current_students: 5, subject: 'Semua Mapel' },
      { name: 'Sahabat SMP', description: 'Bimbingan SMP dengan mentoring sistem', price: 500000, price_type: 'monthly', duration_months: 6, sessions_per_week: 4, level: 'intermediate', capacity: 6, current_students: 6, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Kak Budi Sahabat', education: 'S1 Psikologi UI', experience_years: 10, specializations: ['Mentoring', 'Counseling'], bio: 'Konselor pendidikan yang sangat sabar dan pengertian' }
    ],
    reviews: [
      { rating: 5, comment: 'Guru-gurunya seperti kakak sendiri, anak jadi nyaman curhat.', student_name: 'Ibu Lestari', program_name: 'Sahabat SD', created_at: '2025-12-18' }
    ]
  },
  {
    id: generateId(),
    name: 'Kawan Pintar',
    description: 'Les privat dan kelompok kecil dengan harga terjangkau. Mengutamakan kedekatan guru dan siswa.',
    type: 'offline',
    address: 'Jl. Mampang Prapatan No. 67',
    city: 'JAKARTA SELATAN',
    district: 'Mampang',
    photos: [],
    facilities: ['AC', 'WiFi', 'Private Rooms', 'Waiting Room', 'Free Drinks'],
    highlights: ['Affordable', 'Friendly Teachers', 'Flexible Schedule'],
    rating: 4.6,
    review_count: 134,
    student_count: 312,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Privat Matematika', description: 'Les privat matematika 1-on-1', price: 150000, price_type: 'per_session', duration_months: 3, sessions_per_week: 2, level: 'all', capacity: 1, current_students: 1, subject: 'Matematika' },
      { name: 'Kelompok Kecil SMP', description: 'Bimbel SMP max 4 siswa per kelas', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 4, current_students: 4, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Kak Tyo', education: 'S1 Pendidikan Matematika UNJ', experience_years: 6, specializations: ['Matematika', 'Privat'], bio: 'Tutor muda yang energik dan sabar' }
    ],
    reviews: [
      { rating: 4, comment: 'Harganya terjangkau tapi kualitasnya bagus!', student_name: 'Ibu Ratih', program_name: 'Kelompok Kecil SMP', created_at: '2025-12-20' }
    ]
  },
  {
    id: generateId(),
    name: 'Teras Ilmu',
    description: 'Seperti belajar di teras rumah tetangga yang pintar. Santai tapi serius dalam belajar.',
    type: 'offline',
    address: 'Jl. Bintaro Utama No. 34',
    city: 'TANGERANG',
    district: 'Pondok Aren',
    photos: [],
    facilities: ['AC', 'WiFi', 'Open Space', 'Mini Library', 'Bean Bags'],
    highlights: ['Relaxed Atmosphere', 'Casual Learning', 'Free WiFi'],
    rating: 4.5,
    review_count: 112,
    student_count: 156,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Les Santai SD', description: 'Belajar santai tapi tetap fokus untuk SD', price: 300000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 8, current_students: 7, subject: 'Semua Mapel' },
      { name: 'Les Santai SMP', description: 'Belajar SMP dengan suasana rileks', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 8, current_students: 6, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Mas Ari', education: 'S1 Pendidikan Fisika UNJ', experience_years: 7, specializations: ['Fisika', 'Casual Teaching'], bio: 'Guru yang asyik diajak ngobrol tapi tetap profesional' }
    ],
    reviews: [
      { rating: 4, comment: 'Suasananya enak, anak nggak stress belajarnya.', student_name: 'Papa Rendi', program_name: 'Les Santai SD', created_at: '2025-12-22' }
    ]
  },
  {
    id: generateId(),
    name: 'Pojok Belajar',
    description: 'Les privat rumahan dengan guru yang datang ke rumah. Praktis untuk orang tua sibuk.',
    type: 'offline',
    address: 'Mobile - Jabodetabek',
    city: 'JAKARTA SELATAN',
    district: 'Various',
    photos: [],
    facilities: ['Home Visit', 'Flexible Schedule', 'Materials Provided'],
    highlights: ['Home Tutoring', 'Convenient', 'Trusted Teachers'],
    rating: 4.7,
    review_count: 198,
    student_count: 278,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Privat ke Rumah SD', description: 'Guru datang ke rumah untuk siswa SD', price: 200000, price_type: 'per_session', duration_months: 3, sessions_per_week: 2, level: 'beginner', capacity: 1, current_students: 1, subject: 'Semua Mapel' },
      { name: 'Privat ke Rumah SMP', description: 'Guru datang ke rumah untuk siswa SMP', price: 250000, price_type: 'per_session', duration_months: 3, sessions_per_week: 2, level: 'intermediate', capacity: 1, current_students: 1, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Tim Pojok Belajar', education: 'Various', experience_years: 5, specializations: ['Home Tutoring', 'All Subjects'], bio: 'Tim tutor terverifikasi yang siap datang ke rumah Anda' }
    ],
    reviews: [
      { rating: 5, comment: 'Praktis banget! Tidak perlu antar jemput anak.', student_name: 'Mama Busy', program_name: 'Privat ke Rumah SD', created_at: '2025-12-23' }
    ]
  },
  {
    id: generateId(),
    name: 'Omah Sinau',
    description: 'Rumah belajar dengan sentuhan budaya Jawa. Mengajarkan nilai-nilai luhur sambil belajar akademik.',
    type: 'offline',
    address: 'Jl. Prawirotaman No. 56',
    city: 'YOGYAKARTA',
    district: 'Mergangsan',
    photos: [],
    facilities: ['AC', 'WiFi', 'Pendopo', 'Garden', 'Traditional Corner'],
    highlights: ['Cultural Touch', 'Character Values', 'Traditional Setting'],
    rating: 4.8,
    review_count: 145,
    student_count: 345,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Sinau Ceria', description: 'Belajar dengan nilai-nilai budaya Jawa', price: 300000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 10, current_students: 9, subject: 'Semua Mapel' },
      { name: 'Sinau Bahasa', description: 'Bahasa Inggris dan Jawa dengan pendekatan budaya', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'all', capacity: 8, current_students: 7, subject: 'Bahasa' }
    ],
    teachers: [
      { name: 'Bu Guru Ningrum', education: 'S1 Pendidikan Bahasa UNY', experience_years: 15, specializations: ['Budaya Jawa', 'Character Building'], bio: 'Guru dengan filosofi Jawa yang mengajarkan unggah-ungguh' }
    ],
    reviews: [
      { rating: 5, comment: 'Anak jadi sopan dan rajin belajar. Unique concept!', student_name: 'Ibu Wulan', program_name: 'Sinau Ceria', created_at: '2025-12-24' }
    ]
  },
  {
    id: generateId(),
    name: 'Sobat Prestasi',
    description: 'Menjadi sobat menuju prestasi. Bimbel dengan sistem buddy yang saling mendukung.',
    type: 'offline',
    address: 'Jl. Pemuda No. 89',
    city: 'SOLO',
    district: 'Jebres',
    photos: [],
    facilities: ['AC', 'WiFi', 'Group Study Area', 'Discussion Room', 'Canteen'],
    highlights: ['Buddy System', 'Peer Learning', 'Supportive Community'],
    rating: 4.6,
    review_count: 123,
    student_count: 267,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Buddy Math', description: 'Belajar matematika dengan sistem buddy', price: 350000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 12, current_students: 10, subject: 'Matematika' },
      { name: 'Buddy Science', description: 'IPA dengan diskusi kelompok dan experiments', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 10, current_students: 9, subject: 'IPA' }
    ],
    teachers: [
      { name: 'Kak Dony', education: 'S1 Pendidikan Kimia UNS', experience_years: 9, specializations: ['Peer Learning', 'Group Dynamics'], bio: 'Fasilitator belajar yang menciptakan atmosfer kolaboratif' }
    ],
    reviews: [
      { rating: 4, comment: 'Anak jadi punya teman belajar dan saling memotivasi.', student_name: 'Ibu Tutik', program_name: 'Buddy Math', created_at: '2025-12-25' }
    ]
  },
  {
    id: generateId(),
    name: 'Ruang Cerdas',
    description: 'Ruang belajar yang memaksimalkan potensi kecerdasan setiap anak. Multiple intelligences approach.',
    type: 'offline',
    address: 'Jl. Simpang Lima No. 45',
    city: 'SEMARANG',
    district: 'Semarang Tengah',
    photos: [],
    facilities: ['AC', 'WiFi', 'Multiple Intelligence Lab', 'Art Corner', 'Music Room'],
    highlights: ['Multiple Intelligences', 'Individual Potential', 'Creative Learning'],
    rating: 4.7,
    review_count: 134,
    student_count: 198,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Discover Your Genius', description: 'Menemukan dan mengembangkan kecerdasan dominan anak', price: 450000, price_type: 'monthly', duration_months: 6, sessions_per_week: 2, level: 'all', capacity: 10, current_students: 8, subject: 'Multiple Intelligences' },
      { name: 'Creative Learning', description: 'Belajar akademik dengan pendekatan kreatif', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 10, current_students: 9, subject: 'All Subjects' }
    ],
    teachers: [
      { name: 'Dr. MI Expert', education: 'S3 Psikologi Pendidikan UNDIP', experience_years: 13, specializations: ['Multiple Intelligences', 'Child Psychology'], bio: 'Pakar kecerdasan majemuk dengan pendekatan holistik' }
    ],
    reviews: [
      { rating: 5, comment: 'Akhirnya tahu anak saya ternyata kinesthetic learner!', student_name: 'Ibu Maya', program_name: 'Discover Your Genius', created_at: '2025-12-26' }
    ]
  },
  {
    id: generateId(),
    name: 'Sanggar Edukasi',
    description: 'Sanggar belajar dengan suasana komunitas. Belajar bersama dengan anak-anak dari berbagai sekolah.',
    type: 'offline',
    address: 'Jl. Duren Tiga No. 78',
    city: 'JAKARTA SELATAN',
    district: 'Pancoran',
    photos: [],
    facilities: ['AC', 'WiFi', 'Community Hall', 'Mini Library', 'Outdoor Area'],
    highlights: ['Community Learning', 'Social Skills', 'Diverse Friends'],
    rating: 4.5,
    review_count: 112,
    student_count: 223,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Sanggar SD', description: 'Belajar bersama untuk siswa SD', price: 300000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'beginner', capacity: 15, current_students: 12, subject: 'Semua Mapel' },
      { name: 'Sanggar SMP', description: 'Komunitas belajar untuk siswa SMP', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'intermediate', capacity: 12, current_students: 10, subject: 'Semua Mapel' }
    ],
    teachers: [
      { name: 'Pak Joko Komunitas', education: 'S1 Sosiologi UI', experience_years: 12, specializations: ['Community Building', 'Social Learning'], bio: 'Fasilitator komunitas yang menciptakan lingkungan belajar positif' }
    ],
    reviews: [
      { rating: 4, comment: 'Anak jadi punya banyak teman dari berbagai sekolah.', student_name: 'Ibu Siska', program_name: 'Sanggar SD', created_at: '2025-12-27' }
    ]
  },
  {
    id: generateId(),
    name: 'Pondok Pintar',
    description: 'Pondok belajar dengan suasana asri dan tenang. Cocok untuk anak yang butuh ketenangan dalam belajar.',
    type: 'offline',
    address: 'Jl. Bukit Dago No. 34',
    city: 'BANDUNG',
    district: 'Coblong',
    photos: [],
    facilities: ['AC', 'WiFi', 'Garden View', 'Quiet Rooms', 'Meditation Corner'],
    highlights: ['Peaceful Environment', 'Focus Zone', 'Nature View'],
    rating: 4.6,
    review_count: 98,
    student_count: 187,
    is_active: true,
    is_verified: true,
    verification_status: 'verified',
    programs: [
      { name: 'Focus Study', description: 'Belajar dengan fokus tinggi di lingkungan tenang', price: 400000, price_type: 'monthly', duration_months: 6, sessions_per_week: 3, level: 'all', capacity: 8, current_students: 7, subject: 'Semua Mapel' },
      { name: 'UTBK Retreat', description: 'Persiapan UTBK dengan konsentrasi penuh', price: 600000, price_type: 'monthly', duration_months: 4, sessions_per_week: 4, level: 'advanced', capacity: 6, current_students: 6, subject: 'UTBK' }
    ],
    teachers: [
      { name: 'Ibu Tenang', education: 'S2 Pendidikan ITB', experience_years: 14, specializations: ['Concentration', 'Mindful Learning'], bio: 'Guru yang tenang dan bisa menciptakan atmosfer belajar fokus' }
    ],
    reviews: [
      { rating: 5, comment: 'Tempatnya tenang banget, cocok untuk anak saya yang mudah distraksi.', student_name: 'Ibu Andini', program_name: 'Focus Study', created_at: '2025-12-28' }
    ]
  }
]
