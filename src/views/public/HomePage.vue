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

// Default banners (fallback)
const defaultBanners = [
  { id: 1, image_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200', title: 'Selamat Datang di Mariles' },
  { id: 2, image_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200', title: 'Belajar Lebih Efektif' },
  { id: 3, image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200', title: 'UTBK 2025 Segera Tiba!' },
]

// Use fetched banners or defaults
const promoSlides = computed(() => {
  return banners.value.length > 0 ? banners.value : defaultBanners
})

// Mata pelajaran penting untuk anak sekolah
const importantSubjects = [
  'Matematika', 'Bahasa Inggris', 'Bahasa Indonesia', 'Fisika', 
  'Kimia', 'Biologi', 'IPA', 'IPS'
]

const categoryColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']

// Filter 8 kategori penting untuk guest
const popularCategories = computed(() => {
  if (!categories.value.length) return []
  
  const filtered = categories.value.filter(cat => 
    importantSubjects.some(subj => cat.name.toLowerCase().includes(subj.toLowerCase()))
  )
  
  // Sort berdasarkan urutan di importantSubjects
  filtered.sort((a, b) => {
    const indexA = importantSubjects.findIndex(s => a.name.toLowerCase().includes(s.toLowerCase()))
    const indexB = importantSubjects.findIndex(s => b.name.toLowerCase().includes(s.toLowerCase()))
    return indexA - indexB
  })
  
  return filtered.slice(0, 8)
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

let slideInterval = null

onMounted(async () => {
  await Promise.all([
    fetchBanners(),
    fetchCategories(),
    fetchLesPlaces({ limit: 20 }),
    fetchProvinces()
  ])
  
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
  router.push({ path: '/search', query: { category: category.name } })
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
</script>

<template>
  <div class="home-page">

    <!-- Navbar Component -->
    <Navbar />

    <!-- ========== CONTENT FOR LOGGED IN USER ========== -->
    <template v-if="authStore.isAuthenticated">
      <!-- Carousel Section - Coverflow Style -->
      <section class="carousel-section">
        <div class="container">
          <div class="carousel-wrapper">
            <button class="carousel-btn prev" @click="prevSlide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            
            <div class="carousel-container">
              <div class="carousel-track">
                <div 
                  v-for="(slide, index) in promoSlides" 
                  :key="slide.id" 
                  class="carousel-slide"
                  :class="{
                    active: currentSlide === index,
                    prev: currentSlide === index + 1 || (currentSlide === 0 && index === promoSlides.length - 1),
                    next: currentSlide === index - 1 || (currentSlide === promoSlides.length - 1 && index === 0)
                  }"
                  @click="goToSlide(index)"
                >
                  <img :src="slide.image_url" :alt="slide.title">
                  <div class="slide-content">
                    <h3>{{ slide.title }}</h3>
                  </div>
                </div>
              </div>
            </div>

            <button class="carousel-btn next" @click="nextSlide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="carousel-dots">
            <button 
              v-for="(slide, index) in promoSlides" 
              :key="slide.id" 
              class="dot" 
              :class="{ active: currentSlide === index }"
              @click="goToSlide(index)"
            ></button>
          </div>
        </div>
      </section>

      <!-- Les Cards Section -->
      <section class="les-section">
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
    </template>

    <!-- ========== CONTENT FOR GUEST (Same as logged in) ========== -->
    <template v-else>
      <!-- Carousel Section - Coverflow Style -->
      <section class="carousel-section">
        <div class="container">
          <div class="carousel-wrapper">
            <button class="carousel-btn prev" @click="prevSlide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            
            <div class="carousel-container">
              <div class="carousel-track">
                <div 
                  v-for="(slide, index) in promoSlides" 
                  :key="slide.id" 
                  class="carousel-slide"
                  :class="{
                    active: currentSlide === index,
                    prev: currentSlide === index + 1 || (currentSlide === 0 && index === promoSlides.length - 1),
                    next: currentSlide === index - 1 || (currentSlide === promoSlides.length - 1 && index === 0)
                  }"
                  @click="goToSlide(index)"
                >
                  <img :src="slide.image_url" :alt="slide.title">
                  <div class="slide-content">
                    <h3>{{ slide.title }}</h3>
                  </div>
                </div>
              </div>
            </div>

            <button class="carousel-btn next" @click="nextSlide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div class="carousel-dots">
            <button 
              v-for="(slide, index) in promoSlides" 
              :key="slide.id" 
              class="dot" 
              :class="{ active: currentSlide === index }"
              @click="goToSlide(index)"
            ></button>
          </div>
        </div>
      </section>

      <!-- Les Cards Section -->
      <section class="les-section">
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

      <!-- CTA Section for Guest -->
      <CTASection 
        title="Siap Memulai?" 
        subtitle="Bergabung dengan ribuan siswa dan guru yang sudah merasakan manfaat Mariles"
        primaryText="Daftar Sekarang"
        primaryLink="/register"
        secondaryText="Jelajahi Tempat Les"
        secondaryLink="/search"
      />
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
</style>
