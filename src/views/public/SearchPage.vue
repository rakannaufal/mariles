<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLesPlaces } from '@/composables/useLesPlaces'
import { useCategories } from '@/composables/useCategories'
import { usePrograms } from '@/composables/usePrograms'
import { useIndonesiaLocation } from '@/composables/useIndonesiaLocation'
import Navbar from '@/components/Navbar.vue'
import LesCard from '@/components/LesCard.vue'
import ProgramCard from '@/components/ProgramCard.vue'
import Footer from '@/components/Footer.vue'

const route = useRoute()
const router = useRouter()
const { lesPlaces, loading, fetchLesPlaces } = useLesPlaces()
const { categories, fetchCategories } = useCategories()
const { programs: allPrograms, loading: programsLoading, fetchAllPrograms } = usePrograms()
const { provinces, cities, loadingProvinces, loadingCities, fetchProvinces, fetchCities, formatCityName } = useIndonesiaLocation()

// Pending filter values (not applied yet)
const searchQuery = ref(route.query.q || '')
const selectedCategory = ref(route.query.category || '')
const selectedProvince = ref('')
const selectedCity = ref(route.query.city || '')
const selectedType = ref(route.query.type || '')
const selectedPriceRange = ref('')
const selectedRating = ref('')
const selectedEducation = ref('')
const sortBy = ref('popular')
const showMobileFilter = ref(false)

// Applied filters (used for actual filtering)
const appliedFilters = ref({
  searchQuery: route.query.q || '',
  province: '',
  city: route.query.city || '',
  type: route.query.type || '',
  category: route.query.category || '',
  priceRange: '',
  rating: '',
  education: ''
})

// Price ranges
const priceRanges = [
  { value: '', label: 'Semua Harga' },
  { value: '0-500000', label: 'Di bawah Rp 500rb' },
  { value: '500000-1000000', label: 'Rp 500rb - 1jt' },
  { value: '1000000-2000000', label: 'Rp 1jt - 2jt' },
  { value: '2000000-5000000', label: 'Rp 2jt - 5jt' },
  { value: '5000000+', label: 'Di atas Rp 5jt' }
]

// Education levels - static list
const educationLevels = [
  { value: '', label: 'Semua Jenjang' },
  { value: 'sd', label: 'SD' },
  { value: 'smp', label: 'SMP' },
  { value: 'sma', label: 'SMA/SMK' },
  { value: 'universitas', label: 'Kuliah/Universitas' },
  { value: 'umum', label: 'Umum' }
]

const filteredResults = computed(() => {
  let results = [...lesPlaces.value]
  
  if (appliedFilters.value.searchQuery) {
    const q = appliedFilters.value.searchQuery.toLowerCase()
    results = results.filter(l => l.name.toLowerCase().includes(q) || (l.description && l.description.toLowerCase().includes(q)))
  }
  
  if (appliedFilters.value.city) {
    results = results.filter(l => l.city?.toLowerCase().includes(appliedFilters.value.city.toLowerCase()))
  }
  
  if (appliedFilters.value.type) {
    results = results.filter(l => l.type === appliedFilters.value.type)
  }
  
  if (appliedFilters.value.rating) {
    const minRating = parseFloat(appliedFilters.value.rating)
    results = results.filter(l => (l.rating || 0) >= minRating)
  }
  
  if (appliedFilters.value.priceRange) {
    const [min, max] = appliedFilters.value.priceRange.split('-').map(v => v === '' ? 0 : parseInt(v.replace('+', '')))
    results = results.filter(l => {
      const price = l.min_price || l.programs?.[0]?.price || 0
      if (appliedFilters.value.priceRange.includes('+')) return price >= min
      return price >= min && price <= (max || Infinity)
    })
  }
  
  if (appliedFilters.value.education) {
    results = results.filter(l => {
      if (!l.programs?.length) return false
      return l.programs.some(program => {
        const eduLevel = program.education_level?.toLowerCase() || ''
        const name = program.name?.toLowerCase() || ''
        const filterEdu = appliedFilters.value.education
        if (eduLevel === filterEdu) return true
        if (filterEdu === 'sd' && (name.includes('sd') || name.includes('sekolah dasar'))) return true
        if (filterEdu === 'smp' && name.includes('smp')) return true
        if (filterEdu === 'sma' && (name.includes('sma') || name.includes('smk'))) return true
        if (filterEdu === 'universitas' && (name.includes('universitas') || name.includes('kuliah'))) return true
        return false
      })
    })
  }
  
  if (sortBy.value === 'rating') results.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  else if (sortBy.value === 'price_low') results.sort((a, b) => (a.min_price || 0) - (b.min_price || 0))
  else if (sortBy.value === 'price_high') results.sort((a, b) => (b.min_price || 0) - (a.min_price || 0))
  else if (sortBy.value === 'newest') results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  else results.sort((a, b) => (b.total_students || 0) - (a.total_students || 0))
  
  return results
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (appliedFilters.value.province) count++
  if (appliedFilters.value.city) count++
  if (appliedFilters.value.type) count++
  if (appliedFilters.value.category) count++
  if (appliedFilters.value.priceRange) count++
  if (appliedFilters.value.rating) count++
  if (appliedFilters.value.education) count++
  return count
})

