<script setup>
import { ref, computed, onMounted } from 'vue'
import StatCard from '@/components/StatCard.vue'
import { useRoute } from 'vue-router'
import { useTeacherData } from '@/composables/useTeacherData'
import { useMyClass } from '@/composables/useMyClass'
import { useProgramCompletion } from '@/composables/useProgramCompletion'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const isOwner = computed(() => route.path.startsWith('/owner'))
const authStore = useAuthStore()

const { loading, students, lesPlace, programs: teacherPrograms, fetchTeacherStudents, fetchTeacherProfile, fetchTeacherSchedule } = useTeacherData()
const { fetchReportCard } = useMyClass()
const { completeBookingLocal, terminateBookingLocal, checkDropoutEligibility } = useProgramCompletion()

const filter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')
const viewMode = ref('grid') // 'grid' or 'table'
const showStudentModal = ref(false)
const selectedStudent = ref(null)

// Complete/Terminate modal states
const showCompleteModal = ref(false)
const showTerminateModal = ref(false)
const completeStudent = ref(null)
const terminateStudent = ref(null)
const completeForm = ref({ result: 'passed', notes: '' })
const terminateForm = ref({ reason: 'tidak_hadir', customReason: '' })
const notification = ref({ show: false, type: '', message: '' })

// Stats
const studentStats = computed(() => {
  const total = students.value.length
  const active = students.value.filter(s => s.status === 'active').length
  const avgProgress = total > 0 ? Math.round(students.value.reduce((sum, s) => sum + (s.progress || 0), 0) / total) : 0
  const newThisMonth = students.value.filter(s => {
    if (!s.join_date) return false
    const joinDate = new Date(s.join_date)
    const now = new Date()
    return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear()
  }).length

  /* Logic needed for "Perlu Perhatian" */
  const needsAttention = students.value.filter(s => s.status === 'warning' || (s.progress && s.progress < 50)).length

  return { total, active, avgProgress, newThisMonth, needsAttention }
})

// Get all programs - combine from students (for filtering) and teacherPrograms (for showing all)
const programs = computed(() => {
  const programMap = new Map()
  
  // First, add programs from students data (these have correct IDs that match student.program_id)
  students.value.forEach(s => {
    if (s.program_id && s.program?.name) {
      programMap.set(s.program_id, s.program.name)
    }
  })
  
  // Also add from teacherPrograms (in case some programs have no students yet)
  teacherPrograms.value.forEach(p => {
    if (p.id && p.name && !programMap.has(p.id)) {
      programMap.set(p.id, p.name)
    }
  })
  
  return Array.from(programMap.entries()).map(([id, name]) => ({ id, name }))
})

// Get unique subjects
const subjects = computed(() => {
  const unique = [...new Set(students.value.map(s => s.subject))]
  return unique.filter(s => s && s !== '-')
})

const filteredStudents = computed(() => {
  return students.value.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                       s.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchProgram = filter.value === 'all' || s.program_id === filter.value
    const matchStatus = statusFilter.value === 'all' || s.status === statusFilter.value
    return matchSearch && matchProgram && matchStatus
  })
})

function getProgressColor(progress) {
  if (progress >= 85) return 'excellent'
  if (progress >= 70) return 'good'
  if (progress >= 50) return 'average'
  return 'poor'
}

function getStatusBadge(status) {
  const badges = {
    active: { text: 'Aktif', class: 'success' },
    inactive: { text: 'Tidak Aktif', class: 'muted' },
    warning: { text: 'Perlu Perhatian', class: 'warning' }
  }
  return badges[status] || { text: status, class: 'muted' }
}

function openStudentDetail(student) {
  selectedStudent.value = student
  showStudentModal.value = true
  fetchStudentReport(student)
}

// Student report data
const studentReport = ref({
  quizScores: [],
  latihanScores: [],
  quizAverage: 0,
  latihanAverage: 0,
  finalGrade: 0,
  settings: {
    quiz_weight: 60,
    latihan_weight: 40
  },
  loading: false
})

