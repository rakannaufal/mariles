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
  schedule,
  students,
  programs,
  fetchTeacherSchedule,
  fetchTeacherStudents,
  fetchTeacherProfile
} = useTeacherData()

// Date navigation
const selectedDayIndex = ref(new Date().getDay() || 7) // 1-7, Monday=1, Sunday=7

const days = [
  { short: 'SEN', full: 'Senin', index: 1 },
  { short: 'SEL', full: 'Selasa', index: 2 },
  { short: 'RAB', full: 'Rabu', index: 3 },
  { short: 'KAM', full: 'Kamis', index: 4 },
  { short: 'JUM', full: 'Jumat', index: 5 },
  { short: 'SAB', full: 'Sabtu', index: 6 },
  { short: 'MIN', full: 'Minggu', index: 7 },
]

const selectedProgram = ref('all')
const searchQuery = ref('')

// Modal state
const showAttendanceModal = ref(false)
const selectedSession = ref(null)
const attendanceList = ref([])

// Week calculation
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

const currentWeekStart = ref(getWeekStart(new Date()))

function getWeekDates() {
  const dates = []
  const start = new Date(currentWeekStart.value)
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date)
  }
  return dates
}

const weekDates = computed(() => getWeekDates())

// Get unique classes from schedule
const classes = computed(() => {
  const unique = [...new Set(schedule.value.map(s => s.class))]
  return unique.filter(c => c && c !== '-' && c !== 'Umum')
})

// Get schedule for selected day
const todaySchedule = computed(() => {
  return schedule.value.filter(s => s.day === selectedDayIndex.value)
})

// Filter sessions
const filteredSessions = computed(() => {
  return todaySchedule.value.filter(s => {
    const matchProgram = selectedProgram.value === 'all' || s.program_id === selectedProgram.value
    const matchSearch = !searchQuery.value || 
      s.program_name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      s.subject?.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchProgram && matchSearch
  })
})

// Stats for selected day
const attendanceStats = computed(() => {
  const total = todaySchedule.value.length
  const completed = todaySchedule.value.filter(s => s.attendance_status === 'completed').length
  const pending = total - completed
  // Use actual registered students count from students data
  const totalStudents = students.value.length
  
  return { total, completed, pending, totalStudents }
})

