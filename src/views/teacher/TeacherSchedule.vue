<script setup>
import TeacherSidebar from '@/components/TeacherSidebar.vue'
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTeacherData } from '@/composables/useTeacherData'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const isOwner = computed(() => route.path.startsWith('/owner'))

const { loading, schedule, lesPlace, fetchTeacherSchedule, fetchTeacherProfile } = useTeacherData()

// View mode: 'week' or 'list'
const viewMode = ref('week')

// Modal state
const showModal = ref(false)
const selectedClass = ref(null)
const meetingLink = ref('')
const savingLink = ref(false)

// Notification state
const notification = ref({ show: false, type: '', message: '' })

function showNotification(type, message) {
  notification.value = { show: true, type, message }
  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.value.show = false
  }, 3000)
}

async function openClassDetail(item) {
  selectedClass.value = item
  meetingLink.value = item.meeting_url || ''
  showModal.value = true
}

async function updateMeetingLink() {
  if (!selectedClass.value) return
  
  savingLink.value = true
  try {
    const { error } = await supabase
      .from('programs')
      .update({ meeting_url: meetingLink.value })
      .eq('id', selectedClass.value.program_id)
      
    if (error) throw error
    
    // Update local data
    const idx = schedule.value.findIndex(s => s.id === selectedClass.value.id)
    if (idx !== -1) {
      schedule.value[idx].meeting_url = meetingLink.value
    }
    
    // Also update all items with same program_id
    schedule.value.forEach(s => {
      if (s.program_id === selectedClass.value.program_id) {
        s.meeting_url = meetingLink.value
      }
    })
    
    showModal.value = false
    showNotification('success', 'Link meeting berhasil disimpan')
  } catch (err) {
    console.error('Error updating link:', err)
    showNotification('error', 'Gagal menyimpan link')
  } finally {
    savingLink.value = false
  }
}


// Current week date
const currentWeekStart = ref(getWeekStart(new Date()))

const selectedDay = ref(new Date().getDay() || 7)
const days = [
  { short: 'Sen', full: 'Senin', index: 1 },
  { short: 'Sel', full: 'Selasa', index: 2 },
  { short: 'Rab', full: 'Rabu', index: 3 },
  { short: 'Kam', full: 'Kamis', index: 4 },
  { short: 'Jum', full: 'Jumat', index: 5 },
  { short: 'Sab', full: 'Sabtu', index: 6 },
  { short: 'Min', full: 'Minggu', index: 7 },
]

// Stats
const weeklyStats = computed(() => {
  const totalClasses = schedule.value.length
  const todayClasses = schedule.value.filter(s => s.day === (new Date().getDay() || 7)).length
  const totalStudents = schedule.value.reduce((sum, s) => sum + (s.students || s.capacity || 0), 0)
  const uniqueSubjects = [...new Set(schedule.value.map(s => s.subject))].length
  
  return { totalClasses, todayClasses, totalStudents, uniqueSubjects }
})

const filteredSchedule = computed(() => {
  return schedule.value.filter(s => s.day === selectedDay.value).sort((a, b) => {
    // Sort by time
    const timeA = a.time?.split(' - ')[0] || '00:00'
    const timeB = b.time?.split(' - ')[0] || '00:00'
    return timeA.localeCompare(timeB)
  })
})

// Get schedule for a specific day (for week view)
function getScheduleForDay(dayIndex) {
  return schedule.value.filter(s => s.day === dayIndex).sort((a, b) => {
    const timeA = a.time?.split(' - ')[0] || '00:00'
    const timeB = b.time?.split(' - ')[0] || '00:00'
    return timeA.localeCompare(timeB)
  })
}

// Get week dates
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

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

function formatDayDate(date) {
  return date.getDate()
}

