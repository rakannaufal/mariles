<script setup>
import TeacherSidebar from '@/components/TeacherSidebar.vue'
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTeacherData } from '@/composables/useTeacherData'

const route = useRoute()
const isOwner = computed(() => route.path.startsWith('/owner'))

const { 
  loading, 
  grades, 
  programs,
  students,
  fetchStudentGrades, 
  fetchTeacherSchedule,
  fetchTeacherStudents,
  saveGrade 
} = useTeacherData()

const selectedClass = ref('all')
const selectedExam = ref('Ulangan Harian')
const searchQuery = ref('')
const viewMode = ref('table') // 'table' or 'cards'

// Modal
const showInputModal = ref(false)
const selectedStudent = ref(null)
const gradeInput = ref(0)
const noteInput = ref('')

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// Get unique classes
const classes = computed(() => {
  const unique = [...new Set(programs.value.map(p => p.level || p.name))]
  return unique.filter(c => c && c !== '-')
})

const exams = [
  { id: 'harian', name: 'Ulangan Harian' },
  { id: 'kuis', name: 'Kuis' },
  { id: 'tugas', name: 'Tugas' }
]

// Grade settings
const passingGrade = ref(70)
const showSettingsModal = ref(false)

const filteredGrades = computed(() => {
  let result = grades.value
  
  if (selectedClass.value !== 'all') {
    result = result.filter(g => g.class === selectedClass.value)
  }
  
  if (searchQuery.value) {
    result = result.filter(g => 
      g.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      g.subject?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  return result
})

// Stats
const stats = computed(() => {
  const gradesList = filteredGrades.value.filter(g => g.grade > 0).map(g => g.grade)
  
  if (gradesList.length === 0) {
    return { avg: 0, max: 0, min: 0, total: 0, passed: 0, failed: 0 }
  }
  
  const avg = Math.round(gradesList.reduce((a, b) => a + b, 0) / gradesList.length)
  const max = Math.max(...gradesList)
  const min = Math.min(...gradesList)
  const passed = gradesList.filter(g => g >= passingGrade.value).length
  const failed = gradesList.filter(g => g < passingGrade.value).length
  
  return { avg, max, min, total: gradesList.length, passed, failed }
})

// Grade distribution
const gradeDistribution = computed(() => {
  const gradesList = filteredGrades.value.filter(g => g.grade > 0).map(g => g.grade)
  
  return {
    A: gradesList.filter(g => g >= 90).length,
    B: gradesList.filter(g => g >= 80 && g < 90).length,
    C: gradesList.filter(g => g >= 70 && g < 80).length,
    D: gradesList.filter(g => g < 70).length
  }
})

function getGradeClass(grade) {
  if (grade >= 90) return 'excellent'
  if (grade >= 80) return 'good'
  if (grade >= 70) return 'average'
  return 'poor'
}

function getGradeLabel(grade) {
  if (grade >= 90) return 'A'
  if (grade >= 80) return 'B'
  if (grade >= 70) return 'C'
  return 'D'
}

function openInputModal(student) {
  selectedStudent.value = student
  gradeInput.value = student.grade || 0
  noteInput.value = ''
  showInputModal.value = true
}

function showSuccessToast(message) {
  toastMessage.value = message
  toastType.value = 'success'
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

function showErrorToast(message) {
  toastMessage.value = message
  toastType.value = 'error'
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

async function handleSaveGrade() {
  if (gradeInput.value < 0 || gradeInput.value > 100) {
    showErrorToast('Nilai harus antara 0-100')
    return
  }
  
  const success = await saveGrade(
    selectedStudent.value.booking_id,
    gradeInput.value,
    selectedExam.value,
    selectedStudent.value.subject
  )
  
  if (success) {
    selectedStudent.value.grade = gradeInput.value
    showInputModal.value = false
    showSuccessToast('Nilai berhasil disimpan!')
    await fetchStudentGrades()
  } else {
    showErrorToast('Gagal menyimpan nilai')
  }
}

async function handleSaveAllGrades() {
  let saved = 0
  for (const student of filteredGrades.value) {
    if (student.grade > 0) {
      const success = await saveGrade(
        student.booking_id,
        student.grade,
        selectedExam.value,
        student.subject
      )
      if (success) saved++
    }
  }
  
  if (saved > 0) {
    showSuccessToast(`${saved} nilai berhasil disimpan!`)
    await fetchStudentGrades()
  } else {
    showErrorToast('Tidak ada nilai yang disimpan')
  }
}

onMounted(async () => {
  await fetchTeacherSchedule()
  await fetchStudentGrades()
  await fetchTeacherStudents()
})
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar v-if="isOwner" />
    <TeacherSidebar v-else />

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="showToast" :class="['toast', toastType]">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <main class="main">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            Nilai Siswa
          </h1>
          <p class="subtitle">Kelola dan input nilai siswa untuk setiap ujian dan tugas</p>
        </div>
        <div class="header-actions">
          <button class="btn-settings" @click="showSettingsModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button class="btn-save-all" @click="handleSaveAllGrades">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Simpan Semua
          </button>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-4"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.avg }}</span>
            <span class="stat-label">Rata-rata Nilai</span>
          </div>
          <div class="stat-badge" :class="getGradeClass(stats.avg)">{{ getGradeLabel(stats.avg) }}</div>
        </div>
        
        <div class="stat-card green">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.max }}</span>
            <span class="stat-label">Nilai Tertinggi</span>
          </div>
        </div>
        
        <div class="stat-card red">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
              <polyline points="17 18 23 18 23 12"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.min }}</span>
            <span class="stat-label">Nilai Terendah</span>
          </div>
        </div>
        
        <div class="stat-card purple">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">Total Dinilai</span>
          </div>
        </div>
      </section>

      <!-- Grade Distribution -->
      <section class="distribution-card">
        <h3>Distribusi Nilai</h3>
        <div class="distribution-bars">
          <div class="dist-item">
            <div class="dist-bar-wrapper">
              <div class="dist-bar excellent" :style="{ height: (gradeDistribution.A / (stats.total || 1) * 100) + '%' }"></div>
            </div>
            <span class="dist-label">A</span>
            <span class="dist-count">{{ gradeDistribution.A }}</span>
          </div>
          <div class="dist-item">
            <div class="dist-bar-wrapper">
              <div class="dist-bar good" :style="{ height: (gradeDistribution.B / (stats.total || 1) * 100) + '%' }"></div>
            </div>
            <span class="dist-label">B</span>
            <span class="dist-count">{{ gradeDistribution.B }}</span>
          </div>
          <div class="dist-item">
            <div class="dist-bar-wrapper">
              <div class="dist-bar average" :style="{ height: (gradeDistribution.C / (stats.total || 1) * 100) + '%' }"></div>
            </div>
            <span class="dist-label">C</span>
            <span class="dist-count">{{ gradeDistribution.C }}</span>
          </div>
          <div class="dist-item">
            <div class="dist-bar-wrapper">
              <div class="dist-bar poor" :style="{ height: (gradeDistribution.D / (stats.total || 1) * 100) + '%' }"></div>
            </div>
            <span class="dist-label">D</span>
            <span class="dist-count">{{ gradeDistribution.D }}</span>
          </div>
        </div>
        <div class="pass-fail">
          <div class="pf-item pass">
            <span class="pf-count">{{ stats.passed }}</span>
            <span class="pf-label">Lulus (≥{{ passingGrade }})</span>
          </div>
          <div class="pf-item fail">
            <span class="pf-count">{{ stats.failed }}</span>
            <span class="pf-label">Belum Lulus (&lt;{{ passingGrade }})</span>
          </div>
        </div>
      </section>

      <!-- Exam Type Tabs -->
      <section class="exam-tabs">
        <button v-for="exam in exams" :key="exam.id" 
                :class="['exam-tab', { active: selectedExam === exam.name }]"
                @click="selectedExam = exam.name">
          {{ exam.name }}
        </button>
      </section>

      <!-- Filters -->
      <section class="filter-bar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Cari nama siswa...">
        </div>
        <select v-model="selectedClass" class="filter-select">
          <option value="all">Semua Kelas</option>
          <option v-for="cls in classes" :key="cls" :value="cls">{{ cls }}</option>
        </select>
        <div class="view-toggle">
          <button :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
          <button :class="{ active: viewMode === 'cards' }" @click="viewMode = 'cards'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Memuat data nilai...</p>
      </div>

      <!-- Table View -->
      <section v-else-if="viewMode === 'table' && filteredGrades.length > 0" class="grades-table-container">
        <table class="grades-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>Mata Pelajaran</th>
              <th>Nilai</th>
              <th>Grade</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, index) in filteredGrades" :key="student.id">
              <td>{{ index + 1 }}</td>
              <td>
                <div class="student-cell">
                  <span class="avatar">{{ student.name?.charAt(0) || '?' }}</span>
                  {{ student.name }}
                </div>
              </td>
              <td>{{ student.class }}</td>
              <td>{{ student.subject }}</td>
              <td>
                <input type="number" v-model.number="student.grade" min="0" max="100" class="grade-input">
              </td>
              <td>
                <span :class="['grade-badge', getGradeClass(student.grade)]">
                  {{ getGradeLabel(student.grade) }}
                </span>
              </td>
              <td>
                <button class="btn-edit" @click="openInputModal(student)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Card View -->
      <section v-else-if="viewMode === 'cards' && filteredGrades.length > 0" class="grades-cards">
        <div v-for="student in filteredGrades" :key="student.id" class="grade-card">
          <div class="gc-header">
            <div class="gc-student">
              <span class="avatar">{{ student.name?.charAt(0) || '?' }}</span>
              <div>
                <h4>{{ student.name }}</h4>
                <p>{{ student.class }} • {{ student.subject }}</p>
              </div>
            </div>
            <div :class="['grade-circle', getGradeClass(student.grade)]">
              <span class="grade-value">{{ student.grade || '-' }}</span>
              <span class="grade-letter">{{ student.grade ? getGradeLabel(student.grade) : '' }}</span>
            </div>
          </div>
          <div class="gc-body">
            <div class="gc-progress">
              <div class="progress-track">
                <div class="progress-fill" :class="getGradeClass(student.grade)" :style="{ width: (student.grade || 0) + '%' }"></div>
              </div>
            </div>
            <input type="number" v-model.number="student.grade" min="0" max="100" class="gc-input" placeholder="Input nilai...">
          </div>
          <div class="gc-footer">
            <span class="gc-exam">{{ selectedExam }}</span>
            <button class="btn-detail" @click="openInputModal(student)">Detail</button>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <section v-else class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
        <h3>Belum ada data nilai</h3>
        <p>Data nilai akan muncul setelah siswa terdaftar di program</p>
      </section>

      <!-- Input Modal -->
      <div v-if="showInputModal" class="modal-overlay" @click.self="showInputModal = false">
        <div class="modal">
          <button class="modal-close" @click="showInputModal = false">×</button>
          <h2>Input Nilai</h2>
          
          <div class="modal-student">
            <span class="avatar lg">{{ selectedStudent?.name?.charAt(0) || '?' }}</span>
            <div>
              <h4>{{ selectedStudent?.name }}</h4>
              <p>{{ selectedStudent?.class }} • {{ selectedStudent?.subject }}</p>
            </div>
          </div>
          
          <div class="form-group">
            <label>Jenis Ujian</label>
            <div class="exam-info">{{ selectedExam }}</div>
          </div>
          
          <div class="form-group">
            <label>Nilai (0-100)</label>
            <div class="grade-input-wrapper">
              <input type="number" v-model.number="gradeInput" min="0" max="100" class="big-input">
              <div :class="['grade-preview', getGradeClass(gradeInput)]">
                <span>{{ getGradeLabel(gradeInput) }}</span>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>Catatan (opsional)</label>
            <textarea v-model="noteInput" rows="2" placeholder="Tambahkan catatan..."></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="btn-cancel" @click="showInputModal = false">Batal</button>
            <button class="btn-save" @click="handleSaveGrade">Simpan Nilai</button>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
        <div class="modal settings-modal">
          <button class="modal-close" @click="showSettingsModal = false">×</button>
          <h2>Pengaturan Nilai</h2>
          
          <div class="form-group">
            <label>Batas Nilai Kelulusan (KKM)</label>
            <div class="kkm-input">
              <input type="number" v-model.number="passingGrade" min="0" max="100">
              <span>/ 100</span>
            </div>
            <p class="helper-text">Siswa dengan nilai ≥ {{ passingGrade }} dianggap lulus</p>
          </div>
          
          <div class="modal-actions">
            <button class="btn-save" @click="showSettingsModal = false">Simpan Pengaturan</button>
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
  max-width: 1200px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
}