function formatWeekRange() {
  const start = new Date(currentWeekStart.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  
  return `${startStr} - ${endStr}`
}

function isToday(date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function prevWeek() {
  const newDate = new Date(currentWeekStart.value)
  newDate.setDate(newDate.getDate() - 7)
  currentWeekStart.value = newDate
}

function nextWeek() {
  const newDate = new Date(currentWeekStart.value)
  newDate.setDate(newDate.getDate() + 7)
  currentWeekStart.value = newDate
}

function goToToday() {
  currentWeekStart.value = getWeekStart(new Date())
  selectedDayIndex.value = new Date().getDay() || 7
}

function selectDay(dayIndex) {
  selectedDayIndex.value = dayIndex
}

function getScheduleCount(dayIndex) {
  return schedule.value.filter(s => s.day === dayIndex).length
}

function getSelectedDayName() {
  return days.find(d => d.index === selectedDayIndex.value)?.full || ''
}

function getSelectedDate() {
  const dayOffset = selectedDayIndex.value - 1
  const date = new Date(currentWeekStart.value)
  date.setDate(date.getDate() + dayOffset)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function openAttendanceModal(session) {
  selectedSession.value = session
  attendanceList.value = students.value
    .filter(s => s.class === session.class || s.subject === session.subject)
    .map(s => ({
      id: s.id,
      name: s.name,
      status: 'present',
      note: ''
    }))
  
  if (attendanceList.value.length === 0) {
    for (let i = 0; i < (session.students || session.capacity || 5); i++) {
      attendanceList.value.push({
        id: i + 1,
        name: `Siswa ${i + 1}`,
        status: 'present',
        note: ''
      })
    }
  }
  
  showAttendanceModal.value = true
}

function setAttendanceStatus(studentId, status) {
  const student = attendanceList.value.find(s => s.id === studentId)
  if (student) student.status = status
}

async function submitAttendance() {
  const present = attendanceList.value.filter(s => s.status === 'present').length
  const absent = attendanceList.value.filter(s => s.status === 'absent').length
  const late = attendanceList.value.filter(s => s.status === 'late').length
  const sick = attendanceList.value.filter(s => s.status === 'sick').length
  
  if (selectedSession.value) {
    selectedSession.value.attendance_status = 'completed'
    selectedSession.value.present = present
    selectedSession.value.absent = absent
  }
  
  showAttendanceModal.value = false
  alert(`Absensi berhasil disimpan!\nHadir: ${present}, Tidak Hadir: ${absent}, Terlambat: ${late}, Sakit/Izin: ${sick}`)
}

onMounted(async () => {
  await fetchTeacherProfile()
  await fetchTeacherSchedule()
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
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Absensi Kelas
        </h1>
        <p class="subtitle">Catat kehadiran siswa berdasarkan jadwal mengajar</p>
      </header>

      <!-- Stats Cards -->
      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ attendanceStats.total }}</span>
            <span class="stat-label">Kelas Hari Ini</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ attendanceStats.completed }}</span>
            <span class="stat-label">Selesai</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ attendanceStats.pending }}</span>
            <span class="stat-label">Belum Absen</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ attendanceStats.totalStudents }}</span>
            <span class="stat-label">Total Siswa</span>
          </div>
        </div>
      </section>

      <!-- Week Navigation -->
      <section class="week-nav">
        <button class="nav-btn" @click="prevWeek">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="week-range">{{ formatWeekRange() }}</span>
        <button class="nav-btn" @click="nextWeek">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <button class="today-btn" @click="goToToday">Hari Ini</button>
      </section>

      <!-- Day Cards -->
      <section class="day-cards">
        <div v-for="(day, idx) in days" :key="day.index" 
             :class="['day-card', { 
               active: selectedDayIndex === day.index, 
               today: isToday(weekDates[idx]),
               'has-schedule': getScheduleCount(day.index) > 0
             }]"
             @click="selectDay(day.index)">
          <span class="day-label">{{ day.short }}</span>
          <span class="day-num">{{ weekDates[idx]?.getDate() }}</span>
          <span class="day-count" v-if="getScheduleCount(day.index) > 0">{{ getScheduleCount(day.index) }} kelas</span>
          <span class="day-count empty" v-else>-</span>
        </div>
      </section>

      <!-- Filter -->
      <section class="filter-bar">
        <div class="search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Cari kelas atau program...">
        </div>
        <select v-model="selectedProgram" class="filter-select">
          <option value="all">Semua Program</option>
          <option v-for="prog in programs" :key="prog.id" :value="prog.id">{{ prog.name }}</option>
        </select>
      </section>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Memuat jadwal...</p>
      </div>

      <!-- Class Cards -->
      <section v-else-if="filteredSessions.length > 0" class="class-grid">
        <div v-for="session in filteredSessions" :key="session.id" class="class-card">
          <div class="card-top">
            <div class="time-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ session.time }}
            </div>
            <span class="status-tag" :class="session.attendance_status === 'completed' ? 'done' : 'pending'">
              {{ session.attendance_status === 'completed' ? 'Selesai' : 'Belum' }}
            </span>
          </div>
          
          <h3 class="card-title">{{ session.program_name || session.subject }}</h3>
          <p class="card-subtitle">{{ session.subject }} • Kelas {{ session.class }}</p>
          
          <div class="card-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              {{ session.students || session.capacity || 0 }} siswa
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {{ session.les_place }}
            </span>
          </div>
          
          <button class="btn-action" :class="{ completed: session.attendance_status === 'completed' }" @click="openAttendanceModal(session)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {{ session.attendance_status === 'completed' ? 'Edit Absensi' : 'Mulai Absensi' }}
          </button>
        </div>
      </section>

      <!-- Empty State -->
      <section v-else class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <line x1="9" y1="2" x2="9" y2="6"/>
          <line x1="15" y1="2" x2="15" y2="6"/>
        </svg>
        <h3>Tidak ada jadwal pada hari {{ getSelectedDayName() }}</h3>
        <p>Pilih hari lain yang memiliki jadwal kelas</p>
      </section>

      <!-- Modal -->
      <div v-if="showAttendanceModal" class="modal-backdrop" @click.self="showAttendanceModal = false">
        <div class="modal-box">
          <button class="close-btn" @click="showAttendanceModal = false">×</button>
          
          <div class="modal-header">
            <h2>Absensi Kelas</h2>
            <p>{{ selectedSession?.program_name || selectedSession?.subject }}</p>
            <div class="modal-tags">
              <span class="tag">{{ selectedSession?.class }}</span>
              <span class="tag">{{ selectedSession?.dayName }}: {{ selectedSession?.time }}</span>
            </div>
          </div>

          <div class="modal-content">
            <div class="quick-btns">
              <button @click="attendanceList.forEach(s => s.status = 'present')">Semua Hadir</button>
              <button @click="attendanceList.forEach(s => s.status = 'absent')">Semua Tidak Hadir</button>
            </div>

            <div class="student-list">
              <div v-for="student in attendanceList" :key="student.id" class="student-row">
                <div class="student-name">
                  <span class="avatar">{{ student.name.charAt(0) }}</span>
                  {{ student.name }}
                </div>
                <div class="status-btns">
                  <button :class="{ active: student.status === 'present' }" @click="setAttendanceStatus(student.id, 'present')" title="Hadir">H</button>
                  <button :class="{ active: student.status === 'absent' }" @click="setAttendanceStatus(student.id, 'absent')" title="Tidak Hadir">A</button>
                  <button :class="{ active: student.status === 'late' }" @click="setAttendanceStatus(student.id, 'late')" title="Terlambat">T</button>
                  <button :class="{ active: student.status === 'sick' }" @click="setAttendanceStatus(student.id, 'sick')" title="Sakit/Izin">S</button>
                </div>
              </div>
            </div>

            <div class="summary-row">
              <div class="summary-item green">{{ attendanceList.filter(s => s.status === 'present').length }} Hadir</div>
              <div class="summary-item red">{{ attendanceList.filter(s => s.status === 'absent').length }} Tidak Hadir</div>
              <div class="summary-item yellow">{{ attendanceList.filter(s => s.status === 'late').length }} Terlambat</div>
              <div class="summary-item purple">{{ attendanceList.filter(s => s.status === 'sick').length }} Sakit/Izin</div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showAttendanceModal = false">Batal</button>
            <button class="btn-save" @click="submitAttendance">Simpan Absensi</button>
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
.page-header { margin-bottom: 32px; }

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

