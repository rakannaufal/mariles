<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLesPlaces } from '@/composables/useLesPlaces'
import { useFavorites } from '@/composables/useFavorites'
import { useBookings } from '@/composables/useBookings'
import { useChat } from '@/composables/useChat'
import Navbar from '@/components/Navbar.vue'
import LesCard from '@/components/LesCard.vue'
import Footer from '@/components/Footer.vue'
import { createPayment } from '@/services/paymentService'
import { supabase } from '@/lib/supabase'
import { loadSnapScript, generateOrderId } from '@/lib/midtrans'
import { getLevelLabel, getLevelColor, getTypeLabel, getTypeColor, getTypeBgColor } from '@/utils/badgeUtils'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { lesPlace, lesPlaces, loading, fetchLesPlaceById, fetchLesPlaces } = useLesPlaces()
const { toggleFavorite, isFavorited } = useFavorites()
const { createBooking } = useBookings()
const { getOrCreateChatRoom, getOwnerByLesPlaceId } = useChat()

const activeTab = ref('programs')
const selectedProgram = ref(null)
const currentImage = ref(0)
const isFavorite = ref(false)
const bookingLoading = ref(false)
const chatLoading = ref(false)
const showProgramModal = ref(false)
const modalProgram = ref(null)
const paymentStatus = ref(null) // 'success', 'pending', 'error', null
const paymentMessage = ref('')
const enrolledProgramIds = ref([]) // Track which programs user has enrolled

// Report feature
const showReportModal = ref(false)
const reportLoading = ref(false)
const reportForm = ref({
  reason: '',
  description: ''
})
const reportReasons = [
  'Informasi tidak akurat',
  'Foto tidak sesuai',
  'Penipuan/Scam',
  'Konten tidak pantas',
  'Tempat tidak beroperasi',
  'Lainnya'
]

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// Related les places (exclude current) - show 5 cards
const relatedLesPlaces = computed(() => {
  if (!lesPlace.value || !lesPlaces.value) return []
  return lesPlaces.value
    .filter(lp => lp.id !== lesPlace.value.id)
    .slice(0, 5)
})

// Calculate rating from reviews array
const calculatedRating = computed(() => {
  const reviews = lesPlace.value?.reviews
  if (reviews?.length) {
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
    return (sum / reviews.length).toFixed(1)
  }
  return lesPlace.value?.rating?.toFixed(1) || '0'
})

// Calculate review count from reviews array
const reviewCount = computed(() => {
  return lesPlace.value?.reviews?.length || lesPlace.value?.total_reviews || 0
})

// Student count and per-program counts - will be fetched from bookings
const studentCount = ref(0)
const programStudentCounts = ref({}) // { programId: count }

// Fetch actual student counts from paid bookings
async function fetchStudentCounts() {
  if (!lesPlace.value?.id) return
  
  try {
    // Get all paid bookings for this les place
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, program_id')
      .eq('les_place_id', lesPlace.value.id)
      .in('payment_status', ['paid', 'settlement', 'capture'])
      .in('status', ['confirmed', 'active'])
    
    if (!error && bookings) {
      // Total student count
      studentCount.value = bookings.length
      
      // Count per program
      const counts = {}
      bookings.forEach(b => {
        counts[b.program_id] = (counts[b.program_id] || 0) + 1
      })
      programStudentCounts.value = counts
    }
  } catch (err) {
    console.error('Error fetching student counts:', err)
  }
}

const formatPrice = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p)

function getAvailableSlots(program) {
  const enrolled = programStudentCounts.value[program.id] || 0
  return (program.capacity || 20) - enrolled
}

function getEnrolledCount(program) {
  return programStudentCounts.value[program.id] || 0
}

function isProgramFull(program) {
  const enrolled = programStudentCounts.value[program.id] || 0
  return enrolled >= (program.capacity || 20)
}

// Check if user has already enrolled in a specific program
function isProgramEnrolled(programId) {
  return enrolledProgramIds.value.includes(programId)
}

function selectProgram(program) {
  if (!isProgramFull(program)) {
    selectedProgram.value = program
  }
}

function openProgramDetail(program, event) {
  event.stopPropagation()
  modalProgram.value = program
  showProgramModal.value = true
}

function closeProgramModal() {
  showProgramModal.value = false
  modalProgram.value = null
}

function getScheduleText(program) {
  if (!program.schedule) return 'Jadwal fleksibel'
  
  // Handle new format: { monday: { start, end }, tuesday: { start, end } }
  if (typeof program.schedule === 'object' && !Array.isArray(program.schedule)) {
    const dayLabels = {
      monday: 'Senin', tuesday: 'Selasa', wednesday: 'Rabu',
      thursday: 'Kamis', friday: 'Jumat', saturday: 'Sabtu', sunday: 'Minggu'
    }
    const days = Object.entries(program.schedule)
      .filter(([_, data]) => data.start && data.end)
      .map(([day, data]) => `${dayLabels[day] || day} ${data.start}-${data.end}`)
    return days.length ? days.join(', ') : 'Jadwal fleksibel'
  }
  
  // Handle old format: [{ day, time }]
  if (Array.isArray(program.schedule)) {
    return program.schedule.map(s => `${s.day} ${s.time || ''}`).join(', ')
  }
  
  return 'Jadwal fleksibel'
}

// Get count of schedule days per week
function getScheduleCount(program) {
  if (!program.schedule) return 2 // default
  
  // Handle new format: { day: { start, end } }
  if (typeof program.schedule === 'object' && !Array.isArray(program.schedule)) {
    return Object.values(program.schedule).filter(data => data.start && data.end).length || 2
  }
  
  // Handle old format: [{ day, time }]
  if (Array.isArray(program.schedule)) {
    return program.schedule.length || 2
  }
  
  return 2
}

