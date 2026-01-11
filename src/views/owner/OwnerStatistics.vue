<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// State
const loading = ref(true)
const lesPlace = ref(null)
const stats = ref({
  totalStudents: 0,
  activeStudents: 0,
  totalBookings: 0,
  totalRevenue: 0,
  pendingPayments: 0,
  avgRating: 0,
  totalReviews: 0,
  completedSessions: 0
})

const monthlyData = ref({
  labels: [],
  students: [],
  revenue: []
})

const topPrograms = ref([])
const recentReviews = ref([])
const bookingStats = ref({ pending: 0, confirmed: 0, active: 0, completed: 0 })

// Fetch all statistics
async function fetchStatistics() {
  loading.value = true
  try {
    // Get owner's les place first
    const { data: ownerData } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()

    if (!ownerData) return

    const { data: lesData } = await supabase
      .from('les_places')
      .select('id, name, rating, total_reviews, total_students')
      .eq('owner_id', ownerData.id)
      .single()

    if (!lesData) return
    lesPlace.value = lesData

    await Promise.all([
      fetchMainStats(lesData.id),
      fetchMonthlyData(lesData.id),
      fetchTopPrograms(lesData.id),
      fetchRecentReviews(lesData.id),
      fetchBookingStats(lesData.id)
    ])
  } catch (err) {
    console.error('Error fetching statistics:', err)
  } finally {
    loading.value = false
  }
}

// Fetch main statistics
async function fetchMainStats(lesPlaceId) {
  // Total bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('les_place_id', lesPlaceId)
  stats.value.totalBookings = bookingCount || 0

  // Active students (unique from active bookings)
  const { data: activeBookings } = await supabase
    .from('bookings')
    .select('student_id')
    .eq('les_place_id', lesPlaceId)
    .eq('status', 'active')
  
  const uniqueStudents = new Set(activeBookings?.map(b => b.student_id) || [])
  stats.value.activeStudents = uniqueStudents.size

  // Total revenue
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, net_amount')
    .eq('les_place_id', lesPlaceId)
    .eq('payment_status', 'settlement')
  
  stats.value.totalRevenue = transactions?.reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0) || 0

  // Pending payments
  const { data: pendingTx } = await supabase
    .from('transactions')
    .select('amount')
    .eq('les_place_id', lesPlaceId)
    .eq('payment_status', 'pending')
  
  stats.value.pendingPayments = pendingTx?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

  // Rating and reviews from les_place
  stats.value.avgRating = lesPlace.value?.rating || 0
  stats.value.totalReviews = lesPlace.value?.total_reviews || 0
  stats.value.totalStudents = lesPlace.value?.total_students || 0
}

// Fetch monthly data (last 6 months)
async function fetchMonthlyData(lesPlaceId) {
  const months = []
  const now = new Date()
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      label: date.toLocaleDateString('id-ID', { month: 'short' }),
      start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()
    })
  }

  monthlyData.value.labels = months.map(m => m.label)

  // Fetch bookings and revenue per month
  const bookingsPromises = months.map(m =>
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('les_place_id', lesPlaceId)
      .gte('created_at', m.start).lte('created_at', m.end)
  )
  const revenuePromises = months.map(m =>
    supabase.from('transactions').select('net_amount, amount')
      .eq('les_place_id', lesPlaceId)
      .eq('payment_status', 'settlement')
      .gte('created_at', m.start).lte('created_at', m.end)
  )

  const [bookingsResults, revenueResults] = await Promise.all([
    Promise.all(bookingsPromises),
    Promise.all(revenuePromises)
  ])

  monthlyData.value.students = bookingsResults.map(r => r.count || 0)
  monthlyData.value.revenue = revenueResults.map(r => 
    r.data?.reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0) || 0
  )
}

// Fetch top programs
async function fetchTopPrograms(lesPlaceId) {
  const { data } = await supabase
    .from('programs')
    .select('id, name, current_students, capacity, price')
    .eq('les_place_id', lesPlaceId)
    .eq('is_active', true)
    .order('current_students', { ascending: false })
    .limit(5)
  
  topPrograms.value = data || []
}

