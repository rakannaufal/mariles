<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTeacherData } from '@/composables/useTeacherData'
import { useProgramCompletion } from '@/composables/useProgramCompletion'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const { teacherProfile, lesPlace, fetchTeacherProfile } = useTeacherData()
const { 
  loading, 
  getStudentsForCompletion, 
  completeBookingLocal, 
  terminateBookingLocal,
  calculateEligibilityLocal
} = useProgramCompletion()

// Data
const students = ref([])
const selectedFilter = ref('active')
const searchQuery = ref('')

// Modal states
const showCompleteModal = ref(false)
const showTerminateModal = ref(false)
const selectedStudent = ref(null)

// Complete form
const completeForm = ref({
  result: 'passed',
  notes: ''
})

// Terminate form
const terminateForm = ref({
  reason: 'tidak_hadir',
  customReason: ''
})

// Notification
const notification = ref({ show: false, type: '', message: '' })

function showNotification(type, message) {
  notification.value = { show: true, type, message }
  setTimeout(() => notification.value.show = false, 4000)
}

// Filters
const filters = [
  { key: 'active', label: 'Aktif', count: 0 },
  { key: 'completed', label: 'Selesai', count: 0 },
  { key: 'terminated', label: 'Dihentikan', count: 0 },
  { key: 'all', label: 'Semua', count: 0 }
]

const filterCounts = computed(() => {
  const counts = { active: 0, completed: 0, terminated: 0, all: 0 }
  students.value.forEach(s => {
    if (s.status === 'active' || s.status === 'confirmed') counts.active++
    else if (s.status === 'completed') counts.completed++
    else if (s.status === 'terminated') counts.terminated++
    counts.all++
  })
  return counts
})

const filteredStudents = computed(() => {
  let result = students.value
  
  // Filter by status
  if (selectedFilter.value === 'active') {
    result = result.filter(s => s.status === 'active' || s.status === 'confirmed')
  } else if (selectedFilter.value !== 'all') {
    result = result.filter(s => s.status === selectedFilter.value)
  }
  
  // Filter by search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.studentName?.toLowerCase().includes(q) ||
      s.programName?.toLowerCase().includes(q)
    )
  }
  
  return result
})

// Fetch data
async function fetchData() {
  await fetchTeacherProfile()
  if (lesPlace.value?.id) {
    students.value = await getStudentsForCompletion(lesPlace.value.id)
  }
}

// Open complete modal
function openCompleteModal(student) {
  selectedStudent.value = student
  completeForm.value = { result: 'passed', notes: '' }
  showCompleteModal.value = true
}

// Submit complete
async function submitComplete() {
  if (!selectedStudent.value) return
  
  try {
    await completeBookingLocal(selectedStudent.value.id, {
      completionType: 'manual',
      completionResult: completeForm.value.result,
      notes: completeForm.value.notes || null
    })
    
    showNotification('success', `Program ${selectedStudent.value.studentName} berhasil ditandai selesai!`)
    showCompleteModal.value = false
    await fetchData()
  } catch (err) {
    showNotification('error', 'Gagal menandai selesai: ' + err.message)
  }
}

// Open terminate modal
function openTerminateModal(student) {
  selectedStudent.value = student
  terminateForm.value = { reason: 'tidak_hadir', customReason: '' }
  showTerminateModal.value = true
}

// Submit terminate
async function submitTerminate() {
  if (!selectedStudent.value) return
  
  const reason = terminateForm.value.reason === 'lainnya' 
    ? terminateForm.value.customReason 
    : getReasonText(terminateForm.value.reason)
  
  try {
    await terminateBookingLocal(
      selectedStudent.value.id, 
      reason,
      authStore.user?.id
    )
    
    showNotification('success', `Program ${selectedStudent.value.studentName} berhasil dihentikan.`)
    showTerminateModal.value = false
    await fetchData()
  } catch (err) {
    showNotification('error', 'Gagal menghentikan program: ' + err.message)
  }
}

function getReasonText(key) {
  const reasons = {
    'tidak_hadir': 'Tidak hadir 3x berturut-turut',
    'tidak_aktif': 'Tidak ada aktivitas > 3 minggu',
    'permintaan': 'Atas permintaan siswa',
    'lainnya': 'Alasan lain'
  }
  return reasons[key] || key
}

