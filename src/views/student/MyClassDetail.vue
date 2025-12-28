<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMyClass } from '@/composables/useMyClass'
import Navbar from '@/components/Navbar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const {
  currentCourse,
  materials,
  tests,
  grades,
  attendance,
  loading,
  fetchCourseDetail,
  fetchMaterials,
  fetchTests,
  fetchGrades,
  fetchAttendance,
  getScheduleDisplay,
  calculateCourseProgress
} = useMyClass()

const activeTab = ref('jadwal')
const tabsLoading = ref(false)

const tabs = [
  { id: 'jadwal', label: 'Jadwal', icon: 'calendar' },
  { id: 'modul', label: 'Modul', icon: 'book' },
  { id: 'video', label: 'Video', icon: 'play' },
  { id: 'nilai', label: 'Nilai', icon: 'star' },
  { id: 'latihan', label: 'Latihan', icon: 'edit' }
]

const modules = computed(() => materials.value.filter(m => m.type === 'module'))
const videos = computed(() => materials.value.filter(m => m.type === 'video'))
const scheduleItems = computed(() => getScheduleDisplay(currentCourse.value?.program?.schedule))

const averageGrade = computed(() => {
  if (!grades.value.length) return null
  const avg = grades.value.reduce((sum, g) => sum + (g.score / g.max_score * 100), 0) / grades.value.length
  return Math.round(avg)
})

const attendanceStats = computed(() => {
  const total = attendance.value.length
  const present = attendance.value.filter(a => a.status === 'present').length
  const absent = attendance.value.filter(a => a.status === 'absent').length
  return { total, present, absent, rate: total ? Math.round((present / total) * 100) : 0 }
})

onMounted(async () => {
  await loadCourse()
})

async function loadCourse() {
  const bookingId = route.params.bookingId
  
  // Load course detail
  if (authStore.user?.id) {
    await fetchCourseDetail(bookingId, authStore.user.id)
  }
  
  if (currentCourse.value?.program?.id) {
    await loadTabData()
  }
}

async function loadTabData() {
  if (!currentCourse.value?.program?.id) return
  
  tabsLoading.value = true
  const programId = currentCourse.value.program.id
  const bookingId = currentCourse.value.id
  
  if (authStore.user?.id) {
    await Promise.all([
      fetchMaterials(programId, authStore.user.id),
      fetchTests(programId, authStore.user.id),
      fetchGrades(bookingId),
      fetchAttendance(bookingId)
    ])
  }
  
  tabsLoading.value = false
}

function goBack() {
  router.push('/student/myclass')
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
}

function getGradeColor(score, max) {
  const percent = (score / max) * 100
  if (percent >= 80) return 'success'
  if (percent >= 60) return 'warning'
  return 'error'
}

function getTestTypeLabel(type) {
  const labels = {
    'quiz': 'Kuis',
    'practice': 'Latihan',
    'exam': 'Ujian',
    'assignment': 'Tugas'
  }
  return labels[type] || type
}
</script>

