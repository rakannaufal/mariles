<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCategories } from '@/composables/useCategories'
import { useLesPlaces } from '@/composables/useLesPlaces'
import { useIndonesiaLocation } from '@/composables/useIndonesiaLocation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar.vue'
import LesCard from '@/components/LesCard.vue'
import Footer from '@/components/Footer.vue'
import CTASection from '@/components/CTASection.vue'

const router = useRouter()
const authStore = useAuthStore()
const { categories, loading: categoriesLoading, fetchCategories } = useCategories()
const { lesPlaces, loading: lesLoading, fetchLesPlaces } = useLesPlaces()
const { provinces, cities, loadingProvinces, loadingCities, fetchProvinces, fetchCities, formatCityName } = useIndonesiaLocation()

// Guest search
const searchQuery = ref('')
const selectedProvince = ref('')
const selectedCity = ref('')
const isMenuOpen = ref(false)
const showAllLes = ref(false)
const currentSlide = ref(0)
const showProfileMenu = ref(false)

// Banner data from database
const banners = ref([])
const bannersLoading = ref(true)

// ======== LOGGED-IN USER DATA ========
const myClasses = ref([])
const myClassesLoading = ref(true)
const userStats = ref({ totalClasses: 0, averageProgress: 0, achievements: 0 })
const recentActivities = ref([])
const activitiesLoading = ref(true)

// ======== GUEST DATA ========
const platformStats = ref({ totalLesPlaces: 0, totalCities: 0, totalStudents: 0, totalTeachers: 0 })
const statsLoading = ref(true)
const testimonials = ref([])
const testimonialsLoading = ref(true)