function getStatusClass(status) {
  const classes = {
    active: 'status-active',
    confirmed: 'status-active',
    completed: 'status-completed',
    terminated: 'status-terminated',
    expired: 'status-expired'
  }
  return classes[status] || ''
}

function getStatusText(status, result) {
  if (status === 'completed') {
    return result === 'passed' ? 'Selesai (Lulus)' : 'Selesai (Tidak Lulus)'
  }
  const texts = {
    active: 'Aktif',
    confirmed: 'Terkonfirmasi',
    terminated: 'Dihentikan',
    expired: 'Kadaluarsa'
  }
  return texts[status] || status
}

onMounted(fetchData)
</script>

<template>
  <div class="student-management">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Manajemen Siswa
        </h1>
        <p>Kelola status program dan penyelesaian siswa</p>
      </div>
    </header>

    <!-- Notification -->
    <div v-if="notification.show" :class="['notification', notification.type]">
      <span>{{ notification.message }}</span>
      <button @click="notification.show = false">&times;</button>
    </div>

    <!-- Stats Cards -->
    <section class="stats-row">
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ filterCounts.active }}</span>
          <span class="stat-label">Siswa Aktif</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ filterCounts.completed }}</span>
          <span class="stat-label">Selesai</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ filterCounts.terminated }}</span>
          <span class="stat-label">Dihentikan</span>
        </div>
      </div>
    </section>

    <!-- Filters & Search -->
    <section class="filter-bar">
      <div class="filter-tabs">
        <button 
          v-for="f in filters" 
          :key="f.key"
          :class="{ active: selectedFilter === f.key }"
          @click="selectedFilter = f.key"
        >
          {{ f.label }} ({{ filterCounts[f.key] }})
        </button>
      </div>
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Cari siswa atau program...">
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat data siswa...</p>
    </div>

    <!-- Student List -->
    <section v-else class="student-list">
      <div v-if="filteredStudents.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
        </svg>
        <p>Tidak ada siswa ditemukan</p>
      </div>

      <div v-for="student in filteredStudents" :key="student.id" class="student-card">
        <div class="student-main">
          <div class="student-avatar">
            <img v-if="student.studentAvatar" :src="student.studentAvatar" alt="">
            <span v-else>{{ student.studentName?.charAt(0) || '?' }}</span>
          </div>
          <div class="student-info">
            <h3>{{ student.studentName }}</h3>
            <p>{{ student.programName }} • {{ student.programType }}</p>
            <div class="student-meta">
              <span :class="['status-badge', getStatusClass(student.status)]">
                {{ getStatusText(student.status, student.completion_result) }}
              </span>
              <span v-if="student.is_dropout_eligible" class="warning-badge">
                ⚠️ {{ student.consecutive_absents }}x Tidak Hadir
              </span>
            </div>
          </div>
        </div>

        <div class="student-stats" v-if="student.eligibility">
          <div class="stat-mini">
            <span class="stat-mini-value">{{ student.eligibility.progress_percent || 0 }}%</span>
            <span class="stat-mini-label">Progress</span>
          </div>
          <div class="stat-mini">
            <span class="stat-mini-value">{{ student.eligibility.attendance_percent || 0 }}%</span>
            <span class="stat-mini-label">Kehadiran</span>
          </div>
          <div class="stat-mini">
            <span class="stat-mini-value">{{ student.eligibility.attended_sessions || 0 }}/{{ student.eligibility.total_sessions || 0 }}</span>
            <span class="stat-mini-label">Sesi</span>
          </div>
        </div>

        <div class="student-actions" v-if="student.status === 'active' || student.status === 'confirmed'">
          <button class="btn-complete" @click="openCompleteModal(student)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Tandai Selesai
          </button>
          <button 
            class="btn-terminate" 
            @click="openTerminateModal(student)"
            :class="{ highlight: student.is_dropout_eligible }"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Hentikan
          </button>
        </div>

        <div class="student-completed" v-else-if="student.status === 'completed'">
          <span class="completed-badge" :class="student.completion_result">
            {{ student.completion_result === 'passed' ? '🎓 Lulus' : '❌ Tidak Lulus' }}
          </span>
          <span class="completed-date">{{ new Date(student.completed_at).toLocaleDateString('id-ID') }}</span>
        </div>
      </div>
    </section>

    <!-- Complete Modal -->
    <div v-if="showCompleteModal" class="modal-backdrop" @click.self="showCompleteModal = false">
      <div class="modal-box">
        <button class="close-btn" @click="showCompleteModal = false">&times;</button>
        
        <div class="modal-header">
          <h2>✅ Tandai Program Selesai</h2>
          <p>{{ selectedStudent?.studentName }} - {{ selectedStudent?.programName }}</p>
        </div>

        <div class="modal-body">
          <div class="eligibility-check" v-if="selectedStudent?.eligibility">
            <div class="check-item" :class="{ success: selectedStudent.eligibility.progress_percent >= 100 }">
              <span class="check-icon">{{ selectedStudent.eligibility.progress_percent >= 100 ? '✅' : '⚠️' }}</span>
              <span>Progress Materi: {{ selectedStudent.eligibility.progress_percent }}%</span>
            </div>
            <div class="check-item" :class="{ success: selectedStudent.eligibility.attendance_percent >= 80 }">
              <span class="check-icon">{{ selectedStudent.eligibility.attendance_percent >= 80 ? '✅' : '⚠️' }}</span>
              <span>Kehadiran: {{ selectedStudent.eligibility.attendance_percent }}% (min 80%)</span>
            </div>
          </div>

          <div class="form-group">
            <label>Hasil Akhir:</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" v-model="completeForm.result" value="passed">
                <span class="radio-custom"></span>
                🎓 Lulus
              </label>
              <label class="radio-label">
                <input type="radio" v-model="completeForm.result" value="failed">
                <span class="radio-custom"></span>
                ❌ Tidak Lulus
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Catatan (opsional):</label>
            <textarea v-model="completeForm.notes" placeholder="Catatan tambahan..."></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showCompleteModal = false">Batal</button>
          <button class="btn-primary" @click="submitComplete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Konfirmasi Selesai
          </button>
        </div>
      </div>
    </div>

    <!-- Terminate Modal -->
    <div v-if="showTerminateModal" class="modal-backdrop" @click.self="showTerminateModal = false">
      <div class="modal-box">
        <button class="close-btn" @click="showTerminateModal = false">&times;</button>
        
        <div class="modal-header warning">
          <h2>⚠️ Hentikan Program Siswa</h2>
          <p>{{ selectedStudent?.studentName }} - {{ selectedStudent?.programName }}</p>
        </div>

        <div class="modal-body">
          <div class="warning-box" v-if="selectedStudent?.is_dropout_eligible">
            <span>⚠️</span>
            <p>Siswa ini tidak hadir {{ selectedStudent.consecutive_absents }}x berturut-turut.</p>
          </div>

          <div class="form-group">
            <label>Alasan Penghentian:</label>
            <div class="radio-group vertical">
              <label class="radio-label">
                <input type="radio" v-model="terminateForm.reason" value="tidak_hadir">
                <span class="radio-custom"></span>
                Tidak hadir 3x berturut-turut
              </label>
              <label class="radio-label">
                <input type="radio" v-model="terminateForm.reason" value="tidak_aktif">
                <span class="radio-custom"></span>
                Tidak ada aktivitas > 3 minggu
              </label>
              <label class="radio-label">
                <input type="radio" v-model="terminateForm.reason" value="permintaan">
                <span class="radio-custom"></span>
                Atas permintaan siswa
              </label>
              <label class="radio-label">
                <input type="radio" v-model="terminateForm.reason" value="lainnya">
                <span class="radio-custom"></span>
                Alasan lain
              </label>
            </div>
          </div>

          <div class="form-group" v-if="terminateForm.reason === 'lainnya'">
            <label>Jelaskan alasan:</label>
            <textarea v-model="terminateForm.customReason" placeholder="Tuliskan alasan..."></textarea>
          </div>

          <div class="info-box">
            <strong>Perhatian:</strong>
            <ul>
              <li>Siswa tidak bisa mengakses materi setelah dihentikan</li>
              <li>Tindakan ini tidak bisa dibatalkan</li>
              <li>Refund tidak tersedia untuk program yang dihentikan</li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showTerminateModal = false">Batal</button>
          <button class="btn-danger" @click="submitTerminate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Hentikan Program
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-management {
  padding: 32px;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header */
.page-header {
  margin-bottom: 28px;
}

.page-header h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
}