async function fetchStudentReport(student) {
  if (!student?.user_id || !student?.program) return
  
  studentReport.value.loading = true
  
  try {
    const report = await fetchReportCard(student.user_id, student.program)
    
    if (report) {
      studentReport.value = {
        quizScores: report.quizScores || [],
        latihanScores: report.latihanScores || [],
        quizAverage: report.quiz_avg || 0,
        latihanAverage: report.latihan_avg || 0,
        finalGrade: report.final_grade || 0,
        settings: report.settings || { quiz_weight: 60, latihan_weight: 40 },
        loading: false
      }
    }
  } catch (err) {
    console.error('Error fetching student report:', err)
  } finally {
    studentReport.value.loading = false
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric'
  })
}

function getGradeFromScore(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}

// Notification helper
function showNotification(type, message) {
  notification.value = { show: true, type, message }
  setTimeout(() => notification.value.show = false, 4000)
}

// Complete functions
function openCompleteModal(student, event) {
  event?.stopPropagation()
  completeStudent.value = student
  completeForm.value = { result: 'passed', notes: '' }
  showCompleteModal.value = true
}

async function submitComplete() {
  if (!completeStudent.value?.booking_id) {
    showNotification('error', 'Data booking tidak ditemukan')
    return
  }
  
  try {
    await completeBookingLocal(completeStudent.value.booking_id, {
      completionType: 'manual',
      completionResult: completeForm.value.result,
      notes: completeForm.value.notes || null
    })
    
    showNotification('success', `Program ${completeStudent.value.name} berhasil ditandai selesai!`)
    showCompleteModal.value = false
    await fetchTeacherStudents()
  } catch (err) {
    showNotification('error', 'Gagal menandai selesai: ' + err.message)
  }
}

// Terminate functions  
function openTerminateModal(student, event) {
  event?.stopPropagation()
  terminateStudent.value = student
  terminateForm.value = { reason: 'tidak_hadir', customReason: '' }
  showTerminateModal.value = true
}

async function submitTerminate() {
  if (!terminateStudent.value?.booking_id) {
    showNotification('error', 'Data booking tidak ditemukan')
    return
  }
  
  const reasonMap = {
    'tidak_hadir': 'Tidak hadir 3x berturut-turut',
    'tidak_aktif': 'Tidak ada aktivitas > 3 minggu',
    'permintaan': 'Atas permintaan siswa',
    'lainnya': terminateForm.value.customReason
  }
  
  try {
    await terminateBookingLocal(
      terminateStudent.value.booking_id, 
      reasonMap[terminateForm.value.reason] || terminateForm.value.reason,
      authStore.user?.id
    )
    
    showNotification('success', `Program ${terminateStudent.value.name} berhasil dihentikan.`)
    showTerminateModal.value = false
    await fetchTeacherStudents()
  } catch (err) {
    showNotification('error', 'Gagal menghentikan program: ' + err.message)
  }
}