<template>
  <div class="myclass-detail-page">
    <!-- Navbar -->
    <Navbar />

    <!-- Main Content -->
    <main class="main-content">
      <!-- Loading -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>Memuat kelas...</p>
      </div>

      <template v-else-if="currentCourse">
        <!-- Course Header -->
        <div class="course-header">
          <div class="container">
            <button class="back-btn" @click="goBack">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Kembali
            </button>
            
            <div class="course-info">
              <span class="course-badge">{{ currentCourse.program?.subject }}</span>
              <h1>{{ currentCourse.program?.name }}</h1>
              <p>{{ currentCourse.program?.les_place?.name }} • {{ currentCourse.program?.les_place?.city }}</p>
            </div>
          </div>
        </div>

        <div class="container">
          <!-- Stats Overview -->
          <div class="stats-overview">
            <div class="stat-card">
              <div class="stat-icon progress">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ calculateCourseProgress() }}%</span>
                <span class="stat-label">Progress Belajar</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon grade">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ averageGrade ?? '-' }}</span>
                <span class="stat-label">Rata-rata Nilai</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon attendance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <polyline points="16 11 18 13 22 9"/>
                </svg>
              </div>
              <div class="stat-content">
                <span class="stat-value">{{ attendanceStats.rate }}%</span>
                <span class="stat-label">Kehadiran</span>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs-section">
            <div class="tabs-nav">
              <button v-for="tab in tabs" :key="tab.id" 
                      class="tab-btn" 
                      :class="{ active: activeTab === tab.id }"
                      @click="activeTab = tab.id">
                {{ tab.label }}
              </button>
            </div>

            <div class="tab-content">
              <!-- Loading -->
              <div v-if="tabsLoading" class="tab-loading">
                <div class="loading-spinner small"></div>
              </div>

              <!-- Jadwal Tab -->
              <div v-else-if="activeTab === 'jadwal'" class="tab-panel">
                <h3 class="section-title">Jadwal Les</h3>
                <div v-if="scheduleItems.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <p>Jadwal belum tersedia</p>
                </div>
                <div v-else class="schedule-list">
                  <div v-for="(item, index) in scheduleItems" :key="index" class="schedule-item">
                    <div class="schedule-day">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {{ item.day }}
                    </div>
                    <div class="schedule-time">{{ item.time }}</div>
                  </div>
                </div>
                
                <!-- Attendance History -->
                <div v-if="attendance.length" class="attendance-section">
                  <h3 class="section-title">Riwayat Kehadiran</h3>
                  <div class="attendance-list">
                    <div v-for="att in attendance" :key="att.id" class="attendance-item">
                      <span class="att-date">{{ formatDate(att.session_date) }}</span>
                      <span class="att-status" :class="att.status">
                        {{ att.status === 'present' ? 'Hadir' : att.status === 'absent' ? 'Tidak Hadir' : att.status === 'late' ? 'Terlambat' : 'Izin' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modul Tab -->
              <div v-else-if="activeTab === 'modul'" class="tab-panel">
                <h3 class="section-title">Materi Pembelajaran</h3>
                <div v-if="modules.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  <p>Belum ada modul tersedia</p>
                </div>
                <div v-else class="materials-list">
                  <div v-for="(item, index) in modules" :key="item.id" class="material-item">
                    <div class="material-number">{{ index + 1 }}</div>
                    <div class="material-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div class="material-info">
                      <h4>{{ item.title }}</h4>
                      <p>{{ item.description }}</p>
                    </div>
                    <div class="material-status" :class="{ completed: item.progress?.is_completed }">
                      <svg v-if="item.progress?.is_completed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span v-else>{{ item.progress?.progress_percent || 0 }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Video Tab -->
              <div v-else-if="activeTab === 'video'" class="tab-panel">
                <h3 class="section-title">Video Pembelajaran</h3>
                <div v-if="videos.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                  <p>Belum ada video tersedia</p>
                </div>
                <div v-else class="videos-grid">
                  <div v-for="video in videos" :key="video.id" class="video-card">
                    <div class="video-thumbnail">
                      <img v-if="video.thumbnail_url" :src="video.thumbnail_url" :alt="video.title">
                      <div v-else class="video-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </div>
                      <div class="play-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      </div>
                      <span v-if="video.duration_minutes" class="video-duration">{{ video.duration_minutes }} menit</span>
                    </div>
                    <div class="video-info">
                      <h4>{{ video.title }}</h4>
                      <p>{{ video.description }}</p>
                    </div>
                    <div class="video-progress" v-if="video.progress">
                      <div class="progress-bar">
                        <div class="progress-fill" :style="{ width: video.progress.progress_percent + '%' }"></div>
                      </div>
                      <span>{{ video.progress.progress_percent }}% selesai</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Nilai Tab -->
              <div v-else-if="activeTab === 'nilai'" class="tab-panel">
                <h3 class="section-title">Rapor & Nilai</h3>
                <div v-if="grades.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <p>Belum ada nilai tersedia</p>
                </div>
                <template v-else>
                  <!-- Average Summary -->
                  <div class="grades-summary">
                    <div class="summary-circle" :class="getGradeColor(averageGrade, 100)">
                      <span class="summary-value">{{ averageGrade }}</span>
                      <span class="summary-label">Rata-rata</span>
                    </div>
                  </div>
                  
                  <!-- Grades List -->
                  <div class="grades-list">
                    <div v-for="grade in grades" :key="grade.id" class="grade-item">
                      <div class="grade-info">
                        <h4>{{ grade.subject }}</h4>
                        <span class="grade-type">{{ grade.grade_type }}</span>
                        <span class="grade-date">{{ formatDate(grade.created_at) }}</span>
                      </div>
                      <div class="grade-score" :class="getGradeColor(grade.score, grade.max_score)">
                        {{ grade.score }}<span class="max-score">/{{ grade.max_score }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Latihan Tab -->
              <div v-else-if="activeTab === 'latihan'" class="tab-panel">
                <h3 class="section-title">Latihan & Ujian</h3>
                <div v-if="tests.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <p>Belum ada latihan tersedia</p>
                </div>
                <div v-else class="tests-list">
                  <div v-for="test in tests" :key="test.id" class="test-item" :class="{ 'test-upcoming': test.scheduleStatus === 'upcoming', 'test-expired': test.scheduleStatus === 'expired' }">
                    <div class="test-icon" :class="test.test_type">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <div class="test-info">
                      <div class="test-header-row">
                        <div class="test-type-badge">Quiz</div>
                        <span v-if="test.scheduleStatus === 'upcoming'" class="schedule-badge upcoming">Belum Mulai</span>
                        <span v-else-if="test.scheduleStatus === 'expired'" class="schedule-badge expired">Berakhir</span>
                        <span v-else-if="test.scheduleStatus === 'active'" class="schedule-badge active">Berlangsung</span>
                      </div>
                      <h4>{{ test.title }}</h4>
                      <p>{{ test.description || 'Tidak ada deskripsi' }}</p>
                      <div class="test-meta">
                        <span v-if="test.questionCount">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          {{ test.questionCount }} soal
                        </span>
                        <span v-if="test.time_limit_minutes">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {{ test.time_limit_minutes }} menit
                        </span>
                        <span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                          </svg>
                          {{ test.attemptCount }}/{{ test.max_attempts }} percobaan
                        </span>
                      </div>
                      <!-- Schedule info -->
                      <div v-if="test.startDate || test.endDate" class="test-schedule">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span v-if="test.startDate">Mulai: {{ formatDate(test.startDate) }}</span>
                        <span v-if="test.endDate">Sampai: {{ formatDate(test.endDate) }}</span>
                      </div>
                    </div>
                    <div class="test-action">
                      <div v-if="test.bestScore !== null" class="test-best-score">
                        <span class="best-label">Nilai Terbaik</span>
                        <span class="best-value" :class="getGradeColor(test.bestScore, 100)">{{ test.bestScore }}</span>
                      </div>
                      <button 
                        class="start-test-btn" 
                        :disabled="test.attemptCount >= test.max_attempts || test.scheduleStatus === 'upcoming' || test.scheduleStatus === 'expired'"
                        :class="{ 'btn-disabled': test.scheduleStatus === 'upcoming' || test.scheduleStatus === 'expired' }"
                      >
                        <template v-if="test.scheduleStatus === 'upcoming'">Belum Dimulai</template>
                        <template v-else-if="test.scheduleStatus === 'expired'">Telah Berakhir</template>
                        <template v-else-if="test.attemptCount >= test.max_attempts">Selesai</template>
                        <template v-else>Mulai Quiz</template>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.myclass-detail-page {
  min-height: 100vh;
  background: var(--background);
}

.main-content {
  padding-top: 64px;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--spacing-xl);
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
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

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Course Header */
.course-header {
  background: var(--primary);
  color: white;
  padding: var(--spacing-xl) 0;
  margin-bottom: var(--spacing-xl);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
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
  background: rgba(255, 255, 255, 0.3);
}

.course-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
}

.course-info h1 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
}

.course-info p {
  opacity: 0.9;
}

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  margin-top: calc(-1 * var(--spacing-xl) - 30px);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.progress {
  background: rgba(136, 208, 228, 0.2);
  color: var(--primary);
}

.stat-icon.grade {
  background: rgba(251, 113, 133, 0.2);
  color: var(--accent);
}

.stat-icon.attendance {
  background: var(--success-bg);
  color: var(--success);
}

.stat-icon svg {
  width: 26px;
  height: 26px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

/* Tabs */
.tabs-section {
  margin-bottom: var(--spacing-2xl);
}

.tabs-nav {
  display: flex;
  gap: var(--spacing-xs);
  background: var(--surface);
  padding: var(--spacing-xs);
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-lg);
  overflow-x: auto;
}

.tab-btn {
  flex: 1;
  padding: var(--spacing-md);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  min-width: 80px;
}

.tab-btn:hover {
  color: var(--text);
  background: var(--background);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
}

.tab-content {
  background: var(--surface);
  border-radius: var(--radius-xl);
  min-height: 400px;
}

.tab-loading {
  display: flex;
  justify-content: center;
  padding: var(--spacing-3xl);
}

.tab-panel {
  padding: var(--spacing-xl);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text);
  margin-bottom: var(--spacing-lg);
}