.subtitle {
  color: #64748b;
  font-size: 14px;
  margin-top: 4px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
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

.stat-icon.blue { background: #dbeafe; color: #2563eb; }
.stat-icon.green { background: #dcfce7; color: #16a34a; }
.stat-icon.orange { background: #fed7aa; color: #ea580c; }
.stat-icon.purple { background: #f3e8ff; color: #9333ea; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 13px; color: #64748b; }

/* Week Navigation */
.week-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover { background: #f8fafc; }
.nav-btn svg { width: 18px; height: 18px; color: #475569; }

.week-range {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  min-width: 180px;
  text-align: center;
}

.today-btn {
  padding: 10px 20px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.today-btn:hover { background: #0a4568; }

/* Day Cards */
.day-cards {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

.day-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}

.day-card:hover { border-color: #94a3b8; }

.day-card.active {
  background: #0d5782;
  border-color: #0d5782;
  color: white;
}

.day-card.today:not(.active) {
  background: #ecfdf5;
  border-color: #10b981;
}

.day-card.has-schedule:not(.active):not(.today) {
  border-color: #93c5fd;
  background: #eff6ff;
}

.day-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
  margin-bottom: 4px;
}

.day-num {
  display: block;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.day-count {
  display: block;
  font-size: 11px;
  margin-top: 6px;
  opacity: 0.8;
}

.day-count.empty { opacity: 0.4; }

/* Selected Day Header */
.selected-day-header {
  background: linear-gradient(135deg, #0d5782 0%, #1e88e5 100%);
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 24px;
  color: white;
}

.day-info h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.day-info p {
  font-size: 14px;
  opacity: 0.9;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-input input {
  width: 100%;
  padding: 12px 12px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
}

.search-input input:focus {
  outline: none;
  border-color: #0d5782;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  background: white;
  min-width: 150px;
}

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

/* Class Grid */
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.class-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s, transform 0.2s;
}

.class-card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.time-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #0d5782;
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.time-tag svg { width: 14px; height: 14px; }

.status-tag {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.status-tag.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-tag.done {
  background: #dcfce7;
  color: #16a34a;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.card-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}

.card-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.card-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.card-meta svg { width: 14px; height: 14px; }

.btn-action {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-action:hover { background: #0a4568; }
.btn-action.completed { background: #16a34a; }
.btn-action svg { width: 18px; height: 18px; }

/* Empty State */
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 60px;
  text-align: center;
  border: 2px dashed #e2e8f0;
}

.empty-state svg {
  width: 80px;
  height: 80px;
  color: #cbd5e1;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.empty-state p {
  font-size: 14px;
  color: #64748b;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-box {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.close-btn {
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

.close-btn:hover { background: #e2e8f0; }

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.modal-header p {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
}

.modal-tags {
  display: flex;
  gap: 8px;
}

.tag {
  padding: 4px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 12px;
  color: #475569;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.quick-btns {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.quick-btns button {
  flex: 1;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.quick-btns button:hover { background: #f8fafc; }

.student-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 20px;
}

.student-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.student-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #0d5782;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.status-btns {
  display: flex;
  gap: 6px;
}

.status-btns button {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.status-btns button.active:nth-child(1) { background: #22c55e; color: white; border-color: #22c55e; }
.status-btns button.active:nth-child(2) { background: #ef4444; color: white; border-color: #ef4444; }
.status-btns button.active:nth-child(3) { background: #f59e0b; color: white; border-color: #f59e0b; }
.status-btns button.active:nth-child(4) { background: #8b5cf6; color: white; border-color: #8b5cf6; }

.summary-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.summary-item {
  text-align: center;
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
}

.summary-item.green { background: #dcfce7; color: #16a34a; }
.summary-item.red { background: #fee2e2; color: #dc2626; }
.summary-item.yellow { background: #fef3c7; color: #d97706; }
.summary-item.purple { background: #f3e8ff; color: #7c3aed; }

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  flex: 2;
  padding: 12px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover { background: #0a4568; }

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .day-cards { overflow-x: auto; }
}

@media (max-width: 768px) {
  .main { padding: 16px; }
  .stats-grid { grid-template-columns: 1fr; }
  .class-grid { grid-template-columns: 1fr; }
  .day-cards { gap: 8px; }
  .day-card { padding: 12px 8px; }
  .day-num { font-size: 20px; }
  .filter-bar { flex-direction: column; }
  .search-input { max-width: 100%; }
  .summary-row { grid-template-columns: repeat(2, 1fr); }
}
</style>