onMounted(async () => {
  await fetchTeacherProfile()
  await Promise.all([fetchTeacherStudents(), fetchTeacherSchedule()])
})
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Daftar Siswa
          </h1>
          <p class="subtitle">Kelola dan pantau perkembangan siswa Anda</p>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="stats-row">
        <StatCard 
            label="Total Siswa" 
            :value="studentStats.total" 
            icon-color="blue"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
            </template>
        </StatCard>
        
        <StatCard 
            label="Siswa Aktif" 
            :value="studentStats.active" 
            icon-color="green"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </template>
        </StatCard>
        
        <StatCard 
            label="Rata-rata Progress" 
            :value="studentStats.avgProgress + '%'" 
            icon-color="purple"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
            </template>
        </StatCard>
        
        <StatCard 
            label="Perlu Perhatian" 
            :value="studentStats.needsAttention" 
            icon-color="red"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
            </template>
        </StatCard>
      </section>

      <!-- Filter Bar -->
      <section class="filter-section">
        <div class="filter-left">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Cari nama atau email siswa..."
            >
          </div>
          
          <select v-model="filter" class="filter-select">
            <option value="all">Semua Program</option>
            <option v-for="prog in programs" :key="prog.id" :value="prog.id">{{ prog.name }}</option>
          </select>
        </div>
        
        <div class="filter-right">
          <div class="view-toggle">
            <button :class="['toggle-btn', { active: viewMode === 'grid' }]" @click="viewMode = 'grid'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button :class="['toggle-btn', { active: viewMode === 'table' }]" @click="viewMode = 'table'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
          <span class="result-count">{{ filteredStudents.length }} siswa ditemukan</span>
        </div>
      </section>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat data siswa...</p>
      </div>

      <!-- Grid View -->
      <section v-else-if="viewMode === 'grid'" class="students-grid">
        <div v-for="student in filteredStudents" :key="student.id" class="student-card" @click="openStudentDetail(student)">
          <!-- Card Header -->
          <div class="card-top">
            <div class="student-avatar" :class="getProgressColor(student.progress || 0)">
              <img v-if="student.avatar" :src="student.avatar" :alt="student.name">
              <span v-else>{{ student.name?.charAt(0) || '?' }}</span>
            </div>
            <span class="status-badge" :class="getStatusBadge(student.status).class">
              {{ getStatusBadge(student.status).text }}
            </span>
          </div>

          <!-- Student Info -->
          <div class="card-body">
            <h3 class="student-name">{{ student.name }}</h3>
            <p class="student-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              {{ student.class || '-' }}
            </p>
            <p class="student-subject">{{ student.program?.name || '-' }}</p>
          </div>

          <!-- Progress Section -->
          <div class="card-progress">
            <div class="progress-info">
              <span>Progress</span>
              <span class="progress-value" :class="getProgressColor(student.progress || 0)">{{ student.progress || 0 }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :class="getProgressColor(student.progress || 0)" :style="{ width: (student.progress || 0) + '%' }"></div>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="card-footer">
            <div class="footer-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{{ student.join_date || '-' }}</span>
            </div>
            <div class="footer-grade">
              <span class="grade-badge" v-if="student.finalScore !== undefined" :class="getGradeFromScore(student.finalScore).toLowerCase()">
                {{ getGradeFromScore(student.finalScore) }}
              </span>
              <span v-else class="grade-badge secondary">-</span>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card-actions">
            <button class="action-btn secondary" @click="openCompleteModal(student, $event)" v-if="student.status === 'active'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              Selesai
            </button>
            <button class="action-btn danger" @click="openTerminateModal(student, $event)" v-if="student.status === 'active'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              Berhentikan
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredStudents.length === 0" class="empty-state">
          <div class="empty-illustration">
            <svg viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" fill="#f1f5f9"></circle>
              <circle cx="100" cy="80" r="30" fill="white" stroke="#e2e8f0" stroke-width="2"></circle>
              <path d="M60 150c0-22 18-40 40-40s40 18 40 40" fill="white" stroke="#e2e8f0" stroke-width="2"></path>
              <circle cx="140" cy="140" r="25" fill="#0d5782" opacity="0.1"></circle>
              <path d="M140 130v20M130 140h20" stroke="#0d5782" stroke-width="3" stroke-linecap="round"></path>
            </svg>
          </div>
          <h3>Tidak ada siswa ditemukan</h3>
          <p>Coba ubah filter atau kata kunci pencarian</p>
        </div>
      </section>

      <!-- Table View -->
      <section v-else class="students-table-wrapper">
        <table class="students-table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Kelas</th>
              <th>Program</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Tanggal Bergabung</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in filteredStudents" :key="student.id" @click="openStudentDetail(student)">
              <td>
                <div class="table-student">
                  <div class="table-avatar" :class="getProgressColor(student.progress || 0)">
                    <img v-if="student.avatar" :src="student.avatar" :alt="student.name">
                    <span v-else>{{ student.name?.charAt(0) || '?' }}</span>
                  </div>
                  <div class="table-info">
                    <span class="table-name">{{ student.name }}</span>
                    <span class="table-email">{{ student.email || '-' }}</span>
                  </div>
                </div>
              </td>
              <td>{{ student.class || '-' }}</td>
              <td>{{ student.program?.name || '-' }}</td>
              <td>
                <div class="table-progress">
                  <div class="progress-bar-mini">
                    <div class="progress-fill" :class="getProgressColor(student.progress || 0)" :style="{ width: (student.progress || 0) + '%' }"></div>
                  </div>
                  <span>{{ student.progress || 0 }}%</span>
                </div>
              </td>
              <td>
                <span class="status-badge" :class="getStatusBadge(student.status).class">
                  {{ getStatusBadge(student.status).text }}
                </span>
              </td>
              <td>{{ student.join_date || '-' }}</td>
              <td>
                <div class="table-actions" @click.stop>
                  <router-link :to="isOwner ? '/owner/grades' : '/teacher/grades'" class="table-btn">Nilai</router-link>
                  <router-link :to="isOwner ? '/owner/attendance' : '/teacher/attendance'" class="table-btn">Absensi</router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="filteredStudents.length === 0" class="table-empty">
          <p>Tidak ada siswa ditemukan</p>
        </div>
      </section>

      <!-- Student Detail Modal -->
      <div v-if="showStudentModal" class="modal-overlay" @click.self="showStudentModal = false">
        <div class="modal">
          <button class="modal-close" @click="showStudentModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div class="modal-header">
            <div class="modal-avatar" :class="getProgressColor(selectedStudent?.progress || 0)">
              <img v-if="selectedStudent?.avatar" :src="selectedStudent.avatar" :alt="selectedStudent.name">
              <span v-else>{{ selectedStudent?.name?.charAt(0) || '?' }}</span>
            </div>
            <div class="modal-title">
              <h2>{{ selectedStudent?.name }}</h2>
              <p>{{ selectedStudent?.email || '-' }}</p>
            </div>
            <span class="status-badge lg" :class="getStatusBadge(selectedStudent?.status).class">
              {{ getStatusBadge(selectedStudent?.status).text }}
            </span>
          </div>

          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Kelas</span>
                <span class="detail-value">{{ selectedStudent?.class || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Program</span>
                <span class="detail-value">{{ selectedStudent?.program?.name || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tempat Les</span>
                <span class="detail-value">{{ selectedStudent?.les_place || lesPlace?.name || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tanggal Bergabung</span>
                <span class="detail-value">{{ selectedStudent?.join_date || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Telepon</span>
                <span class="detail-value">{{ selectedStudent?.phone || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Sekolah</span>
                <span class="detail-value">{{ selectedStudent?.school || '-' }}</span>
              </div>
            </div>

            <div class="modal-progress">
              <div class="progress-header">
                <span>Progress Belajar</span>
                <span class="progress-value" :class="getProgressColor(selectedStudent?.progress || 0)">
                  {{ selectedStudent?.progress || 0 }}%
                </span>
              </div>
              <div class="progress-bar lg">
                <div class="progress-fill" :class="getProgressColor(selectedStudent?.progress || 0)" :style="{ width: (selectedStudent?.progress || 0) + '%' }"></div>
              </div>
            </div>

            <!-- Student Report Card -->
            <div class="student-report-section">
              <h3 class="report-title">Statistik Penilaian</h3>
              
              <div v-if="studentReport.loading" class="report-loading">
                <div class="spinner-small"></div>
                <span>Memuat nilai...</span>
              </div>
              
              <template v-else>
                <!-- Weighted Total Score -->
                <div class="report-total-score">
                  <div class="total-score-circle" :class="studentReport.finalGrade >= 70 ? 'excellent' : 'poor'">
                    <span class="total-value">{{ studentReport.finalGrade }}</span>
                    <span class="total-label">Nilai Akhir</span>
                  </div>
                  <div class="score-breakdown">
                    <div class="breakdown-item">
                      <span class="bi-label">Rata-rata Quiz ({{ studentReport.settings.quiz_weight }}%)</span>
                      <div class="bi-bar">
                        <div class="bi-bar-track">
                          <div class="bi-fill quiz" :style="{ width: studentReport.quizAverage + '%' }"></div>
                        </div>
                        <span class="bi-value">{{ studentReport.quizAverage }}</span>
                      </div>
                    </div>
                    <div class="breakdown-item">
                      <span class="bi-label">Rata-rata Latihan ({{ studentReport.settings.latihan_weight }}%)</span>
                      <div class="bi-bar">
                        <div class="bi-bar-track">
                          <div class="bi-fill latihan" :style="{ width: studentReport.latihanAverage + '%' }"></div>
                        </div>
                        <span class="bi-value">{{ studentReport.latihanAverage }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Quiz List -->
                <h4 class="sub-title">Detail Quiz</h4>
                <div v-if="studentReport.quizScores.length === 0" class="report-empty">
                  <p>Belum ada quiz yang dikerjakan</p>
                </div>
                
                <div v-else class="scores-list">
                  <div v-for="quiz in studentReport.quizScores" :key="quiz.id" class="score-item">
                    <div class="score-info">
                      <span class="score-title">{{ quiz.title }}</span>
                      <span class="score-date">{{ formatDate(quiz.date) }}</span>
                    </div>
                    <span class="score-value quiz" :class="quiz.passed ? 'passed' : 'failed'">
                      {{ quiz.score }}
                    </span>
                  </div>
                </div>

                <!-- Latihan List -->
                <h4 class="sub-title">Detail Latihan</h4>
                <div v-if="studentReport.latihanScores.length === 0" class="report-empty">
                  <p>Belum ada latihan yang disubmit</p>
                </div>
                
                <div v-else class="scores-list">
                  <div v-for="latihan in studentReport.latihanScores" :key="latihan.id" class="score-item">
                    <div class="score-info">
                      <span class="score-title">{{ latihan.title }}</span>
                      <span class="score-date">{{ formatDate(latihan.date) }}</span>
                    </div>
                    <span class="score-value latihan" :class="latihan.score >= 70 ? 'passed' : 'failed'">
                      {{ latihan.score }}
                    </span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <div class="modal-actions">
            <router-link :to="isOwner ? '/owner/grades' : '/teacher/grades'" class="modal-btn primary" @click="showStudentModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Input Nilai
            </router-link>
            <router-link :to="isOwner ? '/owner/attendance' : '/teacher/attendance'" class="modal-btn secondary" @click="showStudentModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Absensi
            </router-link>
            <button class="modal-btn outline" @click="showStudentModal = false">Tutup</button>
          </div>
        </div>
      </div>

      <!-- Notification Toast -->
      <div v-if="notification.show" :class="['notification-toast', notification.type]">
        <span>{{ notification.message }}</span>
        <button @click="notification.show = false">&times;</button>
      </div>

      <!-- Complete Modal -->
      <div v-if="showCompleteModal" class="completion-modal-overlay" @click.self="showCompleteModal = false">
        <div class="completion-modal">
          <div class="completion-modal-header">
            <h3>Tandai Selesai</h3>
            <button class="close-btn" @click="showCompleteModal = false">&times;</button>
          </div>
          
          <div class="completion-modal-body">
            <div class="student-info-row">
              <span class="info-label">Siswa</span>
              <span class="info-value">{{ completeStudent?.name }}</span>
            </div>
            <div class="student-info-row">
              <span class="info-label">Program</span>
              <span class="info-value">{{ completeStudent?.program?.name }}</span>
            </div>
            
            <div class="form-field">
              <label class="field-label">Hasil Akhir</label>
              <select v-model="completeForm.result" class="form-select">
                <option value="passed">Lulus</option>
                <option value="failed">Tidak Lulus</option>
              </select>
            </div>
            
            <div class="form-field">
              <label class="field-label">Catatan <span class="optional">(opsional)</span></label>
              <textarea v-model="completeForm.notes" class="form-textarea" placeholder="Tambahkan catatan jika diperlukan..." rows="3"></textarea>
            </div>
          </div>
          
          <div class="completion-modal-footer">
            <button class="btn-cancel" @click="showCompleteModal = false">Batal</button>
            <button class="btn-confirm success" @click="submitComplete">Konfirmasi Selesai</button>
          </div>
        </div>
      </div>

      <!-- Terminate Modal -->
      <div v-if="showTerminateModal" class="completion-modal-overlay" @click.self="showTerminateModal = false">
        <div class="completion-modal">
          <div class="completion-modal-header warning">
            <h3>Hentikan Program</h3>
            <button class="close-btn" @click="showTerminateModal = false">&times;</button>
          </div>
          
          <div class="completion-modal-body">
            <div class="student-info-row">
              <span class="info-label">Siswa</span>
              <span class="info-value">{{ terminateStudent?.name }}</span>
            </div>
            <div class="student-info-row">
              <span class="info-label">Program</span>
              <span class="info-value">{{ terminateStudent?.program?.name }}</span>
            </div>
            
            <div class="form-field">
              <label class="field-label">Alasan Penghentian</label>
              <select v-model="terminateForm.reason" class="form-select">
                <option value="tidak_hadir">Tidak hadir 3x berturut-turut</option>
                <option value="tidak_aktif">Tidak ada aktivitas lebih dari 3 minggu</option>
                <option value="permintaan">Atas permintaan siswa</option>
                <option value="lainnya">Alasan lain</option>
              </select>
            </div>
            
            <div class="form-field" v-if="terminateForm.reason === 'lainnya'">
              <label class="field-label">Jelaskan Alasan</label>
              <textarea v-model="terminateForm.customReason" class="form-textarea" placeholder="Tuliskan alasan penghentian..." rows="3"></textarea>
            </div>
            
            <div class="warning-notice">
              <strong>Perhatian:</strong> Siswa tidak akan bisa mengakses materi setelah program dihentikan.
            </div>
          </div>
          
          <div class="completion-modal-footer">
            <button class="btn-cancel" @click="showTerminateModal = false">Batal</button>
            <button class="btn-confirm danger" @click="submitTerminate">Hentikan Program</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

.main {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

/* Header */
.page-header {
  margin-bottom: 28px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.header-left h1 svg { width: 28px; height: 28px; color: #0d5782; }
.subtitle { color: #64748b; font-size: 14px; }

/* Stats Row */
/* Stats Cards - Compact Inline */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 24px;
  width: 100%;
}
/* StatCard styling handled by component */

.stat-content { display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1; }
.stat-label { font-size: 13px; color: #64748b; font-weight: 500; }

/* Filter Section */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-left {
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  gap: 16px;
}

.search-box {
  position: relative;
  min-width: 280px;
  flex: 1;
  max-width: 400px;
}

.search-box svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-box input {
  width: 100%;
  padding: 12px 12px 12px 44px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-box input:focus { outline: none; border-color: #0d5782; }

.filter-select {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  min-width: 160px;
  background: white;
  cursor: pointer;
}

.filter-select:focus { outline: none; border-color: #0d5782; }

.filter-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
}

.toggle-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toggle-btn svg { width: 18px; height: 18px; color: #64748b; }
.toggle-btn.active { background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.toggle-btn.active svg { color: #0d5782; }

.result-count {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #0d5782;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Grid View */
.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.student-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.student-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.student-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: white;
  overflow: hidden;
}

.student-avatar.excellent { background: linear-gradient(135deg, #22c55e, #16a34a); }
.student-avatar.good { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.student-avatar.average { background: linear-gradient(135deg, #f59e0b, #d97706); }
.student-avatar.poor { background: linear-gradient(135deg, #ef4444, #dc2626); }

.student-avatar img { width: 100%; height: 100%; object-fit: cover; }

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.success { background: #dcfce7; color: #16a34a; }
.status-badge.warning { background: #fef3c7; color: #d97706; }
.status-badge.muted { background: #f1f5f9; color: #64748b; }
.status-badge.lg { padding: 6px 16px; font-size: 12px; }

.card-body { margin-bottom: 16px; }

.student-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.student-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #0d5782;
  font-weight: 600;
  margin-bottom: 2px;
}

.student-meta svg { width: 14px; height: 14px; }

.student-subject { font-size: 13px; color: #64748b; }

.card-progress { margin-bottom: 16px; }

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
  color: #64748b;
}

.progress-value { font-weight: 700; }
.progress-value.excellent { color: #16a34a; }
.progress-value.good { color: #2563eb; }
.progress-value.average { color: #d97706; }
.progress-value.poor { color: #dc2626; }

.progress-bar {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar.lg { height: 12px; border-radius: 6px; }

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-fill.excellent { background: linear-gradient(90deg, #22c55e, #16a34a); }
.progress-fill.good { background: linear-gradient(90deg, #3b82f6, #2563eb); }
.progress-fill.average { background: linear-gradient(90deg, #f59e0b, #d97706); }
.progress-fill.poor { background: linear-gradient(90deg, #ef4444, #dc2626); }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  margin-bottom: 16px;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.footer-info svg { width: 14px; height: 14px; }

.grade-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.grade-badge.a { background: #dcfce7; color: #15803d; }
.grade-badge.b { background: #dbeafe; color: #1d4ed8; }
.grade-badge.c { background: #fef9c3; color: #a16207; }
.grade-badge.d { background: #fee2e2; color: #b91c1c; }
.grade-badge.secondary { background: #f1f5f9; color: #64748b; }

.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.action-btn svg { width: 14px; height: 14px; }

.action-btn.primary { background: #0d5782; color: white; }
.action-btn.primary:hover { background: #094160; }

.action-btn.secondary { background: #e0f2fe; color: #0d5782; }
.action-btn.secondary:hover { background: #bfdbfe; }

.action-btn.success { background: #22c55e; color: white; border: none; cursor: pointer; }
.action-btn.success:hover { background: #16a34a; }

.action-btn.danger { background: white; color: #dc2626; border: 1px solid #fecaca; cursor: pointer; }
.action-btn.danger:hover { background: #fee2e2; }

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  background: white;
  border-radius: 16px;
  padding: 60px 20px;
  text-align: center;
}

.empty-illustration { margin-bottom: 20px; }
.empty-illustration svg { width: 160px; height: 160px; }

.empty-state h3 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
.empty-state p { font-size: 14px; color: #64748b; }

/* Table View */
.students-table-wrapper {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
}

.students-table th {
  text-align: left;
  padding: 16px 20px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.students-table td {
  padding: 16px 20px;
  font-size: 14px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.students-table tr:last-child td { border-bottom: none; }

.students-table tr:hover { background: #fafafa; cursor: pointer; }

.table-student {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: white;
  overflow: hidden;
}

.table-avatar.excellent { background: #22c55e; }
.table-avatar.good { background: #3b82f6; }
.table-avatar.average { background: #f59e0b; }
.table-avatar.poor { background: #ef4444; }

.table-avatar img { width: 100%; height: 100%; object-fit: cover; }

.table-info { display: flex; flex-direction: column; }
.table-name { font-weight: 600; color: #0f172a; }
.table-email { font-size: 12px; color: #94a3b8; }

.table-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar-mini {
  width: 80px;
  height: 6px;
  background: #f1f5f9;
  border-radius: 3px;
  overflow: hidden;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.table-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  background: #f1f5f9;
  color: #475569;
  transition: all 0.2s;
}

.table-btn:hover { background: #0d5782; color: white; }

.table-empty {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
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
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: modalIn 0.2s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  background: #f1f5f9;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.modal-close:hover { background: #e2e8f0; }
.modal-close svg { width: 18px; height: 18px; color: #64748b; }

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 0;
  flex-wrap: wrap;
}

.modal-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: white;
  overflow: hidden;
}

.modal-title { flex: 1; }
.modal-title h2 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
.modal-title p { font-size: 14px; color: #64748b; }

.modal-body { padding: 24px; }

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label { font-size: 12px; color: #94a3b8; }
.detail-value { font-size: 14px; font-weight: 600; color: #0f172a; }

.modal-progress { margin-bottom: 24px; }

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
  color: #64748b;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 0 24px 24px;
}

.modal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn svg { width: 18px; height: 18px; }

.modal-btn.primary { background: #0d5782; color: white; }
.modal-btn.primary:hover { background: #094160; }

.modal-btn.secondary { background: #e0f2fe; color: #0d5782; }
.modal-btn.secondary:hover { background: #bfdbfe; }

.modal-btn.outline { background: white; color: #64748b; border: 2px solid #e2e8f0; }
.modal-btn.outline:hover { border-color: #94a3b8; }

/* Responsive */
@media (max-width: 1024px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .main { padding: 16px; }
  .stats-row { grid-template-columns: 1fr; }
  .filter-section { flex-direction: column; align-items: stretch; }
  .filter-section { flex-direction: column; align-items: stretch; }
  .filter-left { flex-direction: column; gap: 16px; }
  .search-box { max-width: 100%; }
  .students-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .modal-actions { flex-direction: column; }
}

/* Student Report Card Styles */
.student-report-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.report-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16px;
}

.report-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 20px;
  color: #64748b;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #0d5782;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Report Total Score Section */
.report-total-score {
  display: flex;
  align-items: center;
  gap: 32px;
  background: white;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.total-score-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 6px solid #f1f5f9;
  flex-shrink: 0;
}

.total-score-circle.excellent { border-color: #dcfce7; color: #16a34a; }
.total-score-circle.poor { border-color: #fee2e2; color: #dc2626; }

.total-value {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}

.total-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.score-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bi-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.bi-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bi-bar-track {
  flex: 1;
  height: 10px;
  background: #f1f5f9;
  border-radius: 5px;
  overflow: hidden;
}

.bi-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.bi-fill.quiz { background: linear-gradient(90deg, #0d5782, #1e88a8); }
.bi-fill.latihan { background: linear-gradient(90deg, #10b981, #34d399); }

.bi-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  min-width: 45px;
  text-align: right;
}

.sub-title {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 24px 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-empty {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-size: 14px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
  margin-bottom: 16px;
}

.report-empty p {
  margin: 0;
}

.scores-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.score-item:hover {
  background: white;
  border-color: #cbd5e1;
  transform: translateX(4px);
}

.score-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.score-title {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.score-date {
  font-size: 12px;
  color: #94a3b8;
}

.score-value {
  font-size: 18px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 8px;
}

.score-value.quiz { background: #eff6ff; color: #1d4ed8; }
.score-value.latihan { background: #f0fdf4; color: #15803d; }

.score-value.passed { color: #16a34a; }
.score-value.failed { color: #dc2626; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Notification Toast */
.notification-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1100;
}

.notification-toast.success { background: #dcfce7; color: #16a34a; }
.notification-toast.error { background: #fee2e2; color: #dc2626; }

.notification-toast button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.notification-toast button:hover { opacity: 1; }

/* Compact Modal */
.modal.compact { max-width: 420px; }

/* Form Group */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #475569; margin-bottom: 8px; }
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
}

/* Radio Group */
.radio-group { display: flex; gap: 12px; }
.radio-group.vertical { flex-direction: column; gap: 10px; }

.radio-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.radio-label:hover { 
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.radio-label input { display: none; }

.radio-label input:checked ~ * { font-weight: 600; }

.radio-label:has(input:checked) {
  background: #eff6ff;
  border-color: #0d5782;
}

.radio-dot {
  width: 20px;
  height: 20px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.radio-label input:checked + .radio-dot { 
  border-color: #0d5782;
  background: white;
}

.radio-label input:checked + .radio-dot::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 8px;
  height: 8px;
  background: #0d5782;
  border-radius: 50%;
}

/* Warning Box */
.warning-box {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 14px;
  color: #92400e;
}

.warning-box strong { display: block; margin-bottom: 4px; }
.warning-box p { margin: 0; font-size: 13px; }

/* Modal Header Variants */
.modal-header.warning h2 { color: #d97706; }
.modal-header.success h2 { color: #16a34a; }

.modal-subtitle { 
  color: #64748b; 
  font-size: 14px;
  margin-top: 4px;
}

/* Modal Close Button */
.modal.compact .modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 28px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
}

.modal.compact .modal-close:hover { color: #64748b; }

/* Modal Button Variants */
.modal-btn.success {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #22c55e;
  color: white;
  border: none;
}

.modal-btn.success:hover { background: #16a34a; }
.modal-btn.success svg { width: 16px; height: 16px; }

.modal-btn.danger {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #dc2626;
  color: white;
  border: none;
}

.modal-btn.danger:hover { background: #b91c1c; }
.modal-btn.danger svg { width: 16px; height: 16px; }

/* ============= COMPLETION MODAL ============= */
.completion-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.completion-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.completion-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.completion-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #16a34a;
}

.completion-modal-header.warning h3 {
  color: #dc2626;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #64748b;
}

.completion-modal-body {
  padding: 24px;
}

.student-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.student-info-row:last-of-type {
  margin-bottom: 20px;
}

.info-label {
  font-size: 13px;
  color: #64748b;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
}

.form-field {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
}

.optional {
  font-weight: 400;
  color: #94a3b8;
}

.form-select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #0d5782;
}

.form-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #0d5782;
}

.form-textarea::placeholder {
  color: #94a3b8;
}

.warning-notice {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
}

.warning-notice strong {
  color: #78350f;
}

.completion-modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn-cancel {
  flex: 1;
  padding: 12px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-confirm {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-confirm.success {
  background: #16a34a;
}

.btn-confirm.success:hover {
  background: #15803d;
}

.btn-confirm.danger {
  background: #dc2626;
}

.btn-confirm.danger:hover {
  background: #b91c1c;
}

</style>
@media (max-width: 1200px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .stats-row { grid-template-columns: 1fr; } }