.header-left h1 svg { width: 28px; height: 28px; color: #0d5782; }
.subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-settings {
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-settings:hover { background: #f8fafc; }
.btn-settings svg { width: 20px; height: 20px; color: #64748b; }

.btn-save-all {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save-all:hover { background: #0a4568; }
.btn-save-all svg { width: 18px; height: 18px; }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  position: relative;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg { width: 22px; height: 22px; }

.stat-card.primary .stat-icon { background: #dbeafe; color: #2563eb; }
.stat-card.green .stat-icon { background: #dcfce7; color: #16a34a; }
.stat-card.red .stat-icon { background: #fee2e2; color: #dc2626; }
.stat-card.purple .stat-icon { background: #f3e8ff; color: #9333ea; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 13px; color: #64748b; }

.stat-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.stat-badge.excellent { background: #dcfce7; color: #16a34a; }
.stat-badge.good { background: #dbeafe; color: #2563eb; }
.stat-badge.average { background: #fef3c7; color: #d97706; }
.stat-badge.poor { background: #fee2e2; color: #dc2626; }

/* Distribution Card */
.distribution-card {
  background: white;
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.distribution-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.distribution-bars {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;
}

.dist-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dist-bar-wrapper {
  width: 48px;
  height: 100px;
  background: #f1f5f9;
  border-radius: 8px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.dist-bar {
  width: 100%;
  border-radius: 8px 8px 0 0;
  transition: height 0.3s ease;
  min-height: 4px;
}

.dist-bar.excellent { background: linear-gradient(to top, #16a34a, #22c55e); }
.dist-bar.good { background: linear-gradient(to top, #2563eb, #60a5fa); }
.dist-bar.average { background: linear-gradient(to top, #d97706, #fbbf24); }
.dist-bar.poor { background: linear-gradient(to top, #dc2626, #f87171); }

.dist-label { font-weight: 700; font-size: 18px; color: #1e293b; }
.dist-count { font-size: 13px; color: #64748b; }

.pass-fail {
  display: flex;
  justify-content: center;
  gap: 48px;
}

.pf-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pf-count {
  font-size: 24px;
  font-weight: 700;
}

.pf-item.pass .pf-count { color: #16a34a; }
.pf-item.fail .pf-count { color: #dc2626; }

.pf-label { font-size: 13px; color: #64748b; }

/* Exam Tabs */
.exam-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.exam-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.exam-tab:hover { border-color: #0d5782; }

.exam-tab.active {
  background: #0d5782;
  border-color: #0d5782;
  color: white;
}

.exam-icon { font-size: 16px; }

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 300px;
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
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
}

.search-box input:focus { outline: none; border-color: #0d5782; }

.filter-select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
}

.view-toggle {
  display: flex;
  background: white;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.view-toggle button {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-toggle button.active { background: #0d5782; }
.view-toggle button svg { width: 18px; height: 18px; color: #64748b; }
.view-toggle button.active svg { color: white; }

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  gap: 16px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #0d5782;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Table */
.grades-table-container {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.grades-table {
  width: 100%;
  border-collapse: collapse;
}

.grades-table th,
.grades-table td {
  padding: 14px 16px;
  text-align: left;
}

.grades-table th {
  background: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.grades-table tr:not(:last-child) td {
  border-bottom: 1px solid #f1f5f9;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  background: #0d5782;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.avatar.lg { width: 48px; height: 48px; font-size: 18px; }

.grade-input {
  width: 70px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.grade-input:focus { outline: none; border-color: #0d5782; }

.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
}

.grade-badge.excellent { background: #dcfce7; color: #16a34a; }
.grade-badge.good { background: #dbeafe; color: #2563eb; }
.grade-badge.average { background: #fef3c7; color: #d97706; }
.grade-badge.poor { background: #fee2e2; color: #dc2626; }

.btn-edit {
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit:hover { background: #f8fafc; }
.btn-edit svg { width: 16px; height: 16px; color: #64748b; }

/* Cards View */
.grades-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.grade-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.gc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.gc-student {
  display: flex;
  gap: 12px;
}

.gc-student h4 { font-size: 15px; font-weight: 600; color: #1e293b; }
.gc-student p { font-size: 13px; color: #64748b; }

.grade-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.grade-circle.excellent { background: #dcfce7; }
.grade-circle.good { background: #dbeafe; }
.grade-circle.average { background: #fef3c7; }
.grade-circle.poor { background: #fee2e2; }

.grade-value { font-size: 18px; font-weight: 700; color: #1e293b; }
.grade-letter { font-size: 11px; font-weight: 600; color: #64748b; }

.gc-body { margin-bottom: 16px; }

.gc-progress { margin-bottom: 12px; }

.progress-track {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-fill.excellent { background: #22c55e; }
.progress-fill.good { background: #3b82f6; }
.progress-fill.average { background: #f59e0b; }
.progress-fill.poor { background: #ef4444; }

.gc-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.gc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.gc-exam {
  font-size: 12px;
  color: #64748b;
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 6px;
}

.btn-detail {
  padding: 6px 14px;
  border: 1px solid #0d5782;
  background: transparent;
  color: #0d5782;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-detail:hover { background: #0d5782; color: white; }

/* Empty State */
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 60px;
  text-align: center;
  border: 2px dashed #e2e8f0;
}

.empty-state svg { width: 80px; height: 80px; color: #cbd5e1; margin-bottom: 20px; }
.empty-state h3 { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
.empty-state p { font-size: 14px; color: #64748b; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  padding: 28px;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: #64748b;
}

.modal h2 { font-size: 20px; font-weight: 700; margin-bottom: 24px; }

.modal-student {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.modal-student h4 { font-size: 16px; font-weight: 600; }
.modal-student p { font-size: 13px; color: #64748b; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 6px; }

.exam-info {
  padding: 12px;
  background: #f1f5f9;
  border-radius: 10px;
  font-size: 14px;
  color: #64748b;
}

.grade-input-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.big-input {
  flex: 1;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 20px;
  text-align: center;
  font-weight: 600;
}

.big-input:focus { outline: none; border-color: #0d5782; }

.grade-preview {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
}

.grade-preview.excellent { background: #dcfce7; color: #16a34a; }
.grade-preview.good { background: #dbeafe; color: #2563eb; }
.grade-preview.average { background: #fef3c7; color: #d97706; }
.grade-preview.poor { background: #fee2e2; color: #dc2626; }

.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  resize: none;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  flex: 2;
  padding: 12px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover { background: #0a4568; }

/* Settings Modal */
.settings-modal { max-width: 380px; }

.kkm-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kkm-input input {
  width: 100px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 20px;
  text-align: center;
  font-weight: 600;
}

.kkm-input input:focus { outline: none; border-color: #0d5782; }
.kkm-input span { font-size: 16px; color: #64748b; }

.helper-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}

/* Toast */
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

.toast.success { border-left: 4px solid #22c55e; }
.toast.error { border-left: 4px solid #ef4444; }
.toast svg { width: 24px; height: 24px; }
.toast.success svg { color: #22c55e; }
.toast.error svg { color: #ef4444; }
.toast span { font-size: 14px; font-weight: 500; }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateX(20px); }

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .main { padding: 16px; }
  .page-header { flex-direction: column; gap: 16px; }
  .stats-grid { grid-template-columns: 1fr; }
  .filter-bar { flex-wrap: wrap; }
  .search-box { max-width: 100%; flex: 1 1 100%; }
  .exam-tabs { flex-wrap: nowrap; }
  .grades-cards { grid-template-columns: 1fr; }
  .distribution-bars { gap: 16px; }
  .pass-fail { gap: 24px; }
}
</style>