// Default banners (fallback)
const defaultBanners = [
  { id: 1, image_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200', title: 'Selamat Datang di Mariles', link: '/register' },
  { id: 2, image_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200', title: 'Belajar Lebih Efektif', link: '/search' },
  { id: 3, image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200', title: 'UTBK 2025 Segera Tiba!', link: '/search?q=UTBK' },
]

// Use fetched banners or defaults
const promoSlides = computed(() => {
  return banners.value.length > 0 ? banners.value : defaultBanners
})

// Kategori utama yang akan ditampilkan di homepage
const mainCategoryNames = ['Matematika', 'Bahasa Inggris', 'Fisika', 'Kimia', 'UTBK/SBMPTN', 'Pemrograman']

const categoryColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']

// Kategori populer dari database (6 kategori utama)
const popularCategories = computed(() => {
  // Filter kategori yang ada di mainCategoryNames
  const filtered = categories.value.filter(c => mainCategoryNames.includes(c.name))
  
  // Jika data dari database belum ada, gunakan fallback
  if (filtered.length === 0) {
    return mainCategoryNames.map((name, idx) => ({
      id: `fallback-${idx}`,
      name: name,
      keywords: [name.toLowerCase()]
    }))
  }
  
  // Map ke format yang dibutuhkan
  return filtered.slice(0, 6).map(c => ({
    id: c.id,
    name: c.name,
    keywords: [c.name.toLowerCase()]
  }))
})

// Les places yang ditampilkan (10 atau semua)
const displayedLes = computed(() => {
  if (showAllLes.value) return lesPlaces.value
  return lesPlaces.value.slice(0, 10)
})

// Fetch banners from database
async function fetchBanners() {
  bannersLoading.value = true
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    banners.value = data || []
  } catch (err) {
    console.log('Using default banners')
    banners.value = []
  } finally {
    bannersLoading.value = false
  }
}

// ======== FETCH LOGGED-IN USER DATA ========
import { useMyClass } from '@/composables/useMyClass'

// ... existing imports

const { 
  fetchMaterials, 
  fetchTests, 
  fetchExercises, 
  calculateCourseProgress,
  materials,
  tests,
  exercises
} = useMyClass()


// ======== FETCH LOGGED-IN USER DATA ========
async function fetchMyClasses() {
  if (!authStore.isAuthenticated) return
  myClassesLoading.value = true
  try {
    // Get student ID
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (!studentData) {
      myClassesLoading.value = false
      return
    }

    // Get enrolled classes
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        id, status, created_at,
        programs (
          id, name, duration_months, schedule, type, class_type,
          les_places (id, name, photos, type)
        )
      `)
      .eq('student_id', studentData.id)
      .in('status', ['active', 'confirmed']) // Exclude 'completed' from "Lanjutkan Belajar"
      .neq('status', 'refunded') // Basic check
      .in('payment_status', ['paid', 'settlement', 'capture'])
      .order('created_at', { ascending: false })
      .limit(5) // Fetch more to account for filtering

    // DEFENSIVE CHECK: Fetch approved refunds to exclude them
    // This handles cases where booking status wasn't updated correctly
    const { data: approvedRefunds } = await supabase
      .from('refunds')
      .select('transaction_id, transactions(booking_id, program_id)')
      .eq('student_id', authStore.user.id) // user_id in refunds is from users table
      .eq('status', 'approved')
    
    let bookings = bookingsData || []
    
    if (approvedRefunds && approvedRefunds.length > 0) {
      // Create a set of refunded program IDs and booking IDs
      const refundedProgramIds = new Set()
      const refundedBookingIds = new Set()
      
      approvedRefunds.forEach(r => {
        if (r.transactions?.program_id) refundedProgramIds.add(r.transactions.program_id)
        if (r.transactions?.booking_id) refundedBookingIds.add(r.transactions.booking_id)
      })
      
      // Filter out bookings that match refunded programs
      bookings = bookings.filter(b => {
        const isRefundedBooking = refundedBookingIds.has(b.id)
        const isRefundedProgram = b.programs?.id && refundedProgramIds.has(b.programs.id) // Note: b.programs not b.program in this query
        
        if (isRefundedBooking || isRefundedProgram) {
          return false
        }
        return true
      })
    }

    // Process each class to get real progress and schedule
    const processedClasses = await Promise.all((bookings || []).map(async booking => {
      // 1. Calculate Real Progress
      // We need to fetch data for this specific program to use calculateCourseProgress
      // Note: useMyClass uses shared refs, so we need to be careful with parallelism if we want to use the composable's state.
      // However, since we are just calculating, we can fetch into local vars or sequentially.
      // To strictly follow the composable pattern without race conditions on the shared refs 'materials', 'tests', etc.,
      // we should probably do this sequentially or instantiate the composable inside the loop if it was a factory (it's not).
      // BUT `useMyClass` exports refs that are shared if created outside component? No, Vue composables usually create fresh refs per call unless defined outside.
      // Let's check useMyClass definition.
      // checked: export function useMyClass() { const materials = ref([]) ... } -> It creates NEW refs every time it's called.
      // So we can instantiate it for each iteration!
      
      const { 
        fetchMaterials, 
        fetchTests, 
        fetchExercises, 
        calculateCourseProgress: calcProgress 
      } = useMyClass()

      if (booking.programs?.id) {
        await Promise.all([
          fetchMaterials(booking.programs.id, studentData.id),
          fetchTests(booking.programs.id, studentData.id, authStore.user.id),
          fetchExercises(booking.programs.id, studentData.id, authStore.user.id)
        ])
      }

      const progress = calcProgress()

      // 2. Check Schedule for Today
      const todayScheduleCount = getTodayScheduleCount(booking.programs?.schedule)

      // 3. Check if Online Class
      const p = booking.programs
      let isOnline = false
      if (p?.class_type) {
        isOnline = p.class_type === 'online'
      } else {
        const type = p?.les_places?.type || p?.type
        isOnline = type && ['Online', 'online', 'Hybrid', 'hybrid'].includes(type)
      }

      return {
        id: booking.id,
        programName: booking.programs?.name || 'Program',
        lesPlaceName: booking.programs?.les_places?.name || 'Tempat Les',
        photo: booking.programs?.les_places?.photos?.[0] || null,
        progress: progress,
        status: booking.status,
        todayScheduleCount: todayScheduleCount,
        isOnline: isOnline
      }
    }))

    // Filter out completed classes (100% progress) from "Lanjutkan Belajar"
    myClasses.value = processedClasses.filter(c => c.progress < 100).slice(0, 3)

    // Calculate user stats
    const { count: totalClasses } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentData.id)
      .in('status', ['active', 'confirmed', 'completed'])
      .in('payment_status', ['paid', 'settlement', 'capture'])

    userStats.value = {
      totalClasses: totalClasses || 0,
      averageProgress: myClasses.value.length > 0 
        ? Math.round(myClasses.value.reduce((sum, c) => sum + c.progress, 0) / myClasses.value.length)
        : 0,
      achievements: Math.floor((totalClasses || 0) * 1.5)
    }
  } catch (err) {
    console.error('Error fetching my classes:', err)
  } finally {
    myClassesLoading.value = false
  }
}

function getTodayScheduleCount(schedule) {
  if (!schedule) return 0
  
  const today = new Date()
  const daysID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const daysEN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayIndex = today.getDay()
  
  const currentDayID = daysID[dayIndex]
  const currentDayEN = daysEN[dayIndex]
  
  let count = 0

  // 1. Array Format: [{ day: 'Senin', ... }, { day: 'Monday', ... }]
  if (Array.isArray(schedule)) {
    count = schedule.filter(s => {
      if (!s.day) return false
      const d = s.day.toLowerCase()
      return d === currentDayID.toLowerCase() || d === currentDayEN.toLowerCase()
    }).length
  } 
  // 2. Object Format: { "Senin": ..., "Monday": ..., "day": "Senin" }
  else if (typeof schedule === 'object') {
    // Check 'day' property if it exists (single schedule object)
    if (schedule.day) {
      const d = schedule.day.toLowerCase()
      if (d === currentDayID.toLowerCase() || d === currentDayEN.toLowerCase()) {
        count = 1
      }
    }
    // Check keys (dictionary format: { "Senin": {...}, "kamis": {...} })
    else {
      // Check for ID keys
      if (schedule[currentDayID] || schedule[currentDayID.toLowerCase()] || schedule[currentDayID.toUpperCase()]) count = 1
      // Check for EN keys
      if (schedule[currentDayEN] || schedule[currentDayEN.toLowerCase()] || schedule[currentDayEN.toUpperCase()]) count = 1
    }
  }

  // Debug log
  console.log('Checking schedule:', { schedule, dayID: currentDayID, dayEN: currentDayEN, count })

  return count
}


async function fetchRecentActivities() {
  if (!authStore.isAuthenticated) return
  activitiesLoading.value = true
  try {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, created_at, is_read')
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    recentActivities.value = data || []
  } catch (err) {
    console.error('Error fetching activities:', err)
  } finally {
    activitiesLoading.value = false
  }
}

// ======== FETCH GUEST DATA ========
async function fetchPlatformStats() {
  statsLoading.value = true
  try {
    // Count les places
    const { count: lesCount } = await supabase
      .from('les_places')
      .select('id', { count: 'exact', head: true })

    // Count unique cities
    const { data: citiesData } = await supabase
      .from('les_places')
      .select('city')
    const uniqueCities = new Set((citiesData || []).map(l => l.city).filter(Boolean))

    // Count students
    const { count: studentsCount } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })

    // Count teachers
    const { count: teachersCount } = await supabase
      .from('teachers')
      .select('id', { count: 'exact', head: true })

    platformStats.value = {
      totalLesPlaces: lesCount || 0,
      totalCities: uniqueCities.size || 0,
      totalStudents: studentsCount || 0,
      totalTeachers: teachersCount || 0
    }
  } catch (err) {
    console.error('Error fetching platform stats:', err)
  } finally {
    statsLoading.value = false
  }
}

async function fetchTestimonials() {
  testimonialsLoading.value = true
  try {
    const { data } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        students (users (name)),
        les_places (name)
      `)
      .eq('is_visible', true)
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(4)

    testimonials.value = data || []
  } catch (err) {
    console.error('Error fetching testimonials:', err)
    // Fallback: try without is_visible filter (column might not exist)
    try {
      const { data } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          students (users (name)),
          les_places (name)
        `)
        .gte('rating', 4)
        .order('created_at', { ascending: false })
        .limit(4)
      testimonials.value = data || []
    } catch (e) {
      testimonials.value = []
    }
  } finally {
    testimonialsLoading.value = false
  }
}

let slideInterval = null

onMounted(async () => {
  // Common data
  await Promise.all([
    fetchBanners(),
    fetchCategories(),
    fetchLesPlaces({ limit: 20 }),
    fetchProvinces()
  ])
  
  // Conditional data based on auth
  if (authStore.isAuthenticated) {
    await Promise.all([
      fetchMyClasses(),
      fetchRecentActivities()
    ])
  } else {
    await Promise.all([
      fetchPlatformStats(),
      fetchTestimonials()
    ])
  }
  
  // Auto slide carousel
  slideInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % promoSlides.value.length
  }, 5000)
})

onUnmounted(() => {
  if (slideInterval) clearInterval(slideInterval)
})

function handleSearch() {
  router.push({ path: '/search', query: { q: searchQuery.value, city: selectedCity.value || undefined } })
}

function onProvinceChange() {
  selectedCity.value = ''
  if (selectedProvince.value) {
    fetchCities(selectedProvince.value)
  }
}

function goToCategory(category) {
  // Search by first keyword or name
  const searchTerm = category.keywords?.[0] || category.name
  router.push({ path: '/search', query: { q: searchTerm } })
}

function getImage(les) {
  if (les.photos && les.photos.length > 0) return les.photos[0]
  return 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400'
}

function getCategoryColor(index) {
  return categoryColors[index % categoryColors.length]
}

function goToSlide(index) {
  currentSlide.value = index
}

function prevSlide() {
  currentSlide.value = (currentSlide.value - 1 + promoSlides.value.length) % promoSlides.value.length
}

function nextSlide() {
  currentSlide.value = (currentSlide.value + 1) % promoSlides.value.length
}

function toggleShowAllLes() {
  showAllLes.value = !showAllLes.value
}

async function handleLogout() {
  await authStore.signOut()
  showProfileMenu.value = false
  router.push('/')
}

function getDisplayName() {
  if (authStore.userProfile?.name) return authStore.userProfile.name.split(' ')[0]
  if (authStore.user?.email) return authStore.user.email.split('@')[0]
  return 'User'
}

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `${diffMins} menit yang lalu`
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  if (diffDays < 7) return `${diffDays} hari yang lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const currentDate = computed(() => {
  return new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
})
</script>

<template>
  <div class="home-page">

    <!-- Navbar Component -->
    <Navbar />

    <!-- ========== CONTENT FOR LOGGED IN USER ========== -->
    <template v-if="authStore.isAuthenticated">
      
      <!-- 1. WELCOME SECTION (Standard Container, Pure White Text, Date) -->
      <section class="welcome-section">
        <div class="container">
          <div class="welcome-card">
            <div class="welcome-text">
              <h2>Selamat datang kembali, {{ getDisplayName() }}!</h2>
              <p>Yuk lanjutkan belajar hari ini</p>
            </div>
            <div class="welcome-right-content">
              <span class="current-date">{{ currentDate }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. KELAS SAYA SECTION -->
      <section class="my-classes-section" v-if="myClasses.length > 0 || myClassesLoading">
        <div class="container">
          <div class="section-header-row">
            <div class="section-header">
              <h2 class="section-title">Lanjutkan Belajar</h2>
              <p class="section-subtitle">Kelas yang sedang kamu ikuti</p>
            </div>
            <router-link to="/student/myclass" class="see-all-link">
              Lihat Semua 
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </router-link>
          </div>

          <div v-if="myClassesLoading" class="loading-state">
            <div class="loading-spinner"></div>
          </div>

          <div v-else class="my-classes-grid">
            <div v-for="cls in myClasses" :key="cls.id" class="my-class-card">
              <div class="class-photo">
                <img v-if="cls.photo" :src="cls.photo" :alt="cls.programName">
                <div v-else class="photo-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                </div>
              </div>
              <div class="class-info">
                <div class="class-header-row">
                  <h4>{{ cls.programName }}</h4>
                  <span v-if="cls.todayScheduleCount > 0" class="today-schedule-badge">
                    {{ cls.todayScheduleCount }} Jadwal Hari Ini
                  </span>
                </div>
                <p class="class-place">{{ cls.lesPlaceName }}</p>
                <div v-if="cls.isOnline" class="progress-container">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: cls.progress + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ cls.progress }}%</span>
                </div>
                <router-link 
                  :to="`/student/myclass/${cls.id}`" 
                  class="btn-continue"
                >
                  Lanjutkan
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </router-link>
              </div>
            </div>

            <!-- Add new class card -->
            <router-link to="/search" class="my-class-card add-card">
              <div class="add-icon">+</div>
              <p>Cari Kelas Baru</p>
            </router-link>
          </div>
        </div>
      </section>



      <!-- 4. REKOMENDASI TEMPAT LES -->
      <section class="les-section">
        <div class="container">
          <div class="section-header-row">
            <div class="section-header">
              <h2 class="section-title">Rekomendasi Untuk Kamu</h2>
              <p class="section-subtitle">Berdasarkan minat dan lokasi kamu</p>
            </div>
            <router-link to="/search" class="see-all-link">
              Lihat Semua 
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </router-link>
          </div>

          <div v-if="lesLoading" class="loading-state">
            <div class="loading-spinner"></div>
          </div>

          <div v-else-if="displayedLes.length" class="les-grid">
            <LesCard v-for="les in displayedLes" :key="les.id" :les-place="les" />
          </div>

          <div v-else class="empty-state">
            <p>Belum ada tempat les tersedia</p>
          </div>

          <div v-if="lesPlaces.length > 10" class="section-action">
            <button class="btn btn-outline btn-lg" @click="toggleShowAllLes">
              {{ showAllLes ? 'Tampilkan Lebih Sedikit' : 'Lihat Selengkapnya' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 5. AKTIVITAS TERBARU -->
      <section class="activities-section" v-if="recentActivities.length > 0">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Aktivitas Terbaru</h2>
            <p class="section-subtitle">Update dari kelas kamu</p>
          </div>

          <div class="activities-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item" :class="{ unread: !activity.is_read }">
              <div class="activity-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <div class="activity-content">
                <h4>{{ activity.title }}</h4>
                <p>{{ activity.message }}</p>
                <span class="activity-time">{{ formatTimeAgo(activity.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </template>

    <!-- ========== CONTENT FOR GUEST ========== -->
    <template v-else>
      
      <!-- 1. HERO BANNER - FULL WIDTH, NO NAV BUTTONS -->
      <section class="hero-banner-section">
        <div class="hero-banner-wrapper">
          <div class="banner-track">
            <div 
              v-for="(slide, index) in promoSlides" 
              :key="slide.id" 
              class="banner-slide"
              :class="{ active: currentSlide === index, clickable: slide.link }"
              @click="slide.link ? router.push(slide.link) : null"
            >
              <img :src="slide.image_url" :alt="slide.title">
            </div>
          </div>
        </div>
        
        <div class="banner-dots">
          <button 
            v-for="(slide, index) in promoSlides" 
            :key="slide.id" 
            class="banner-dot" 
            :class="{ active: currentSlide === index }"
            @click="goToSlide(index)"
          ></button>
        </div>
      </section>

      <!-- 2. KATEGORI SECTION - No Icons, Text Only -->
      <section class="kategori-section">
        <div class="container">
          <div class="kategori-row">
            <button 
              v-for="cat in popularCategories.slice(0, 6)" 
              :key="cat.id" 
              class="kategori-item"
              @click="goToCategory(cat)"
            >
              <span class="kategori-name">{{ cat.name }}</span>
            </button>
            <router-link to="/search" class="kategori-item see-all">
              <span class="kategori-name">Semua Kategori</span>
            </router-link>
          </div>
        </div>
      </section>

      <!-- 3. PAKET POPULER (LES CARDS) - No Dropdown -->
      <section class="paket-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Rekomendasi Tempat Les</h2>
            <p class="section-subtitle">Temukan tempat les terbaik untuk Anda</p>
          </div>

          <div v-if="lesLoading" class="loading-state">
            <div class="loading-spinner"></div>
          </div>

          <div v-else-if="displayedLes.length" class="les-grid">
            <LesCard v-for="les in displayedLes" :key="les.id" :les-place="les" />
          </div>

          <div v-else class="empty-state">
            <p>Belum ada tempat les tersedia</p>
          </div>

          <div v-if="lesPlaces.length > 10" class="section-action">
            <button class="btn btn-outline btn-lg" @click="toggleShowAllLes">
              {{ showAllLes ? 'Tampilkan Lebih Sedikit' : 'Lihat Selengkapnya' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 4. STATISTIK PLATFORM -->
      <section class="stats-section">
        <div class="container">
          <div class="stats-row">
            <div class="stat-box">
              <span class="stat-value">{{ platformStats.totalLesPlaces || '3' }}+</span>
              <span class="stat-label">Tempat Les</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ platformStats.totalCities || '1' }}+</span>
              <span class="stat-label">Kota</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ platformStats.totalStudents || '23' }}+</span>
              <span class="stat-label">Siswa</span>
            </div>
            <div class="stat-box">
              <span class="stat-value">{{ platformStats.totalTeachers || '4' }}+</span>
              <span class="stat-label">Guru </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 5. TESTIMONI SISWA (jika ada) -->
      <section class="testimoni-section" v-if="testimonials.length > 0">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Apa Kata Mereka?</h2>
            <p class="section-subtitle">Testimoni dari siswa yang sudah bergabung</p>
          </div>

          <div class="testimoni-grid">
            <div v-for="testi in testimonials" :key="testi.id" class="testimoni-card">
              <div class="testimoni-rating">
                <span v-for="n in 5" :key="n" class="star" :class="{ filled: n <= testi.rating }">&#9733;</span>
              </div>
              <p class="testimoni-text">"{{ testi.comment }}"</p>
              <div class="testimoni-author">
                <div class="author-avatar">{{ testi.students?.users?.name?.charAt(0) || 'A' }}</div>
                <div class="author-info">
                  <span class="author-name">{{ testi.students?.users?.name || 'Anonim' }}</span>
                  <span class="author-place">{{ testi.les_places?.name || 'Tempat Les' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </template>

    <!-- ========== FOOTER ========== -->
    <Footer />
  </div>
</template>

<style scoped>
/* ========== NAVBAR GUEST ========== */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--primary);
  box-shadow: var(--shadow-md);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  text-decoration: none;
}

.logo-text {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: white;
  background: none;
  -webkit-text-fill-color: white;
}

.nav-links {
  display: flex;
  gap: var(--spacing-xl);
}

.nav-link {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  transition: color var(--transition-fast);
}

.nav-link:hover {
  color: white;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.nav-actions .btn-ghost {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.nav-actions .btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-actions .btn-primary {
  background: white;
  color: var(--primary);
}

.nav-actions .btn-primary:hover {
  background: rgba(255, 255, 255, 0.9);
}

.mobile-menu-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
}

.mobile-menu-btn span {
  width: 24px;
  height: 2px;
  background: white;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--primary);
    flex-direction: column;
    padding: var(--spacing-lg);
    gap: var(--spacing-md);
    box-shadow: var(--shadow-lg);
  }
  .nav-links.active {
    display: flex;
  }
  .mobile-menu-btn {
    display: flex;
  }
  .nav-actions .btn:first-child {
    display: none;
  }
}

/* ========== NAVBAR LOGGED IN ========== */
.navbar-logged {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--primary);
  box-shadow: var(--shadow-md);
}

.navbar-logged .nav-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  height: 64px;
}

.navbar-logged .logo {
  flex-shrink: 0;
}

.navbar-logged .logo-text {
  color: white;
  background: none;
  -webkit-text-fill-color: white;
}

.nav-search {
  flex: 1;
  max-width: 400px;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-full);
  border: none;
}

.nav-search:focus-within {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.nav-search .search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.nav-search input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  outline: none;
  color: var(--text);
}

.nav-search input::placeholder {
  color: var(--text-muted);
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-left: auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--spacing-sm) var(--spacing-md);
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.nav-item svg {
  width: 20px;
  height: 20px;
}

.nav-profile {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs);
  cursor: pointer;
  border-radius: var(--radius-lg);
}

.nav-profile:hover {
  background: rgba(255, 255, 255, 0.15);
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  font-weight: 600;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: white;
}

.chevron {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.7);
  transition: transform var(--transition-fast);
}