function getScheduleArray(schedule) {
  if (!schedule) return []
  
  const dayLabels = {
    monday: 'Senin', tuesday: 'Selasa', wednesday: 'Rabu',
    thursday: 'Kamis', friday: 'Jumat', saturday: 'Sabtu', sunday: 'Minggu'
  }
  
  // Handle new format: { monday: { start, end } }
  if (typeof schedule === 'object' && !Array.isArray(schedule)) {
    return Object.entries(schedule)
      .filter(([_, data]) => data.start && data.end)
      .map(([day, data]) => ({
        day: dayLabels[day] || day,
        time: `${data.start} - ${data.end}`
      }))
  }
  
  // Handle old format: [{ day, time }]
  if (Array.isArray(schedule)) {
    return schedule
  }
  
  return []
}

function getTotalMeetings(program) {
  if (!program.duration_months || !program.sessions_per_week) return null
  return program.duration_months * 4 * program.sessions_per_week
}

function getLesTypeLabel(type) {
  const labels = {
    'offline': 'Offline',
    'online': 'Online',
    'hybrid': 'Hybrid (Offline & Online)',
    'offline_online': 'Hybrid (Offline & Online)' // Legacy support
  }
  return labels[type] || type
}

function getProgramTypeLabel(type) {
  const labels = {
    'offline': 'Offline',
    'online': 'Online',
    'hybrid': 'Hybrid',
    'offline_online': 'Hybrid'
  }
  return labels[type] || 'Offline'
}

async function handleBooking() {
  if (!selectedProgram.value) {
    alert('Pilih program terlebih dahulu')
    return
  }
  
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  
  bookingLoading.value = true
  paymentStatus.value = null
  paymentMessage.value = ''
  
  try {
    // Get student_id from students table
    const userId = authStore.user?.id
    if (!userId) {
      alert('Silakan login terlebih dahulu')
      return
    }

    // Check user role first
    const role = authStore.user?.user_metadata?.role || 'student'
    if (['owner', 'teacher', 'admin'].includes(role) && role !== 'student') {
      alert(`Anda masuk sebagai ${role.charAt(0).toUpperCase() + role.slice(1)}. Silakan gunakan akun Siswa untuk mendaftar kelas.`)
      return
    }

    // Fetch student record
    let { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .single()

    // If student profile not found but role is student (or unknown), try to create it
    if (!studentData) {
      console.log('Student profile not found, attempting to create...')
      const { data: newStudent, error: createError } = await supabase
        .from('students')
        .insert({ user_id: userId })
        .select('id')
        .single()
      
      if (createError) {
        throw new Error('Gagal membuat profil siswa: ' + createError.message)
      }
      studentData = newStudent
    }

    if (!studentData?.id) {
       throw new Error('Gagal mendapatkan ID Siswa.')
    }

    const studentId = studentData.id
    
    // Check if user already enrolled in this specific program before
    // User can buy different programs, but cannot buy the same program twice
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, status, payment_status')
      .eq('student_id', studentId)
      .eq('program_id', selectedProgram.value.id)
      .in('payment_status', ['paid', 'settlement', 'capture'])
      .limit(1)
    
    if (existingBooking && existingBooking.length > 0) {
      throw new Error(`Anda sudah pernah mendaftar program "${selectedProgram.value.name}". Silakan pilih program lain.`)
    }
    
    // Create booking and redirect to payment page
    const booking = await createBooking({
      student_id: studentId,
      program_id: selectedProgram.value.id,
      les_place_id: lesPlace.value.id,
      status: 'pending',
      start_date: new Date().toISOString().split('T')[0]
    })
    
    if (booking?.id) {
      router.push(`/student/payment/${booking.id}`)
    } else {
      throw new Error('Gagal membuat booking')
    }
    
  } catch (err) {
    console.error('Booking/Payment error:', err)
    paymentStatus.value = 'error'
    paymentMessage.value = 'Gagal: ' + err.message
    alert(paymentMessage.value)
  } finally {
    bookingLoading.value = false
  }
}

async function handleToggleFavorite() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  
  try {
    isFavorite.value = await toggleFavorite(authStore.user.id, lesPlace.value.id)
  } catch (err) {
    console.error('Error toggling favorite:', err)
  }
}

async function checkFavorite() {
  if (authStore.isAuthenticated && lesPlace.value?.id) {
    isFavorite.value = await isFavorited(authStore.user.id, lesPlace.value.id)
  }
}

// Check which programs user has already enrolled in
async function checkEnrolledPrograms() {
  if (!authStore.isAuthenticated) {
    enrolledProgramIds.value = []
    return
  }
  
  try {
    const userId = authStore.user?.id
    if (!userId) return
    
    // Get student ID
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (!studentData?.id) return
    
    // Get all paid bookings for this student at this les place
    const { data: bookings } = await supabase
      .from('bookings')
      .select('program_id')
      .eq('student_id', studentData.id)
      .eq('les_place_id', lesPlace.value?.id)
      .in('payment_status', ['paid', 'settlement', 'capture'])
    
    if (bookings) {
      enrolledProgramIds.value = bookings.map(b => b.program_id)
    }
  } catch (err) {
    console.error('Error checking enrolled programs:', err)
  }
}

async function handleChatOwner() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  
  if (!lesPlace.value?.id) return
  
  chatLoading.value = true
  try {
    const owner = await getOwnerByLesPlaceId(lesPlace.value.id)
    if (!owner) {
      alert('Owner tidak ditemukan')
      return
    }
    
    const room = await getOrCreateChatRoom(authStore.user.id, owner.id, lesPlace.value.id)
    router.push({ name: 'student-chat', query: { room: room.id } })
  } catch (err) {
    console.error('Error starting chat:', err)
    alert('Gagal memulai chat: ' + err.message)
  } finally {
    chatLoading.value = false
  }
}

