<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const refreshing = ref(false)

// Stats with trends
const stats = ref({
  totalUsers: { value: 0, trend: '+12%', trendUp: true },
  totalLesPlaces: { value: 0, trend: '+5%', trendUp: true },
  pendingVerifications: { value: 0, trend: '', trendUp: false },
  totalRevenue: { value: 0, trend: '+18%', trendUp: true },
  activeStudents: { value: 0, trend: '+8%', trendUp: true },
  activeTeachers: { value: 0, trend: '+3%', trendUp: true },
  activeOwners: { value: 0, trend: '+2%', trendUp: true },
  todayTransactions: { value: 0, trend: '', trendUp: true }
})

// User breakdown for chart
const userBreakdown = computed(() => [
  { label: 'Siswa', count: stats.value.activeStudents.value, color: '#3B82F6', percent: 0 },
  { label: 'Guru', count: stats.value.activeTeachers.value, color: '#10B981', percent: 0 },
  { label: 'Pemilik', count: stats.value.activeOwners.value, color: '#F59E0B', percent: 0 }
])

// Recent Data
const recentUsers = ref([])
const recentLesPlaces = ref([])
const recentTransactions = ref([])
const pendingVerifications = ref([])

onMounted(async () => {
  await fetchDashboardData()
})

async function fetchDashboardData() {
  loading.value = true
  try {
    // Fetch user counts by role (exclude admin users)
    const { count: totalUserCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'admin')
    const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student')
    const { count: teacherCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher')
    const { count: ownerCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner')
    const { count: lesCount } = await supabase.from('les_places').select('*', { count: 'exact', head: true })
    
    // Pending verifications
    const { count: pendingCount } = await supabase.from('les_places').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending')
    
    // Revenue from bookings (consistent with AdminFinance)
    const successStatuses = ['paid', 'settlement', 'capture']
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('payment_status, programs(price)')
    
    const completedBookings = (allBookings || []).filter(b => successStatuses.includes(b.payment_status))
    const totalRevenue = completedBookings.reduce((sum, b) => sum + Math.round((b.programs?.price || 0) * 0.1), 0)
    const totalTransactions = completedBookings.length

    stats.value = {
      totalUsers: { value: totalUserCount || 0, trend: '+12% bulan ini', trendUp: true },
      totalLesPlaces: { value: lesCount || 0, trend: '+5% bulan ini', trendUp: true },
      pendingVerifications: { value: pendingCount || 0, trend: pendingCount > 0 ? 'Perlu ditinjau' : 'Semua terverifikasi', trendUp: pendingCount === 0 },
      totalRevenue: { value: totalRevenue, trend: '+18% bulan ini', trendUp: true },
      activeStudents: { value: studentCount || 0, trend: '+8%', trendUp: true },
      activeTeachers: { value: teacherCount || 0, trend: '+3%', trendUp: true },
      activeOwners: { value: ownerCount || 0, trend: '+2%', trendUp: true },
      todayTransactions: { value: totalTransactions, trend: `${totalTransactions} berhasil`, trendUp: true }
    }

    // Recent Users (exclude admin)
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
      .limit(5)
    recentUsers.value = users || []

    // Recent Les Places - menggunakan view dengan owner
    const { data: lesPlaces } = await supabase
      .from('les_places_with_owner')
      .select('id, name, city, is_verified, verification_status, created_at, owner_name')
      .order('created_at', { ascending: false })
      .limit(5)
    recentLesPlaces.value = lesPlaces || []

    // Pending Verifications
    const { data: pending } = await supabase
      .from('les_places')
      .select('id, name, city, created_at, owners(users(name))')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    pendingVerifications.value = pending || []

    // Recent Transactions (from bookings for consistency)
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, payment_status, created_at, programs(price, les_places(name))')
      .order('created_at', { ascending: false })
      .limit(5)
    
    recentTransactions.value = (recentBookings || []).map(b => {
      // Normalize status for display
      let normalizedStatus = b.payment_status
      if (successStatuses.includes(b.payment_status)) {
        normalizedStatus = 'completed'
      } else if (b.payment_status === 'unpaid' || b.payment_status === 'pending') {
        normalizedStatus = 'pending'
      } else if (['failed', 'cancelled', 'expire'].includes(b.payment_status)) {
        normalizedStatus = 'failed'
      }
      
      return {
        id: b.id,
        amount: b.programs?.price || 0,
        payment_status: normalizedStatus,
        created_at: b.created_at,
        les_places: b.programs?.les_places
      }
    })

  } catch (err) {
    console.error('Error fetching admin dashboard:', err)
  } finally {
    loading.value = false
  }
}

async function refreshData() {
  refreshing.value = true
  await fetchDashboardData()
  refreshing.value = false
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)
}

function getRoleBadge(role) {
  const badges = {
    student: { label: 'Siswa', class: 'info' },
    teacher: { label: 'Guru', class: 'success' },
    owner: { label: 'Pemilik', class: 'warning' },
    admin: { label: 'Admin', class: 'error' }
  }
  return badges[role] || { label: role, class: 'info' }
}

function getStatusBadge(status) {
  const badges = {
    // Normalized statuses
    pending: { label: 'Menunggu', class: 'warning' },
    completed: { label: 'Selesai', class: 'success' },
    failed: { label: 'Gagal', class: 'error' },
    // Original statuses (fallback)
    verified: { label: 'Terverifikasi', class: 'success' },
    rejected: { label: 'Ditolak', class: 'error' },
    paid: { label: 'Selesai', class: 'success' },
    settlement: { label: 'Selesai', class: 'success' },
    capture: { label: 'Selesai', class: 'success' },
    unpaid: { label: 'Menunggu', class: 'warning' },
    cancelled: { label: 'Dibatalkan', class: 'error' },
    expire: { label: 'Kadaluarsa', class: 'error' }
  }
  return badges[status] || { label: status, class: 'info' }
}
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <main class="main-content">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Dashboard Admin
          </h1>
          <p class="subtitle">Selamat datang! Berikut ringkasan platform Mariles</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" @click="refreshData" :disabled="refreshing">
            <svg :class="{ spinning: refreshing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else class="dashboard-content">
        <!-- Stats Grid -->
        <section class="stats-grid">
          <div class="stat-card primary">
            <div class="icon-wrapper blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="label">Total Pengguna</span>
              <h3 class="value">{{ stats.totalUsers.value.toLocaleString() }}</h3>
              <span class="trend up">{{ stats.totalUsers.trend }} <span class="muted">bulan ini</span></span>
            </div>
          </div>

          <div class="stat-card">
            <div class="icon-wrapper green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="label">Tempat Les</span>
              <h3 class="value">{{ stats.totalLesPlaces.value }}</h3>
              <span class="trend up">{{ stats.totalLesPlaces.trend }} <span class="muted">bulan ini</span></span>
            </div>
          </div>

          <div class="stat-card" :class="{ 'warning': stats.pendingVerifications.value > 0 }">
            <div class="icon-wrapper" :class="stats.pendingVerifications.value > 0 ? 'orange' : 'green'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="label">Verifikasi Pending</span>
              <h3 class="value">{{ stats.pendingVerifications.value }}</h3>
              <span class="trend" :class="stats.pendingVerifications.value > 0 ? 'warning' : 'success'">
                {{ stats.pendingVerifications.trend }}
              </span>
            </div>
          </div>

          <div class="stat-card">
            <div class="icon-wrapper purple">
              <span class="currency-icon">Rp</span>
            </div>
            <div class="stat-content">
              <span class="label">Total Pendapatan</span>
              <h3 class="value">{{ formatCurrency(stats.totalRevenue.value) }}</h3>
              <span class="trend up">{{ stats.totalRevenue.trend }} <span class="muted">bulan ini</span></span>
            </div>
          </div>
        </section>

        <!-- User Breakdown + Quick Actions -->
        <section class="overview-grid">
          <div class="card breakdown-card">
            <div class="card-header">
              <h3>Komposisi Pengguna</h3>
            </div>
            <div class="breakdown-content">
              <div class="breakdown-chart">
                <div class="donut-chart">
                  <svg viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#E2E8F0" stroke-width="3"/>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#3B82F6" stroke-width="3"
                      :stroke-dasharray="`${(stats.activeStudents.value / stats.totalUsers.value) * 100} 100`"
                      stroke-dashoffset="25"/>
                  </svg>
                  <div class="donut-center">
                    <span class="total">{{ stats.totalUsers.value }}</span>
                    <span class="label">Total</span>
                  </div>
                </div>
              </div>
              <div class="breakdown-legend">
                <div class="legend-item">
                  <span class="dot blue"></span>
                  <span class="name">Siswa</span>
                  <span class="count">{{ stats.activeStudents.value }}</span>
                </div>
                <div class="legend-item">
                  <span class="dot green"></span>
                  <span class="name">Guru</span>
                  <span class="count">{{ stats.activeTeachers.value }}</span>
                </div>
                <div class="legend-item">
                  <span class="dot orange"></span>
                  <span class="name">Pemilik Les</span>
                  <span class="count">{{ stats.activeOwners.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card quick-actions-card">
            <div class="card-header">
              <h3>Aksi Cepat</h3>
            </div>
            <div class="quick-actions">
              <router-link to="/admin/les-places" class="action-btn">
                <div class="action-icon orange">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div class="action-info">
                  <span class="action-title">Verifikasi Les</span>
                  <span class="action-count">{{ stats.pendingVerifications.value }} pending</span>
                </div>
              </router-link>
              <router-link to="/admin/users" class="action-btn">
                <div class="action-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <div class="action-info">
                  <span class="action-title">Kelola Pengguna</span>
                  <span class="action-count">{{ stats.totalUsers.value }} user</span>
                </div>
              </router-link>
              <router-link to="/admin/reports" class="action-btn">
                <div class="action-icon green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div class="action-info">
                  <span class="action-title">Lihat Laporan</span>
                  <span class="action-count">Keuangan & Transaksi</span>
                </div>
              </router-link>
              <router-link to="/admin/notifications" class="action-btn">
                <div class="action-icon purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <div class="action-info">
                  <span class="action-title">Kirim Notifikasi</span>
                  <span class="action-count">Broadcast</span>
                </div>
              </router-link>
            </div>
          </div>
        </section>

        <!-- Pending Verifications Alert -->
        <section v-if="pendingVerifications.length > 0" class="alert-section">
          <div class="alert-card warning">
            <div class="alert-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="alert-content">
              <h4>{{ pendingVerifications.length }} Tempat Les Menunggu Verifikasi</h4>
              <p>Tinjau dan verifikasi tempat les baru untuk menjaga kualitas platform</p>
            </div>
            <router-link to="/admin/les-places" class="alert-action">Tinjau Sekarang</router-link>
          </div>
        </section>

        <!-- Tables Section -->
        <section class="tables-grid">
          <!-- Recent Users -->
          <div class="card table-card">
            <div class="card-header">
              <h3>Pengguna Terbaru</h3>
              <router-link to="/admin/users" class="link">Lihat Semua</router-link>
            </div>
            <div class="table-responsive">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Role</th>
                    <th>Bergabung</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in recentUsers" :key="user.id">
                    <td>
                      <div class="user-cell">
                        <div class="avatar-placeholder">{{ user.name?.charAt(0) || 'U' }}</div>
                        <div>
                          <div class="fw-bold">{{ user.name || 'N/A' }}</div>
                          <div class="text-xs text-muted">{{ user.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" :class="getRoleBadge(user.role).class">
                        {{ getRoleBadge(user.role).label }}
                      </span>
                    </td>
                    <td class="text-muted">{{ formatDate(user.created_at) }}</td>
                  </tr>
                  <tr v-if="recentUsers.length === 0">
                    <td colspan="3" class="text-center text-muted py-lg">Belum ada pengguna</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Recent Transactions -->
          <div class="card table-card">
            <div class="card-header">
              <h3>Transaksi Terbaru</h3>
              <router-link to="/admin/reports" class="link">Lihat Semua</router-link>
            </div>
            <div class="table-responsive">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Tempat Les</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="txn in recentTransactions" :key="txn.id">
                    <td>
                      <div class="fw-bold">{{ txn.les_places?.name || 'N/A' }}</div>
                      <div class="text-xs text-muted">{{ formatDate(txn.created_at) }}</div>
                    </td>
                    <td class="fw-medium">{{ formatCurrency(txn.amount) }}</td>
                    <td>
                      <span class="status-badge" :class="getStatusBadge(txn.payment_status).class">
                        {{ getStatusBadge(txn.payment_status).label }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="recentTransactions.length === 0">
                    <td colspan="3" class="text-center text-muted py-lg">Belum ada transaksi</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Recent Les Places -->
        <section class="recent-section">
          <div class="card table-card full-width">
            <div class="card-header">
              <h3>Tempat Les Terbaru</h3>
              <router-link to="/admin/les-places" class="link">Lihat Semua</router-link>
            </div>
            <div class="table-responsive">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Nama Tempat Les</th>
                    <th>Kota</th>
                    <th>Pemilik</th>
                    <th>Terdaftar</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="lp in recentLesPlaces" :key="lp.id">
                    <td>
                      <div class="fw-bold">{{ lp.name }}</div>
                    </td>
                    <td>{{ lp.city || '-' }}</td>
                    <td>{{ lp.owner_name || '-' }}</td>
                    <td class="text-muted">{{ formatDate(lp.created_at) }}</td>
                    <td>
                      <span class="status-badge" :class="getStatusBadge(lp.verification_status || (lp.is_verified ? 'verified' : 'pending')).class">
                        {{ getStatusBadge(lp.verification_status || (lp.is_verified ? 'verified' : 'pending')).label }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="recentLesPlaces.length === 0">
                    <td colspan="5" class="text-center text-muted py-lg">Belum ada tempat les</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.header-left h1 svg { width: 28px; height: 28px; color: #0A4568; }
.subtitle { font-size: 14px; color: #64748B; }

.btn-refresh { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.2s; }
.btn-refresh:hover { background: #F1F5F9; border-color: #CBD5E1; }
.btn-refresh svg { width: 18px; height: 18px; }
.btn-refresh svg.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.loading-state { display: flex; justify-content: center; padding: 100px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }

.stat-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s; }
.stat-card:hover { border-color: #CBD5E1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.stat-card.warning { border-color: #FBBF24; background: #FFFBEB; }
.stat-card.primary { background: #F1F5F9; color: #0D5782; border: 1px solid #E2E8F0; }
.stat-card.primary label { color: #64748B; }
.stat-card.primary .value { color: #0D5782; }
.stat-card.primary .trend { color: #16A34A; }

.icon-wrapper { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-wrapper svg { width: 26px; height: 26px; }
.icon-wrapper.blue { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.green { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.orange { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.purple { background: #F1F5F9; color: #0D5782; }
.currency-icon { font-weight: 800; font-size: 18px; }
.stat-card.primary .icon-wrapper { background: #F1F5F9; color: #0D5782; }

.stat-content { flex: 1; }
.stat-content .label { display: block; font-size: 13px; color: #64748B; margin-bottom: 4px; }
.stat-content .value { font-size: 20px; font-weight: 800; color: #1E293B; margin-bottom: 4px; }
.stat-content .trend { font-size: 12px; font-weight: 500; }
.trend.up { color: #16A34A; }
.trend.warning { color: #D97706; }
.trend.success { color: #16A34A; }
.trend .muted { color: #94A3B8; font-weight: 400; }

/* Overview Grid */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }

.card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-header h3 { font-size: 16px; font-weight: 600; color: #1E293B; }
.link { font-size: 13px; color: #0284C7; font-weight: 500; text-decoration: none; }
.link:hover { text-decoration: underline; }

/* Breakdown Card */
.breakdown-content { display: flex; align-items: center; gap: 32px; }
.donut-chart { position: relative; width: 120px; height: 120px; }
.donut-chart svg { transform: rotate(-90deg); }
.donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.donut-center .total { display: block; font-size: 24px; font-weight: 700; color: #1E293B; }
.donut-center .label { font-size: 11px; color: #64748B; }

.breakdown-legend { flex: 1; }
.legend-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
.legend-item:last-child { border-bottom: none; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.blue { background: #3B82F6; }
.dot.green { background: #10B981; }
.dot.orange { background: #F59E0B; }
.legend-item .name { flex: 1; font-size: 14px; color: #475569; }
.legend-item .count { font-weight: 600; color: #1E293B; }

/* Quick Actions */
.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.action-btn { display: flex; align-items: center; gap: 12px; padding: 16px; background: #F8FAFC; border-radius: 12px; text-decoration: none; transition: all 0.2s; }
.action-btn:hover { background: #F1F5F9; }
.action-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.action-icon svg { width: 20px; height: 20px; }
.action-icon.blue { background: #F1F5F9; color: #0D5782; }
.action-icon.green { background: #F1F5F9; color: #0D5782; }
.action-icon.orange { background: #F1F5F9; color: #0D5782; }
.action-icon.purple { background: #F1F5F9; color: #0D5782; }
.action-info { display: flex; flex-direction: column; }
.action-title { font-size: 14px; font-weight: 600; color: #1E293B; }
.action-count { font-size: 12px; color: #64748B; }

/* Alert Section */
.alert-section { margin-bottom: 24px; }
.alert-card { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-radius: 12px; }
.alert-card.warning { background: #FEF3C7; border: 1px solid #FCD34D; }
.alert-icon { width: 40px; height: 40px; border-radius: 10px; background: #D97706; color: white; display: flex; align-items: center; justify-content: center; }
.alert-icon svg { width: 20px; height: 20px; }
.alert-content { flex: 1; }
.alert-content h4 { font-size: 14px; font-weight: 600; color: #92400E; margin-bottom: 2px; }
.alert-content p { font-size: 13px; color: #B45309; }
.alert-action { padding: 8px 16px; background: #D97706; color: white; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; }
.alert-action:hover { background: #B45309; }

/* Tables Grid */
.tables-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.table-card.full-width { width: 100%; }

.table-responsive { overflow-x: auto; }
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { text-align: left; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; border-bottom: 1px solid #E2E8F0; }
.modern-table td { padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #F1F5F9; }
.modern-table tr:last-child td { border-bottom: none; }
.modern-table tr:hover { background: #F8FAFC; }

.user-cell { display: flex; align-items: center; gap: 12px; }
.avatar-placeholder { width: 36px; height: 36px; background: #F1F5F9; color: #0D5782; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; }

.text-xs { font-size: 12px; }
.fw-bold { font-weight: 600; }
.fw-medium { font-weight: 500; }
.text-muted { color: #64748B; }
.text-center { text-align: center; }
.py-lg { padding: 24px 16px; }

.status-badge { padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
.status-badge.success { background: #DCFCE7; color: #16A34A; }
.status-badge.warning { background: #FEF3C7; color: #D97706; }
.status-badge.error { background: #FEE2E2; color: #DC2626; }
.status-badge.info { background: #DBEAFE; color: #2563EB; }

/* Responsive */
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .overview-grid { grid-template-columns: 1fr; }
  .tables-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .main-content { padding: 16px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .quick-actions { grid-template-columns: 1fr; }
}
</style>
