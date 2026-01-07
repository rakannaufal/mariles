<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '@/components/AdminSidebar.vue'

// State
const loading = ref(true)
const stats = ref({
  totalUsers: 0,
  totalLesPlaces: 0,
  totalBookings: 0,
  totalRevenue: 0,
  pendingVerifications: 0,
  activeStudents: 0
})

const monthlyData = ref({
  labels: [],
  users: [],
  bookings: [],
  revenue: []
})

const topLesPlaces = ref([])
const recentTransactions = ref([])

// Fetch all analytics data
async function fetchAnalytics() {
  loading.value = true
  try {
    await Promise.all([
      fetchStats(),
      fetchMonthlyData(),
      fetchTopLesPlaces(),
      fetchRecentTransactions()
    ])
  } catch (err) {
    console.error('Error fetching analytics:', err)
  } finally {
    loading.value = false
  }
}

// Fetch summary stats
async function fetchStats() {
  // Total users
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
  stats.value.totalUsers = userCount || 0

  // Total les places
  const { count: lesCount } = await supabase
    .from('les_places')
    .select('*', { count: 'exact', head: true })
  stats.value.totalLesPlaces = lesCount || 0

  // Total bookings
  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
  stats.value.totalBookings = bookingCount || 0

  // Total revenue
  const { data: revenueData } = await supabase
    .from('transactions')
    .select('amount')
    .eq('payment_status', 'settlement')
  stats.value.totalRevenue = revenueData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0

  // Pending verifications
  const { count: pendingCount } = await supabase
    .from('les_places')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'pending')
  stats.value.pendingVerifications = pendingCount || 0

  // Active students
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
  stats.value.activeStudents = studentCount || 0
}

// Fetch monthly trend data (last 6 months)
async function fetchMonthlyData() {
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
  
  // Fetch data for each month
  const usersPromises = months.map(m => 
    supabase.from('users').select('*', { count: 'exact', head: true })
      .gte('created_at', m.start).lte('created_at', m.end)
  )
  const bookingsPromises = months.map(m =>
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .gte('created_at', m.start).lte('created_at', m.end)
  )
  const revenuePromises = months.map(m =>
    supabase.from('transactions').select('amount')
      .eq('payment_status', 'settlement')
      .gte('created_at', m.start).lte('created_at', m.end)
  )

  const [usersResults, bookingsResults, revenueResults] = await Promise.all([
    Promise.all(usersPromises),
    Promise.all(bookingsPromises),
    Promise.all(revenuePromises)
  ])

  monthlyData.value.users = usersResults.map(r => r.count || 0)
  monthlyData.value.bookings = bookingsResults.map(r => r.count || 0)
  monthlyData.value.revenue = revenueResults.map(r => 
    r.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
  )
}

// Fetch top 5 les places by bookings
async function fetchTopLesPlaces() {
  const { data } = await supabase
    .from('les_places')
    .select('id, name, total_students, rating, city')
    .order('total_students', { ascending: false })
    .limit(5)
  
  topLesPlaces.value = data || []
}