.chevron.open {
  transform: rotate(180deg);
}

.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 200px;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-light);
  overflow: hidden;
  z-index: 50;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text);
  font-size: var(--font-size-sm);
  transition: background var(--transition-fast);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}

.dropdown-item:hover {
  background: var(--background);
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
}

.dropdown-item.logout {
  color: var(--error);
}

.dropdown-item.logout svg {
  color: var(--error);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-light);
}

@media (max-width: 768px) {
  .nav-search {
    display: none;
  }
  .nav-item span {
    display: none;
  }
  .nav-item {
    padding: var(--spacing-sm);
  }
}

/* ========== CAROUSEL COVERFLOW STYLE ========== */
.carousel-section {
  margin-top: 72px;
  padding: var(--spacing-md) 0;
  background: var(--background);
}

.carousel-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  z-index: 20;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
}

.carousel-wrapper:hover .carousel-btn {
  opacity: 1;
  pointer-events: auto;
}

.carousel-btn:hover {
  background: var(--secondary);
  color: white;
  transform: translateY(-50%) scale(1.1);
}

.carousel-btn.prev {
  left: calc(50% - 42%);
}

.carousel-btn.next {
  right: calc(50% - 42%);
}

.carousel-btn svg {
  width: 18px;
  height: 18px;
}