const hasFilterChanges = computed(() => {
  return searchQuery.value !== appliedFilters.value.searchQuery ||
    selectedProvince.value !== appliedFilters.value.province ||
    selectedCity.value !== appliedFilters.value.city ||
    selectedType.value !== appliedFilters.value.type ||
    selectedCategory.value !== appliedFilters.value.category ||
    selectedPriceRange.value !== appliedFilters.value.priceRange ||
    selectedRating.value !== appliedFilters.value.rating ||
    selectedEducation.value !== appliedFilters.value.education
})

// Smart Search: detect if query matches category name
const isSmartSearchCategory = computed(() => {
  const q = appliedFilters.value.searchQuery?.toLowerCase().trim()
  if (!q) return false
  return categories.value.some(cat => 
    cat.name.toLowerCase().includes(q) || q.includes(cat.name.toLowerCase())
  )
})

// Filter programs based on search query
const filteredPrograms = computed(() => {
  const q = appliedFilters.value.searchQuery?.toLowerCase().trim()
  if (!q) return []
  
  let results = allPrograms.value.filter(p => {
    const programName = p.name?.toLowerCase() || ''
    const categoryName = (p.categories?.name || p.category_name || '').toLowerCase()
    const lesPlaceName = p.les_places?.name?.toLowerCase() || ''
    const description = p.description?.toLowerCase() || ''
    
    return programName.includes(q) || 
           categoryName.includes(q) || 
           lesPlaceName.includes(q) ||
           description.includes(q)
  })
  
  // Apply sorting
  if (sortBy.value === 'rating') {
    results.sort((a, b) => (b.les_places?.rating || 0) - (a.les_places?.rating || 0))
  } else if (sortBy.value === 'price_low') {
    results.sort((a, b) => (a.price || 0) - (b.price || 0))
  } else if (sortBy.value === 'price_high') {
    results.sort((a, b) => (b.price || 0) - (a.price || 0))
  } else if (sortBy.value === 'newest') {
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } else {
    // popular - sort by les place rating as proxy
    results.sort((a, b) => (b.les_places?.rating || 0) - (a.les_places?.rating || 0))
  }
  
  return results
})

// Show programs section if query matches category or has program results
const showProgramsSection = computed(() => {
  return filteredPrograms.value.length > 0 && appliedFilters.value.searchQuery
})

onMounted(async () => {
  await Promise.all([fetchCategories(), fetchLesPlaces(), fetchAllPrograms(), fetchProvinces()])
})

// Watch for route query changes (from navbar search)
watch(() => route.query, (newQuery) => {
  if (newQuery.q !== undefined) {
    searchQuery.value = newQuery.q || ''
    appliedFilters.value.searchQuery = newQuery.q || ''
  }
  if (newQuery.category !== undefined) {
    selectedCategory.value = newQuery.category || ''
    appliedFilters.value.category = newQuery.category || ''
  }
}, { immediate: false })

function onProvinceChange() {
  selectedCity.value = ''
  if (selectedProvince.value) fetchCities(selectedProvince.value)
}

function applyFilters() {
  appliedFilters.value = {
    searchQuery: searchQuery.value,
    province: selectedProvince.value,
    city: selectedCity.value,
    type: selectedType.value,
    category: selectedCategory.value,
    priceRange: selectedPriceRange.value,
    rating: selectedRating.value,
    education: selectedEducation.value
  }
  router.replace({ query: { q: searchQuery.value || undefined, city: selectedCity.value || undefined, type: selectedType.value || undefined } })
  showMobileFilter.value = false
}

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedProvince.value = ''
  selectedCity.value = ''
  selectedType.value = ''
  selectedPriceRange.value = ''
  selectedRating.value = ''
  selectedEducation.value = ''
  sortBy.value = 'popular'
  applyFilters()
}
</script>