// Fetch recent transactions
async function fetchRecentTransactions() {
  const { data } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      payment_status,
      created_at,
      les_place:les_places(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5)
  
  recentTransactions.value = data || []
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

// Format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Get max value for chart scaling
const maxChartValue = computed(() => {
  return Math.max(...monthlyData.value.bookings, ...monthlyData.value.users, 1)
})

onMounted(fetchAnalytics)
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <main class="main">
      <header class="header">
        <div>
          <h1>Analytics</h1>
          <p class="subtitle">Statistik dan analitik platform</p>
        </div>
        <button class="btn btn-outline" @click="fetchAnalytics">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat data analytics...</p>
      </div>

      <template v-else>
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon users">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalUsers.toLocaleString() }}</span>
              <span class="stat-label">Total Pengguna</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon places">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalLesPlaces.toLocaleString() }}</span>
              <span class="stat-label">Tempat Les</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon bookings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.totalBookings.toLocaleString() }}</span>
              <span class="stat-label">Total Booking</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon revenue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</span>
              <span class="stat-label">Total Pendapatan</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon pending">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.pendingVerifications }}</span>
              <span class="stat-label">Menunggu Verifikasi</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon students">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stats.activeStudents.toLocaleString() }}</span>
              <span class="stat-label">Total Siswa</span>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Trend Pendaftaran (6 Bulan Terakhir)</h3>
            <div class="simple-chart">
              <div class="chart-bars">
                <div v-for="(value, i) in monthlyData.bookings" :key="i" class="chart-bar-group">
                  <div class="bar-wrapper">
                    <div class="bar users" :style="{ height: (monthlyData.users[i] / maxChartValue * 100) + '%' }" :title="'Users: ' + monthlyData.users[i]"></div>
                    <div class="bar bookings" :style="{ height: (value / maxChartValue * 100) + '%' }" :title="'Bookings: ' + value"></div>
                  </div>
                  <span class="bar-label">{{ monthlyData.labels[i] }}</span>
                </div>
              </div>
              <div class="chart-legend">
                <span class="legend-item"><span class="dot users"></span> Pengguna Baru</span>
                <span class="legend-item"><span class="dot bookings"></span> Booking</span>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <h3>Revenue Bulanan</h3>
            <div class="revenue-list">
              <div v-for="(value, i) in monthlyData.revenue" :key="i" class="revenue-item">
                <span class="month">{{ monthlyData.labels[i] }}</span>
                <div class="revenue-bar">
                  <div class="revenue-fill" :style="{ width: (value / Math.max(...monthlyData.revenue, 1) * 100) + '%' }"></div>
                </div>
                <span class="amount">{{ formatCurrency(value) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tables Section -->
        <div class="tables-grid">
          <div class="table-card">
            <h3>Top 5 Tempat Les</h3>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr><th>Nama</th><th>Kota</th><th>Siswa</th><th>Rating</th></tr>
                </thead>
                <tbody>
                  <tr v-for="les in topLesPlaces" :key="les.id">
                    <td class="name">{{ les.name }}</td>
                    <td>{{ les.city || '-' }}</td>
                    <td>{{ les.total_students || 0 }}</td>
                    <td><span class="rating">⭐ {{ (les.rating || 0).toFixed(1) }}</span></td>
                  </tr>
                  <tr v-if="!topLesPlaces.length"><td colspan="4" class="empty">Tidak ada data</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="table-card">
            <h3>Transaksi Terbaru</h3>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr><th>Tempat Les</th><th>Jumlah</th><th>Status</th><th>Tanggal</th></tr>
                </thead>
                <tbody>
                  <tr v-for="tx in recentTransactions" :key="tx.id">
                    <td class="name">{{ tx.les_place?.name || '-' }}</td>
                    <td>{{ formatCurrency(tx.amount) }}</td>
                    <td><span class="status" :class="tx.payment_status">{{ tx.payment_status }}</span></td>
                    <td>{{ formatDate(tx.created_at) }}</td>
                  </tr>
                  <tr v-if="!recentTransactions.length"><td colspan="4" class="empty">Tidak ada data</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #f8fafc; }
.main { flex: 1; padding: 24px 32px; overflow-x: hidden; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header h1 { font-size: 28px; font-weight: 700; margin: 0; }
.subtitle { color: #64748b; font-size: 14px; margin: 4px 0 0; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn svg { width: 18px; height: 18px; }
.btn-outline { background: white; border: 2px solid #e2e8f0; color: #475569; }
.btn-outline:hover { border-color: #0d5782; color: #0d5782; }

.loading-state { text-align: center; padding: 80px 20px; background: white; border-radius: 16px; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d5782; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card { background: white; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.stat-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon svg { width: 26px; height: 26px; }
.stat-icon.users { background: #F1F5F9; color: #0D5782; }
.stat-icon.places { background: #F1F5F9; color: #0D5782; }
.stat-icon.bookings { background: #F1F5F9; color: #0D5782; }
.stat-icon.revenue { background: #F1F5F9; color: #0D5782; }
.stat-icon.pending { background: #F1F5F9; color: #0D5782; }
.stat-icon.students { background: #F1F5F9; color: #0D5782; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 20px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 13px; color: #64748b; }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 24px; }
.chart-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.chart-card h3 { font-size: 16px; font-weight: 700; margin: 0 0 20px; }

.simple-chart { }
.chart-bars { display: flex; justify-content: space-around; align-items: flex-end; height: 180px; gap: 16px; padding: 0 10px; }
.chart-bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-wrapper { display: flex; gap: 4px; align-items: flex-end; height: 150px; }
.bar { width: 24px; border-radius: 4px 4px 0 0; transition: height 0.5s ease; min-height: 4px; }
.bar.users { background: linear-gradient(180deg, #3b82f6, #60a5fa); }
.bar.bookings { background: linear-gradient(180deg, #f59e0b, #fbbf24); }
.bar-label { font-size: 12px; color: #64748b; margin-top: 8px; }
.chart-legend { display: flex; gap: 20px; justify-content: center; margin-top: 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; }
.dot { width: 10px; height: 10px; border-radius: 3px; }
.dot.users { background: #3b82f6; }
.dot.bookings { background: #f59e0b; }

.revenue-list { display: flex; flex-direction: column; gap: 12px; }
.revenue-item { display: flex; align-items: center; gap: 12px; }
.revenue-item .month { width: 40px; font-size: 13px; color: #64748b; }
.revenue-bar { flex: 1; height: 24px; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
.revenue-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 6px; transition: width 0.5s ease; }
.revenue-item .amount { width: 120px; text-align: right; font-size: 13px; font-weight: 600; color: #1e293b; }

.tables-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
.table-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.table-card h3 { font-size: 16px; font-weight: 700; margin: 0 0 16px; }
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px; text-align: left; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
th { color: #64748b; font-weight: 600; font-size: 13px; }
td.name { font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
td.empty { text-align: center; color: #94a3b8; padding: 24px; }
.rating { background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
.status.settlement { background: #dcfce7; color: #16a34a; }
.status.pending { background: #fef3c7; color: #d97706; }
.status.failed, .status.expire { background: #fee2e2; color: #dc2626; }

@media (max-width: 768px) {
  .main { padding: 16px; }
  .charts-grid, .tables-grid { grid-template-columns: 1fr; }
  .stat-card { padding: 16px; }
  .stat-value { font-size: 20px; }
}
</style>