/* Empty Tab */
.empty-tab {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--text-muted);
}

.empty-tab svg {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

/* Schedule */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
}

.schedule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--background);
  border-radius: var(--radius-lg);
}

.schedule-day {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 600;
  color: var(--text);
}

.schedule-day svg {
  width: 18px;
  height: 18px;
  color: var(--primary);
}

.schedule-time {
  color: var(--text-secondary);
  font-weight: 500;
}

/* Attendance */
.attendance-section {
  border-top: 1px solid var(--border-light);
  padding-top: var(--spacing-xl);
}

.attendance-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-sm);
}

.attendance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-md);
}

.att-date {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.att-status {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.att-status.present { background: var(--success-bg); color: var(--success); }
.att-status.absent { background: var(--error-bg); color: var(--error); }
.att-status.late { background: var(--warning-bg); color: var(--warning); }
.att-status.excused { background: rgba(136, 208, 228, 0.2); color: var(--secondary); }

/* Materials */
.materials-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.material-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--background);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.material-item:hover {
  background: var(--border-light);
  transform: translateX(4px);
}

.material-number {
  width: 28px;
  height: 28px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.material-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  background: rgba(136, 208, 228, 0.2);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.material-icon svg {
  width: 22px;
  height: 22px;
}

.material-info {
  flex: 1;
  min-width: 0;
}

.material-info h4 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: 2px;
}

.material-info p {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.material-status {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--border-light);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: 600;
  flex-shrink: 0;
}

.material-status.completed {
  background: var(--success);
  color: white;
}

.material-status svg {
  width: 20px;
  height: 20px;
}

/* Videos */
.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.video-card {
  background: var(--background);
  border-radius: var(--radius-xl);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base);
}

