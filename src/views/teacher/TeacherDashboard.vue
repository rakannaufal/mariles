<script setup>
import { ref, computed, onMounted } from 'vue'
import StatCard from '@/components/StatCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useTeacherData } from '@/composables/useTeacherData'

const authStore = useAuthStore()
const { 
  loading, 
  stats, 
  students,
  schedule,
  attendanceSessions,
  grades,
  lesPlace,
  isProfileComplete,
  fetchTeacherProfile,
  fetchTeacherStats, 
  fetchTeacherSchedule,
  fetchTeacherStudents,
  fetchAttendanceSessions,
  fetchStudentGrades,
  fetchRecentReviews,
  getTodaySchedule 
} = useTeacherData()

const todaySchedule = ref([])
const recentReviews = ref([])

// Chart Data
const weeklyClasses = ref([])
const gradeDistribution = ref([])
const attendanceData = ref([])

// Monthly performance data
const monthlyPerformance = ref([
  { month: 'Jan', classes: 0, attendance: 0 },
  { month: 'Feb', classes: 0, attendance: 0 },
  { month: 'Mar', classes: 0, attendance: 0 },
  { month: 'Apr', classes: 0, attendance: 0 },
  { month: 'Mei', classes: 0, attendance: 0 },
  { month: 'Jun', classes: 0, attendance: 0 },
])

// Recent activities
const recentActivities = ref([])

onMounted(async () => {
  await fetchTeacherProfile()
  await fetchTeacherStats()
  await fetchTeacherSchedule()
  await fetchTeacherStudents()
  await fetchAttendanceSessions()
  await fetchStudentGrades()
  
  todaySchedule.value = getTodaySchedule()
  recentReviews.value = await fetchRecentReviews()
  
  // Process chart data
  processChartData()
  processRecentActivities()
})

function processChartData() {
  // Weekly classes data (from schedule)
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  weeklyClasses.value = days.map((day, idx) => ({
    day,
    count: getTodayScheduleByDay(idx + 1).length
  }))
  
  // Grade distribution
  const gradeRanges = { A: 0, B: 0, C: 0, D: 0 }
  grades.value.forEach(g => {
    if (g.grade >= 90) gradeRanges.A++
    else if (g.grade >= 80) gradeRanges.B++
    else if (g.grade >= 70) gradeRanges.C++
    else gradeRanges.D++
  })
  gradeDistribution.value = Object.entries(gradeRanges).map(([grade, count]) => ({
    grade,
    count,
    color: grade === 'A' ? '#22c55e' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : '#ef4444'
  }))
  
  // Calculate totals for percentage
  const totalGrades = grades.value.length || 1
  gradeDistribution.value = gradeDistribution.value.map(g => ({
    ...g,
    percentage: Math.round((g.count / totalGrades) * 100)
  }))
  
  // Attendance data
  let present = 0, absent = 0, late = 0
  attendanceSessions.value.forEach(session => {
    present += session.present || 0
    absent += (session.total || 0) - (session.present || 0)
  })
  attendanceData.value = [
    { label: 'Hadir', value: present, color: '#22c55e' },
    { label: 'Tidak Hadir', value: absent, color: '#ef4444' },
    { label: 'Terlambat', value: late, color: '#f59e0b' }
  ]
  
  // Monthly performance (simulated based on current stats)
  const baseClasses = Math.floor((stats.value.totalClasses || 0) / 6)
  monthlyPerformance.value = monthlyPerformance.value.map((m, i) => ({
    ...m,
    classes: Math.max(0, baseClasses + Math.floor(Math.random() * 5) - 2),
    attendance: Math.max(70, Math.min(100, (stats.value.attendanceRate || 85) + Math.floor(Math.random() * 10) - 5))
  }))
}

function processRecentActivities() {
  const activities = []
  
  // Add grade entries
  grades.value.slice(0, 3).forEach(g => {
    activities.push({
      type: 'grade',
      icon: '📝',
      title: `Input nilai untuk ${g.name}`,
      subtitle: `${g.class} - Nilai: ${g.grade}`,
      time: 'Baru saja'
    })
  })
  
  // Add attendance entries
  attendanceSessions.value.slice(0, 2).forEach(s => {
    activities.push({
      type: 'attendance',
      icon: '✅',
      title: `Absensi ${s.class}`,
      subtitle: `${s.present}/${s.total} siswa hadir`,
      time: s.date
    })
  })
  
  recentActivities.value = activities.slice(0, 5)
}

function getTodayScheduleByDay(dayIndex) {
  return schedule.value.filter(s => s.day === dayIndex)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Selamat Pagi'
  if (hour < 17) return 'Selamat Siang'
  return 'Selamat Malam'
}