function isToday(date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isSelected(dayIndex) {
  return selectedDay.value === dayIndex
}

function selectDay(dayIndex) {
  selectedDay.value = dayIndex
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
  selectedDay.value = new Date().getDay() || 7
}

function formatWeekRange() {
  const start = new Date(currentWeekStart.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  
  return `${startStr} - ${endStr}`
}

function getTimeSlot(time) {
  if (!time) return ''
  const start = time.split(' - ')[0]
  return start
}

function getSubjectColor(subject) {
  const colors = {
    'Matematika': { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    'Fisika': { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
    'Kimia': { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' },
    'Biologi': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    'Bahasa Inggris': { bg: '#fae8ff', text: '#a21caf', border: '#f5d0fe' },
    'Bahasa Indonesia': { bg: '#fce7f3', text: '#be185d', border: '#fbcfe8' },
  }
  return colors[subject] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
}

function formatScheduleTime(time) {
  if (!time || time === '-') return '-'
  
  // If it's a simple string like "08:00-10:00", return as is
  if (typeof time === 'string' && !time.includes('{') && !time.includes('start')) {
    return time
  }
  
  // If it's an object with start/end
  if (typeof time === 'object') {
    if (time.start && time.end) {
      return `${time.start} - ${time.end}`
    }
    // If it's day:time format
    return Object.entries(time)
      .map(([day, t]) => typeof t === 'object' ? `${t.start} - ${t.end}` : t)
      .join(', ')
  }
  
  return time
}

onMounted(async () => {
  await fetchTeacherProfile()
  await fetchTeacherSchedule()
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Jadwal Mengajar
          </h1>
          <p class="subtitle">Kelola dan pantau jadwal mengajar Anda</p>
        </div>
      </header>

      <!-- Notification Banner -->
      <div v-if="notification.show" :class="['notification-banner', notification.type]">
        <svg v-if="notification.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>{{ notification.message }}</span>
        <button class="close-notification" @click="notification.show = false">&times;</button>
      </div>

      <!-- Stats Cards -->
      <section class="stats-row">
        <div class="stat-card blue">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ weeklyStats.totalClasses }}</span>
            <span class="stat-label">Total Kelas/Minggu</span>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ weeklyStats.todayClasses }}</span>
            <span class="stat-label">Kelas Hari Ini</span>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ weeklyStats.totalStudents }}</span>
            <span class="stat-label">Total Kapasitas Siswa</span>
          </div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ weeklyStats.uniqueSubjects }}</span>
            <span class="stat-label">Mata Pelajaran</span>
          </div>
        </div>
      </section>

      <!-- Calendar Controls -->
      <section class="calendar-controls">
        <div class="week-navigation">
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
        </div>
        <div class="view-toggle">
          <button :class="['toggle-btn', { active: viewMode === 'week' }]" @click="viewMode = 'week'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Mingguan
          </button>
          <button :class="['toggle-btn', { active: viewMode === 'list' }]" @click="viewMode = 'list'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Harian
          </button>
        </div>
      </section>

      <!-- Week View -->
      <section v-if="viewMode === 'week'" class="week-view">
        <div class="week-header">
          <div v-for="(day, idx) in days" :key="day.index" 
               :class="['day-column-header', { today: isToday(weekDates[idx]), selected: isSelected(day.index) }]"
               @click="selectDay(day.index)">
            <span class="day-name">{{ day.short }}</span>
            <span class="day-date">{{ formatDayDate(weekDates[idx]) }}</span>
            <span class="class-count" v-if="getScheduleForDay(day.index).length">
              {{ getScheduleForDay(day.index).length }} kelas
            </span>
          </div>
        </div>
        <div class="week-body">
          <div v-for="day in days" :key="day.index" 
               :class="['day-column', { today: day.index === (new Date().getDay() || 7) }]">
            <template v-if="getScheduleForDay(day.index).length">
              <div v-for="item in getScheduleForDay(day.index)" :key="item.id" 
                   class="week-schedule-item"
                   :class="{ 'online': item.type === 'Online' }"
                   :style="{ borderLeftColor: getSubjectColor(item.subject).text }"
                   @click="openClassDetail(item)"
                   style="cursor: pointer;">
                <span class="item-time">{{ formatScheduleTime(item.time) }}</span>
                <h4 class="item-subject">{{ item.subject }}</h4>
                <p class="item-class">{{ item.class }}</p>
                <div class="item-students" v-if="item.students || item.capacity">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                  {{ item.students || item.capacity }} siswa
                </div>
                <!-- Google Meet Link -->
                <a v-if="item.meeting_url" 
                   :href="item.meeting_url" 
                   target="_blank" 
                   class="meet-link" 
                   @click.stop>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15.75 6.75a3 3 0 11-6 0 3 3 0 016 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                    <path d="M18 16.08V16a3 3 0 00-6 0v.08" />
                  </svg>
                  Meet
                </a>
              </div>
            </template>
            <div v-else class="no-class">
              <span>Tidak ada kelas</span>
            </div>
          </div>
        </div>
      </section>

      <!-- List View (Daily Detail) -->
      <section v-else class="list-view">
        <!-- Day Tabs -->
        <div class="day-tabs">
          <button v-for="day in days.slice(0, 6)" :key="day.index" 
                  :class="['day-tab', { active: selectedDay === day.index, 'has-class': getScheduleForDay(day.index).length > 0 }]"
                  @click="selectDay(day.index)">
            <span class="tab-day">{{ day.full }}</span>
            <span class="tab-count" v-if="getScheduleForDay(day.index).length">
              {{ getScheduleForDay(day.index).length }}
            </span>
          </button>
        </div>

        <!-- Schedule Cards -->
        <div class="schedule-list" v-if="filteredSchedule.length">
          <div v-for="(item, idx) in filteredSchedule" :key="idx" class="schedule-card" @click="openClassDetail(item)" style="cursor: pointer;">
            <div class="card-timeline">
              <div class="timeline-dot" :style="{ background: getSubjectColor(item.subject).text }"></div>
              <div class="timeline-line" v-if="idx < filteredSchedule.length - 1"></div>
            </div>
            
            <div class="card-main">
              <div class="card-header">
                <div class="time-slot">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{{ item.time }}</span>
                </div>
                <div class="subject-badge" :style="{ 
                  background: getSubjectColor(item.subject).bg, 
                  color: getSubjectColor(item.subject).text,
                  borderColor: getSubjectColor(item.subject).border
                }">
                  {{ item.subject }}
                </div>
              </div>

              <div class="card-body">
                <h3>{{ item.class }}</h3>
                <div class="card-details">
                  <div class="detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{{ item.les_place || lesPlace?.name || '-' }}</span>
                  </div>
                  <div class="detail-item" v-if="item.room && item.room !== '-'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    <span>{{ item.room }}</span>
                  </div>
                  <div class="detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <span>{{ item.students || item.capacity || 0 }} siswa</span>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <router-link :to="isOwner ? '/owner/attendance' : '/teacher/attendance'" class="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Absensi
                </router-link>
                <router-link :to="isOwner ? '/owner/materials' : '/teacher/materials'" class="btn btn-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Materi
                </router-link>
                <router-link :to="isOwner ? '/owner/grades' : '/teacher/grades'" class="btn btn-outline">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                    <path d="M4 2h16v20H4z"/>
                  </svg>
                  Nilai
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-illustration">
            <svg viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" fill="#f1f5f9"/>
              <rect x="60" y="50" width="80" height="100" rx="8" fill="white" stroke="#e2e8f0" stroke-width="2"/>
              <line x1="70" y1="70" x2="130" y2="70" stroke="#e2e8f0" stroke-width="2"/>
              <line x1="70" y1="90" x2="110" y2="90" stroke="#e2e8f0" stroke-width="2"/>
              <line x1="70" y1="110" x2="120" y2="110" stroke="#e2e8f0" stroke-width="2"/>
              <circle cx="140" cy="130" r="25" fill="#0d5782" opacity="0.1"/>
              <path d="M140 120v20M130 130h20" stroke="#0d5782" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Tidak ada jadwal</h3>
          <p>Tidak ada kelas pada hari {{ days.find(d => d.index === selectedDay)?.full }}</p>
        </div>
      </section>
    </main>

    <!-- Class Detail Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Detail Kelas</h2>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        
        <div class="modal-body" v-if="selectedClass">
          <div class="detail-row">
            <label>Mata Pelajaran</label>
            <div class="detail-value font-bold">{{ selectedClass.subject }}</div>
          </div>
          <div class="detail-row">
            <label>Program</label>
            <div class="detail-value">{{ selectedClass.program_name }}</div>
          </div>
          <div class="detail-row">
            <label>Waktu</label>
            <div class="detail-value">{{ selectedClass.time }}</div>
          </div>
          <div class="detail-row">
            <label>Tipe Kelas</label>
            <div class="detail-value">
              <span :class="['type-badge', selectedClass.type.toLowerCase()]">{{ selectedClass.type }}</span>
            </div>
          </div>

          <!-- Meeting Link Input (Only for Online) -->
          <div class="link-section" v-if="['online', 'hybrid'].includes(selectedClass.type?.toLowerCase())">
            <label>Link Google Meet</label>
            <div class="input-group">
              <input 
                v-model="meetingLink" 
                type="url" 
                placeholder="https://meet.google.com/..."
                class="link-input"
              >
            </div>
            <p class="help-text">Link ini akan muncul di dashboard siswa saat jadwal kelas berlangsung.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" @click="showModal = false">Tutup</button>
          <button 
            v-if="['online', 'hybrid'].includes(selectedClass?.type?.toLowerCase())"
            class="btn-save" 
            :disabled="savingLink"
            @click="updateMeetingLink"
          >
            {{ savingLink ? 'Menyimpan...' : 'Simpan Link' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Notification Banner */
.notification-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 500;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.notification-banner svg { width: 20px; height: 20px; flex-shrink: 0; }
.notification-banner.success { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
.notification-banner.error { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
.close-notification { 
  margin-left: auto; 
  background: none; 
  border: none; 
  font-size: 20px; 
  cursor: pointer; 
  opacity: 0.6;
  color: inherit;
}
.close-notification:hover { opacity: 1; }

/* Meet Link in Schedule Card */
.meet-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #16a34a;
  color: white;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  margin-top: 8px;
  transition: all 0.2s;
}
.meet-link svg { width: 12px; height: 12px; }
.meet-link:hover { background: #15803d; transform: translateY(-1px); }

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }

.detail-row { margin-bottom: 16px; }
.detail-row label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
.detail-value { font-size: 14px; color: #0f172a; }
.font-bold { font-weight: 600; }

.type-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
.type-badge.online { background: #dcfce7; color: #16a34a; }
.type-badge.offline { background: #f1f5f9; color: #64748b; }
.type-badge.hybrid { background: #e0f2fe; color: #0284c7; }

.link-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.link-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.help-text { font-size: 12px; color: #94a3b8; margin-top: 6px; }

.modal-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
}

.btn-save {
  padding: 8px 16px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

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
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 16px;
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

.les-place-badge {
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

.les-place-badge svg { width: 18px; height: 18px; }

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
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg { width: 24px; height: 24px; }

.stat-card.blue .stat-icon { background: #e0f2fe; color: #0284c7; }
.stat-card.green .stat-icon { background: #dcfce7; color: #16a34a; }
.stat-card.purple .stat-icon { background: #f3e8ff; color: #9333ea; }
.stat-card.orange .stat-icon { background: #ffedd5; color: #ea580c; }

.stat-info { display: flex; flex-direction: column; }

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* Calendar Controls */
.calendar-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.week-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.nav-btn:hover { background: #f8fafc; border-color: #0d5782; }
.nav-btn svg { width: 18px; height: 18px; color: #64748b; }

.week-range {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  min-width: 180px;
  text-align: center;
}

.today-btn {
  padding: 8px 16px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.today-btn:hover { background: #094160; }

.view-toggle {
  display: flex;
  gap: 8px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn svg { width: 16px; height: 16px; }
.toggle-btn.active { background: white; color: #0d5782; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.toggle-btn:hover:not(.active) { color: #0f172a; }

/* Week View */
.week-view {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid #e2e8f0;
}

.day-column-header {
  padding: 16px 8px;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s;
  border-right: 1px solid #f1f5f9;
}

.day-column-header:last-child { border-right: none; }
.day-column-header:hover { background: #f8fafc; }
.day-column-header.today { background: #eff6ff; }
.day-column-header.selected { background: #e0f2fe; }

.day-name {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.day-date {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 4px 0;
}

.day-column-header.today .day-date { color: #0d5782; }

.class-count {
  display: inline-block;
  background: #0d5782;
  color: white;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.week-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 300px;
}

.day-column {
  padding: 12px 8px;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-column:last-child { border-right: none; }
.day-column.today { background: #fafafa; }

.week-schedule-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px;
  border-left: 3px solid;
  transition: transform 0.2s;
}

.week-schedule-item:hover { transform: translateX(2px); }

.item-time {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.item-subject {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.item-class {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.item-students {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #94a3b8;
}

.item-students svg { width: 12px; height: 12px; }

.no-class {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #cbd5e1;
  font-size: 12px;
}

/* List View */
.day-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.day-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.day-tab:hover { border-color: #0d5782; color: #0d5782; }
.day-tab.active { background: #0d5782; border-color: #0d5782; color: white; }
.day-tab.has-class:not(.active) { border-color: #bfdbfe; background: #eff6ff; }

.tab-day { font-size: 14px; }

.tab-count {
  background: rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.day-tab.active .tab-count { background: rgba(255,255,255,0.3); }
.day-tab:not(.active) .tab-count { background: #0d5782; color: white; }

/* Schedule List */
.schedule-list {
  display: flex;
  flex-direction: column;
}

.schedule-card {
  display: flex;
  gap: 20px;
  padding-bottom: 24px;
}

.card-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
}

.timeline-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: #e2e8f0;
  margin-top: 8px;
}

.card-main {
  flex: 1;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.card-main:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.time-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0d5782;
}

.time-slot svg { width: 18px; height: 18px; }

.subject-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid;
}

.card-body h3 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}

.card-details {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #64748b;
}

.detail-item svg { width: 18px; height: 18px; opacity: 0.7; }

.card-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  position: relative;
  z-index: 10;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  border: none;
  position: relative;
  z-index: 10;
}

.btn svg { width: 16px; height: 16px; pointer-events: none; }

.btn-primary { background: #0d5782; color: white; }
.btn-primary:hover { background: #094160; transform: translateY(-1px); }

.btn-secondary { background: #e0f2fe; color: #0d5782; }
.btn-secondary:hover { background: #bfdbfe; transform: translateY(-1px); }

.btn-outline { background: white; color: #64748b; border: 1px solid #e2e8f0; }
.btn-outline:hover { border-color: #0d5782; color: #0d5782; transform: translateY(-1px); }

/* Empty State */
.empty-state {
  background: white;
  border-radius: 16px;
  padding: 60px 20px;
  text-align: center;
  border: 1px dashed #e2e8f0;
}

.empty-illustration { margin-bottom: 20px; }
.empty-illustration svg { width: 160px; height: 160px; }

.empty-state h3 { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
.empty-state p { font-size: 14px; color: #64748b; }

/* Responsive */
@media (max-width: 1200px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .week-header, .week-body { grid-template-columns: repeat(7, minmax(80px, 1fr)); overflow-x: auto; }
}

@media (max-width: 768px) {
  .main { padding: 16px; }
  .stats-row { grid-template-columns: 1fr; }
  .calendar-controls { flex-direction: column; align-items: stretch; }
  .week-navigation { justify-content: center; }
  .view-toggle { justify-content: center; }
  .page-header { flex-direction: column; }
  .card-actions { flex-direction: column; }
  .btn { justify-content: center; }
}
</style>
