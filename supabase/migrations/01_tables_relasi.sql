-- 1. Table: users
CREATE TABLE users (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role ENUM('siswa', 'pemilik', 'pengajar', 'admin') NOT NULL, 
  phone VARCHAR(50),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  gender VARCHAR(50),
  birth_date DATE,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 2. Table: students
CREATE TABLE students (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL UNIQUE,
  nickname VARCHAR(100),
  education_level VARCHAR(50), 
  school_name VARCHAR(255),
  grade VARCHAR(50),
  curriculum VARCHAR(100),
  major VARCHAR(100),
  parent_name VARCHAR(255),
  parent_phone VARCHAR(50),
  province_id VARCHAR(50),
  province_name VARCHAR(100),
  city_id VARCHAR(50),
  city_name VARCHAR(100),
  postal_code VARCHAR(20),
  gender VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Table: owners
CREATE TABLE owners (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL UNIQUE,
  business_name VARCHAR(255),
  owner_type ENUM('pribadi', 'umum') DEFAULT 'umum',
  business_type VARCHAR(100),
  npwp VARCHAR(50),
  nik VARCHAR(50),
  verification_status ENUM('menunggu', 'terverifikasi', 'ditolak') DEFAULT 'menunggu',
  verified_at DATETIME,
  documents JSON,
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  bank_holder VARCHAR(100),
  payment_type VARCHAR(50) DEFAULT 'bank',
  ewallet_type VARCHAR(50),
  ewallet_number VARCHAR(50),
  province_id VARCHAR(50),
  province_name VARCHAR(100),
  city_id VARCHAR(50),
  city_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Table: les_places
CREATE TABLE les_places (
  id CHAR(36) NOT NULL,
  owner_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  type ENUM('online', 'offline', 'hybrid'),
  photos JSON,
  facilities JSON,
  highlights JSON,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_students INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(50) DEFAULT 'menunggu',
  rejection_reason TEXT,
  balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (owner_id) REFERENCES owners(id)
);

-- 5. Table: teachers
CREATE TABLE teachers (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL UNIQUE,
  owner_id CHAR(36),
  les_place_id CHAR(36),
  specializations JSON,
  certificates JSON,
  experience_years INT DEFAULT 0,
  education VARCHAR(255),
  qualification VARCHAR(255),
  bio TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  nik VARCHAR(50),
  province_id VARCHAR(50),
  province_name VARCHAR(100),
  city_id VARCHAR(50),
  city_name VARCHAR(100),
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  bank_holder VARCHAR(100),
  payment_type VARCHAR(50) DEFAULT 'bank',
  ewallet_type VARCHAR(50),
  ewallet_number VARCHAR(50),
  salary DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES owners(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 6. Table: categories
CREATE TABLE categories (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 7. Table: programs
CREATE TABLE programs (
  id CHAR(36) NOT NULL,
  les_place_id CHAR(36) NOT NULL,
  category_id CHAR(36),
  category_name VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(255),
  price DECIMAL(15, 2) NOT NULL,
  price_type ENUM('per_jam', 'harian', 'mingguan', 'bulanan', 'paket') DEFAULT 'bulanan',
  duration_months INT,
  sessions_per_week INT,
  session_duration_minutes INT DEFAULT 90,
  total_sessions INT DEFAULT 0,
  schedule JSON,
  capacity INT DEFAULT 10,
  current_students INT DEFAULT 0,
  level VARCHAR(50),
  type ENUM('offline', 'online', 'hybrid') DEFAULT 'offline',
  meeting_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  total_modules INT DEFAULT 0,
  total_videos INT DEFAULT 0,
  total_exercises INT DEFAULT 0,
  completion_config JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 8. Table: bookings
CREATE TABLE bookings (
  id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  program_id CHAR(36) NOT NULL,
  les_place_id CHAR(36) NOT NULL,
  status ENUM('menunggu', 'dikonfirmasi', 'aktif', 'selesai', 'dihentikan', 'kadaluarsa', 'dibatalkan') DEFAULT 'menunggu',
  payment_status ENUM('belum_dibayar', 'menunggu_verifikasi', 'lunas', 'dikembalikan', 'gagal', 'settlement', 'capture') DEFAULT 'belum_dibayar',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 9. Table: transactions
CREATE TABLE transactions (
  id CHAR(36) NOT NULL,
  les_place_id CHAR(36),
  student_id CHAR(36),
  booking_id CHAR(36),
  program_id CHAR(36),
  amount DECIMAL(15, 2) NOT NULL,
  platform_fee DECIMAL(15, 2) DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'menunggu', 
  payment_date DATETIME,
  midtrans_order_id VARCHAR(255) UNIQUE,
  midtrans_transaction_id VARCHAR(255),
  midtrans_payment_type VARCHAR(50),
  midtrans_status_code VARCHAR(10),
  snap_token VARCHAR(255),
  snap_redirect_url TEXT,
  description TEXT,
  reference_id VARCHAR(255) UNIQUE,
  hold_until DATETIME,
  refund_deadline DATETIME,
  lock_status VARCHAR(50) DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 10. Table: balances
CREATE TABLE balances (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) UNIQUE,
  les_place_id CHAR(36),
  total_balance DECIMAL(15, 2) DEFAULT 0,
  available_balance DECIMAL(15, 2) DEFAULT 0,
  pending_balance DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 11. Table: withdrawals
CREATE TABLE withdrawals (
  id CHAR(36) NOT NULL,
  user_id CHAR(36),
  les_place_id CHAR(36),
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  bank_account VARCHAR(100) NOT NULL,
  bank_holder VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'menunggu',
  requester_type ENUM('pemilik', 'pengajar') DEFAULT 'pemilik',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  completed_at DATETIME,
  disbursement_id VARCHAR(255),
  disbursement_status VARCHAR(50),
  disbursement_response JSON,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 12. Table: platform_revenue
CREATE TABLE platform_revenue (
  id CHAR(36) NOT NULL,
  transaction_id CHAR(36),
  withdrawal_id CHAR(36),
  amount DECIMAL(15, 2) NOT NULL,
  source ENUM('biaya_platform', 'biaya_penarikan', 'biaya_pengembalian', 'lainnya') NOT NULL,
  description TEXT,
  les_place_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (withdrawal_id) REFERENCES withdrawals(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 13. Table: teacher_payments
CREATE TABLE teacher_payments (
  id CHAR(36) NOT NULL,
  les_place_id CHAR(36),
  teacher_id CHAR(36),
  owner_id CHAR(36),
  amount DECIMAL(15, 2) NOT NULL,
  payment_type VARCHAR(50) DEFAULT 'gaji',
  payment_period VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'menunggu',
  scheduled_date DATE,
  paid_date DATETIME,
  bank_name VARCHAR(100),
  bank_account VARCHAR(100),
  bank_holder VARCHAR(100),
  disbursement_id VARCHAR(255),
  disbursement_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 14. Table: vouchers
CREATE TABLE vouchers (
  id CHAR(36) NOT NULL,
  les_place_id CHAR(36),
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  type ENUM('persen', 'nominal') NOT NULL,
  discount DECIMAL(15, 2) NOT NULL,
  max_discount DECIMAL(15, 2),
  min_purchase DECIMAL(15, 2) DEFAULT 0,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  usage_limit INT,
  usage_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 15. Table: refunds
CREATE TABLE refunds (
  id CHAR(36) NOT NULL,
  transaction_id CHAR(36),
  student_id CHAR(36),
  les_place_id CHAR(36),
  amount DECIMAL(15, 2) NOT NULL,
  reason TEXT,
  status ENUM('menunggu', 'disetujui', 'ditolak', 'diproses') DEFAULT 'menunggu',
  admin_note TEXT,
  processed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 16. Table: attendance
CREATE TABLE attendance (
  id CHAR(36) NOT NULL,
  booking_id CHAR(36) NOT NULL,
  teacher_id CHAR(36),
  session_date DATE NOT NULL,
  status ENUM('hadir', 'absen', 'terlambat', 'izin') DEFAULT 'hadir',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 17. Table: course_materials
CREATE TABLE course_materials (
  id CHAR(36) NOT NULL,
  program_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('modul', 'video', 'latihan') NOT NULL,
  exercise_type VARCHAR(50),
  deadline DATETIME,
  content TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INT,
  order_index INT DEFAULT 0,
  session_number INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  unlock_type ENUM('selalu', 'setelah_sesi', 'setelah_tanggal', 'manual') DEFAULT 'selalu',
  unlock_after_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- 18. Table: material_progress
CREATE TABLE material_progress (
  id CHAR(36) NOT NULL,
  material_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  progress_percent INT DEFAULT 0,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (material_id) REFERENCES course_materials(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 19. Table: exercise_submissions
CREATE TABLE exercise_submissions (
  id CHAR(36) NOT NULL,
  material_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  submission_url TEXT,
  submission_notes TEXT,
  score INT CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  graded_at DATETIME,
  graded_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (material_id) REFERENCES course_materials(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (graded_by) REFERENCES users(id)
);

-- 20. Table: grades
CREATE TABLE grades (
  id CHAR(36) NOT NULL,
  booking_id CHAR(36) NOT NULL,
  teacher_id CHAR(36),
  subject VARCHAR(100),
  score DECIMAL(5, 2),
  max_score DECIMAL(5, 2) DEFAULT 100,
  grade_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- 21. Table: quizzes
CREATE TABLE quizzes (
  id CHAR(36) NOT NULL,
  les_place_id CHAR(36),
  program_id CHAR(36),
  teacher_id CHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quiz_type ENUM('kuis', 'latihan', 'ujian', 'tugas') DEFAULT 'kuis',
  questions JSON NOT NULL,
  duration_minutes INT DEFAULT 30,
  time_limit_minutes INT,
  passing_score INT DEFAULT 70,
  max_attempts INT DEFAULT 3,
  is_published BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATETIME,
  end_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id),
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- 22. Table: quiz_attempts
CREATE TABLE quiz_attempts (
  id CHAR(36) NOT NULL,
  quiz_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  completed_at DATETIME,
  submitted_at DATETIME,
  answers JSON,
  results JSON,
  score INT,
  is_passed BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

-- 23. Table: chat_rooms
CREATE TABLE chat_rooms (
  id CHAR(36) NOT NULL,
  participant_1 CHAR(36) NOT NULL,
  participant_2 CHAR(36) NOT NULL,
  les_place_id CHAR(36),
  last_message TEXT,
  last_message_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 24. Table: chat_messages
CREATE TABLE chat_messages (
  id CHAR(36) NOT NULL,
  room_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id)
);

-- 25. Table: contacts
CREATE TABLE contacts (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('belum_dibaca', 'dibaca', 'dibalas', 'diarsipkan') DEFAULT 'belum_dibaca',
  replied_at DATETIME,
  reply_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 26. Table: reviews
CREATE TABLE reviews (
  id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  les_place_id CHAR(36) NOT NULL,
  booking_id CHAR(36),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reply TEXT,
  replied_at DATETIME,
  is_visible BOOLEAN DEFAULT TRUE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  flagged_at DATETIME,
  flagged_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 27. Table: reports
CREATE TABLE reports (
  id CHAR(36) NOT NULL,
  reporter_id CHAR(36),
  target_type ENUM('tempat_les', 'ulasan', 'pengguna', 'postingan_forum', 'komentar_forum', 'pesan') NOT NULL,
  target_id CHAR(36) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('menunggu', 'investigasi', 'selesai', 'diabaikan') DEFAULT 'menunggu',
  admin_note TEXT,
  admin_response TEXT,
  resolved_at DATETIME,
  resolved_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- 28. Table: favorites
CREATE TABLE favorites (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  les_place_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);

-- 29. Table: platform_settings
CREATE TABLE platform_settings (
  setting_key VARCHAR(255) NOT NULL,
  setting_value JSON NOT NULL,
  description TEXT,
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- 30. Table: forum_posts
CREATE TABLE forum_posts (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags JSON,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 31. Table: forum_comments
CREATE TABLE forum_comments (
  id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  parent_id CHAR(36),
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (post_id) REFERENCES forum_posts(id),
  FOREIGN KEY (parent_id) REFERENCES forum_comments(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 32. Table: notifications
CREATE TABLE notifications (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  data JSON,
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 33. Table: banners
CREATE TABLE banners (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  image_url TEXT NOT NULL,
  link VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 34. Table: teacher_invite_codes
CREATE TABLE teacher_invite_codes (
  id CHAR(36) NOT NULL,
  owner_id CHAR(36) NOT NULL,
  les_place_id CHAR(36),
  code VARCHAR(50) NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT FALSE,
  used_by CHAR(36),
  used_at DATETIME,
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (used_by) REFERENCES teachers(id),
  FOREIGN KEY (owner_id) REFERENCES owners(id),
  FOREIGN KEY (les_place_id) REFERENCES les_places(id)
);