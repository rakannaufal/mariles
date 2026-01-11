<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMyClass } from '@/composables/useMyClass'
import { getLevelLabel, getLevelColor, getTypeLabel, getTypeColor, getTypeBgColor } from '@/utils/badgeUtils'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar.vue'
import StatCard from '@/components/StatCard.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const {
  currentCourse,
  materials,
  tests,
  grades,
  attendance,
  exercises,
  reportCard,
  loading,
  fetchCourseDetail,
  fetchMaterials,
  fetchTests,
  fetchGrades,
  fetchAttendance,
  fetchExercises,
  submitExercise,
  fetchReportCard,
  getScheduleDisplay,
  calculateCourseProgress,
  updateMaterialProgress
} = useMyClass()

const reportCardLoaded = ref(false)

const activeTab = ref('jadwal')
const tabsLoading = ref(false)

// Check if class is Online (has materials) vs Offline (jadwal + nilai only)
// Priority: program.class_type (new) → les_place.type (fallback)
const isOnlineClass = computed(() => {
  const p = currentCourse.value?.program
  
  // Use program.class_type if available (new system)
  if (p?.class_type) {
    return p.class_type === 'online'
  }
  
  // Fallback to les_place.type for older programs
  const type = p?.les_place?.type || p?.type
  return type && ['Online', 'online', 'Hybrid', 'hybrid'].includes(type)
})

// Dynamic tabs based on class type
const tabs = computed(() => {
  const allTabs = [
    { id: 'jadwal', label: 'Jadwal', icon: 'calendar' },
    { id: 'modul', label: 'Modul', icon: 'book' },
    { id: 'video', label: 'Video', icon: 'play' },
    { id: 'nilai', label: 'Nilai', icon: 'star' },
    { id: 'quiz', label: 'Quiz', icon: 'question' },
    { id: 'latihan', label: 'Latihan', icon: 'edit' }
  ]
  
  // For Offline classes, only show Jadwal
  if (!isOnlineClass.value) {
    return allTabs.filter(t => ['jadwal'].includes(t.id))
  }
  
  return allTabs
})

// Include all document types (module, PDF, document, etc.)
const modules = computed(() => materials.value.filter(m => 
  m.type === 'module' || m.type === 'document' || m.type === 'pdf' || m.type === 'PDF' || m.type === 'DOC' || !['video'].includes(m.type)
))
const videos = computed(() => materials.value.filter(m => m.type === 'video'))
const scheduleItems = computed(() => getScheduleDisplay(currentCourse.value?.program?.schedule))

