<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import StatCard from '@/components/StatCard.vue'
import { ref, onMounted, computed } from 'vue'
import { 
  getAdminRevenueStats, 
  getMonthlyRevenueChart, 
  getRecentPlatformRevenue,
  getPendingRefunds 
} from '@/services/paymentService'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const refreshing = ref(false)
const activeTab = ref('overview')

// Stats data
const stats = ref({
  totalRevenue: 0,
  monthRevenue: 0,
  todayRevenue: 0,
  breakdown: {},
  completedTransactions: 0,
  pendingWithdrawals: 0,
  pendingRefunds: 0
})

// Chart data
const chartData = ref([])
const maxChartValue = computed(() => Math.max(...chartData.value.map(d => d.total), 1))

// Recent revenue
const recentRevenue = ref([])

// Pending withdrawals
const pendingWithdrawals = ref([])

// Pending refunds
const pendingRefunds = ref([])

const tabs = [
  { id: 'overview', label: 'Ringkasan' },
  { id: 'revenue', label: 'Pendapatan' },
  { id: 'withdrawals', label: 'Pencairan' },
  { id: 'refunds', label: 'Refund' }
]

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    // SUCCESS STATUSES (consistent across all finance pages)
    const successStatuses = ['paid', 'settlement', 'capture']

    // Try to fetch from platform_revenue first
    const statsResult = await getAdminRevenueStats()
    if (statsResult.success && statsResult.stats.totalRevenue > 0) {
      stats.value = statsResult.stats
    } else {
      // FALLBACK: Calculate from bookings (source of truth)
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('status, payment_status, created_at, programs(price)')
      
      const validStatuses = ['active', 'confirmed', 'completed']
      const completedBookings = (allBookings || []).filter(b => 
        successStatuses.includes(b.payment_status) && 
        validStatuses.includes(b.status)
      )
      
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyBookings = completedBookings.filter(b => new Date(b.created_at) >= startOfMonth)
      
      // Calculate platform fee (10%) from completed bookings
      const totalPlatformFee = completedBookings.reduce((sum, b) => sum + Math.round((b.programs?.price || 0) * 0.1), 0)
      const monthlyPlatformFee = monthlyBookings.reduce((sum, b) => sum + Math.round((b.programs?.price || 0) * 0.1), 0)
      
      const { data: pendingWithdrawalsCount } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('status', 'pending')
      
      const { data: pendingRefundsCount } = await supabase
        .from('refunds')
        .select('id')
        .eq('status', 'pending')
      
      stats.value = {
        totalRevenue: totalPlatformFee,
        monthRevenue: monthlyPlatformFee,
        pendingWithdrawals: pendingWithdrawalsCount?.length || 0,
        pendingRefunds: pendingRefundsCount?.length || 0,
        breakdown: {
          platform_fee: totalPlatformFee,
          withdrawal_fee: 0
        }
      }
    }

    // Generate chart data from bookings (last 6 months)
    const { data: chartBookings } = await supabase
      .from('bookings')
      .select('status, payment_status, created_at, programs(price)')
      .in('payment_status', successStatuses)
      .in('status', ['active', 'confirmed', 'completed'])
    
    // Group by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const now = new Date()
    const chartMonths = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      chartMonths.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      })
    }
    
    chartData.value = chartMonths.map(m => {
      const monthBookings = (chartBookings || []).filter(b => {
        const bDate = new Date(b.created_at)
        return bDate.getFullYear() === m.year && bDate.getMonth() === m.month
      })
      const platformFee = monthBookings.reduce((sum, b) => sum + Math.round((b.programs?.price || 0) * 0.1), 0)
      return {
        month: m.label,
        platformFee: platformFee,
        withdrawalFee: 0,
        total: platformFee
      }
    })

    // Fetch recent revenue from bookings instead
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, status, payment_status, created_at, programs(name, price, les_places(id, name))')
      .in('payment_status', successStatuses)
      .in('status', ['active', 'confirmed', 'completed'])
      .order('created_at', { ascending: false })
      .limit(10)
    
    recentRevenue.value = (recentBookings || []).map(b => ({
      id: b.id,
      amount: Math.round((b.programs?.price || 0) * 0.1),
      source: 'platform_fee',
      description: `Komisi dari ${b.programs?.name}`,
      les_places: b.programs?.les_places,
      created_at: b.created_at
    }))

    // Fetch pending withdrawals
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select(`
        *,
        users(name, email),
        les_places(name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    pendingWithdrawals.value = withdrawals || []

    // Fetch pending refunds
    const refundResult = await getPendingRefunds()
    if (refundResult.success) {
      pendingRefunds.value = refundResult.refunds
    }

  } catch (err) {
    console.error('Error fetching admin finance data:', err)
  } finally {
    loading.value = false
  }
}

async function refreshData() {
  refreshing.value = true
  await fetchData()
  refreshing.value = false
}

async function approveWithdrawal(withdrawal) {
  if (!confirm(`Proses pencairan Rp ${formatCurrency(withdrawal.net_amount)} ke ${withdrawal.bank_holder}?`)) return
  
  try {
    await supabase
      .from('withdrawals')
      .update({ 
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', withdrawal.id)
    
    await fetchData()
  } catch (err) {
    console.error('Error approving withdrawal:', err)
  }
}

async function rejectWithdrawal(withdrawal) {
  const reason = prompt('Alasan penolakan:')
  if (!reason) return
  
  try {
    // Return balance to user
    const { data: balance } = await supabase
      .from('balances')
      .select('available_balance')
      .eq('user_id', withdrawal.user_id)
      .single()
    
    if (balance) {
      await supabase
        .from('balances')
        .update({ 
          available_balance: balance.available_balance + withdrawal.amount 
        })
        .eq('user_id', withdrawal.user_id)
    }
    
    await supabase
      .from('withdrawals')
      .update({ 
        status: 'rejected',
        notes: reason
      })
      .eq('id', withdrawal.id)
    
    await fetchData()
  } catch (err) {
    console.error('Error rejecting withdrawal:', err)
  }
}

async function approveRefund(refund) {
  if (!confirm(`Setujui refund Rp ${formatCurrency(refund.amount)}?`)) return
  
  try {
    const { processRefund } = await import('@/services/paymentService')
    const result = await processRefund(refund.id)
    
    if (!result.success) {
      alert(`Refund ditolak: ${result.error}`)
      return
    }
    
    alert('Refund berhasil disetujui!')
    await fetchData()
  } catch (err) {
    console.error('Error approving refund:', err)
    alert('Terjadi kesalahan saat memproses refund')
  }
}

async function rejectRefund(refund) {
  const reason = prompt('Alasan penolakan:')
  if (!reason) return
  
  try {
    await supabase
      .from('refunds')
      .update({ 
        status: 'rejected',
        admin_note: reason,
        processed_at: new Date().toISOString()
      })
      .eq('id', refund.id)
    
    await fetchData()
  } catch (err) {
    console.error('Error rejecting refund:', err)
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount || 0)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getSourceLabel(source) {
  const labels = {
    platform_fee: 'Komisi Platform',
    withdrawal_fee: 'Biaya Pencairan',
    refund_fee: 'Biaya Refund',
    other: 'Lainnya'
  }
  return labels[source] || source
}

function getSourceClass(source) {
  const classes = {
    platform_fee: 'success',
    withdrawal_fee: 'info',
    refund_fee: 'warning',
    other: 'default'
  }
  return classes[source] || 'default'
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
            <span class="header-rp-icon">Rp</span>
            Keuangan Platform
          </h1>
          <p class="subtitle">Kelola pendapatan platform, pencairan, dan refund</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" @click="refreshData" :disabled="refreshing">
            <svg :class="{ spinning: refreshing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat data keuangan...</p>
      </div>

      <div v-else class="finance-content">
        <!-- Stats Cards -->
        <section class="stats-grid">
          <StatCard 
              label="Total Pendapatan Platform" 
              :value="`Rp ${formatCurrency(stats.totalRevenue)}`" 
              icon-color="green"
          >
              <template #icon>
                <span class="currency-symbol">Rp</span>
              </template>
              <template #extra>
                <span class="stat-hint">Dari semua komisi & biaya</span>
              </template>
          </StatCard>

          <StatCard 
              label="Pendapatan Bulan Ini" 
              :value="formatCurrency(stats.monthRevenue)" 
              icon-color="blue"
          >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </template>
              <template #extra>
                <span class="stat-hint">{{ new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }) }}</span>
              </template>
          </StatCard>

          <StatCard 
              label="Pencairan Pending" 
              :value="stats.pendingWithdrawals" 
              icon-color="orange"
          >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </template>
              <template #extra>
                <span class="stat-hint">Menunggu diproses</span>
              </template>
          </StatCard>

          <StatCard 
              label="Refund Pending" 
              :value="stats.pendingRefunds" 
              icon-color="purple"
          >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3h18v18H3zM21 9H3M9 21V9"></path>
                </svg>
              </template>
              <template #extra>
                <span class="stat-hint">Perlu ditinjau</span>
              </template>
          </StatCard>
        </section>

        <!-- Tabs -->
        <div class="tabs-container">
          <div class="tabs">
            <button 
              v-for="tab in tabs" 
              :key="tab.id" 
              class="tab" 
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'" class="tab-panel">
            <div class="overview-grid">
              <!-- Revenue Chart -->
              <div class="panel-card chart-card">
                <h3>Pendapatan 6 Bulan Terakhir</h3>
                <div class="chart-container">
                  <div class="chart-bars">
                    <div v-for="(data, i) in chartData" :key="i" class="chart-bar-wrapper">
                      <div class="chart-bar-group">
                        <div 
                          class="chart-bar platform" 
                          :style="{ height: `${(data.platformFee / maxChartValue) * 100}%` }"
                          :title="`Komisi: Rp ${formatCurrency(data.platformFee)}`"
                        ></div>
                        <div 
                          class="chart-bar withdrawal" 
                          :style="{ height: `${(data.withdrawalFee / maxChartValue) * 100}%` }"
                          :title="`Biaya Pencairan: Rp ${formatCurrency(data.withdrawalFee)}`"
                        ></div>
                      </div>
                      <span class="chart-label">{{ data.month }}</span>
                      <span class="chart-value">{{ formatCurrency(data.total) }}</span>
                    </div>
                  </div>
                </div>
                <div class="chart-legend">
                  <span class="legend-item"><span class="dot platform"></span> Komisi Platform</span>
                  <span class="legend-item"><span class="dot withdrawal"></span> Biaya Pencairan</span>
                </div>
              </div>

              <!-- Revenue Breakdown -->
              <div class="panel-card">
                <h3>Breakdown Pendapatan</h3>
                <div class="breakdown-list">
                  <div class="breakdown-item" v-for="(amount, source) in stats.breakdown" :key="source">
                    <div class="breakdown-info">
                      <span class="breakdown-label">{{ getSourceLabel(source) }}</span>
                      <span class="breakdown-value">Rp {{ formatCurrency(amount) }}</span>
                    </div>
                    <div class="breakdown-bar">
                      <div 
                        class="breakdown-fill" 
                        :class="getSourceClass(source)"
                        :style="{ width: `${(amount / stats.totalRevenue) * 100}%` }"
                      ></div>
                    </div>
                  </div>
                  <div v-if="Object.keys(stats.breakdown).length === 0" class="empty-state">
                    <p>Belum ada data pendapatan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Revenue Tab -->
          <div v-if="activeTab === 'revenue'" class="tab-panel">
            <div class="panel-card">
              <h3>Riwayat Pendapatan Platform</h3>
              <div class="table-responsive">
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Sumber</th>
                      <th>Deskripsi</th>
                      <th>Tempat Les</th>
                      <th>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="rev in recentRevenue" :key="rev.id">
                      <td>{{ formatDate(rev.created_at) }}</td>
                      <td>
                        <span class="badge" :class="getSourceClass(rev.source)">
                          {{ getSourceLabel(rev.source) }}
                        </span>
                      </td>
                      <td>{{ rev.description || '-' }}</td>
                      <td>{{ rev.les_places?.name || '-' }}</td>
                      <td class="amount">Rp {{ formatCurrency(rev.amount) }}</td>
                    </tr>
                    <tr v-if="recentRevenue.length === 0">
                      <td colspan="5" class="empty">Belum ada data pendapatan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Withdrawals Tab -->
          <div v-if="activeTab === 'withdrawals'" class="tab-panel">
            <div class="panel-card">
              <h3>Pencairan Pending ({{ pendingWithdrawals.length }})</h3>
              <div class="table-responsive">
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>User</th>
                      <th>Bank</th>
                      <th>Jumlah</th>
                      <th>Net</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="w in pendingWithdrawals" :key="w.id">
                      <td>{{ formatDate(w.created_at) }}</td>
                      <td>
                        <div class="user-info">
                          <strong>{{ w.users?.name || 'N/A' }}</strong>
                          <span>{{ w.users?.email }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="bank-info">
                          <strong>{{ w.bank_name }}</strong>
                          <span>{{ w.bank_account }} ({{ w.bank_holder }})</span>
                        </div>
                      </td>
                      <td>Rp {{ formatCurrency(w.amount) }}</td>
                      <td class="amount">Rp {{ formatCurrency(w.net_amount) }}</td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn-approve" @click="approveWithdrawal(w)">Proses</button>
                          <button class="btn-reject" @click="rejectWithdrawal(w)">Tolak</button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="pendingWithdrawals.length === 0">
                      <td colspan="6" class="empty">Tidak ada pencairan pending</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Refunds Tab -->
          <div v-if="activeTab === 'refunds'" class="tab-panel">
            <div class="panel-card">
              <h3>Refund Pending ({{ pendingRefunds.length }})</h3>
              <div class="table-responsive">
                <table class="modern-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Siswa</th>
                      <th>Transaksi</th>
                      <th>Alasan</th>
                      <th>Jumlah</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in pendingRefunds" :key="r.id">
                      <td>{{ formatDate(r.created_at) }}</td>
                      <td>
                        <div class="user-info">
                          <strong>{{ r.students?.users?.name || 'N/A' }}</strong>
                          <span>{{ r.students?.users?.email }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="txn-info">
                          <strong>{{ r.transactions?.description || 'N/A' }}</strong>
                          <span>{{ r.transactions?.midtrans_order_id }}</span>
                        </div>
                      </td>
                      <td>{{ r.reason || '-' }}</td>
                      <td class="amount">Rp {{ formatCurrency(r.amount) }}</td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn-approve" @click="approveRefund(r)">Setuju</button>
                          <button class="btn-reject" @click="rejectRefund(r)">Tolak</button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="pendingRefunds.length === 0">
                      <td colspan="6" class="empty">Tidak ada refund pending</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.header-left h1 svg { width: 26px; height: 26px; color: #0A4568; }
.header-rp-icon { font-size: 20px; font-weight: 800; color: #0A4568; }
.subtitle { font-size: 14px; color: #64748B; }

.btn-refresh { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.2s; }
.btn-refresh:hover { background: #F1F5F9; }
.btn-refresh svg { width: 18px; height: 18px; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.loading-state { display: flex; flex-direction: column; align-items: center; padding: 80px; color: #64748B; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }

/* Stats Cards - Compact Inline */
.stats-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 24px; 
  margin-bottom: 32px; 
  width: 100%;
}

/* StatCard styling handled by component */
.stat-hint { font-size: 11px; color: #64748B; margin-top: 4px; display: block; }


/* Tabs */
.tabs-container { margin-bottom: 20px; }
.tabs { display: flex; gap: 4px; background: white; padding: 4px; border-radius: 12px; border: 1px solid #E2E8F0; width: fit-content; }
.tab { padding: 10px 20px; border: none; background: transparent; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer; transition: all 0.2s; }
.tab:hover { background: #F1F5F9; }
.tab.active { background: #0A4568; color: white; }

/* Tab Content */
.tab-panel { animation: fadeIn 0.3s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.panel-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 24px; margin-bottom: 20px; }
.panel-card h3 { font-size: 16px; font-weight: 600; color: #1E293B; margin-bottom: 20px; }

/* Overview Grid */
.overview-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }

/* Chart */
.chart-container { height: 200px; margin-bottom: 16px; }
.chart-bars { display: flex; justify-content: space-around; align-items: flex-end; height: 100%; gap: 16px; }
.chart-bar-wrapper { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
.chart-bar-group { display: flex; gap: 4px; align-items: flex-end; height: calc(100% - 40px); }
.chart-bar { width: 20px; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.3s; }
.chart-bar.platform { background: #10B981; }
.chart-bar.withdrawal { background: #3B82F6; }
.chart-label { font-size: 11px; color: #64748B; margin-top: 8px; }
.chart-value { font-size: 10px; font-weight: 600; color: #0A4568; }

.chart-legend { display: flex; gap: 20px; justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748B; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.platform { background: #10B981; }
.dot.withdrawal { background: #3B82F6; }

/* Breakdown */
.breakdown-list { display: flex; flex-direction: column; gap: 16px; }

.breakdown-info { display: flex; justify-content: space-between; margin-bottom: 6px; }
.breakdown-label { font-size: 14px; color: #475569; }
.breakdown-value { font-size: 14px; font-weight: 600; color: #1E293B; }
.breakdown-bar { height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
.breakdown-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.breakdown-fill.success { background: #10B981; }
.breakdown-fill.info { background: #3B82F6; }
.breakdown-fill.warning { background: #F59E0B; }

/* Tables */
.table-responsive { overflow-x: auto; }
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { text-align: left; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid #E2E8F0; }
.modern-table td { padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #F1F5F9; }
.modern-table tr:hover { background: #F8FAFC; }
.modern-table .amount { font-weight: 600; color: #0A4568; }
.modern-table .empty { text-align: center; color: #94A3B8; padding: 40px; }

.badge { padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
.badge.success { background: #D1FAE5; color: #059669; }
.badge.info { background: #DBEAFE; color: #2563EB; }
.badge.warning { background: #FEF3C7; color: #D97706; }

.user-info, .bank-info, .txn-info { display: flex; flex-direction: column; gap: 2px; }
.user-info strong, .bank-info strong, .txn-info strong { font-weight: 600; }
.user-info span, .bank-info span, .txn-info span { font-size: 12px; color: #64748B; }

.action-buttons { display: flex; gap: 8px; }
.btn-approve { padding: 6px 12px; background: #10B981; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-approve:hover { background: #059669; }
.btn-reject { padding: 6px 12px; background: #FEE2E2; color: #DC2626; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-reject:hover { background: #FECACA; }

.empty-state { text-align: center; padding: 40px; color: #94A3B8; }

/* Responsive */
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .overview-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .main-content { padding: 16px; }
}
</style>
@media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .stats-grid { grid-template-columns: 1fr; } }