onMounted(async () => {
  const lesId = route.params.id
  if (lesId) {
    await fetchLesPlaceById(lesId)
    await fetchStudentCounts()
    await checkFavorite()
    await checkEnrolledPrograms()
    // Fetch other les places for related section
    await fetchLesPlaces()
  }
})

function getMinPrice(lesPlace) {
  if (!lesPlace.programs?.length) return 0
  return Math.min(...lesPlace.programs.map(p => p.price))
}

// Report functions
function openReportModal() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  reportForm.value = { reason: '', description: '' }
  showReportModal.value = true
}

function closeReportModal() {
  showReportModal.value = false
  reportForm.value = { reason: '', description: '' }
}

async function submitReport() {
  if (!reportForm.value.reason) {
    toast('Pilih alasan laporan', 'error')
    return
  }
  
  if (!reportForm.value.description.trim()) {
    toast('Masukkan deskripsi laporan', 'error')
    return
  }
  
  reportLoading.value = true
  try {
    const { error } = await supabase.from('reports').insert({
      reporter_id: authStore.user.id,
      target_type: 'les_place',
      target_id: lesPlace.value.id,
      reason: reportForm.value.reason,
      description: reportForm.value.description,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    
    if (error) throw error
    
    toast('Laporan berhasil dikirim. Tim kami akan meninjau dalam 1-3 hari kerja.', 'success')
    closeReportModal()
  } catch (err) {
    console.error('Report error:', err)
    toast('Gagal mengirim laporan. Coba lagi nanti.', 'error')
  } finally {
    reportLoading.value = false
  }
}

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 5000)
}
</script>