const averageGrade = computed(() => {
  return reportCard.value?.final_grade || 0
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
    // Get student_id (table ID) from currentCourse
    let studentId = currentCourse.value?.student_id 
    
    // Fallback if student_id is consumed by relation alias
    if (!studentId && currentCourse.value?.students) {
      studentId = currentCourse.value.students.id || currentCourse.value.students.user_id
    }
    
    if (!studentId) {
      console.error('CRITICAL: Student ID missing from course data!')
       // Try fallback to auth id if we suspect they are same (temporary fix)
       // studentId = authStore.user.id 
    }

    await Promise.all([
      fetchMaterials(programId, studentId),
      fetchTests(programId, studentId, authStore.user.id), // Pass both IDs for legacy data support
      fetchGrades(bookingId),
      fetchAttendance(bookingId),
      fetchExercises(programId, studentId, authStore.user.id), // Pass both IDs for legacy data support
      fetchReportCard(studentId, currentCourse.value.program, authStore.user.id) // Pass both IDs for legacy data support
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

// Upload modal for exercise
const showUploadModal = ref(false)
const selectedExercise = ref(null)
const uploadFile = ref(null)
const uploadNotes = ref('')
const uploading = ref(false)

function openUploadModal(exercise) {
  selectedExercise.value = exercise
  showUploadModal.value = true
  uploadFile.value = null
  uploadNotes.value = ''
}

async function handleExerciseSubmit() {
  if (!uploadFile.value || !selectedExercise.value) return
  
  uploading.value = true
  try {
    // Upload file to storage
    const fileName = `exercise_${selectedExercise.value.id}_${authStore.user.id}_${Date.now()}`
    const { data: fileData, error: uploadErr } = await supabase.storage
      .from('submissions')
      .upload(fileName, uploadFile.value)
    
    if (uploadErr) throw uploadErr
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('submissions')
      .getPublicUrl(fileName)
    
    // Submit to database - use student table ID (not auth ID)
    const studentId = currentCourse.value?.student_id || currentCourse.value?.students?.id
    await submitExercise(
      selectedExercise.value.id,
      studentId,
      urlData.publicUrl,
      uploadNotes.value
    )
    
    // Refresh exercises with proper student ID (and auth ID for legacy support)
    await fetchExercises(currentCourse.value.program.id, studentId, authStore.user.id)
    
    showUploadModal.value = false
    alert('Jawaban berhasil dikirim!')
  } catch (err) {
    console.error('Error submitting exercise:', err)
    alert('Gagal mengirim jawaban: ' + err.message)
  } finally {
    uploading.value = false
  }
}

function handleFileChange(e) {
  uploadFile.value = e.target.files[0]
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

// Check if a material/video has been completed
function isItemCompleted(item) {
  return item.progress?.is_completed || item.progress?.is_read || item.progress?.is_watched
}

// Check if an item is locked (previous item not completed)
function isItemLocked(items, index) {
  if (index === 0) return false // First item is never locked
  const prevItem = items[index - 1]
  return !isItemCompleted(prevItem)
}

// Open material (PDF, document, etc.) and track progress
// Open material (PDF, document, etc.) and track progress
async function openMaterial(material) {
  const contentUrl = material.content || material.video_url || material.url
  
  if (contentUrl) {
    // 1. Optimistic Update (Immediate UI response)
    // Create progress object if it doesn't exist
    if (!material.progress) {
      material.progress = {}
    }
    
    // Mark as completed locally immediately
    material.progress = {
      ...material.progress,
      is_completed: true,
      is_read: true, // for modules
      is_watched: true, // for videos
      progress_percent: 100
    }

    // 2. Open Content
    window.open(contentUrl, '_blank')

    // 3. Update Database in Background
    try {
      // Get student_id from booking
      const studentId = currentCourse.value?.student_id || currentCourse.value?.students?.id
      if (studentId) {
        await updateMaterialProgress(material.id, studentId, {
          is_completed: true,
          progress_percent: 100,
          completed_at: new Date().toISOString()
        })
      }
    } catch (err) {
      console.error('Error tracking progress:', err)
      // Silently fail or revert if strictly needed, but for read status it's usually fine
    }
  } else {
    alert('Materi tidak tersedia. URL materi kosong.')
  }
}

// Open video
function openVideo(video) {
  if (video.video_url) {
    window.open(video.video_url, '_blank')
  } else if (video.content) {
    window.open(video.content, '_blank')
  } else {
    alert('Video tidak tersedia')
  }
}

// Get YouTube thumbnail
function getYouTubeThumbnail(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
    }
  }
  return null
}

// Start quiz
function startQuiz(quiz) {
  if (quiz.scheduleStatus === 'upcoming') {
    alert('Quiz belum dimulai')
    return
  }
  if (quiz.scheduleStatus === 'expired') {
    alert('Quiz sudah berakhir')
    return
  }
  if (quiz.attemptCount >= quiz.max_attempts) {
    alert('Anda sudah mencapai batas percobaan maksimal')
    return
  }
  // Navigate to quiz page
  router.push(`/student/quiz/${quiz.id}`)
  // Navigate to quiz page
  router.push(`/student/quiz/${quiz.id}`)
}

// Online Class Meeting Logic
const showMeetingButton = computed(() => {
  const p = currentCourse.value?.program
  // Only for Online or Hybrid
  if (!p || (p.type !== 'Online' && p.type !== 'Hybrid') || !p.meeting_url) return false
  
  // Check if today matches schedule
  return isClassToday(p.schedule)
})

function isClassToday(schedule) {
  if (!schedule) return false
  const today = new Date()
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const todayName = days[today.getDay()]
  
  if (typeof schedule === 'object') {
     // Format 3: { "day": "Senin", ... }
     if (schedule.day) return schedule.day === todayName
     
     // Format 2: { "start": "...", "end": "..." } (No day specified -> assume daily or handled elsewhere, but for safety let's say true or check context. 'Setiap Hari' logic)
     if (schedule.start && schedule.end && !schedule.day) return true 
     
     // Format 1: { "Senin": "..." }
     return !!schedule[todayName]
  }
  return false
}

function joinMeeting() {
  const url = currentCourse.value?.program?.meeting_url
  if (url) window.open(url, '_blank')
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
                <path d="M19 12H5M12 19l-7-7 7-7"></path>
              </svg>
              Kembali
            </button>
            
            <div class="course-info">
              <div class="course-badges">
                <span class="level-badge" 
                      v-if="currentCourse.program?.level"
                      :style="{ backgroundColor: getLevelColor(currentCourse.program?.level) }">
                  {{ getLevelLabel(currentCourse.program?.level) }}
                </span>
                <span class="type-badge" 
                      :style="{ backgroundColor: getTypeBgColor(currentCourse.program?.les_place?.type || currentCourse.program?.type), color: getTypeColor(currentCourse.program?.les_place?.type || currentCourse.program?.type) }">
                  {{ getTypeLabel(currentCourse.program?.les_place?.type || currentCourse.program?.type) }}
                </span>
              </div>
              <h1 class="course-title">{{ currentCourse.program?.name }}</h1>
              <div class="course-location">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="location-name">{{ currentCourse.program?.les_place?.name }}</span>
                <span class="separator">•</span>
                <span class="location-city">{{ currentCourse.program?.les_place?.city }}</span>
              </div>
              
              <!-- Online Class Button -->
              <div v-if="showMeetingButton" class="mt-4">
                <button @click="joinMeeting" class="join-meet-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 7l-7 5 7 5V7z"></path>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  Gabung Kelas Online
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="container">
          <!-- Stats Overview -->
          <div v-if="isOnlineClass" class="stats-overview">
            <StatCard 
                label="Progress Belajar" 
                :value="calculateCourseProgress() + '%'" 
                icon-color="blue"
            >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </template>
            </StatCard>

            <StatCard 
                label="Rata-rata Nilai" 
                :value="averageGrade ?? '-'" 
                icon-color="purple"
            >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </template>
            </StatCard>

            <StatCard 
                label="Kehadiran" 
                :value="attendanceStats.rate + '%'" 
                icon-color="green"
            >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <polyline points="16 11 18 13 22 9"></polyline>
                  </svg>
                </template>
            </StatCard>
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
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <p>Jadwal belum tersedia</p>
                </div>
                <div v-else class="schedule-list">
                  <div v-for="(item, index) in scheduleItems" :key="index" class="schedule-item">
                    <div class="schedule-day">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {{ item.day }}
                    </div>
                    <div class="schedule-time">{{ item.time }}</div>
                  </div>
                </div>
                
                <!-- Meeting Link Section for Online/Hybrid -->
                <div v-if="currentCourse.program?.meeting_url && ['Online', 'online', 'Hybrid', 'hybrid'].includes(currentCourse.program?.les_place?.type || currentCourse.program?.type)" class="meeting-link-section">
                  <h4 class="meeting-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 7l-7 5 7 5V7z"></path>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    Link Kelas Online
                  </h4>
                  <div class="meeting-link-box">
                    <span class="meeting-url">{{ currentCourse.program.meeting_url }}</span>
                    <button @click="joinMeeting" class="join-meeting-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      Gabung Kelas
                    </button>
                  </div>
                  <p class="meeting-note">
                    Klik tombol "Gabung Kelas" saat jadwal les dimulai
                  </p>
                </div>
                
                <div v-else-if="['Online', 'online', 'Hybrid', 'hybrid'].includes(currentCourse.program?.les_place?.type || currentCourse.program?.type) && !currentCourse.program?.meeting_url" class="meeting-link-section pending">
                  <h4 class="meeting-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 7l-7 5 7 5V7z"></path>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                    Link Kelas Online
                  </h4>
                  <p class="meeting-pending">Link meeting belum tersedia. Guru akan segera menambahkan link.</p>
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
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <p>Belum ada modul tersedia</p>
                </div>
                <div v-else class="materials-list">
                  <div 
                    v-for="(item, index) in modules" 
                    :key="item.id" 
                    class="material-item" 
                    :class="{ 'locked': isItemLocked(modules, index) }"
                    @click="!isItemLocked(modules, index) && openMaterial(item)"
                  >
                    <div class="material-number">{{ index + 1 }}</div>
                    <div class="material-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    </div>
                    <div class="material-info">
                      <h4>
                        {{ item.title }} 
                        <span v-if="isItemLocked(modules, index)" class="status-badge locked">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          Terkunci
                        </span>
                        <span v-else-if="isItemCompleted(item)" class="status-badge completed">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Sudah Dibaca
                        </span>
                      </h4>
                      <p>{{ item.description || 'Klik untuk membuka materi' }}</p>
                    </div>
                    <button 
                      class="material-action-btn" 
                      :class="{ 'locked': isItemLocked(modules, index), 'completed': isItemCompleted(item) }"
                      :disabled="isItemLocked(modules, index)"
                      @click.stop="openMaterial(item)"
                    >
                      <template v-if="isItemLocked(modules, index)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Terkunci
                      </template>
                      <template v-else>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        {{ isItemCompleted(item) ? 'Baca Lagi' : 'Buka' }}
                      </template>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Video Tab -->
              <div v-else-if="activeTab === 'video'" class="tab-panel">
                <h3 class="section-title">Video Pembelajaran</h3>
                <div v-if="videos.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <p>Belum ada video tersedia</p>
                </div>
                <div v-else class="videos-grid">
                  <div 
                    v-for="(video, index) in videos" 
                    :key="video.id" 
                    class="video-item"
                    :class="{ 'locked': isItemLocked(videos, index) }"
                    @click="!isItemLocked(videos, index) && openMaterial(video)"
                  >
                    <div class="video-thumbnail">
                      <img v-if="getYouTubeThumbnail(video.video_url)" :src="getYouTubeThumbnail(video.video_url)" :alt="video.title">
                      <img v-else-if="video.thumbnail_url" :src="video.thumbnail_url" :alt="video.title">
                      <div v-else class="video-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </div>
                      <div class="play-overlay">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </div>
                      <span v-if="video.duration_minutes" class="video-duration">{{ video.duration_minutes }} menit</span>
                    </div>
                    <div class="video-info">
                      <h4>
                        {{ video.title }}
                        <span v-if="isItemLocked(videos, index)" class="status-badge locked">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          Terkunci
                        </span>
                        <span v-else-if="isItemCompleted(video)" class="status-badge completed">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Sudah Ditonton
                        </span>
                      </h4>
                      <p>{{ video.description || 'Klik untuk menonton video' }}</p>
                    </div>
                    <button 
                      class="video-play-btn" 
                      :class="{ 'locked': isItemLocked(videos, index), 'completed': isItemCompleted(video) }"
                      :disabled="isItemLocked(videos, index)"
                      @click.stop="openMaterial(video)"
                    >
                      <template v-if="isItemLocked(videos, index)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Terkunci
                      </template>
                      <template v-else>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        {{ isItemCompleted(video) ? 'Tonton Lagi' : 'Tonton Video' }}
                      </template>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Nilai Tab - Report Card -->
              <div v-else-if="activeTab === 'nilai'" class="tab-panel">
                <h3 class="section-title">Rapor & Nilai</h3>
                
                <!-- Weighted Total Score -->
                <div class="report-total-score">
                  <div class="total-score-circle" :class="reportCard.final_grade >= 70 ? 'excellent' : 'poor'">
                    <span class="total-value">{{ reportCard.final_grade || 0 }}</span>
                    <span class="total-label">Nilai Akhir</span>
                  </div>
                  <div class="score-breakdown">
                    <div class="breakdown-item">
                      <span class="bi-label">Rata-rata Quiz ({{ reportCard.settings?.quiz_weight || 60 }}%)</span>
                      <div class="bi-bar">
                        <div class="bi-bar-track">
                          <div class="bi-fill quiz" :style="{ width: (reportCard.quizAverage || 0) + '%' }"></div>
                        </div>
                        <span class="bi-value">{{ reportCard.quizAverage || 0 }}</span>
                      </div>
                    </div>
                    <div class="breakdown-item">
                      <span class="bi-label">Rata-rata Latihan ({{ reportCard.settings?.latihan_weight || 40 }}%)</span>
                      <div class="bi-bar">
                        <div class="bi-bar-track">
                          <div class="bi-fill latihan" :style="{ width: (reportCard.latihanAverage || 0) + '%' }"></div>
                        </div>
                        <span class="bi-value">{{ reportCard.latihanAverage || 0 }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Quiz List -->
                <h4 class="sub-title">Detail Quiz</h4>
                <div v-if="reportCard.quizScores.length === 0" class="report-empty">
                  <p>Belum ada quiz yang dikerjakan</p>
                </div>
                
                <div v-else class="scores-list">
                  <div v-for="quiz in reportCard.quizScores" :key="quiz.id" class="score-item">
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
                <div v-if="reportCard.latihanScores.length === 0" class="report-empty">
                  <p>Belum ada latihan yang disubmit</p>
                </div>
                
                <div v-else class="scores-list">
                  <div v-for="latihan in reportCard.latihanScores" :key="latihan.id" class="score-item">
                    <div class="score-info">
                      <span class="score-title">{{ latihan.title }}</span>
                      <span class="score-date">{{ formatDate(latihan.date) }}</span>
                    </div>
                    <span class="score-value latihan" :class="latihan.score >= 70 ? 'passed' : 'failed'">
                      {{ latihan.score }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Quiz Tab -->
              <div v-else-if="activeTab === 'quiz'" class="tab-panel">
                <h3 class="section-title">Quiz</h3>
                <div v-if="tests.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <p>Belum ada quiz tersedia</p>
                </div>
                <div v-else class="quiz-list">
                  <div v-for="quiz in tests" :key="quiz.id" class="quiz-card">
                    <div class="quiz-card-header">
                      <div class="quiz-card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      </div>
                      <div class="quiz-card-info">
                        <h4>{{ quiz.title }}</h4>
                        <p>{{ quiz.description || 'Tidak ada deskripsi' }}</p>
                      </div>
                      <span v-if="quiz.scheduleStatus === 'upcoming'" class="quiz-status upcoming">Belum Mulai</span>
                      <span v-else-if="quiz.scheduleStatus === 'expired'" class="quiz-status expired">Berakhir</span>
                      <span v-else-if="quiz.scheduleStatus === 'active' && quiz.bestScore === null" class="quiz-status active">Aktif</span>
                    </div>
                    <div class="quiz-card-meta">
                      <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span>{{ quiz.questionCount }} Soal</span>
                      </div>
                      <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{{ quiz.time_limit_minutes }} Menit</span>
                      </div>
                      <div class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span>KKM {{ quiz.passing_score || 70 }}</span>
                      </div>
                    </div>
                    <!-- Warning: Quiz hanya 1x -->
                    <div v-if="!quiz.isLocked && quiz.bestScore === null && quiz.attemptCount < quiz.max_attempts" class="quiz-warning">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <span>Quiz hanya dapat dikerjakan 1 kali</span>
                    </div>
                    <div class="quiz-card-footer">
                      <div v-if="quiz.bestScore !== null" class="best-score-display">
                        <span class="label">Nilai Terbaik:</span>
                        <span class="value" :class="getGradeColor(quiz.bestScore, 100)">{{ quiz.bestScore }}</span>
                      </div>
                      <button 
                        class="btn-quiz-start"
                        :class="{ 'locked': quiz.isLocked || quiz.bestScore !== null || quiz.attemptCount >= quiz.max_attempts }"
                        :disabled="quiz.bestScore !== null || quiz.attemptCount >= quiz.max_attempts || quiz.scheduleStatus === 'upcoming' || quiz.scheduleStatus === 'expired'"
                        @click="startQuiz(quiz)"
                      >
                        <template v-if="quiz.scheduleStatus === 'upcoming'">Belum Dimulai</template>
                        <template v-else-if="quiz.scheduleStatus === 'expired'">Telah Berakhir</template>
                        <template v-else-if="quiz.isLocked || quiz.bestScore !== null || quiz.attemptCount >= quiz.max_attempts">
                          Selesai (Nilai: {{ quiz.bestScore }})
                        </template>
                        <template v-else>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                          Mulai Quiz
                        </template>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Latihan Tab -->
              <div v-else-if="activeTab === 'latihan'" class="tab-panel">
                <h3 class="section-title">Latihan</h3>
                
                <div v-if="exercises.length === 0" class="empty-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <p>Belum ada latihan tersedia</p>
                  <span class="empty-hint">Latihan akan muncul ketika guru mengupload</span>
                </div>
                
                <div v-else class="exercise-list">
                  <div v-for="ex in exercises" :key="ex.id" class="exercise-card">
                    <div class="exercise-header">
                      <div class="exercise-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </div>
                      <div class="exercise-info">
                        <h4>{{ ex.title }}</h4>
                        <p>{{ ex.description }}</p>
                      </div>
                      <span class="exercise-status" :class="ex.status">
                        {{ ex.status === 'graded' ? 'Sudah Dinilai' : ex.status === 'submitted' ? 'Sudah Disubmit' : 'Belum Dikerjakan' }}
                      </span>
                    </div>
                    
                    <div v-if="ex.deadline" class="exercise-deadline">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>Deadline: {{ new Date(ex.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                    </div>
                    
                    <!-- Show grade if graded -->
                    <div v-if="ex.status === 'graded'" class="exercise-grade">
                      <div class="grade-display">
                        <span class="grade-label">Nilai:</span>
                        <span class="grade-value" :class="ex.submission.score >= 70 ? 'passed' : 'failed'">
                          {{ ex.submission.score }}
                        </span>
                      </div>
                      <p v-if="ex.submission.feedback" class="grade-feedback">
                        <strong>Feedback:</strong> {{ ex.submission.feedback }}
                      </p>
                    </div>
                    
                    <!-- Show submitted file if submitted -->
                    <div v-if="ex.status === 'submitted'" class="exercise-submitted">
                      <div class="submitted-content">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="submitted-icon">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <p>Jawaban sudah disubmit, menunggu penilaian</p>
                      </div>
                      <a :href="ex.submission.submission_url" target="_blank" class="view-submission">Lihat file yang disubmit</a>
                    </div>
                    
                    <!-- Upload form if not submitted -->
                    <div v-if="ex.status === 'pending'" class="exercise-upload">
                      <p class="upload-hint">Upload file jawaban Anda (PDF, DOC, atau gambar)</p>
                      <div class="upload-actions">
                        <button class="btn-upload" @click="openUploadModal(ex)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          Upload Jawaban
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Upload Modal -->
      <div v-if="showUploadModal" class="modal-overlay" @click.self="showUploadModal = false">
        <div class="upload-modal">
          <div class="modal-header">
            <h3>Upload Jawaban</h3>
            <button class="modal-close" @click="showUploadModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <p class="exercise-title">{{ selectedExercise?.title }}</p>
            
            <div class="form-group">
              <label>Pilih File Jawaban</label>
              <input type="file" @change="handleFileChange" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
              <span class="file-hint">Format: PDF, DOC, atau Gambar (Max 10MB)</span>
            </div>
            
            <div class="form-group">
              <label>Catatan (Opsional)</label>
              <textarea v-model="uploadNotes" placeholder="Tambahkan catatan untuk guru..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showUploadModal = false">Batal</button>
            <button class="btn-submit" @click="handleExerciseSubmit" :disabled="!uploadFile || uploading">
              {{ uploading ? 'Mengupload...' : 'Submit Jawaban' }}
            </button>
          </div>
        </div>
      </div>
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

.course-badges {
  display: flex;
  gap: 8px;
  margin-bottom: var(--spacing-sm);
}

.level-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
}

.type-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
}

.course-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  line-height: 1.2;
  color: white;
}

.course-location {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-base);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
}

.course-location svg {
  width: 18px;
  height: 18px;
  opacity: 0.9;
}

.course-location svg { width: 16px; height: 16px; margin-top: 2px; }
.location-name { font-weight: 500; }
.separator { color: white; opacity: 0.5; font-size: 10px; }
.location-city { opacity: 0.9; }

.mt-4 { margin-top: 16px; }

.join-meet-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  color: #0d5782;
  border: none;
  padding: 10px 20px;
  border-radius: 30px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.join-meet-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  background: #f8fafc;
}

.join-meet-btn svg { width: 18px; height: 18px; }

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
  width: 100%;
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

/* Meeting Link Section */
.meeting-link-section {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(25, 118, 210, 0.2);
}

.meeting-link-section.pending {
  background: linear-gradient(135deg, #fff3e0 0%, #ffeeed 100%);
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.meeting-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 1rem;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: var(--spacing-md);
}

.meeting-title svg {
  width: 20px;
  height: 20px;
}

.meeting-link-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: white;
  border-radius: var(--radius-md);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.meeting-url {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.join-meeting-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: linear-gradient(135deg, #1976d2, #1565c0);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.join-meeting-btn:hover {
  background: linear-gradient(135deg, #1565c0, #0d47a1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(21, 101, 192, 0.3);
}

.join-meeting-btn svg {
  width: 16px;
  height: 16px;
}

.meeting-note {
  margin-top: var(--spacing-sm);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.meeting-pending {
  color: #e65100;
  font-size: 0.9rem;
  font-style: italic;
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

.material-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.material-action-btn svg {
  width: 16px;
  height: 16px;
}

.material-action-btn:hover {
  background: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(10, 69, 104, 0.2);
}

/* Progress Bars */
.material-progress,
.video-progress-bar {
  margin-top: 8px;
}

.progress-bar-small {
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill-small {
  height: 100%;
  background: var(--secondary);
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 11px;
  color: var(--text-muted);
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

.video-play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 24px);
  margin: 0 12px 12px;
  padding: 10px;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.video-play-btn svg {
  width: 16px;
  height: 16px;
}

.video-play-btn:hover {
  background: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(10, 69, 104, 0.2);
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
    width: 100%;
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

@media (max-width: 1200px) { .stats-overview { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .stats-overview { grid-template-columns: 1fr; } }
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

/* Quiz Cards */
.quiz-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.quiz-card {
  background: white;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.quiz-card-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.quiz-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(136, 208, 228, 0.15);
  color: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.quiz-card-icon svg {
  width: 24px;
  height: 24px;
}

.quiz-card-info {
  flex: 1;
  min-width: 0;
}

.quiz-card-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.quiz-card-info p {
  font-size: 13px;
  color: var(--text-muted);
}

.quiz-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.quiz-status.upcoming {
  background: #fef3c7;
  color: #d97706;
}

.quiz-status.expired {
  background: #fee2e2;
  color: #dc2626;
}

.quiz-status.active {
  background: #dcfce7;
  color: #16a34a;
}

.quiz-card-meta {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--background);
}

.quiz-card-meta .meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.quiz-card-meta .meta-item svg {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.quiz-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
}

.best-score-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.best-score-display .label {
  color: var(--text-muted);
}

.best-score-display .value {
  font-weight: 700;
  font-size: 18px;
}

.best-score-display .value.success {
  color: #16a34a;
}

.best-score-display .value.warning {
  color: #d97706;
}

.best-score-display .value.error {
  color: #dc2626;
}

.btn-quiz-start {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-quiz-start svg {
  width: 16px;
  height: 16px;
}

.btn-quiz-start:hover:not(:disabled) {
  background: var(--primary);
  transform: translateY(-2px);
}

.btn-quiz-start:disabled {
  background: var(--border);
  color: var(--text-muted);
  cursor: not-allowed;
}

.btn-quiz-start.locked {
  background: #e2e8f0;
  color: #64748b;
}

.quiz-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  margin-bottom: 12px;
}

.quiz-warning svg {
  width: 16px;
  height: 16px;
  color: #d97706;
  flex-shrink: 0;
}

.quiz-warning span {
  font-size: 12px;
  font-weight: 500;
  color: #92400e;
}

@media (max-width: 640px) {
  .quiz-card-meta {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
  
  .quiz-card-footer {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .btn-quiz-start {
    width: 100%;
    justify-content: center;
  }
}

/* Report Card Styles */
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

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

@media (max-width: 640px) {
  .report-total-score {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-md);
  }
  
  .final-grade-circle {
    width: 100px;
    height: 100px;
  }
  
  .final-grade-value {
    font-size: 28px;
  }
  
  .weight-info-box {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}

/* Exercise List Styles */
.exercise-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.exercise-card {
  background: white;
  border-radius: 16px;
  padding: var(--spacing-lg);
  border: 1px solid var(--border);
  transition: box-shadow 0.2s;
}

.exercise-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.exercise-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.exercise-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #e0f2fe, #f0f9ff);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.exercise-icon svg {
  width: 24px;
  height: 24px;
  color: #0d5782;
}

.exercise-info {
  flex: 1;
}

.exercise-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.exercise-info p {
  font-size: 13px;
  color: var(--text-secondary);
}

.exercise-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.exercise-status.pending {
  background: #fef3c7;
  color: #d97706;
}

.exercise-status.submitted {
  background: #dbeafe;
  color: #2563eb;
}

.exercise-status.graded {
  background: #dcfce7;
  color: #16a34a;
}

.exercise-deadline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
}

.exercise-deadline svg {
  width: 16px;
  height: 16px;
}

.exercise-grade {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f8fafc;
  border-radius: 12px;
}

.grade-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grade-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.grade-value {
  font-size: 28px;
  font-weight: 700;
}

.grade-value.passed {
  color: #16a34a;
}

.grade-value.failed {
  color: #dc2626;
}

.grade-feedback {
  margin-top: var(--spacing-sm);
  font-size: 13px;
  color: var(--text-secondary);
}

.exercise-submitted {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: #f0f7ff;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.submitted-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.submitted-icon {
  width: 18px;
  height: 18px;
  color: #2563eb;
}

.exercise-submitted p {
  font-size: 14px;
  color: #1e40af;
  font-weight: 500;
  margin: 0;
}

.view-submission {
  display: inline-flex;
  align-items: center;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  padding: 6px 14px;
  background: white;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  transition: all 0.2s;
}

.view-submission:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.exercise-upload {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border);
}

.upload-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #0d5782, #0a4568);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-upload:hover {
  transform: scale(1.02);
}

.btn-upload svg {
  width: 18px;
  height: 18px;
}

/* Upload Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg);
}

.upload-modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  overflow: hidden;
}

.upload-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border);
}

.upload-modal .modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.upload-modal .modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-modal .modal-body {
  padding: var(--spacing-lg);
}

.upload-modal .exercise-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.upload-modal .form-group {
  margin-bottom: var(--spacing-md);
}

.upload-modal .form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.upload-modal .form-group input[type="file"] {
  width: 100%;
  padding: 12px;
  border: 2px dashed var(--border);
  border-radius: 10px;
  cursor: pointer;
}

.upload-modal .file-hint {
  font-size: 12px;
  color: var(--text-secondary);
  display: block;
  margin-top: 6px;
}

.upload-modal textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
}

.upload-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border);
}

.btn-cancel {
  padding: 12px 24px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit {
  padding: 12px 24px;
  background: linear-gradient(135deg, #0d5782, #0a4568);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
  vertical-align: middle;
}

.status-badge svg {
  width: 12px;
  height: 12px;
}

.status-badge.locked {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.status-badge.completed {
  background: #dcfce7;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

/* Locked Button States */
.material-action-btn.locked,
.video-play-btn.locked {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  border: 1px solid #e2e8f0;
}

.material-action-btn.locked:hover,
.video-play-btn.locked:hover {
  transform: none;
  background: #f1f5f9;
}

/* Completed Button States */
.material-action-btn.completed,
.video-play-btn.completed {
  background: white;
  color: #16a34a;
  border: 1px solid #16a34a;
}

.material-action-btn.completed:hover,
.video-play-btn.completed:hover {
  background: #f0fdf4;
}
</style>