<template>
  <div class="search-page">
    <Navbar />
    <main class="search-main">
      <div class="search-layout">
        <!-- Sidebar Filters -->
        <aside class="filter-sidebar" :class="{ 'mobile-open': showMobileFilter }">
          <div class="sidebar-header">
            <h3>Filter</h3>
            <button v-if="activeFiltersCount" class="clear-btn" @click="clearFilters">Reset</button>
            <button class="close-mobile-btn" @click="showMobileFilter = false">&times;</button>
          </div>

          <div class="filter-group">
            <label class="filter-label">Pencarian</label>
            <input v-model="searchQuery" type="text" placeholder="Cari tempat les..." class="filter-input">
          </div>

          <div class="filter-group">
            <label class="filter-label">Lokasi</label>
            <select v-model="selectedProvince" class="filter-select" :disabled="loadingProvinces" @change="onProvinceChange">
              <option value="">{{ loadingProvinces ? 'Memuat...' : 'Pilih Provinsi' }}</option>
              <option v-for="prov in provinces" :key="prov.id" :value="prov.id">{{ prov.name }}</option>
            </select>
            <select v-if="selectedProvince" v-model="selectedCity" class="filter-select" :disabled="loadingCities">
              <option value="">{{ loadingCities ? 'Memuat...' : 'Pilih Kota/Kab' }}</option>
              <option v-for="city in cities" :key="city.id" :value="city.name">{{ formatCityName(city.name) }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Tipe Les</label>
            <select v-model="selectedType" class="filter-select">
              <option value="">Semua Tipe</option>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div class="filter-group" v-if="categories.length">
            <label class="filter-label">Kategori</label>
            <select v-model="selectedCategory" class="filter-select">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Harga</label>
            <select v-model="selectedPriceRange" class="filter-select">
              <option v-for="range in priceRanges" :key="range.value" :value="range.value">{{ range.label }}</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Rating</label>
            <select v-model="selectedRating" class="filter-select">
              <option value="">Semua Rating</option>
              <option value="4.5">⭐ 4.5+</option>
              <option value="4">⭐ 4.0+</option>
              <option value="3.5">⭐ 3.5+</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">Jenjang</label>
            <select v-model="selectedEducation" class="filter-select">
              <option v-for="edu in educationLevels" :key="edu.value" :value="edu.value">{{ edu.label }}</option>
            </select>
          </div>

          <!-- Apply Button -->
          <button class="apply-btn" :class="{ 'has-changes': hasFilterChanges }" @click="applyFilters">
            Terapkan Filter
          </button>
        </aside>

        <div v-if="showMobileFilter" class="mobile-backdrop" @click="showMobileFilter = false"></div>

        <!-- Results -->
        <div class="results-content">
          <div class="results-header">
            <div class="results-left">
              <button class="mobile-filter-btn" @click="showMobileFilter = true">
                Filter <span v-if="activeFiltersCount" class="badge">{{ activeFiltersCount }}</span>
              </button>
              <div class="results-info">
                <h2>Hasil Pencarian</h2>
                <span v-if="showProgramsSection">{{ filteredPrograms.length }} program, {{ filteredResults.length }} tempat les</span>
                <span v-else>{{ filteredResults.length }} tempat les</span>
              </div>
            </div>
            <div class="sort-wrapper">
              <label>Urutkan:</label>
              <select v-model="sortBy" class="sort-select">
                <option value="popular">Terpopuler</option>
                <option value="rating">Rating Tertinggi</option>
                <option value="price_low">Harga Terendah</option>
                <option value="price_high">Harga Tertinggi</option>
                <option value="newest">Terbaru</option>
              </select>
            </div>
          </div>

          <div v-if="loading || programsLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Memuat...</p>
          </div>

          <template v-else>
            <!-- Smart Search: Programs Section (if query matches category) -->
            <div v-if="showProgramsSection" class="results-section">
              <div class="section-header">
                <h3> Program yang cocok</h3>
                <span class="section-count">{{ filteredPrograms.length }} program</span>
              </div>
              <div class="results-grid programs-grid">
                <ProgramCard v-for="program in filteredPrograms.slice(0, 8)" :key="program.id" :program="program" />
              </div>
            </div>

            <!-- Les Places Section -->
            <div v-if="filteredResults.length" class="results-section">
              <div v-if="showProgramsSection" class="section-header">
                <h3> Tempat Les terkait</h3>
                <span class="section-count">{{ filteredResults.length }} tempat les</span>
              </div>
              <div class="results-grid">
                <LesCard v-for="les in filteredResults" :key="les.id" :les-place="les" />
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="!filteredResults.length && !filteredPrograms.length" class="empty-state">
              <h3>Tidak ada hasil</h3>
              <p>Coba ubah filter pencarian</p>
              <button class="btn-primary" @click="clearFilters">Reset Filter</button>
            </div>
          </template>
        </div>
      </div>
    </main>
    <Footer />
  </div>
</template>

<style scoped>
.search-page { min-height: 100vh; background: #f8fafc; }
.search-main { padding-top: 80px; min-height: calc(100vh - 80px); }
.search-layout { display: flex; max-width: 1400px; margin: 0 auto; gap: 24px; padding: 24px; }

.filter-sidebar {
  width: 280px; flex-shrink: 0; background: white; border-radius: 16px; padding: 20px;
  position: sticky; top: 100px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  max-height: calc(100vh - 120px); overflow-y: auto;
}
.filter-sidebar::-webkit-scrollbar { width: 6px; }
.filter-sidebar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
.filter-sidebar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.filter-sidebar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
.sidebar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
.sidebar-header h3 { font-size: 16px; font-weight: 700; margin: 0; }
.clear-btn { padding: 6px 12px; background: #fef2f2; color: #dc2626; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }
.close-mobile-btn { display: none; width: 32px; height: 32px; background: #f1f5f9; border: none; border-radius: 8px; font-size: 20px; cursor: pointer; }

.filter-group { margin-bottom: 16px; }
.filter-label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
.filter-input, .filter-select {
  width: 100%; padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 14px; background: white; margin-bottom: 8px;
}
.filter-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; cursor: pointer; }
.filter-select:disabled { background-color: #f8fafc; color: #94a3b8; }

.apply-btn {
  width: 100%; padding: 12px; background: #0a4568; color: white; border: none; border-radius: 10px;
  font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 8px;
}
.apply-btn:hover { background: #083654; }
.apply-btn.has-changes { background: #059669; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.4); } 50% { box-shadow: 0 0 0 8px rgba(5, 150, 105, 0); } }

.results-content { flex: 1; min-width: 0; }
.results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
.results-left { display: flex; align-items: center; gap: 16px; }
.mobile-filter-btn { display: none; align-items: center; gap: 6px; padding: 10px 14px; background: white; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.badge { background: #0a4568; color: white; font-size: 11px; padding: 2px 7px; border-radius: 20px; }
.results-info h2 { font-size: 20px; font-weight: 700; margin: 0 0 2px; }
.results-info span { font-size: 14px; color: #64748b; }
.sort-wrapper { display: flex; align-items: center; gap: 10px; }
.sort-wrapper label { font-size: 14px; color: #64748b; }
.sort-select { padding: 10px 36px 10px 14px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 14px; background: white; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; cursor: pointer; }

.loading-state { text-align: center; padding: 80px 20px; background: white; border-radius: 16px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0a4568; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.results-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }

/* Smart Search Sections */
.results-section { margin-bottom: 32px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #E2E8F0; }
.section-header h3 { font-size: 18px; font-weight: 700; color: #1E293B; margin: 0; }
.section-count { font-size: 14px; color: #64748B; font-weight: 500; }
.programs-grid { grid-template-columns: repeat(4, 1fr); }

.empty-state { text-align: center; padding: 80px 20px; background: white; border-radius: 16px; }
.empty-state h3 { font-size: 18px; margin-bottom: 8px; }
.empty-state p { color: #64748b; margin-bottom: 20px; }
.btn-primary { padding: 12px 24px; background: #0a4568; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

.mobile-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 998; }

@media (max-width: 1200px) { .results-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 1024px) {
  .filter-sidebar { position: fixed; top: 0; left: 0; height: 100vh; width: 300px; border-radius: 0; z-index: 999; transform: translateX(-100%); transition: transform 0.3s; overflow-y: auto; padding-top: 20px; }
  .filter-sidebar.mobile-open { transform: translateX(0); }
  .close-mobile-btn { display: block; }
  .mobile-filter-btn { display: flex; }
  .mobile-backdrop { display: block; }
  .results-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) { .search-layout { padding: 16px; } .results-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .results-grid { grid-template-columns: 1fr; } }
</style>