const currentDate = computed(() => {
  return new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <!-- Header with welcome and date -->
      <header class="header">
        <div class="header-content">
          <div class="welcome-section">
            <h1>{{ getGreeting() }}, {{ authStore.userProfile?.name || 'Guru' }}! 👋</h1>
            <p class="date-text">{{ currentDate }}</p>
          </div>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Memuat data...</p>
      </div>

      <template v-else>
        <!-- Profile Incomplete Alert -->
        <div v-if="!isProfileComplete" class="profile-alert">
          <div class="alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="alert-content">
            <h3>Lengkapi Profil Anda</h3>
            <p>Profil Anda belum lengkap. Lengkapi profil untuk dapat mulai mengajar dan tampil di halaman tempat les.</p>
          </div>
          <router-link to="/teacher/profile" class="alert-btn">Lengkapi Profil →</router-link>
        </div>
        <!-- Stats Overview Cards -->
        <!-- Stats Overview Cards -->
        <section class="stats-section">
          <StatCard 
              label="Total Siswa" 
              :value="stats.totalStudents" 
              icon-color="blue"
          >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </template>
              <template #extra>
                <div class="stat-trend up">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
              </template>
          </StatCard>
          
          <StatCard 
              label="Kelas Hari Ini" 
              :value="stats.classesToday" 
              icon-color="green"
          >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </template>
          </StatCard>
          
          <StatCard 
              label="Tingkat Kehadiran" 
              :value="stats.attendanceRate + '%'" 
              icon-color="yellow"
          >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </template>
          </StatCard>
          
          <StatCard 
              label="Rating" 
              :value="stats.averageRating || '0'" 
              icon-color="purple"
          >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </template>
              <template #extra>
                <div class="rating-stars" v-if="stats.averageRating">
                  <span v-for="i in 5" :key="i" :class="{ filled: i <= Math.round(stats.averageRating) }">★</span>
                </div>
              </template>
          </StatCard>
        </section>

        <!-- Main Content Grid -->
        <div class="content-grid">
          <!-- Left Column -->
          <div class="left-column">
            <!-- Today's Schedule -->
            <section class="card schedule-section">
              <div class="card-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Jadwal Hari Ini
                </h2>
                <router-link to="/teacher/schedule" class="view-all-link">Lihat Semua →</router-link>
              </div>
              
              <div class="schedule-list" v-if="todaySchedule.length > 0">
                <div v-for="(item, idx) in todaySchedule" :key="idx" class="schedule-item">
                  <div class="schedule-time">
                    <span class="time">{{ item.time }}</span>
                  </div>
                  <div class="schedule-details">
                    <h4>{{ item.subject }}</h4>
                    <p>{{ item.class }}</p>
                  </div>
                  <div class="schedule-meta">
                    <span class="student-count">{{ item.students || 0 }} siswa</span>
                    <router-link to="/teacher/attendance" class="btn-sm">Absensi</router-link>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state-mini">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>Tidak ada kelas hari ini</p>
              </div>
            </section>

            <!-- Weekly Classes Chart -->
            <section class="card chart-section">
              <div class="card-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  Jadwal Kelas Mingguan
                </h2>
              </div>
              <div class="bar-chart">
                <div v-for="item in weeklyClasses" :key="item.day" class="bar-item">
                  <div class="bar-container">
                    <div class="bar" :style="{ height: Math.max(10, item.count * 30) + 'px' }">
                      <span class="bar-value">{{ item.count }}</span>
                    </div>
                  </div>
                  <span class="bar-label">{{ item.day }}</span>
                </div>
              </div>
            </section>

            <!-- Monthly Performance Chart -->
            <section class="card chart-section">
              <div class="card-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  Performa Bulanan
                </h2>
              </div>
              <div class="line-chart">
                <div class="chart-area">
                  <svg viewBox="0 0 350 120" class="chart-svg">
                    <!-- Grid lines -->
                    <line x1="0" y1="30" x2="350" y2="30" stroke="#e2e8f0" stroke-dasharray="4"/>
                    <line x1="0" y1="60" x2="350" y2="60" stroke="#e2e8f0" stroke-dasharray="4"/>
                    <line x1="0" y1="90" x2="350" y2="90" stroke="#e2e8f0" stroke-dasharray="4"/>
                    
                    <!-- Attendance line (green) -->
                    <polyline
                      :points="monthlyPerformance.map((m, i) => `${i * 60 + 30},${120 - m.attendance}`).join(' ')"
                      fill="none"
                      stroke="#22c55e"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    
                    <!-- Classes line (blue) -->
                    <polyline
                      :points="monthlyPerformance.map((m, i) => `${i * 60 + 30},${120 - m.classes * 4}`).join(' ')"
                      fill="none"
                      stroke="#3b82f6"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    
                    <!-- Data points -->
                    <g v-for="(m, i) in monthlyPerformance" :key="i">
                      <circle :cx="i * 60 + 30" :cy="120 - m.attendance" r="4" fill="#22c55e"/>
                      <circle :cx="i * 60 + 30" :cy="120 - m.classes * 4" r="4" fill="#3b82f6"/>
                    </g>
                  </svg>
                </div>
                <div class="chart-labels">
                  <span v-for="m in monthlyPerformance" :key="m.month">{{ m.month }}</span>
                </div>
                <div class="chart-legend">
                  <span class="legend-item"><span class="dot blue"></span> Kelas</span>
                  <span class="legend-item"><span class="dot green"></span> Kehadiran (%)</span>
                </div>
              </div>
            </section>
          </div>

          <!-- Right Column -->
          <div class="right-column">
            <!-- Grade Distribution -->
            <section class="card">
              <div class="card-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  Distribusi Nilai
                </h2>
              </div>
              <div class="grade-distribution">
                <div v-for="item in gradeDistribution" :key="item.grade" class="grade-bar-row">
                  <span class="grade-label">{{ item.grade }}</span>
                  <div class="grade-bar-container">
                    <div class="grade-bar" :style="{ width: item.percentage + '%', background: item.color }"></div>
                  </div>
                  <span class="grade-count">{{ item.count }} ({{ item.percentage }}%)</span>
                </div>
              </div>
            </section>

            <!-- Attendance Summary Donut -->
            <section class="card">
              <div class="card-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Ringkasan Kehadiran
                </h2>
              </div>
              <div class="attendance-summary">
                <div class="donut-chart">
                  <svg viewBox="0 0 120 120" class="donut">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" stroke-width="12"/>
                    <circle 
                      cx="60" cy="60" r="50" 
                      fill="none" 
                      stroke="#22c55e" 
                      stroke-width="12"
                      :stroke-dasharray="`${(stats.attendanceRate || 0) * 3.14} 314`"
                      stroke-linecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    <text x="60" y="55" text-anchor="middle" class="donut-value">{{ stats.attendanceRate || 0 }}%</text>
                    <text x="60" y="72" text-anchor="middle" class="donut-label">Kehadiran</text>
                  </svg>
                </div>
                <div class="attendance-breakdown">
                  <div v-for="item in attendanceData" :key="item.label" class="attendance-item">
                    <span class="attendance-dot" :style="{ background: item.color }"></span>
                    <span class="attendance-label">{{ item.label }}</span>
                    <span class="attendance-value">{{ item.value }}</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Recent Reviews -->
            <section class="card">
              <div class="card-header">
                <h2>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Review Terbaru
                </h2>
                <router-link to="/teacher/performance" class="view-all-link">Lihat Semua →</router-link>
              </div>
              <div class="reviews-list" v-if="recentReviews.length > 0">
                <div v-for="review in recentReviews.slice(0, 3)" :key="review.id" class="review-item">
                  <div class="review-header">
                    <span class="reviewer-name">{{ review.student }}</span>
                    <div class="review-stars">
                      <span v-for="i in 5" :key="i" :class="{ filled: i <= review.rating }">★</span>
                    </div>
                  </div>
                  <p class="review-comment">{{ review.comment || 'Tidak ada komentar' }}</p>
                  <span class="review-date">{{ formatDate(review.date) }}</span>
                </div>
              </div>
              <div v-else class="empty-state-mini">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <p>Belum ada review</p>
              </div>
            </section>

            <!-- Quick Actions -->
            <section class="card quick-actions">
              <h2>Aksi Cepat</h2>
              <div class="action-buttons">
                <router-link to="/teacher/attendance" class="action-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Absensi
                </router-link>
                <router-link to="/teacher/grades" class="action-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Input Nilai
                </router-link>
                <router-link to="/teacher/materials" class="action-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Materi
                </router-link>
                <router-link to="/teacher/students" class="action-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  Daftar Siswa
                </router-link>
              </div>
            </section>
          </div>
        </div>
      </template>
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
.header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}

.welcome-section h1 {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.date-text {
  color: #64748b;
  font-size: 14px;
}

.les-place-info { display: flex; align-items: center; }

.les-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #0d5782, #1e88e5);
  color: white;
  padding: 10px 20px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(13, 87, 130, 0.3);
}

.les-badge svg { width: 18px; height: 18px; }

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #0d5782;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Stats Section */
/* Dashboard Stat Cards - Compact Inline */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
  width: 100%;
}
/* StatCard styling handled by component */