.carousel-container {
  width: 100%;
  overflow: hidden;
  position: relative;
  height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-track {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  height: 100%;
}

.carousel-slide {
  position: absolute;
  width: 78%;
  max-width: 1000px;
  aspect-ratio: 16/9;
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: pointer;
  opacity: 0;
  transform: scale(0.7);
  pointer-events: none;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  background: #f0f0f0;
}

.carousel-slide.active {
  opacity: 1;
  transform: scale(1) translateX(0);
  z-index: 10;
  pointer-events: auto;
  border-color: rgba(255, 255, 255, 0.4);
}

.carousel-slide.prev {
  opacity: 0.35;
  transform: scale(0.55) translateX(-55%);
  z-index: 5;
  pointer-events: auto;
}

.carousel-slide.next {
  opacity: 0.35;
  transform: scale(0.55) translateX(55%);
  z-index: 5;
  pointer-events: auto;
}

.slide-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  color: white;
}

.slide-content h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: white;
}

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: var(--spacing-sm);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dot.active {
  background: var(--secondary);
  width: 20px;
  border-radius: 4px;
}

/* ========== LES SECTION (LOGGED IN) ========== */
.les-section {
  padding: var(--spacing-md) 0;
  background: white;
}

.les-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-lg);
}

@media (max-width: 1200px) {
  .les-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1024px) {
  .les-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .les-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .les-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== LES CARDS ========== */
.les-card {
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.les-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
}

.les-card a {
  display: block;
  color: inherit;
}

.les-image {
  position: relative;
  aspect-ratio: 16/10;
}

.les-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.les-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--secondary);
}