.page-header h1 svg {
  width: 28px;
  height: 28px;
  color: #0d5782;
}

.page-header p {
  color: #64748b;
  font-size: 14px;
  margin-top: 4px;
}

/* Notification */
.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-radius: 10px;
  margin-bottom: 20px;
  font-weight: 500;
}

.notification.success { background: #dcfce7; color: #16a34a; }
.notification.error { background: #fee2e2; color: #dc2626; }
.notification button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: inherit;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg { width: 24px; height: 24px; }
.stat-icon.blue { background: #eff6ff; color: #3b82f6; }
.stat-icon.green { background: #ecfdf5; color: #22c55e; }
.stat-icon.red { background: #fef2f2; color: #ef4444; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 13px; color: #64748b; }

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tabs button {
  padding: 10px 18px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-tabs button:hover { background: #f8fafc; }
.filter-tabs button.active {
  background: #0d5782;
  color: white;
  border-color: #0d5782;
}

.search-box {
  position: relative;
  width: 280px;
}

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-box input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

/* Loading */
.loading-state {
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px;
  color: #94a3b8;
}

.empty-state svg { width: 48px; height: 48px; margin-bottom: 12px; }

/* Student List */
.student-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.student-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: box-shadow 0.2s;
}

.student-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

.student-main {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.student-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0d5782, #1e88e5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
  overflow: hidden;
}

.student-avatar img { width: 100%; height: 100%; object-fit: cover; }

.student-info h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.student-info p {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
}

.student-meta { display: flex; gap: 8px; }

.status-badge {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.status-active { background: #dcfce7; color: #16a34a; }
.status-completed { background: #dbeafe; color: #2563eb; }
.status-terminated { background: #fee2e2; color: #dc2626; }
.status-expired { background: #fef3c7; color: #d97706; }

.warning-badge {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  background: #fef3c7;
  color: #d97706;
  font-weight: 500;
}

/* Student Stats */
.student-stats {
  display: flex;
  gap: 20px;
}

.stat-mini {
  text-align: center;
  min-width: 60px;
}

.stat-mini-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.stat-mini-label {
  font-size: 11px;
  color: #94a3b8;
}

/* Actions */
.student-actions {
  display: flex;
  gap: 10px;
}

.btn-complete, .btn-terminate {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-complete {
  background: #0d5782;
  color: white;
  border: none;
}

.btn-complete:hover { background: #0a4568; }
.btn-complete svg { width: 16px; height: 16px; }

.btn-terminate {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-terminate:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.btn-terminate.highlight { background: #fef3c7; color: #d97706; border-color: #fcd34d; }
.btn-terminate svg { width: 16px; height: 16px; }

/* Completed Badge */
.student-completed {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.completed-badge {
  font-size: 13px;
  font-weight: 600;
}

.completed-badge.passed { color: #16a34a; }
.completed-badge.failed { color: #dc2626; }

.completed-date {
  font-size: 12px;
  color: #94a3b8;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: white;
  border-radius: 16px;
  width: 480px;
  max-width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
}

.modal-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.modal-header.warning h2 { color: #d97706; }

.modal-header p {
  font-size: 14px;
  color: #64748b;
}

.modal-body {
  padding: 20px 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Form Elements */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
}

.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-group.vertical {
  flex-direction: column;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
}

.radio-label input { display: none; }

.radio-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  position: relative;
}

.radio-label input:checked + .radio-custom {
  border-color: #0d5782;
}

.radio-label input:checked + .radio-custom::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 8px;
  height: 8px;
  background: #0d5782;
  border-radius: 50%;
}

/* Eligibility Check */
.eligibility-check {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: #64748b;
}

.check-item.success { color: #16a34a; }
.check-icon { font-size: 16px; }

/* Warning & Info Boxes */
.warning-box {
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  color: #92400e;
}

.warning-box span { font-size: 20px; }
.warning-box p { font-size: 14px; margin: 0; }

.info-box {
  background: #f1f5f9;
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  color: #475569;
}

.info-box strong { display: block; margin-bottom: 8px; }
.info-box ul { margin: 0; padding-left: 20px; }
.info-box li { margin-bottom: 4px; }

/* Buttons */
.btn-cancel {
  padding: 10px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover { background: #0a4568; }
.btn-primary svg { width: 18px; height: 18px; }

.btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:hover { background: #b91c1c; }
.btn-danger svg { width: 18px; height: 18px; }

/* Responsive */
@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr; }
  .student-card { flex-direction: column; align-items: stretch; }
  .student-stats { justify-content: space-around; margin: 12px 0; }
  .student-actions { justify-content: center; }
  .filter-bar { flex-direction: column; }
  .search-box { width: 100%; }
}
</style>