// Fetch recent reviews
async function fetchRecentReviews(lesPlaceId) {
  const { data } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      student:students(user:users(name))
    `)
    .eq('les_place_id', lesPlaceId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(5)
  
  recentReviews.value = data || []
}

// Fetch booking status distribution
async function fetchBookingStats(lesPlaceId) {
  const statuses = ['pending', 'confirmed', 'active', 'completed']
  const promises = statuses.map(status =>
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('les_place_id', lesPlaceId).eq('status', status)
  )
  
  const results = await Promise.all(promises)
  bookingStats.value = {
    pending: results[0].count || 0,
    confirmed: results[1].count || 0,
    active: results[2].count || 0,
    completed: results[3].count || 0
  }
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const maxRevenue = computed(() => Math.max(...monthlyData.value.revenue, 1))
const maxStudents = computed(() => Math.max(...monthlyData.value.students, 1))
const conversionRate = computed(() => {
  const total = bookingStats.value.pending + bookingStats.value.confirmed + bookingStats.value.active + bookingStats.value.completed
  if (total === 0) return 0
  return Math.round((bookingStats.value.active + bookingStats.value.completed) / total * 100)
})

onMounted(fetchStatistics)
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="header">
        <div>
          <h1>Statistik</h1>
          <p class="subtitle">{{ lesPlace?.name || 'Tempat Les Anda' }}</p>
        </div>
        <button class="btn btn-outline" @click="fetchStatistics">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Refresh
        </button>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat statistik...</p>
      </div>

      <template v-else-if="lesPlace">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card highlight">
            <div class="stat-icon revenue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</span>
              <span class="stat-label">Total Pendapatan</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon students">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalStudents }}</span>
              <span class="stat-label">Total Siswa</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.activeStudents }}</span>
              <span class="stat-label">Siswa Aktif</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon rating">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.avgRating.toFixed(1) }} <small>({{ stats.totalReviews }} ulasan)</small></span>
              <span class="stat-label">Rating</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon bookings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalBookings }}</span>
              <span class="stat-label">Total Booking</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon pending">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatCurrency(stats.pendingPayments) }}</span>
              <span class="stat-label">Pending Payment</span>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Pendapatan Bulanan</h3>
            <div class="revenue-chart">
              <div v-for="(value, i) in monthlyData.revenue" :key="i" class="chart-item">
                <span class="month">{{ monthlyData.labels[i] }}</span>
                <div class="bar-track">
                  <div class="bar-fill revenue" :style="{ width: (value / maxRevenue * 100) + '%' }"></div>
                </div>
                <span class="value">{{ formatCurrency(value) }}</span>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <h3>Status Booking</h3>
            <div class="booking-stats">
              <div class="booking-stat">
                <span class="count pending">{{ bookingStats.pending }}</span>
                <span class="label">Pending</span>
              </div>
              <div class="booking-stat">
                <span class="count confirmed">{{ bookingStats.confirmed }}</span>
                <span class="label">Dikonfirmasi</span>
              </div>
              <div class="booking-stat">
                <span class="count active">{{ bookingStats.active }}</span>
                <span class="label">Aktif</span>
              </div>
              <div class="booking-stat">
                <span class="count completed">{{ bookingStats.completed }}</span>
                <span class="label">Selesai</span>
              </div>
            </div>
            <div class="conversion-rate">
              <span>Conversion Rate:</span>
              <strong>{{ conversionRate }}%</strong>
            </div>
          </div>
        </div>

        <!-- Tables Row -->
        <div class="tables-grid">
          <div class="table-card">
            <h3>Program Populer</h3>
            <div class="programs-list">
              <div v-for="prog in topPrograms" :key="prog.id" class="program-item">
                <div class="program-info">
                  <span class="name">{{ prog.name }}</span>
                  <span class="price">{{ formatCurrency(prog.price) }}</span>
                </div>
                <div class="capacity-bar">
                  <div class="capacity-fill" :style="{ width: (prog.current_students / (prog.capacity || 1) * 100) + '%' }"></div>
                </div>
                <span class="capacity-text">{{ prog.current_students }}/{{ prog.capacity }} siswa</span>
              </div>
              <p v-if="!topPrograms.length" class="empty">Belum ada program</p>
            </div>
          </div>

          <div class="table-card">
            <h3>Review Terbaru</h3>
            <div class="reviews-list">
              <div v-for="review in recentReviews" :key="review.id" class="review-item">
                <div class="review-header">
                  <span class="reviewer">{{ review.student?.user?.name || 'Anonim' }}</span>
                  <span class="stars">{{ '⭐'.repeat(review.rating) }}</span>
                </div>
                <p class="comment">{{ review.comment || 'Tidak ada komentar' }}</p>
                <span class="date">{{ formatDate(review.created_at) }}</span>
              </div>
              <p v-if="!recentReviews.length" class="empty">Belum ada review</p>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="empty-state">
        <h3>Tidak Ada Data</h3>
        <p>Anda belum memiliki tempat les terdaftar</p>
        <router-link to="/owner/les" class="btn btn-primary">Kelola Tempat Les</router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #f8fafc; }
.main { flex: 1; padding: 24px 32px; overflow-x: hidden; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header h1 { font-size: 28px; font-weight: 700; margin: 0; }
.subtitle { color: #64748b; font-size: 14px; margin: 4px 0 0; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
.btn svg { width: 18px; height: 18px; }
.btn-outline { background: white; border: 2px solid #e2e8f0; color: #475569; }
.btn-primary { background: #0d5782; color: white; }

.loading-state, .empty-state { text-align: center; padding: 80px 20px; background: white; border-radius: 16px; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d5782; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { 
  background: white; 
  border-radius: 16px; 
  padding: 20px 24px; 
  display: flex; 
  align-items: center; 
  gap: 16px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: all 0.25s ease;
  border: 2px solid transparent;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
}
.stat-card.highlight { background: linear-gradient(135deg, #0d5782, #0a4568); color: white; grid-column: span 2; }
.stat-card.highlight .stat-icon { background: rgba(255,255,255,0.2); color: white; }
.stat-card.highlight .stat-label { color: rgba(255,255,255,0.8); }
.stat-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon svg { width: 26px; height: 26px; }
.stat-icon.revenue { background: #F1F5F9; color: #0D5782; }
.stat-icon.students { background: #F1F5F9; color: #0D5782; }
.stat-icon.active { background: #F1F5F9; color: #0D5782; }
.stat-icon.rating { background: #F1F5F9; color: #0D5782; }
.stat-icon.bookings { background: #F1F5F9; color: #0D5782; }
.stat-icon.pending { background: #F1F5F9; color: #0D5782; }
.stat-info { display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1; }
.stat-value small { font-size: 13px; font-weight: 400; opacity: 0.7; }
.stat-label { font-size: 13px; color: #64748b; font-weight: 500; }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 24px; }
.chart-card, .table-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.chart-card h3, .table-card h3 { font-size: 16px; font-weight: 700; margin: 0 0 20px; }

.revenue-chart { display: flex; flex-direction: column; gap: 12px; }
.chart-item { display: flex; align-items: center; gap: 12px; }
.chart-item .month { width: 36px; font-size: 13px; color: #64748b; }
.bar-track { flex: 1; height: 28px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease; }
.bar-fill.revenue { background: linear-gradient(90deg, #0d5782, #1a7ab0); }
.chart-item .value { width: 110px; text-align: right; font-size: 13px; font-weight: 600; }

.booking-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.booking-stat { text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px; }
.booking-stat .count { display: block; font-size: 28px; font-weight: 700; }
.booking-stat .count.pending { color: #d97706; }
.booking-stat .count.confirmed { color: #2563eb; }
.booking-stat .count.active { color: #16a34a; }
.booking-stat .count.completed { color: #64748b; }
.booking-stat .label { font-size: 12px; color: #64748b; }
.conversion-rate { display: flex; justify-content: space-between; padding: 12px 16px; background: #f0fdf4; border-radius: 10px; font-size: 14px; }
.conversion-rate strong { color: #16a34a; }

.tables-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
.programs-list, .reviews-list { display: flex; flex-direction: column; gap: 16px; }
.program-item { }
.program-info { display: flex; justify-content: space-between; margin-bottom: 8px; }
.program-info .name { font-weight: 600; font-size: 14px; }
.program-info .price { font-size: 13px; color: #64748b; }
.capacity-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
.capacity-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 4px; }
.capacity-text { font-size: 12px; color: #64748b; }

.review-item { padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
.review-item:last-child { border-bottom: none; }
.review-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.reviewer { font-weight: 600; font-size: 14px; }
.stars { font-size: 12px; }
.comment { font-size: 13px; color: #64748b; margin: 0 0 4px; line-height: 1.5; }
.date { font-size: 12px; color: #94a3b8; }
.empty { text-align: center; color: #94a3b8; padding: 20px; font-size: 14px; }

@media (max-width: 768px) {
  .main { padding: 16px; }
  .stat-card.highlight { grid-column: span 1; }
  .booking-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