.les-body {
  padding: var(--spacing-lg);
}

.les-name {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.les-location {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.les-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.les-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.les-rating .star {
  color: var(--warning);
}

.les-reviews {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* ========== HERO ========== */
.hero {
  position: relative;
  padding: 160px 0 100px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--background), rgba(136, 208, 228, 0.1));
}

.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.hero-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
  filter: blur(60px);
}

.hero-shape-1 {
  width: 400px;
  height: 400px;
  background: var(--primary);
  top: -100px;
  right: -100px;
  animation: float 6s ease-in-out infinite;
}

.hero-shape-2 {
  width: 300px;
  height: 300px;
  background: var(--accent);
  bottom: 0;
  left: -50px;
  animation: float 8s ease-in-out infinite reverse;
}

.hero-shape-3 {
  width: 200px;
  height: 200px;
  background: var(--secondary);
  top: 50%;
  left: 50%;
  animation: float 7s ease-in-out infinite;
}

.hero-content {
  position: relative;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: var(--spacing-lg);
}

.hero-subtitle {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-2xl);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: white;
  padding: 10px 12px;
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
}

.search-input-group {
  flex: 2;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-sm);
  min-width: 200px;
}

.icon {
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  font-size: 14px;
  outline: none;
  min-width: 120px;
}

