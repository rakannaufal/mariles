<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMyClass } from '@/composables/useMyClass'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar.vue'

const router = useRouter()
const authStore = useAuthStore()
const { enrolledCourses, loading, fetchEnrolledCourses } = useMyClass()

// Review state
const showReviewModal = ref(false)
const reviewingCourse = ref(null)
const reviewRating = ref(5)
const reviewComment = ref('')
const submittingReview = ref(false)
const reviewSuccess = ref(false)

onMounted(async () => {
  if (authStore.user?.id) {
    await fetchEnrolledCourses(authStore.user.id)
  }
})

function openCourse(booking) {
  router.push(`/student/myclass/${booking.id}`)
}

function goHome() {
  router.push('/')
}

function getPhoto(photos) {
  if (!photos || !photos.length) return null
  return photos[0]
}

function formatSchedule(schedule) {
  if (!schedule) return 'Jadwal belum ditentukan'
  if (Array.isArray(schedule) && schedule.length) {
    return `${schedule.length} jadwal/minggu`
  }
  return 'Lihat jadwal lengkap'
}

// Review functions
function openReviewModal(booking, event) {
  event.stopPropagation() // Prevent card click
  reviewingCourse.value = booking
  reviewRating.value = 5
  reviewComment.value = ''
  showReviewModal.value = true
}

async function submitReview() {
  if (!reviewingCourse.value || !authStore.user?.id) return
  
  submittingReview.value = true
  
  try {
    // Get student ID
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (!studentData) {
      console.error('Student not found')
      return
    }
    
    // Insert review
    const { error } = await supabase
      .from('reviews')
      .insert({
        student_id: studentData.id,
        les_place_id: reviewingCourse.value.program?.les_place?.id,
        rating: reviewRating.value,
        comment: reviewComment.value,
        is_visible: true
      })
    
    if (error) throw error
    
    reviewSuccess.value = true
    setTimeout(() => {
      showReviewModal.value = false
      reviewSuccess.value = false
    }, 2000)
    
  } catch (err) {
    console.error('Error submitting review:', err)
  } finally {
    submittingReview.value = false
  }
}
</script>

