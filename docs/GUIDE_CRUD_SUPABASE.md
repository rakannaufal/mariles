# Panduan Lengkap Integrasi Frontend - Backend (Supabase) + Page Mapping

Dokumen ini berisi kode **siap pakai** untuk setiap peran, lengkap dengan **Lokasi File (`src/views/...`)** di mana kode tersebut seharusnya ditempatkan.

---

## 1. SETUP GLOBAL
**(File: `src/supabase.js`)**
Pastikan Anda punya file ini untuk inisialisasi client.

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## 2. PUBLIC PAGE (Tamu)

### A. Register User & Trigger Backend
**(File: `src/views/public/RegisterPage.vue`)**
Logic ini otomatis akan memicu trigger `handle_new_user` di database untuk membuat profil Student/Owner/Teacher yang kosong.

```javascript
async function handleRegister() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: this.email,
      password: this.password,
      options: {
        data: {
          full_name: this.fullName,
          // Role ini PENTING karena dibaca oleh Database Trigger
          role: this.selectedRole // 'student', 'owner', atau 'teacher'
        }
      }
    });

    if (error) throw error;
    alert('Registrasi Berhasil! Cek email untuk verifikasi.');
    this.$router.push('/login');

  } catch (err) {
    alert('Gagal: ' + err.message);
  }
}
```

### B. Fetch Tempat Les
**(File: `src/views/public/HomePage.vue` & `src/views/public/SearchPage.vue`)**
Menampilkan tempat les yang sudah diverifikasi admin.

```javascript
async function fetchLesPlaces() {
  const { data, error } = await supabase
    .from('les_places')
    .select(`
      id, name, city, rating, photos, type, price_range,
      categories(name)
    `)
    .eq('verification_status', 'verified')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (error) console.error(error);
  this.lesPlaces = data || [];
}
```

---

## 3. STUDENT (Murid)

### A. Booking Kelas (Anti-Fraud)
**(File: `src/views/public/LesDetailPage.vue` atau `src/views/student/StudentPayment.vue`)**
Student wajib booking dengan status `pending`.

```javascript
async function createBooking(programId) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // 1. Ambil Profil Student (Relasi User -> Student)
  const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single();

  // 2. Buat Booking
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      student_id: student.id,
      program_id: programId,
      les_place_id: this.lesPlaceId, // ID Tempat Les
      status: 'pending',        // WAJIB: RLS menolak jika 'active'
      payment_status: 'unpaid', 
      start_date: new Date()
    })
    .select()
    .single();

  if (error) return alert('Gagal Booking: ' + error.message);
  
  // Lanjut ke Payment Gateway...
  this.$router.push(`/student/payment/${data.id}`);
}
```

### B. Dashboard & Jadwal
**(File: `src/views/student/StudentMyClass.vue`)**
Menampilkan daftar les saya.

```javascript
async function fetchMyClasses() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single();

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, status, start_date,
      programs ( name, subject, schedule ),
      les_places ( name, address, photos )
    `)
    .eq('student_id', student.id)
    .neq('status', 'cancelled'); // Sembunyikan yang batal

  this.myClasses = data || [];
}
```

### C. Submit Tugas
**(File: `src/views/student/MyClassDetail.vue`)**

```javascript
async function submitCourseWork(materialId, fileUrl) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('exercise_submissions')
    .insert({
      material_id: materialId,
      student_id: user.id, // User ID (Sesuai RLS)
      submission_url: fileUrl,
      submission_notes: this.notes,
      submitted_at: new Date()
    });

  if (!error) alert('Tugas Terkirim!');
}
```

---

## 4. OWNER (Pemilik)

### A. Cek Saldo & Withdraw
**(File: `src/views/owner/OwnerFinance.vue`)**

```javascript
// A1. Cek Saldo
async function fetchBalance() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from('balances').select('*').eq('user_id', user.id).single();
  this.balance = data;
}

// A2. Request Withdraw (RPC Atomik)
async function requestPayout() {
  const { data, error } = await supabase.rpc('process_withdrawal_request', {
    p_amount: this.withdrawAmount,
    p_bank_name: this.bankName,
    p_bank_account: this.accountNumber,
    p_bank_holder: this.holderName
  });

  if (data?.success) {
    alert('Penarikan Sukses Diajukan! ID: ' + data.id);
    this.fetchBalance(); // Refresh
  } else {
    alert('Gagal: ' + (data?.message || error.message));
  }
}
```

### B. Manajemen Guru (Invite & Gaji)
**(File: `src/views/owner/OwnerTeachers.vue`)**

```javascript
// B1. Generate Kode Invite
async function generateCode() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: owner } = await supabase.from('owners').select('id').eq('user_id', user.id).single();
  
  const code = 'GURU-' + Math.floor(1000 + Math.random() * 9000);

  await supabase.from('teacher_invite_codes').insert({
    owner_id: owner.id,
    les_place_id: this.lesPlaceId,
    code: code,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  this.generatedCode = code;
}

// B2. Bayar Gaji (Pay Salary)
async function paySalary(teacherId, amount) {
  const { data, error } = await supabase.rpc('pay_teacher_salary', {
    p_teacher_id: teacherId,
    p_amount: amount,
    p_period: 'Bulan Ini'
  });

  if (data?.success) alert('Gaji Terkirim!');
  else alert('Gagal Bayar: ' + data?.message);
}
```

---

## 5. TEACHER (Guru)

### A. Join Tempat Les
**(File: `src/views/teacher/TeacherDashboard.vue` atau Halaman Welcome)**
Jika guru baru login dan belum punya tempat les.

```javascript
async function joinViaCode() {
  const { data, error } = await supabase.rpc('join_teacher_via_code', {
    p_code: this.inviteCodeInput
  });

  if (data?.success) {
    alert('Berhasil bergabung!');
    window.location.reload(); // Refresh state
  } else {
    alert('Kode Salah/Expired');
  }
}
```

### B. Input Nilai (Grading)
**(File: `src/views/teacher/TeacherGrades.vue`)**

```javascript
async function saveGrade(submissionId, score) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('exercise_submissions')
    .update({
      score: score,
      feedback: this.feedbackText,
      graded_at: new Date(),
      graded_by: user.id
    })
    .eq('id', submissionId); // RLS otomatis cek apakah guru ini berhak

  if (!error) alert('Nilai Disimpan');
}
```

### C. Absensi
**(File: `src/views/teacher/TeacherAttendance.vue`)**

```javascript
async function saveAttendance(bookingId, status) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();

  await supabase.from('attendance').insert({
    booking_id: bookingId,
    teacher_id: teacher.id,
    session_date: new Date(),
    status: status, // 'present', 'absent'
    notes: this.notes
  });
}
```

---

## 6. ADMIN (Moderator)

### A. Moderasi User
**(File: `src/views/admin/AdminUsers.vue`)**

```javascript
async function banUser(userId) {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);
    
  if (!error) alert('User Banned');
}
```

### B. Moderasi Review
**(File: `src/views/admin/AdminModeration.vue`)**

```javascript
async function deleteReview(reviewId) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);
    
  if (!error) alert('Review Dihapus');
}
```