.search-location {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 var(--spacing-sm);
  border-left: 1px solid var(--border);
}

.location-select {
  border: none;
  font-size: 13px;
  outline: none;
  background: transparent;
  cursor: pointer;
  max-width: 140px;
  text-overflow: ellipsis;
}

.search-btn {
  white-space: nowrap;
  padding: 10px 20px;
  font-size: 14px;
}

@media (max-width: 768px) {
  .search-box {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .search-location {
    border-left: none;
    border-top: 1px solid var(--border);
    padding-top: var(--spacing-sm);
    width: 100%;
  }
  .search-input-group {
    width: 100%;
  }
  .location-select {
    max-width: 100%;
  }
}

/* ========== CATEGORIES ========== */
.categories-section {
  padding: var(--spacing-3xl) 0;
  background: white;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  background: var(--background);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-base);
  border: 2px solid transparent;
  min-height: 100px;
}

.category-card:hover {
  transform: translateY(-4px);
  border-color: var(--category-color);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.category-name {
  font-weight: 600;
  color: var(--text);
}

@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ========== FEATURED ========== */
.featured-section {
  padding: var(--spacing-3xl) 0;
  background: var(--background);
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-lg);
}

@media (max-width: 1200px) {
  .featured-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1024px) {
  .featured-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .featured-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== HOW IT WORKS ========== */
.how-it-works-section {
  padding: var(--spacing-3xl) 0;
  background: white;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

.step-card {
  text-align: center;
  padding: var(--spacing-xl);
}

.step-number {
  width: 50px;
  height: 50px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--font-size-xl);
  margin: 0 auto var(--spacing-lg);
}

.step-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
}

