<script setup>
import TeacherSidebar from '@/components/TeacherSidebar.vue'
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTeacherData } from '@/composables/useTeacherData'

const route = useRoute()
const isOwner = computed(() => route.path.startsWith('/owner'))

const { loading, students, lesPlace, fetchTeacherStudents, fetchTeacherProfile } = useTeacherData()

const filter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')
const viewMode = ref('grid') // 'grid' or 'table'
const showStudentModal = ref(false)
const selectedStudent = ref(null)

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

  return { total, active, avgProgress, newThisMonth }
})

// Get unique classes for filter dropdown
const classes = computed(() => {
  const unique = [...new Set(students.value.map(s => s.class))]
  return unique.filter(c => c && c !== '-')
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
    const matchClass = filter.value === 'all' || s.class === filter.value
    const matchStatus = statusFilter.value === 'all' || s.status === statusFilter.value
    return matchSearch && matchClass && matchStatus
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
}

function getGradeFromProgress(progress) {
  if (progress >= 90) return 'A'
  if (progress >= 80) return 'B'
  if (progress >= 70) return 'C'
  if (progress >= 60) return 'D'
  return 'E'
}

onMounted(async () => {
  await fetchTeacherProfile()
  await fetchTeacherStudents()
})
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar v-if="isOwner" />
    <TeacherSidebar v-else />

    <main class="main">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Daftar Siswa
          </h1>
          <p class="subtitle">Kelola dan pantau perkembangan siswa Anda</p>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="stats-row">
        <div class="stat-card primary">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ studentStats.total }}</span>
            <span class="stat-label">Total Siswa</span>
          </div>
        </div>
        
        <div class="stat-card success">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ studentStats.active }}</span>
            <span class="stat-label">Siswa Aktif</span>
          </div>
        </div>
        
        <div class="stat-card info">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ studentStats.avgProgress }}%</span>
            <span class="stat-label">Rata-rata Progress</span>
          </div>
        </div>
        
        <div class="stat-card warning">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ studentStats.newThisMonth }}</span>
            <span class="stat-label">Siswa Baru (Bulan Ini)</span>
          </div>
        </div>
      </section>

      <!-- Filter Bar -->
      <section class="filter-section">
        <div class="filter-left">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Cari nama atau email siswa...">
          </div>
          
          <select v-model="filter" class="filter-select">
            <option value="all">Semua Kelas</option>
            <option v-for="cls in classes" :key="cls" :value="cls">{{ cls }}</option>
          </select>
          
          <select v-model="statusFilter" class="filter-select">
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
            <option value="warning">Perlu Perhatian</option>
          </select>
        </div>
        
        <div class="filter-right">
          <div class="view-toggle">
            <button :class="['toggle-btn', { active: viewMode === 'grid' }]" @click="viewMode = 'grid'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button :class="['toggle-btn', { active: viewMode === 'table' }]" @click="viewMode = 'table'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              {{ student.class || '-' }}
            </p>
            <p class="student-subject">{{ student.subject || '-' }}</p>
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
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{{ student.join_date || '-' }}</span>
            </div>
            <div class="footer-grade">
              <span class="grade-badge" :class="getProgressColor(student.progress || 0)">
                {{ getGradeFromProgress(student.progress || 0) }}
              </span>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card-actions">
            <router-link :to="isOwner ? '/owner/grades' : '/teacher/grades'" class="action-btn primary" @click.stop>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Input Nilai
            </router-link>
            <router-link :to="isOwner ? '/owner/attendance' : '/teacher/attendance'" class="action-btn secondary" @click.stop>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Absensi
            </router-link>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredStudents.length === 0" class="empty-state">
          <div class="empty-illustration">
            <svg viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" fill="#f1f5f9"/>
              <circle cx="100" cy="80" r="30" fill="white" stroke="#e2e8f0" stroke-width="2"/>
              <path d="M60 150c0-22 18-40 40-40s40 18 40 40" fill="white" stroke="#e2e8f0" stroke-width="2"/>
              <circle cx="140" cy="140" r="25" fill="#0d5782" opacity="0.1"/>
              <path d="M140 130v20M130 140h20" stroke="#0d5782" stroke-width="3" stroke-linecap="round"/>
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
              <th>Mata Pelajaran</th>
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
              <td>{{ student.subject || '-' }}</td>
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
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
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
                <span class="detail-label">Mata Pelajaran</span>
                <span class="detail-value">{{ selectedStudent?.subject || '-' }}</span>
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
          </div>

          <div class="modal-actions">
            <router-link :to="isOwner ? '/owner/grades' : '/teacher/grades'" class="modal-btn primary" @click="showStudentModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Input Nilai
            </router-link>
            <router-link :to="isOwner ? '/owner/attendance' : '/teacher/attendance'" class="modal-btn secondary" @click="showStudentModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Absensi
            </router-link>
            <button class="modal-btn outline" @click="showStudentModal = false">Tutup</button>
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
  font-family: 'Poppins', sans-serif;
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
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: transform 0.2s;
}

.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08); }

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg { width: 24px; height: 24px; }

.stat-card.primary .stat-icon { background: #e0f2fe; color: #0d5782; }
.stat-card.success .stat-icon { background: #dcfce7; color: #16a34a; }
.stat-card.info .stat-icon { background: #ede9fe; color: #8b5cf6; }
.stat-card.warning .stat-icon { background: #fef3c7; color: #f59e0b; }

.stat-content { display: flex; flex-direction: column; }
.stat-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.1; }
.stat-label { font-size: 12px; color: #64748b; }

/* Filter Section */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
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

.grade-badge.excellent { background: #22c55e; }
.grade-badge.good { background: #3b82f6; }
.grade-badge.average { background: #f59e0b; }
.grade-badge.poor { background: #ef4444; }

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
  .filter-left { flex-direction: column; }
  .search-box { max-width: 100%; }
  .students-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
  .modal-actions { flex-direction: column; }
}
</style>