.stat-icon svg { width: 26px; height: 26px; }

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.stat-trend {
  position: absolute;
  top: 16px;
  right: 16px;
}

.stat-trend svg { width: 20px; height: 20px; }
.stat-trend.up { color: #22c55e; }
.stat-trend.down { color: #ef4444; }

.rating-stars {
  display: flex;
  gap: 2px;
  font-size: 14px;
  color: #e2e8f0;
}

.rating-stars .filled { color: #f59e0b; }

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Cards */
.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-header h2 svg { width: 20px; height: 20px; color: #0d5782; }

.view-all-link {
  font-size: 13px;
  color: #0d5782;
  text-decoration: none;
  font-weight: 500;
}

.view-all-link:hover { text-decoration: underline; }

/* Schedule List */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  transition: background 0.2s;
}

.schedule-item:hover { background: #f1f5f9; }

.schedule-time {
  min-width: 100px;
}

.schedule-time .time {
  font-size: 13px;
  font-weight: 600;
  color: #0d5782;
  background: #e0f2fe;
  padding: 6px 12px;
  border-radius: 6px;
}

.schedule-details {
  flex: 1;
}

.schedule-details h4 {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.schedule-details p {
  font-size: 13px;
  color: #64748b;
}

.schedule-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-count {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 20px;
}

.btn-sm {
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: #0d5782;
  padding: 6px 14px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-sm:hover { background: #094160; }

/* Empty State */
.empty-state-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.empty-state-mini svg {
  width: 40px;
  height: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state-mini p { font-size: 14px; }

/* Bar Chart */
.bar-chart {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 180px;
  padding-top: 20px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.bar-container {
  height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.bar {
  width: 40px;
  background: linear-gradient(180deg, #0d5782, #1e88e5);
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
  min-height: 10px;
  transition: height 0.3s ease;
}

.bar-value {
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.bar-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
}

/* Line Chart */
.line-chart { padding: 10px 0; }

.chart-area {
  height: 120px;
  margin-bottom: 10px;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 20px;
  font-size: 12px;
  color: #64748b;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
}

.legend-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.blue { background: #3b82f6; }
.dot.green { background: #22c55e; }

/* Grade Distribution */
.grade-distribution {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.grade-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grade-label {
  width: 24px;
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
}

.grade-bar-container {
  flex: 1;
  height: 12px;
  background: #f1f5f9;
  border-radius: 6px;
  overflow: hidden;
}

.grade-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.grade-count {
  font-size: 12px;
  color: #64748b;
  min-width: 60px;
  text-align: right;
}

/* Donut Chart */
.attendance-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.donut-chart { width: 140px; height: 140px; }

.donut { width: 100%; height: 100%; }

.donut-value {
  font-size: 24px;
  font-weight: 700;
  fill: #0f172a;
}

.donut-label {
  font-size: 11px;
  fill: #64748b;
}

.attendance-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.attendance-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.attendance-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.attendance-label {
  flex: 1;
  font-size: 13px;
  color: #64748b;
}

.attendance-value {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

/* Reviews */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reviewer-name {
  font-weight: 600;
  font-size: 14px;
  color: #0f172a;
}

.review-stars {
  font-size: 12px;
  color: #e2e8f0;
}

.review-stars .filled { color: #f59e0b; }

.review-comment {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 8px;
}

.review-date {
  font-size: 11px;
  color: #94a3b8;
}

/* Quick Actions */
.quick-actions h2 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 16px;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  background: #f8fafc;
  border-radius: 12px;
  text-decoration: none;
  color: #0f172a;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn svg {
  width: 24px;
  height: 24px;
  color: #0d5782;
}

.action-btn:hover {
  background: #0d5782;
  color: white;
}

.action-btn:hover svg { color: white; }

/* Profile Incomplete Alert */
.profile-alert {
  display: flex;
  align-items: center;
  gap: 20px;
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border: 1px solid #F59E0B;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
}

.alert-icon {
  width: 48px;
  height: 48px;
  background: #F59E0B;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.alert-content {
  flex: 1;
}

.alert-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 4px;
}

.alert-content p {
  font-size: 14px;
  color: #B45309;
  line-height: 1.5;
}

.alert-btn {
  background: #F59E0B;
  color: white;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
}

.alert-btn:hover {
  background: #D97706;
}

/* Responsive */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  .right-column {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  .right-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .main { padding: 16px; }
  .stats-section {
    grid-template-columns: 1fr;
  }
  .header-content {
    flex-direction: column;
  }
  .action-buttons { grid-template-columns: 1fr; }
}
</style>
@media (max-width: 1200px) { .stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .stats { grid-template-columns: 1fr; } }