<template>
  <div class="detail-page">
    <Navbar />

    <main class="detail-main">
      <div v-if="loading" class="loading-state container">
        <div class="loading-spinner"></div>
        <p>Memuat data...</p>
      </div>

      <div v-else-if="!lesPlace" class="container">
        <div class="not-found">
          <h2>Tempat Les Tidak Ditemukan</h2>
          <p>Maaf, tempat les yang Anda cari tidak ditemukan.</p>
          <router-link to="/search" class="btn btn-primary">Kembali ke Pencarian</router-link>
        </div>
      </div>

      <div v-else class="container">
        <div class="detail-layout">
          <div class="detail-content">
            <!-- Gallery -->
            <div class="gallery">
              <img :src="lesPlace.photos?.[currentImage] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800'" :alt="lesPlace.name" class="main-image">
              <div v-if="lesPlace.photos?.length > 1" class="thumbnails">
                <img v-for="(img, i) in lesPlace.photos" :key="i" :src="img" :class="{ active: currentImage === i }" @click="currentImage = i">
              </div>
            </div>

            <!-- Info Section -->
            <div class="info-section">
              <div class="info-header">
                <div>
                  <h1>{{ lesPlace.name }}</h1>
                  <p class="location">{{ lesPlace.address }}, {{ lesPlace.city }}</p>
                </div>
                <div class="badges">
                  <span class="badge method">{{ getLesTypeLabel(lesPlace.type) }}</span>
                  <span v-if="lesPlace.is_verified" class="badge verified">Terverifikasi</span>
                  <button class="report-btn" @click="openReportModal" title="Laporkan tempat les ini">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    Laporkan
                  </button>
                </div>
              </div>
              
              <div class="stats">
                <div class="stat"><span class="value">★ {{ calculatedRating }}</span><span class="label">{{ reviewCount }} ulasan</span></div>
                <div class="stat"><span class="value">{{ studentCount }}</span><span class="label">siswa</span></div>
                <div class="stat"><span class="value">{{ lesPlace.programs?.length || 0 }}</span><span class="label">program</span></div>
              </div>
              
              <p class="description">{{ lesPlace.description }}</p>

              <!-- Keunggulan -->
              <div class="highlights-section" v-if="lesPlace.highlights?.length">
                <h3>Keunggulan</h3>
                <ul class="highlights-list">
                  <li v-for="(item, i) in lesPlace.highlights" :key="i">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    {{ item }}
                  </li>
                </ul>
              </div>

              <!-- Facilities -->
              <div v-if="lesPlace.facilities?.length" class="facilities-section">
                <h3>Fasilitas</h3>
                <div class="facilities-grid">
                  <div v-for="facility in lesPlace.facilities" :key="facility" class="facility-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>{{ facility }}</span>
                  </div>
                </div>
              </div>

              <!-- Teachers for Offline & Online type -->
              <div v-if="(lesPlace.type === 'offline_online' || lesPlace.type === 'online') && lesPlace.teachers?.length" class="teachers-section">
                <h3>Pengajar</h3>
                <div class="teachers-grid">
                  <div v-for="teacher in lesPlace.teachers" :key="teacher.id" class="teacher-card">
                    <div class="teacher-avatar">
                      <img v-if="teacher.avatar_url" :src="teacher.avatar_url" :alt="teacher.name">
                      <span v-else>{{ teacher.name?.charAt(0) }}</span>
                    </div>
                    <div class="teacher-info">
                      <h4>{{ teacher.name }}</h4>
                      <p>{{ teacher.specialization?.join(', ') || 'Pengajar' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabs -->
            <div class="tabs">
              <button :class="{ active: activeTab === 'programs' }" @click="activeTab = 'programs'">Program</button>
              <button :class="{ active: activeTab === 'reviews' }" @click="activeTab = 'reviews'">Ulasan</button>
            </div>

            <div class="tab-content">
              <!-- Programs Tab -->
              <div v-if="activeTab === 'programs'" class="programs">
                <div v-if="!lesPlace.programs?.length" class="empty-state">
                  <p>Belum ada program tersedia</p>
                </div>
                
                <div 
                  v-for="program in lesPlace.programs" 
                  :key="program.id" 
                  class="program-card" 
                  :class="{ selected: selectedProgram?.id === program.id, 'sold-out': isProgramFull(program) }" 
                  @click="selectProgram(program)"
                >
                  <div class="program-main">
                    <div class="program-top">
                      <h3>{{ program.name }}</h3>
                      <span v-if="program.level" class="level-badge" :style="{ backgroundColor: getLevelColor(program.level) }">{{ getLevelLabel(program.level) }}</span>
                      <span class="type-badge" :style="{ backgroundColor: getTypeBgColor(lesPlace.type), color: getTypeColor(lesPlace.type) }">{{ getTypeLabel(lesPlace.type) }}</span>
                    </div>
                    
                    <p class="program-desc">{{ program.description }}</p>
                    
                    <!-- Schedule info for offline programs -->
                    <div v-if="program.type?.toLowerCase() !== 'online'" class="program-schedule-info">
                      <div class="schedule-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>{{ program.sessions_per_week || getScheduleCount(program) }}x pertemuan/minggu</span>
                      </div>
                      <div class="schedule-meta">
                        <span v-if="program.duration_months">{{ program.duration_months }} bulan</span>
                        <span v-if="getTotalMeetings(program)">• {{ getTotalMeetings(program) }} pertemuan</span>
                      </div>
                    </div>
                    
                    <div class="program-bottom">
                      <span v-if="isProgramFull(program)" class="sold-out-badge">Penuh</span>
                      <span v-else class="slots-badge">Sisa {{ getAvailableSlots(program) }} slot</span>
                      
                      <!-- Detail button for all programs -->
                      <button class="detail-btn" @click="openProgramDetail(program, $event)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        Detail
                      </button>
                    </div>
                  </div>
                  
                  <div class="program-price-box">
                    <div class="price">{{ formatPrice(program.price) }}</div>
                    <span class="price-type">/{{ program.price_type === 'package' ? 'paket' : 'bulan' }}</span>
                  </div>
                </div>
              </div>

              <!-- Reviews Tab -->
              <div v-if="activeTab === 'reviews'" class="reviews">
                <div v-if="!lesPlace.reviews?.length" class="empty-state">
                  <p>Belum ada ulasan</p>
                </div>
                <div v-for="review in lesPlace.reviews" :key="review.id" class="review-card">
                  <div class="review-header">
                    <span class="reviewer">{{ review.students?.users?.name || 'Anonim' }}</span>
                    <span class="rating">★ {{ review.rating }}</span>
                  </div>
                  <p>{{ review.comment }}</p>
                  <span class="date">{{ new Date(review.created_at).toLocaleDateString('id-ID') }}</span>
                  <div v-if="review.reply" class="reply">
                    <strong>Balasan Owner:</strong> {{ review.reply }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <aside class="detail-sidebar">
            <div class="booking-card">
              <h3>Daftar Sekarang</h3>
              
              <!-- Payment Status Message -->
              <div v-if="paymentStatus" class="payment-message" :class="paymentStatus">
                <svg v-if="paymentStatus === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <svg v-else-if="paymentStatus === 'pending'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>{{ paymentMessage }}</span>
              </div>
              
              <div v-if="selectedProgram && !paymentStatus" class="selected-program">
                <p class="program-name">{{ selectedProgram.name }}</p>
                <p class="program-slots">Sisa {{ getAvailableSlots(selectedProgram) }} slot</p>
                <div class="price-display">{{ formatPrice(selectedProgram.price) }}<span>/{{ selectedProgram.price_type === 'package' ? 'paket' : 'bulan' }}</span></div>
              </div>
              <p v-else-if="!paymentStatus" class="select-hint">Pilih program terlebih dahulu</p>
              
              <div class="action-buttons" v-if="!paymentStatus">
                <button 
                  class="btn btn-primary action-btn" 
                  :disabled="!selectedProgram || bookingLoading || isProgramEnrolled(selectedProgram?.id)" 
                  @click="handleBooking"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  <span>{{ bookingLoading ? 'Memproses...' : (isProgramEnrolled(selectedProgram?.id) ? 'Sudah Terdaftar' : 'Daftar & Bayar') }}</span>
                </button>
                <button class="btn btn-outline action-btn" :disabled="chatLoading" @click="handleChatOwner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>{{ chatLoading ? 'Memulai...' : 'Chat Owner' }}</span>
                </button>
              </div>
              
              <!-- After successful payment, show dashboard link -->
              <div v-if="paymentStatus === 'success'" class="action-buttons">
                <router-link to="/student/dashboard" class="btn btn-primary action-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span>Buka Dashboard</span>
                </router-link>
              </div>
              
              <button v-if="paymentStatus" class="favorite-btn" @click="paymentStatus = null; paymentMessage = ''">
                Pilih Program Lain
              </button>
              
              <button v-else class="favorite-btn" @click="handleToggleFavorite">
                <svg v-if="isFavorite" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {{ isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit' }}
              </button>
            </div>
          </aside>
        </div>

        <!-- Related Les Places -->
        <div v-if="relatedLesPlaces.length" class="related-section">
          <h2>Tempat Les Lainnya</h2>
          <div class="related-grid">
            <LesCard 
              v-for="related in relatedLesPlaces" 
              :key="related.id" 
              :les-place="related"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- Program Detail Modal -->
    <Teleport to="body">
      <div v-if="showProgramModal && modalProgram" class="modal-overlay" @click="closeProgramModal">
        <div class="modal-content" @click.stop>
          <button class="modal-close" @click="closeProgramModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          
          <div class="modal-header">
            <h2>{{ modalProgram.name }}</h2>
            <span v-if="modalProgram.level" class="modal-level">{{ modalProgram.level }}</span>
          </div>
          
          <p class="modal-desc">{{ modalProgram.description }}</p>
          
          <div class="modal-grid">
            <div class="modal-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <div>
                <span class="stat-value">{{ modalProgram.duration_months || '-' }} bulan</span>
                <span class="stat-label">Durasi</span>
              </div>
            </div>
            <div class="modal-stat" v-if="modalProgram.sessions_per_week">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div>
                <span class="stat-value">{{ modalProgram.sessions_per_week }}x/minggu</span>
                <span class="stat-label">Pertemuan</span>
              </div>
            </div>
            <div class="modal-stat" v-if="modalProgram.type !== 'offline' && getTotalMeetings(modalProgram)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div>
                <span class="stat-value">{{ getTotalMeetings(modalProgram) }} pertemuan</span>
                <span class="stat-label">Total Sesi</span>
              </div>
            </div>
            <div class="modal-stat" v-if="modalProgram.type === 'offline' && getTotalMeetings(modalProgram)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div>
                <span class="stat-value">{{ getTotalMeetings(modalProgram) }} pertemuan</span>
                <span class="stat-label">Total Sesi</span>
              </div>
            </div>
            <!-- Show materials for all programs -->
            <div class="modal-stat" v-if="modalProgram.total_modules">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div>
                <span class="stat-value">{{ modalProgram.total_modules }} modul</span>
                <span class="stat-label">Materi</span>
              </div>
            </div>
            <div class="modal-stat" v-if="modalProgram.total_videos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <div>
                <span class="stat-value">{{ modalProgram.total_videos }} video</span>
                <span class="stat-label">Video</span>
              </div>
            </div>
            <div class="modal-stat" v-if="modalProgram.total_exercises">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <div>
                <span class="stat-value">{{ modalProgram.total_exercises }} latihan</span>
                <span class="stat-label">Latihan/Kuis</span>
              </div>
            </div>
            <div class="modal-stat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <div>
                <span class="stat-value">Sisa {{ getAvailableSlots(modalProgram) }}</span>
                <span class="stat-label">Slot Tersedia</span>
              </div>
            </div>
          </div>
          
          <div class="modal-schedule" v-if="getScheduleArray(modalProgram.schedule).length">
            <h4>Jadwal Kelas</h4>
            <div class="schedule-list">
              <div v-for="(s, i) in getScheduleArray(modalProgram.schedule)" :key="i" class="schedule-item">
                <span class="day">{{ s.day }}</span>
                <span class="time">{{ s.time }}</span>
              </div>
            </div>
          </div>
          
          <div class="modal-price">
            <span class="price-label">Biaya</span>
            <span class="price-value">{{ formatPrice(modalProgram.price) }}<small>/{{ modalProgram.price_type === 'package' ? 'paket' : 'bulan' }}</small></span>
          </div>
          
          <button class="modal-select-btn" :disabled="isProgramFull(modalProgram)" @click="selectProgram(modalProgram); closeProgramModal()">
            {{ isProgramFull(modalProgram) ? 'Kelas Penuh' : 'Pilih Program Ini' }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Report Modal -->
    <Teleport to="body">
      <div v-if="showReportModal" class="modal-overlay" @click="closeReportModal">
        <div class="report-modal" @click.stop>
          <button class="modal-close" @click="closeReportModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          
          <div class="report-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            <div>
              <h3>Laporkan Tempat Les</h3>
              <p>{{ lesPlace.name }}</p>
            </div>
          </div>
          
          <div class="report-form">
            <div class="form-group">
              <label>Alasan Laporan</label>
              <div class="reason-options">
                <label 
                  v-for="reason in reportReasons" 
                  :key="reason" 
                  class="reason-option"
                  :class="{ selected: reportForm.reason === reason }"
                >
                  <input type="radio" v-model="reportForm.reason" :value="reason">
                  <span>{{ reason }}</span>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Deskripsi Lengkap</label>
              <textarea 
                v-model="reportForm.description" 
                placeholder="Jelaskan secara detail mengapa Anda melaporkan tempat les ini..." 
                rows="4"
              ></textarea>
              <span class="char-count">{{ reportForm.description.length }}/500 karakter</span>
            </div>
            
            <div class="report-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Laporan palsu dapat mengakibatkan penangguhan akun. Pastikan laporan Anda akurat dan memiliki dasar yang jelas.</p>
            </div>
            
            <div class="report-actions">
              <button class="btn-cancel" @click="closeReportModal">Batal</button>
              <button class="btn-submit" @click="submitReport" :disabled="reportLoading || !reportForm.reason || !reportForm.description.trim()">
                {{ reportLoading ? 'Mengirim...' : 'Kirim Laporan' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="showToast" :class="['toast-notification', toastType]">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Footer -->
    <Footer />
  </div>
</template>

<style scoped>
.detail-page{min-height:100vh;background:var(--background)}
.detail-main{padding-top:80px;padding-bottom:var(--spacing-xl)}
.container{max-width:1200px;margin:0 auto;padding:0 var(--spacing-xl)}
.loading-state{text-align:center;padding:var(--spacing-3xl)}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto var(--spacing-md)}
@keyframes spin{to{transform:rotate(360deg)}}
.detail-layout{display:grid;grid-template-columns:1fr 320px;gap:var(--spacing-xl)}
.detail-content{display:flex;flex-direction:column;gap:var(--spacing-lg)}
.gallery{background:white;border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-sm)}
.main-image{width:100%;aspect-ratio:16/9;object-fit:cover}
.thumbnails{display:flex;gap:var(--spacing-sm);padding:var(--spacing-md)}
.thumbnails img{width:72px;height:52px;object-fit:cover;border-radius:var(--radius-md);cursor:pointer;opacity:0.5;transition:all var(--transition-fast)}
.thumbnails img.active,.thumbnails img:hover{opacity:1;outline:2px solid var(--primary)}
.info-section{background:white;border-radius:var(--radius-xl);padding:var(--spacing-xl);box-shadow:var(--shadow-sm)}
.info-header{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--spacing-md);margin-bottom:var(--spacing-lg);flex-wrap:wrap}
.info-header h1{font-size:var(--font-size-xl);font-weight:700;margin-bottom:4px}
.location{color:var(--text-secondary);font-size:var(--font-size-sm)}
.badges{display:flex;gap:var(--spacing-xs)}
.badge{padding:4px 10px;border-radius:var(--radius-full);font-size:var(--font-size-xs);font-weight:600}
.badge.method{background:var(--info-bg);color:var(--info);text-transform:capitalize}
.badge.verified{background:var(--success-bg);color:var(--success)}
.stats{display:flex;gap:var(--spacing-xl);padding:var(--spacing-md) 0;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);margin-bottom:var(--spacing-md)}
.stat .value{font-size:var(--font-size-base);font-weight:600;display:block}
.stat .label{color:var(--text-muted);font-size:var(--font-size-xs)}
.description{color:var(--text-secondary);font-size:var(--font-size-sm);line-height:1.6;margin-bottom:var(--spacing-lg)}
/* Highlights */
.highlights-section{margin-bottom:var(--spacing-lg);padding-top:var(--spacing-md);border-top:1px solid var(--border-light)}
.highlights-section h3{font-size:var(--font-size-base);font-weight:600;margin-bottom:var(--spacing-sm)}
.highlights-list{display:flex;flex-wrap:wrap;gap:var(--spacing-sm);list-style:none;padding:0;margin:0}
.highlights-list li{display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm);color:var(--text-secondary);background:var(--success-bg);padding:6px 12px;border-radius:var(--radius-full)}
.highlights-list svg{width:14px;height:14px;color:var(--success)}
/* Facilities */
.facilities-section{padding-top:var(--spacing-md);border-top:1px solid var(--border-light)}
.facilities-section h3{font-size:var(--font-size-base);font-weight:600;margin-bottom:var(--spacing-sm)}
.facilities-grid{display:flex;flex-wrap:wrap;gap:var(--spacing-xs)}
.facility-item{display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--background);border-radius:var(--radius-lg);font-size:var(--font-size-xs);color:var(--text-secondary)}
.facility-item svg{width:14px;height:14px;color:var(--success)}
/* Teachers */
.teachers-section{padding-top:var(--spacing-lg);margin-top:var(--spacing-md);border-top:1px solid var(--border-light)}
.teachers-section h3{font-size:var(--font-size-base);font-weight:600;margin-bottom:var(--spacing-sm)}
.teachers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--spacing-sm)}
.teacher-card{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm);background:var(--background);border-radius:var(--radius-lg)}
.teacher-avatar{width:40px;height:40px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:var(--font-size-sm);overflow:hidden;flex-shrink:0}
.teacher-avatar img{width:100%;height:100%;object-fit:cover}
.teacher-info h4{font-size:var(--font-size-xs);font-weight:600;margin-bottom:2px}
.teacher-info p{font-size:10px;color:var(--text-muted)}
/* Tabs */
.tabs{display:flex;gap:var(--spacing-sm);background:white;padding:0 var(--spacing-md);border-radius:var(--radius-xl) var(--radius-xl) 0 0;border-bottom:1px solid var(--border-light)}
.tabs button{padding:var(--spacing-md) var(--spacing-lg);background:transparent;font-weight:500;font-size:var(--font-size-sm);color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-1px;transition:all var(--transition-fast)}
.tabs button.active{color:var(--primary);border-bottom-color:var(--primary)}
.tab-content{background:white;border-radius:0 0 var(--radius-xl) var(--radius-xl);padding:var(--spacing-lg);box-shadow:var(--shadow-sm)}
.empty-state{text-align:center;padding:var(--spacing-xl);color:var(--text-muted)}
/* Program Card - Clean Design */
.program-card{display:flex;justify-content:space-between;align-items:stretch;padding:var(--spacing-md);border:2px solid var(--border-light);border-radius:var(--radius-xl);cursor:pointer;transition:all var(--transition-fast);margin-bottom:var(--spacing-sm)}
.program-card:hover:not(.sold-out){border-color:var(--primary);background:rgba(136,208,228,0.03)}
.program-card.selected{border-color:var(--primary);background:rgba(136,208,228,0.08)}
.program-card.sold-out{cursor:not-allowed;opacity:0.6;background:var(--background)}
.program-main{flex:1;display:flex;flex-direction:column;gap:var(--spacing-xs)}
.program-top{display:flex;align-items:center;gap:var(--spacing-sm);flex-wrap:wrap}
.program-top h3{font-size:var(--font-size-base);font-weight:600;margin:0}
.level-badge{font-size:11px;padding:4px 10px;border-radius:var(--radius-full);color:white;font-weight:600}
.type-badge{font-size:11px;padding:4px 10px;border-radius:var(--radius-full);font-weight:600}
.program-desc{font-size:var(--font-size-xs);color:var(--text-muted);margin:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;line-clamp:1}
.program-schedule-info{margin-top:var(--spacing-xs)}
.schedule-row{display:flex;align-items:center;gap:6px;font-size:var(--font-size-xs);color:var(--text-secondary)}
.schedule-row svg{width:14px;height:14px;color:var(--primary)}
.schedule-meta{font-size:11px;color:var(--text-muted);margin-top:2px}
.program-bottom{display:flex;align-items:center;gap:var(--spacing-sm);margin-top:var(--spacing-xs)}
.slots-badge{font-size:10px;padding:3px 8px;background:var(--success-bg);color:var(--success);border-radius:var(--radius-sm);font-weight:600}
.sold-out-badge{font-size:10px;padding:3px 8px;background:var(--error-bg);color:var(--error);border-radius:var(--radius-sm);font-weight:600}
.detail-btn{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--primary);background:transparent;border:1px solid var(--primary);padding:3px 8px;border-radius:var(--radius-sm);cursor:pointer;transition:all var(--transition-fast)}
.detail-btn svg{width:12px;height:12px}
.detail-btn:hover{background:var(--primary);color:white}
.program-price-box{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;padding-left:var(--spacing-md);border-left:1px solid var(--border-light);min-width:100px}
.program-price-box .price{font-size:var(--font-size-lg);font-weight:700;color:var(--secondary)}
.program-price-box .price-type{font-size:10px;color:var(--text-muted)}
/* Review */
.review-card{padding:var(--spacing-md) 0;border-bottom:1px solid var(--border-light)}
.review-header{display:flex;justify-content:space-between;margin-bottom:var(--spacing-xs)}
.reviewer{font-weight:600;font-size:var(--font-size-sm)}
.rating{color:var(--warning);font-size:var(--font-size-sm)}
.review-card p{color:var(--text-secondary);font-size:var(--font-size-sm);line-height:1.5;margin-bottom:var(--spacing-xs)}
.date{color:var(--text-muted);font-size:var(--font-size-xs)}
.reply{margin-top:var(--spacing-sm);padding:var(--spacing-sm);background:var(--background);border-radius:var(--radius-md);font-size:var(--font-size-xs)}
/* Sidebar */
.detail-sidebar{position:sticky;top:100px;height:fit-content}
.booking-card{background:white;border-radius:var(--radius-xl);padding:var(--spacing-lg);box-shadow:var(--shadow-lg);display:flex;flex-direction:column;gap:var(--spacing-sm)}
.booking-card h3{font-size:var(--font-size-base);font-weight:600;text-align:center}
.selected-program{background:var(--background);padding:var(--spacing-md);border-radius:var(--radius-lg);text-align:center}
.program-name{font-weight:600;font-size:var(--font-size-sm);margin-bottom:4px}
.program-slots{color:var(--success);font-size:var(--font-size-xs);margin-bottom:var(--spacing-xs)}
.price-display{font-size:var(--font-size-lg);font-weight:700;color:var(--secondary)}
.price-display span{font-size:var(--font-size-xs);font-weight:normal;color:var(--text-muted)}
.select-hint{text-align:center;color:var(--text-muted);font-size:var(--font-size-sm);padding:var(--spacing-md) 0}
.action-buttons{display:flex;flex-direction:column;gap:var(--spacing-xs)}
.action-btn{display:flex;align-items:center;justify-content:center;gap:var(--spacing-sm);padding:var(--spacing-sm) var(--spacing-md);font-size:var(--font-size-sm);font-weight:600;border-radius:var(--radius-lg);transition:all var(--transition-fast);cursor:pointer}
.action-btn svg{width:18px;height:18px}
.action-btn.btn-primary{background:var(--primary);color:white;border:none}
.action-btn.btn-primary:hover:not(:disabled){background:var(--primary-dark)}
.action-btn.btn-primary:disabled{opacity:0.5;cursor:not-allowed}
.action-btn.btn-outline{background:transparent;color:var(--text);border:1px solid var(--border)}
.action-btn.btn-outline:hover:not(:disabled){border-color:var(--primary);color:var(--primary)}
.favorite-btn{display:flex;align-items:center;justify-content:center;gap:var(--spacing-xs);font-size:var(--font-size-xs);color:var(--text-muted);background:transparent;border:none;padding:var(--spacing-xs);cursor:pointer}
.favorite-btn svg{width:16px;height:16px}
.favorite-btn:hover{color:var(--accent)}
.not-found{text-align:center;padding:var(--spacing-3xl);background:white;border-radius:var(--radius-xl)}
/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:var(--spacing-md)}
.modal-content{background:white;border-radius:var(--radius-2xl);padding:var(--spacing-xl);max-width:480px;width:100%;max-height:90vh;overflow-y:auto;position:relative}
.modal-close{position:absolute;top:var(--spacing-md);right:var(--spacing-md);background:var(--background);border:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
.modal-close svg{width:18px;height:18px;color:var(--text-muted)}
.modal-header{display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:var(--spacing-sm);flex-wrap:wrap}
.modal-header h2{font-size:var(--font-size-lg);font-weight:700;margin:0}
.modal-level{font-size:var(--font-size-xs);padding:4px 10px;background:var(--info-bg);color:var(--info);border-radius:var(--radius-full)}
.modal-desc{color:var(--text-secondary);font-size:var(--font-size-sm);line-height:1.6;margin-bottom:var(--spacing-lg)}
.modal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--spacing-sm);margin-bottom:var(--spacing-lg)}
.modal-stat{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm);background:var(--background);border-radius:var(--radius-lg)}
.modal-stat svg{width:20px;height:20px;color:var(--primary);flex-shrink:0}
.modal-stat .stat-value{font-weight:600;font-size:var(--font-size-sm);display:block}
.modal-stat .stat-label{font-size:10px;color:var(--text-muted)}
.modal-schedule{margin-bottom:var(--spacing-lg)}
.modal-schedule h4{font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--spacing-sm)}
.schedule-list{display:flex;flex-direction:column;gap:var(--spacing-xs)}
.schedule-item{display:flex;justify-content:space-between;padding:var(--spacing-sm);background:var(--background);border-radius:var(--radius-md);font-size:var(--font-size-sm)}
.schedule-item .day{font-weight:500}
.schedule-item .time{color:var(--text-secondary)}
.modal-price{display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md);background:var(--primary);color:white;border-radius:var(--radius-lg);margin-bottom:var(--spacing-md)}
.modal-price .price-label{font-size:var(--font-size-sm)}
.modal-price .price-value{font-size:var(--font-size-xl);font-weight:700}
.modal-price .price-value small{font-size:var(--font-size-xs);font-weight:normal;opacity:0.8}
.modal-select-btn{width:100%;padding:var(--spacing-md);background:var(--secondary);color:white;border:none;border-radius:var(--radius-lg);font-weight:600;font-size:var(--font-size-sm);cursor:pointer;transition:all var(--transition-fast)}
.modal-select-btn:hover:not(:disabled){opacity:0.9}
.modal-select-btn:disabled{background:var(--border);color:var(--text-muted);cursor:not-allowed}
/* Related Les Places */
.related-section{margin-top:var(--spacing-xl);padding-top:var(--spacing-xl);border-top:1px solid var(--border-light)}
.related-section h2{font-size:var(--font-size-lg);font-weight:600;margin-bottom:var(--spacing-lg)}
.related-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:var(--spacing-lg)}
/* Payment Status Message */
.payment-message{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-md);border-radius:var(--radius-lg);font-size:var(--font-size-sm);font-weight:500;margin-bottom:var(--spacing-sm)}
.payment-message svg{width:24px;height:24px;flex-shrink:0}
.payment-message.success{background:var(--success-bg);color:var(--success)}
.payment-message.pending{background:var(--warning-bg);color:var(--warning)}
.payment-message.error{background:var(--error-bg);color:var(--error)}
@media(max-width:1200px){.related-grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:1024px){.detail-layout{grid-template-columns:1fr}.detail-sidebar{position:fixed;bottom:0;left:0;right:0;z-index:100}.booking-card{border-radius:var(--radius-xl) var(--radius-xl) 0 0;padding:var(--spacing-md)}.action-buttons{flex-direction:row}.action-btn{flex:1}.related-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){.related-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.modal-grid{grid-template-columns:1fr}.related-grid{grid-template-columns:repeat(2,1fr)}}