.step-desc {
  color: var(--text-secondary);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .steps-grid {
    grid-template-columns: 1fr;
  }
}

/* ========== COMMON ========== */
.section-header {
  text-align: center;
  margin-bottom: var(--spacing-md);
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.section-header-row .section-header {
  text-align: left;
  margin-bottom: 0;
}

.see-all-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--primary);
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.see-all-link svg {
  width: 16px;
  height: 16px;
}

.section-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: 4px;
}

.section-subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.section-action {
  text-align: center;
  margin-top: var(--spacing-2xl);
}

.loading-state {
  text-align: center;
  padding: var(--spacing-3xl);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--text-muted);
}

/* ========== WELCOME SECTION ========== */
.welcome-section {
  margin-top: 60px;
  padding: 32px 0;
  background: #0891b2;
}

.welcome-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.welcome-text h2 {
  font-size: 28px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

.welcome-text p {
  font-size: 16px;
  color: #FFFFFF;
  margin: 0;
  font-weight: 500;
}

.welcome-right-content {
  display: flex;
  align-items: center;
}

.current-date {
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.15);
  padding: 10px 20px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

@media (max-width: 768px) {
  .welcome-card {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
}

/* ========== MY CLASSES SECTION ========== */
.my-classes-section {
  padding: var(--spacing-2xl) 0;
  background: white;
}

.my-classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.my-class-card {
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.my-class-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.class-photo {
  height: 120px;
  overflow: hidden;
  background: var(--background);
}

.class-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f4f8;
}

.photo-placeholder svg {
  width: 48px;
  height: 48px;
  stroke: #94a3b8;
}

.class-info {
  padding: var(--spacing-md);
}


.class-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.class-header-row h4 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text);
  margin: 0;
  flex: 1;
}

.today-schedule-badge {
  font-size: 10px;
  font-weight: 600;
  color: #d946ef;
  background: #fdf4ff;
  padding: 4px 8px;
  border-radius: 99px;
  border: 1px solid #f0abfc;
  white-space: nowrap;
}

.class-place {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-sm);
}

.progress-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--background);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.btn-continue {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--primary);
  color: white;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: var(--font-size-sm);
  transition: background var(--transition-fast);
}

.btn-continue:hover {
  background: var(--primary-dark);
}

.btn-continue svg {
  width: 16px;
  height: 16px;
}

.my-class-card.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 2px dashed var(--border);
  background: var(--background);
  text-decoration: none;
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.my-class-card.add-card:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(102, 126, 234, 0.05);
}

.add-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: var(--spacing-sm);
}

/* ========== CAROUSEL COMPACT ========== */
.carousel-section.compact {
  padding: var(--spacing-md) 0;
}

.carousel-section.compact .carousel-container {
  height: 260px;
}

/* ========== ACTIVITIES SECTION ========== */
.activities-section {
  padding: var(--spacing-2xl) 0;
  background: var(--background);
}

.activities-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-width: 800px;
  margin: 0 auto;
}

.activity-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  transition: background var(--transition-fast);
}

.activity-item.unread {
  background: #f0f7ff;
  border-color: #c3dafe;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon svg {
  width: 20px;
  height: 20px;
  stroke: #d97706;
}