.video-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.video-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  background: var(--border);
}

.video-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.video-placeholder svg {
  width: 40px;
  height: 40px;
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.video-card:hover .play-overlay {
  opacity: 1;
}

.play-overlay svg {
  width: 48px;
  height: 48px;
  color: white;
}

.video-duration {
  position: absolute;
  bottom: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
}

.video-info {
  padding: var(--spacing-md);
}

.video-info h4 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: 4px;
}

.video-info p {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.video-progress {
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.progress-bar {
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width var(--transition-base);
}

.video-progress span {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* Grades */
.grades-summary {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-xl);
}

.summary-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid;
}

.summary-circle.success { border-color: var(--success); color: var(--success); }
.summary-circle.warning { border-color: var(--warning); color: var(--warning); }
.summary-circle.error { border-color: var(--error); color: var(--error); }

.summary-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
}

.summary-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.grades-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.grade-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--background);
  border-radius: var(--radius-lg);
}

.grade-info h4 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  margin-bottom: 2px;
}

.grade-type {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-right: var(--spacing-sm);
}

.grade-date {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.grade-score {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.grade-score.success { color: var(--success); }
.grade-score.warning { color: var(--warning); }
.grade-score.error { color: var(--error); }

.max-score {
  font-size: var(--font-size-sm);
  font-weight: 400;
  color: var(--text-muted);
}

/* Tests */
.tests-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.test-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--background);
  border-radius: var(--radius-xl);
}

.test-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.test-icon.quiz { background: rgba(136, 208, 228, 0.2); color: var(--primary); }
.test-icon.practice { background: var(--success-bg); color: var(--success); }
.test-icon.exam { background: rgba(251, 113, 133, 0.2); color: var(--accent); }
.test-icon.assignment { background: var(--warning-bg); color: var(--warning); }

.test-icon svg {
  width: 26px;
  height: 26px;
}

.test-info {
  flex: 1;
}

.test-type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--border-light);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
  text-transform: uppercase;
}

.test-info h4 {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: 4px;
}

.test-info p {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-sm);
}

.test-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.test-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.test-meta svg {
  width: 14px;
  height: 14px;
}

.test-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--spacing-sm);
}

.test-best-score {
  text-align: right;
}

.best-label {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  display: block;
}

.best-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.best-value.success { color: var(--success); }
.best-value.warning { color: var(--warning); }
.best-value.error { color: var(--error); }

.start-test-btn {
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.start-test-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.start-test-btn:disabled {
  background: var(--border);
  color: var(--text-muted);
  cursor: not-allowed;
}

/* Test Schedule Styles */
.test-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--spacing-xs);
}

.schedule-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
}

.schedule-badge.upcoming {
  background: var(--warning-bg);
  color: var(--warning);
}

.schedule-badge.active {
  background: var(--success-bg);
  color: var(--success);
}

.schedule-badge.expired {
  background: var(--error-bg);
  color: var(--error);
}

.test-schedule {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--spacing-sm);
  padding: 8px 12px;
  background: rgba(136, 208, 228, 0.1);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.test-schedule svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.test-schedule span {
  display: inline;
}

.test-item.test-upcoming {
  opacity: 0.7;
  border-left: 3px solid var(--warning);
}

.test-item.test-expired {
  opacity: 0.6;
  border-left: 3px solid var(--error);
}

.start-test-btn.btn-disabled {
  background: var(--border-light);
  color: var(--text-muted);
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 0 var(--spacing-md);
  }
  
  .stats-overview {
    grid-template-columns: 1fr;
    margin-top: var(--spacing-md);
  }

  .tabs-nav {
    gap: 2px;
  }

  .tab-btn {
    padding: var(--spacing-sm);
    font-size: var(--font-size-xs);
    min-width: 60px;
  }

  .tab-panel {
    padding: var(--spacing-md);
  }

  .attendance-list {
    grid-template-columns: 1fr;
  }

  .videos-grid {
    grid-template-columns: 1fr;
  }

  .test-item {
    flex-direction: column;
  }

  .test-action {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>