/* Report Button */
.report-btn{display:flex;align-items:center;gap:6px;padding:6px 12px;background:transparent;border:1px solid #DC2626;color:#DC2626;border-radius:var(--radius-lg);font-size:var(--font-size-xs);font-weight:500;cursor:pointer;transition:all var(--transition-fast)}
.report-btn svg{width:14px;height:14px}
.report-btn:hover{background:#DC2626;color:white}

/* Report Modal */
.report-modal{background:white;border-radius:var(--radius-2xl);padding:var(--spacing-xl);max-width:520px;width:100%;max-height:90vh;overflow-y:auto;position:relative}
.report-header{display:flex;align-items:flex-start;gap:var(--spacing-md);margin-bottom:var(--spacing-lg);padding-bottom:var(--spacing-md);border-bottom:1px solid var(--border-light)}
.report-header svg{width:32px;height:32px;color:#DC2626;flex-shrink:0}
.report-header h3{font-size:var(--font-size-lg);font-weight:700;margin-bottom:4px}
.report-header p{font-size:var(--font-size-sm);color:var(--text-muted)}
.report-form{display:flex;flex-direction:column;gap:var(--spacing-lg)}
.report-form .form-group{display:flex;flex-direction:column;gap:var(--spacing-sm)}
.report-form label{font-size:var(--font-size-sm);font-weight:600;color:var(--text)}
.reason-options{display:flex;flex-direction:column;gap:var(--spacing-xs)}
.reason-option{display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm) var(--spacing-md);border:1px solid var(--border-light);border-radius:var(--radius-lg);cursor:pointer;transition:all var(--transition-fast)}
.reason-option:hover{border-color:var(--primary)}
.reason-option.selected{border-color:#DC2626;background:#FEF2F2}
.reason-option input{display:none}
.reason-option span{font-size:var(--font-size-sm);color:var(--text)}
.report-form textarea{width:100%;padding:var(--spacing-md);border:1px solid var(--border-light);border-radius:var(--radius-lg);font-size:var(--font-size-sm);resize:vertical;font-family:inherit}
.report-form textarea:focus{outline:none;border-color:var(--primary)}
.char-count{font-size:var(--font-size-xs);color:var(--text-muted);text-align:right}
.report-notice{display:flex;gap:var(--spacing-sm);padding:var(--spacing-md);background:#FEF3C7;border-radius:var(--radius-lg)}
.report-notice svg{width:20px;height:20px;color:#D97706;flex-shrink:0}
.report-notice p{font-size:var(--font-size-xs);color:#92400E;line-height:1.5;margin:0}
.report-actions{display:flex;justify-content:flex-end;gap:var(--spacing-sm)}
.report-actions .btn-cancel{padding:var(--spacing-sm) var(--spacing-lg);background:white;border:1px solid var(--border);border-radius:var(--radius-lg);font-size:var(--font-size-sm);font-weight:600;cursor:pointer}
.report-actions .btn-submit{padding:var(--spacing-sm) var(--spacing-lg);background:#DC2626;color:white;border:none;border-radius:var(--radius-lg);font-size:var(--font-size-sm);font-weight:600;cursor:pointer}
.report-actions .btn-submit:disabled{opacity:0.5;cursor:not-allowed}

/* Toast Notification */
.toast-notification{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-md) var(--spacing-lg);background:white;border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);z-index:1100;max-width:400px}
.toast-notification svg{width:24px;height:24px;flex-shrink:0}
.toast-notification.success{border-left:4px solid var(--success)}
.toast-notification.success svg{color:var(--success)}
.toast-notification.error{border-left:4px solid var(--error)}
.toast-notification.error svg{color:var(--error)}
.toast-notification span{font-size:var(--font-size-sm);color:var(--text)}
.toast-enter-active,.toast-leave-active{transition:all 0.3s ease}
.toast-enter-from,.toast-leave-to{opacity:0;transform:translateX(-50%) translateY(20px)}
</style>