.activity-content h4 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.activity-content p {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.activity-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* ========== PLATFORM STATS SECTION ========== */
.platform-stats-section {
  padding: var(--spacing-xl) 0;
  background: var(--primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.platform-stat-item {
  text-align: center;
  color: white;
}

.stat-number {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 4px;
}

.stat-desc {
  font-size: var(--font-size-sm);
  opacity: 0.9;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-number {
    font-size: 28px;
  }
}

/* ========== CATEGORIES SECTION ========== */
.categories-section {
  padding: var(--spacing-2xl) 0;
  background: white;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-md);
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-md);
  background: white;
  border: 2px solid var(--border-light);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-card:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, white);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.category-icon {
  font-size: 32px;
}

.category-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text);
  text-align: center;
}

/* ========== TESTIMONIALS SECTION ========== */
.testimonials-section {
  padding: var(--spacing-2xl) 0;
  background: var(--background);
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

.testimonial-card {
  background: white;
  padding: var(--spacing-lg);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
}

.testimonial-rating {
  margin-bottom: var(--spacing-sm);
}

.testimonial-rating .star {
  color: #e0e0e0;
  font-size: 18px;
}

.testimonial-rating .star.filled {
  color: #f59e0b;
}

.testimonial-text {
  font-size: var(--font-size-base);
  color: var(--text);
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text);
}

.author-place {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

/* ========== HERO BANNER FULL WIDTH ========== */
.hero-banner-section {
  margin-top: 60px;
  position: relative;
  background: #e0e0e0;
}

.hero-banner-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.banner-track {
  position: relative;
  width: 100%;
}

.banner-slide {
  display: none;
  width: 100%;
}

.banner-slide.active {
  display: block;
}

.banner-slide img {
  width: 100%;
  height: auto;
  max-height: 420px;
  object-fit: cover;
}

.banner-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.banner-nav:hover {
  background: var(--primary);
  color: white;
}

.banner-nav svg {
  width: 24px;
  height: 24px;
}

.banner-nav.prev {
  left: 20px;
}

.banner-nav.next {
  right: 20px;
}

.banner-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 0;
  background: white;
}

.banner-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: #d0d0d0;
  cursor: pointer;
  transition: all 0.2s;
}

.banner-dot.active {
  background: var(--primary);
  width: 24px;
  border-radius: 5px;
}

/* ========== KATEGORI SECTION ========== */
.kategori-section {
  padding: 20px 0;
  background: white;
  border-bottom: 1px solid var(--border-light);
}

.kategori-row {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.kategori-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  color: inherit;
}

.kategori-item:hover {
  border-color: var(--primary);
  background: #f0f7ff;
  color: var(--primary);
}

.kategori-item.see-all {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.kategori-item.see-all:hover {
  background: #e8e8e8;
  border-color: #999;
  color: var(--text);
}

.kategori-name {
  font-size: 14px;
  font-weight: 500;
  color: inherit;
  white-space: nowrap;
}

/* ========== PAKET SECTION ========== */
.paket-section {
  padding: 32px 0;
  background: white;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.section-header-left .section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.level-select {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  background: white;
  cursor: pointer;
}

.level-select:focus {
  outline: none;
  border-color: var(--primary);
}

/* ========== STATS SECTION ========== */
.stats-section {
  padding: 48px 0;
  background: #f0f7ff;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
}

.stat-box {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 42px;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 15px;
  color: var(--text-secondary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
  .stat-value {
    font-size: 32px;
  }
}

/* ========== TESTIMONI SECTION ========== */
.testimoni-section {
  padding: 48px 0;
  background: white;
}

.testimoni-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.testimoni-card {
  background: #fafafa;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid var(--border-light);
}

.testimoni-rating {
  margin-bottom: 12px;
}

.testimoni-rating .star {
  color: #e0e0e0;
  font-size: 18px;
}

.testimoni-rating .star.filled {
  color: #f59e0b;
}

.testimoni-text {
  font-size: 15px;
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 16px;
  font-style: italic;
}

.testimoni-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ========== CTA SECTION ========== */
.cta-section {
  padding: 64px 0;
  background: #1e293b;
}

.cta-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

.cta-box {
  padding: 40px;
  border-radius: 20px;
  text-align: center;
}

.cta-box.student {
  background: #0891b2;
  color: white;
}

.cta-box.owner {
  background: #0891b2;
  color: white;
}

.cta-box h3 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}

.cta-box p {
  opacity: 0.9;
  margin-bottom: 24px;
  line-height: 1.6;
  font-size: 15px;
}

.btn-cta {
  display: inline-block;
  padding: 14px 32px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.2s;
  text-decoration: none;
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-cta:hover {
  background: white;
  color: #0891b2;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .cta-row {
    grid-template-columns: 1fr;
  }
  .cta-box {
    padding: 32px;
  }
  .kategori-row {
    gap: 16px;
  }
  .kategori-item {
    min-width: 80px;
    padding: 8px 12px;
  }
  .kategori-icon {
    width: 40px;
    height: 40px;
  }
}
/* Cursor Pointer for Clickable Banners */
.banner-slide.clickable {
  cursor: pointer;
}
</style>
