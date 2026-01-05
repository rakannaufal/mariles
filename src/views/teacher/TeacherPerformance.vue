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
  stats, 
  fetchTeacherStats,
  fetchRecentReviews 
} = useTeacherData()

const recentReviews = ref([])
const selectedPeriod = ref('month')

// Performance metrics based on real stats
const metrics = computed(() => [
  { 
    id: 'attendance', 
    label: 'Kehadiran', 
    value: stats.value.attendanceRate || 0, 
    target: 100,
    color: '#16a34a',
    icon: 'check'
  },
  { 
    id: 'punctuality', 
    label: 'Ketepatan Waktu', 
    value: stats.value.punctualityRate || 0, 
    target: 100,
    color: '#2563eb',
    icon: 'clock'
  },
  { 
    id: 'material', 
    label: 'Kelengkapan Materi', 
    value: stats.value.materialCompletion || 0, 
    target: 100,
    color: '#9333ea',
    icon: 'book'
  },
  { 
    id: 'interaction', 
    label: 'Interaksi Siswa', 
    value: stats.value.interactionScore || 0, 
    target: 100,
    color: '#ea580c',
    icon: 'users'
  }
])

// Achievements based on real data
const achievements = computed(() => {
  const list = []
  if ((stats.value.attendanceRate || 0) >= 95) {
    list.push({ id: 'perfect', icon: 'trophy', title: 'Kehadiran Sempurna', desc: 'Hadir 95%+ bulan ini', color: '#fbbf24' })
  }
  if ((stats.value.averageRating || 0) >= 4.5) {
    list.push({ id: 'star', icon: 'star', title: 'Guru Bintang', desc: 'Rating 4.5+ dari siswa', color: '#f59e0b' })
  }
  if ((stats.value.totalClasses || 0) >= 20) {
    list.push({ id: 'active', icon: 'fire', title: 'Guru Aktif', desc: '20+ kelas bulan ini', color: '#ef4444' })
  }
  if ((stats.value.totalStudents || 0) >= 10) {
    list.push({ id: 'popular', icon: 'users', title: 'Guru Favorit', desc: '10+ siswa terdaftar', color: '#8b5cf6' })
  }
  return list
})

// Rating breakdown from real reviews
const ratingBreakdown = computed(() => {
  const total = recentReviews.value.length || 1
  return [5, 4, 3, 2, 1].map(star => {
    const count = recentReviews.value.filter(r => Math.round(r.rating) === star).length
    return { star, count, percent: (count / total) * 100 }
  })
})

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getScoreClass(value) {
  if (value >= 90) return 'excellent'
  if (value >= 75) return 'good'
  if (value >= 60) return 'average'
  return 'poor'
}

function getCircleOffset(value) {
  const circumference = 2 * Math.PI * 45
  return circumference - (value / 100) * circumference
}

