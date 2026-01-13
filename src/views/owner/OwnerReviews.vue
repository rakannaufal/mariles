<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const reviews = ref([])
const loading = ref(true)
const filter = ref('all') // all, 5, 4, 3, 2, 1
const lesPlace = ref(null)

onMounted(async () => {
  await fetchReviews()
})

async function fetchReviews() {
  loading.value = true
  try {
    // Dapatkan owner
    const { data: owner } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (!owner) return

    // Dapatkan tempat les
    const { data: place } = await supabase
      .from('les_places')
      .select('id, name')
      .eq('owner_id', owner.id)
      .single()
    
    if (place) {
      lesPlace.value = place
    } else {
      loading.value = false
      return
    }

    // Dapatkan ulasan menggunakan les_place_id (hanya yang terlihat - tidak ditandai)
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, reply, replied_at, created_at, is_visible,
        students (
          id,
          users (name, avatar_url)
        )
      `)
      .eq('les_place_id', place.id)
      .neq('is_visible', false) // Hanya tampilkan ulasan yang terlihat (null atau true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error)
    }
    
    reviews.value = data || []
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

// Statistik
const averageRating = computed(() => {
  if (!reviews.value.length) return 0
  return reviews.value.reduce((sum, r) => sum + r.rating, 0) / reviews.value.length
})

const ratingDistribution = computed(() => {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews.value.forEach(r => {
    if (dist[r.rating] !== undefined) dist[r.rating]++
  })
  return dist
})

const filteredReviews = computed(() => {
  if (filter.value === 'all') return reviews.value
  return reviews.value.filter(r => r.rating === parseInt(filter.value))
})

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

function getPercentage(count) {
  if (!reviews.value.length) return 0
  return Math.round((count / reviews.value.length) * 100)
}
</script>

<template>
  <div class="dashboard">

    <main class="main-content">
      <!-- Header -->
      <header class="page-header">
        <div class="header-info">
          <h1>Ulasan Tempat Les</h1>
          <p class="subtitle" v-if="lesPlace">{{ lesPlace.name }}</p>
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat ulasan...</p>
      </div>

      <template v-else>
        <!-- Stats Section -->
        <div class="stats-section">
          <!-- Average Rating Card -->
          <div class="rating-card">
            <div class="rating-main">
              <span class="rating-value">{{ averageRating.toFixed(1) }}</span>
              <div class="rating-stars">
                <svg v-for="i in 5" :key="i" viewBox="0 0 24 24" :class="{ filled: i <= Math.round(averageRating) }">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <span class="rating-count">{{ reviews.length }} ulasan</span>
            </div>
          </div>

          <!-- Rating Distribution -->
          <div class="distribution-card">
            <h3>Distribusi Rating</h3>
            <div class="distribution-list">
              <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="distribution-row">
                <span class="star-label">{{ star }} Bintang</span>
                <div class="bar-container">
                  <div class="bar-fill" :style="{ width: getPercentage(ratingDistribution[star]) + '%' }"></div>
                </div>
                <span class="count-label">{{ ratingDistribution[star] }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-section">
          <div class="filter-tabs">
            <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
              Semua ({{ reviews.length }})
            </button>
            <button 
              v-for="star in [5, 4, 3, 2, 1]" 
              :key="star"
              :class="{ active: filter === String(star) }" 
              @click="filter = String(star)"
            >
              {{ star }} Bintang ({{ ratingDistribution[star] }})
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredReviews.length === 0" class="empty-state">
          <h3>Tidak Ada Ulasan</h3>
          <p v-if="filter === 'all'">Belum ada ulasan untuk tempat les Anda</p>
          <p v-else>Tidak ada ulasan dengan rating {{ filter }} bintang</p>
        </div>

        <!-- Reviews List -->
        <div v-else class="reviews-list">
          <div v-for="review in filteredReviews" :key="review.id" class="review-card">
            <div class="review-header">
              <div class="reviewer-info">
                <img 
                  :src="review.students?.users?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.students?.users?.name || 'User')}&background=0a4568&color=fff`" 
                  :alt="review.students?.users?.name"
                  class="reviewer-avatar"
                >
                <div class="reviewer-details">
                  <h4>{{ review.students?.users?.name || 'Pengguna' }}</h4>
                  <span class="review-date">{{ formatDate(review.created_at) }}</span>
                </div>
              </div>
              <div class="review-rating">
                <svg v-for="i in 5" :key="i" viewBox="0 0 24 24" :class="{ filled: i <= review.rating }">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span class="rating-text">{{ review.rating }}/5</span>
              </div>
            </div>
            
            <div class="review-body">
              <p class="review-comment">{{ review.comment || 'Tidak ada komentar' }}</p>
            </div>
            
            <div class="review-footer">
              <span class="review-place">Untuk: {{ lesPlace?.name }}</span>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F1F5F9; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

/* Header */
.page-header { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #E2E8F0; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #0F172A; margin-bottom: 6px; }
.subtitle { font-size: 15px; color: #64748B; }

/* Loading */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: var(--secondary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-state p { color: #64748B; }

/* Stats Section */
.stats-section { display: grid; grid-template-columns: 280px 1fr; gap: 24px; margin-bottom: 24px; }

.rating-card { background: white; border-radius: 16px; padding: 32px; border: 1px solid #E2E8F0; text-align: center; }
.rating-main { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.rating-value { font-size: 56px; font-weight: 800; color: #0F172A; line-height: 1; }
.rating-stars { display: flex; gap: 4px; }
.rating-stars svg { width: 24px; height: 24px; fill: #E2E8F0; stroke: none; }
.rating-stars svg.filled { fill: #F59E0B; }
.rating-count { font-size: 14px; color: #64748B; }

.distribution-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #E2E8F0; }
.distribution-card h3 { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 20px; }
.distribution-list { display: flex; flex-direction: column; gap: 12px; }
.distribution-row { display: flex; align-items: center; gap: 12px; }
.star-label { width: 80px; font-size: 13px; color: #64748B; flex-shrink: 0; }
.bar-container { flex: 1; height: 10px; background: #F1F5F9; border-radius: 5px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #F59E0B, #FBBF24); border-radius: 5px; transition: width 0.3s; }
.count-label { width: 30px; text-align: right; font-size: 13px; font-weight: 600; color: #475569; }

/* Filter Section */
.filter-section { margin-bottom: 24px; }
.filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-tabs button { padding: 10px 18px; background: white; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748B; cursor: pointer; transition: all 0.2s; }
.filter-tabs button:hover { border-color: #CBD5E1; color: #475569; }
.filter-tabs button.active { background: var(--secondary); color: white; border-color: var(--secondary); }

/* Empty State */
.empty-state { background: white; border-radius: 16px; padding: 60px; text-align: center; border: 1px solid #E2E8F0; }
.empty-state h3 { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 8px; }
.empty-state p { font-size: 14px; color: #64748B; }

/* Reviews List */
.reviews-list { display: flex; flex-direction: column; gap: 16px; }

.review-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #E2E8F0; }

.review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }

.reviewer-info { display: flex; gap: 14px; align-items: center; }
.reviewer-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: #F1F5F9; }
.reviewer-details h4 { font-size: 15px; font-weight: 600; color: #0F172A; margin-bottom: 4px; }
.review-date { font-size: 13px; color: #94A3B8; }

.review-rating { display: flex; align-items: center; gap: 8px; }
.review-rating svg { width: 18px; height: 18px; fill: #E2E8F0; stroke: none; }
.review-rating svg.filled { fill: #F59E0B; }
.rating-text { font-size: 14px; font-weight: 600; color: #475569; }

.review-body { margin-bottom: 16px; }
.review-comment { font-size: 15px; color: #334155; line-height: 1.7; }

.review-footer { padding-top: 16px; border-top: 1px solid #F1F5F9; }
.review-place { font-size: 13px; color: #94A3B8; }

/* Responsive */
@media (max-width: 900px) {
  .stats-section { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .main-content { padding: 16px; }
  .filter-tabs { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 8px; }
  .filter-tabs button { white-space: nowrap; }
  .review-header { flex-direction: column; gap: 12px; }
}
</style>