<template>
  <div class="myclass-page">
    <!-- Navbar -->
    <Navbar />

    <!-- Main Content -->
    <main class="main-content">
      <div class="container">
        <!-- Header -->
        <header class="page-header">
          <button class="back-btn" @click="goHome">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali ke Beranda
          </button>
          <div class="header-info">
            <h1>Kelas Saya</h1>
            <p>Akses materi, video, dan latihan dari kelas yang kamu ikuti</p>
          </div>
        </header>

        <!-- Loading -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Memuat kelas...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="enrolledCourses.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <h3>Belum ada kelas aktif</h3>
          <p>Kamu belum memiliki kelas yang aktif. Cari dan daftar ke tempat les untuk mulai belajar.</p>
          <router-link to="/search" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Cari Tempat Les
          </router-link>
        </div>

        <!-- Course Grid -->
        <div v-else class="courses-grid">
          <div v-for="booking in enrolledCourses" :key="booking.id" 
               class="course-card" @click="openCourse(booking)">
            <div class="course-image">
              <img v-if="getPhoto(booking.program?.les_place?.photos)" 
                   :src="getPhoto(booking.program.les_place.photos)" 
                   :alt="booking.program?.name">
              <div v-else class="course-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <span class="course-status" :class="booking.status">
                {{ booking.status === 'active' ? 'Aktif' : 'Terdaftar' }}
              </span>
            </div>
            
            <div class="course-content">
              <div class="course-badge">{{ booking.program?.subject || 'Kelas' }}</div>
              <h3 class="course-title">{{ booking.program?.name }}</h3>
              <p class="course-place">{{ booking.program?.les_place?.name }}</p>
              
              <div class="course-info">
                <div class="info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>{{ formatSchedule(booking.program?.schedule) }}</span>
                </div>
                <div class="info-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{{ booking.program?.les_place?.city || 'Online' }}</span>
                </div>
              </div>
              <div class="course-actions">
                <button class="enter-btn" @click="openCourse(booking)">
                  <span>Masuk Kelas</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
                <button class="review-btn" @click="openReviewModal(booking, $event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Beri Ulasan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Review Modal -->
      <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
        <div class="modal">
          <button class="modal-close" @click="showReviewModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          
          <h2>Beri Ulasan</h2>
          <p class="modal-subtitle">{{ reviewingCourse?.program?.les_place?.name }}</p>
          
          <div v-if="reviewSuccess" class="alert success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Ulasan berhasil dikirim! Terima kasih.
          </div>
          
          <div v-else>
            <div class="rating-input">
              <span class="rating-label">Berapa bintang untuk tempat les ini?</span>
              <div class="stars-input">
                <button v-for="i in 5" :key="i" 
                        :class="{ filled: i <= reviewRating }"
                        @click="reviewRating = i">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label>Komentar (opsional)</label>
              <textarea v-model="reviewComment" rows="4" 
                        placeholder="Bagikan pengalaman belajar Anda di tempat les ini..."></textarea>
            </div>
            
            <div class="modal-actions">
              <button class="btn-cancel" @click="showReviewModal = false">Batal</button>
              <button class="btn-submit" @click="submitReview" :disabled="submittingReview">
                <span v-if="submittingReview" class="spinner"></span>
                {{ submittingReview ? 'Mengirim...' : 'Kirim Ulasan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.myclass-page {
  min-height: 100vh;
  background: var(--background);
}

.main-content {
  padding-top: 80px; /* Account for fixed navbar */
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

/* Header */
.page-header {
  margin-bottom: var(--spacing-2xl);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: var(--spacing-lg);
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.back-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.header-info h1 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
}

.header-info p {
  color: var(--text-muted);
  font-size: var(--font-size-base);
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  gap: var(--spacing-md);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--spacing-3xl);
  background: var(--surface);
  border-radius: var(--radius-2xl);
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-lg);
  color: var(--primary);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state h3 {
  font-size: var(--font-size-xl);
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.empty-state p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}

/* Course Grid */
.courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--spacing-lg);
}

.course-card {
  background: var(--surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.course-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.course-image {
  position: relative;
  height: 180px;
  background: var(--border-light);
}

.course-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.course-placeholder svg {
  width: 48px;
  height: 48px;
}

.course-status {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  background: var(--success);
  color: white;
}

.course-status.confirmed {
  background: var(--warning);
}

.course-content {
  padding: var(--spacing-lg);
}

.course-badge {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(136, 208, 228, 0.2);
  color: var(--secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}

.course-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
  line-height: 1.3;
}

.course-place {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-md);
}

.course-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
}

.info-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.info-item svg {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.enter-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.enter-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.enter-btn svg {
  width: 18px;
  height: 18px;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: var(--spacing-md);
  }

  .courses-grid {
    grid-template-columns: 1fr;
  }

  .course-image {
    height: 160px;
  }
}

/* Course Actions */
.course-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.course-actions .enter-btn {
  flex: 1;
}

.review-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--spacing-md) var(--spacing-md);
  background: #fef3c7;
  color: #d97706;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.review-btn:hover {
  background: #fde68a;
}

.review-btn svg {
  width: 16px;
  height: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
}

.modal-close svg { width: 20px; height: 20px; }

.modal h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.modal-subtitle {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 24px;
}

/* Rating Input */
.rating-input {
  margin-bottom: 20px;
}

.rating-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
}

.stars-input {
  display: flex;
  gap: 6px;
}

.stars-input button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #d1d5db;
  transition: all 0.2s;
}

.stars-input button.filled {
  color: #f59e0b;
}

.stars-input button:hover {
  transform: scale(1.2);
}

.stars-input svg {
  width: 32px;
  height: 32px;
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  resize: vertical;
}

.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 10px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.btn-submit {
  padding: 10px 20px;
  background: var(--primary);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-submit:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Alert */
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-radius: 10px;
  font-size: 14px;
}

.alert.success {
  background: #dcfce7;
  color: #16a34a;
}

.alert svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
</style>