onMounted(async () => {
  await fetchTeacherStats()
  recentReviews.value = await fetchRecentReviews()
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
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-4"/>
            </svg>
            Performa Saya
          </h1>
          <p class="subtitle">Pantau dan tingkatkan kualitas mengajar Anda</p>
        </div>
        <div class="period-selector">
          <button :class="{ active: selectedPeriod === 'week' }" @click="selectedPeriod = 'week'">Minggu Ini</button>
          <button :class="{ active: selectedPeriod === 'month' }" @click="selectedPeriod = 'month'">Bulan Ini</button>
          <button :class="{ active: selectedPeriod === 'year' }" @click="selectedPeriod = 'year'">Tahun Ini</button>
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Memuat data performa...</p>
      </div>

      <div v-else>
        <!-- Main Stats -->
        <section class="main-stats">
          <div class="stat-card primary">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalClasses || 0 }}</span>
              <span class="stat-label">Total Kelas</span>
            </div>
          </div>
          
          <div class="stat-card orange">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ (stats.averageRating || 0).toFixed(1) }}</span>
              <span class="stat-label">Rating Rata-rata</span>
            </div>
          </div>
          
          <div class="stat-card green">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.attendanceRate || 0 }}%</span>
              <span class="stat-label">Kehadiran</span>
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
              <span class="stat-value">{{ stats.totalStudents || 0 }}</span>
              <span class="stat-label">Total Siswa</span>
            </div>
          </div>
        </section>

        <!-- Achievements -->
        <section class="achievements-section" v-if="achievements.length">
          <h3>Pencapaian Anda</h3>
          <div class="achievements-grid">
            <div v-for="ach in achievements" :key="ach.id" class="achievement-card" :style="{ '--ach-color': ach.color }">
              <div class="ach-icon-box" :style="{ background: ach.color + '20', color: ach.color }">
                <svg v-if="ach.icon === 'trophy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 22V8a2 2 0 0 1 4 0v14"/>
                  <path d="M8 8h8a4 4 0 0 1-4 8 4 4 0 0 1-4-8Z"/>
                </svg>
                <svg v-else-if="ach.icon === 'star'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <svg v-else-if="ach.icon === 'fire'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="ach-info">
                <span class="ach-title">{{ ach.title }}</span>
                <span class="ach-desc">{{ ach.desc }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Performance Metrics -->
        <section class="metrics-section">
          <h3>Metrik Performa</h3>
          <div class="metrics-grid">
            <div v-for="metric in metrics" :key="metric.id" class="metric-card">
              <div class="metric-circle" :style="{ '--metric-color': metric.color }">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" stroke-width="8"/>
                  <circle cx="50" cy="50" r="45" fill="none" :stroke="metric.color" stroke-width="8" 
                          stroke-linecap="round"
                          :stroke-dasharray="2 * Math.PI * 45"
                          :stroke-dashoffset="getCircleOffset(metric.value)"
                          transform="rotate(-90 50 50)"/>
                </svg>
                <span class="metric-value">{{ Math.round(metric.value) }}%</span>
              </div>
              <span class="metric-label">{{ metric.label }}</span>
              <span class="metric-status" :class="getScoreClass(metric.value)">
                {{ metric.value >= 90 ? 'Sangat Baik' : metric.value >= 75 ? 'Baik' : metric.value >= 60 ? 'Cukup' : 'Perlu Ditingkatkan' }}
              </span>
            </div>
          </div>
        </section>

        <!-- Content Grid -->
        <section class="content-grid">
          <!-- Reviews Section -->
          <div class="panel-card">
            <div class="panel-header">
              <h3>Ulasan dari Siswa</h3>
              <span class="review-count">{{ recentReviews.length }} ulasan</span>
            </div>
            
            <!-- Rating Breakdown -->
            <div class="rating-breakdown" v-if="recentReviews.length">
              <div v-for="rb in ratingBreakdown" :key="rb.star" class="rb-row">
                <span class="rb-star">{{ rb.star }} Bintang</span>
                <div class="rb-bar-track">
                  <div class="rb-bar-fill" :style="{ width: rb.percent + '%' }"></div>
                </div>
                <span class="rb-count">{{ rb.count }}</span>
              </div>
            </div>
            
            <!-- Reviews List -->
            <div class="reviews-list">
              <div v-for="review in recentReviews.slice(0, 5)" :key="review.id" class="review-item">
                <div class="review-avatar">{{ review.student?.charAt(0) || 'S' }}</div>
                <div class="review-content">
                  <div class="review-header">
                    <span class="reviewer-name">{{ review.student }}</span>
                    <div class="review-rating">
                      <span v-for="i in 5" :key="i" :class="{ filled: i <= review.rating }">&#9733;</span>
                    </div>
                  </div>
                  <p class="review-comment">{{ review.comment }}</p>
                  <span class="review-date">{{ formatDate(review.date) }}</span>
                </div>
              </div>
              
              <div v-if="recentReviews.length === 0" class="empty-reviews">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>Belum ada ulasan dari siswa</p>
              </div>
            </div>
          </div>

          <!-- Tips Section -->
          <div class="panel-card">
            <h3>Tips Meningkatkan Performa</h3>
            <div class="tips-list">
              <div class="tip-item">
                <div class="tip-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div class="tip-content">
                  <h4>Tepat Waktu</h4>
                  <p>Datang 5-10 menit sebelum kelas dimulai untuk persiapan</p>
                </div>
              </div>
              <div class="tip-item">
                <div class="tip-icon green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div class="tip-content">
                  <h4>Materi Lengkap</h4>
                  <p>Siapkan materi dan latihan yang bervariasi untuk setiap sesi</p>
                </div>
              </div>
              <div class="tip-item">
                <div class="tip-icon purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="tip-content">
                  <h4>Interaksi Aktif</h4>
                  <p>Libatkan siswa dengan pertanyaan dan diskusi interaktif</p>
                </div>
              </div>
              <div class="tip-item">
                <div class="tip-icon orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div class="tip-content">
                  <h4>Kualitas Terbaik</h4>
                  <p>Berikan pengalaman belajar terbaik untuk meningkatkan rating</p>
                </div>
              </div>
            </div>
          </div>
        </section>
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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
}

.header-left h1 svg { width: 28px; height: 28px; color: #0d5782; }
.subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }

.period-selector {
  display: flex;
  background: white;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.period-selector button {
  padding: 8px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
}

.period-selector button.active { background: #0d5782; color: white; }

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #0d5782;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Main Stats */
.main-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-card.highlight {
  background: linear-gradient(135deg, #0d5782, #1e40af);
  color: white;
  flex-direction: column;
  text-align: center;
  padding: 20px;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg { width: 24px; height: 24px; }

.stat-card.primary .stat-icon { background: #F1F5F9; color: #0D5782; }
.stat-card.green .stat-icon { background: #F1F5F9; color: #0D5782; }
.stat-card.purple .stat-icon { background: #F1F5F9; color: #0D5782; }
.stat-card.orange .stat-icon { background: #F1F5F9; color: #0D5782; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 13px; color: #64748b; }
.stat-card.highlight .stat-label { color: rgba(255,255,255,0.8); }

/* Rating Circle */
.rating-circle {
  position: relative;
  width: 100px;
  height: 100px;
}

.rating-circle svg { width: 100%; height: 100%; }

.rating-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.rating-value { font-size: 24px; font-weight: 700; }

.stars-mini { font-size: 10px; display: flex; gap: 1px; }
.stars-mini span { color: rgba(255,255,255,0.4); }
.stars-mini span.filled { color: #fbbf24; }

/* Achievements */
.achievements-section {
  margin-bottom: 24px;
}

.achievements-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.achievements-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border-left: 4px solid var(--ach-color);
}

.ach-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ach-icon-box svg { width: 20px; height: 20px; }
.ach-info { display: flex; flex-direction: column; }
.ach-title { font-size: 14px; font-weight: 600; color: #1e293b; }
.ach-desc { font-size: 12px; color: #64748b; }

/* Metrics Section */
.metrics-section {
  margin-bottom: 24px;
}

.metrics-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.metric-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.metric-circle {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 12px;
}

.metric-circle svg { width: 100%; height: 100%; }

.metric-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.metric-label { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }

.metric-status {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
}

.metric-status.excellent { background: #dcfce7; color: #16a34a; }
.metric-status.good { background: #dbeafe; color: #2563eb; }
.metric-status.average { background: #fef3c7; color: #d97706; }
.metric-status.poor { background: #fee2e2; color: #dc2626; }

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.panel-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.panel-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 { margin-bottom: 0; }
.review-count { font-size: 13px; color: #64748b; }

/* Rating Breakdown */
.rating-breakdown {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f1f5f9;
}

.rb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.rb-star { font-size: 12px; color: #f59e0b; width: 60px; }

.rb-bar-track {
  flex: 1;
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.rb-bar-fill {
  height: 100%;
  background: #f59e0b;
  border-radius: 4px;
}

.rb-count { font-size: 12px; color: #64748b; width: 20px; text-align: right; }

/* Reviews List */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
}

.review-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 12px;
}

.review-avatar {
  width: 40px;
  height: 40px;
  background: #0d5782;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.review-content { flex: 1; min-width: 0; }

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.reviewer-name { font-size: 14px; font-weight: 600; color: #1e293b; }

.review-rating { display: flex; gap: 1px; }
.review-rating span { font-size: 12px; color: #d1d5db; }
.review-rating span.filled { color: #f59e0b; }

.review-comment {
  font-size: 13px;
  color: #475569;
  margin: 0 0 6px 0;
  line-height: 1.5;
}

.review-date { font-size: 11px; color: #94a3b8; }

.empty-reviews {
  text-align: center;
  padding: 32px;
  color: #94a3b8;
}

.empty-reviews svg { width: 48px; height: 48px; margin-bottom: 12px; }
.empty-reviews p { font-size: 14px; margin: 0; }

/* Tips List */
.tips-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tip-item {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.tip-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tip-icon svg { width: 20px; height: 20px; }
.tip-icon.blue { background: #dbeafe; color: #2563eb; }
.tip-icon.green { background: #dcfce7; color: #16a34a; }
.tip-icon.purple { background: #f3e8ff; color: #9333ea; }
.tip-icon.orange { background: #fed7aa; color: #ea580c; }

.tip-content h4 { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0 0 4px 0; }
.tip-content p { font-size: 13px; color: #64748b; margin: 0; line-height: 1.4; }

/* Responsive */
@media (max-width: 1024px) {
  .main-stats { grid-template-columns: repeat(2, 1fr); }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .content-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .main { padding: 16px; }
  .page-header { flex-direction: column; gap: 16px; }
  .main-stats { grid-template-columns: 1fr; }
  .metrics-grid { grid-template-columns: 1fr 1fr; }
  .achievements-grid { flex-direction: column; }
}
</style>
