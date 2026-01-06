<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { exportFinanceReport } from '@/services/exportService' 

const loading = ref(true)
const activeTab = ref('transactions')
const dateFilter = ref('all')
const statusFilter = ref('all')
const searchQuery = ref('')

const transactions = ref([])
const withdrawals = ref([])

const showTransactionModal = ref(false)
const selectedTransaction = ref(null)

const stats = ref({
  totalRevenue: 0,
  completedTransactions: 0,
  pendingWithdrawals: 0,
  totalWithdrawn: 0
})

onMounted(async () => {
  await fetchData()
})

watch([dateFilter, statusFilter], () => {
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    // SUCCESS STATUSES (consistent across all finance pages)
    const successStatuses = ['paid', 'settlement', 'capture']
    
    // 1. Fetch Bookings as primary source (consistent with OwnerRegistrations)
    let bookingsQuery = supabase
      .from('bookings')
      .select(`
        id, status, payment_status, created_at,
        students(id, users(id, name, email, phone)),
        programs(id, name, price, les_places(id, name, city))
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (dateFilter.value === 'today') {
      const today = new Date().toISOString().split('T')[0]
      bookingsQuery = bookingsQuery.gte('created_at', today)
    } else if (dateFilter.value === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      bookingsQuery = bookingsQuery.gte('created_at', weekAgo.toISOString())
    }

    const { data: bookingsData } = await bookingsQuery
    
    // Map bookings to transaction format with normalized status
    let mappedTransactions = (bookingsData || []).map(b => {
      // Normalize status for display
      let normalizedStatus = b.payment_status
      if (successStatuses.includes(b.payment_status)) {
        normalizedStatus = 'completed'
      } else if (b.payment_status === 'unpaid') {
        normalizedStatus = 'pending'
      }
      
      return {
        id: b.id,
        amount: b.programs?.price || 0,
        payment_status: normalizedStatus,
        original_status: b.payment_status, // Keep original for reference
        payment_method: '-',
        created_at: b.created_at,
        les_places: b.programs?.les_places,
        students: { id: b.students?.id, users: b.students?.users }
      }
    })
    
    // Apply status filter based on normalized status
    if (statusFilter.value !== 'all' && activeTab.value === 'transactions') {
      if (statusFilter.value === 'completed') {
        mappedTransactions = mappedTransactions.filter(t => t.payment_status === 'completed')
      } else if (statusFilter.value === 'pending') {
        mappedTransactions = mappedTransactions.filter(t => t.payment_status === 'pending')
      } else if (statusFilter.value === 'failed') {
        mappedTransactions = mappedTransactions.filter(t => 
          ['failed', 'cancelled', 'expire', 'rejected'].includes(t.payment_status) || 
          ['failed', 'cancelled', 'expire', 'rejected'].includes(t.original_status)
        )
      }
    }
    
    transactions.value = mappedTransactions

    // 2. Compute Stats from ALL bookings
    const { data: allBookings } = await supabase.from('bookings').select('payment_status, programs(price)')
    const completedBookings = (allBookings || []).filter(b => successStatuses.includes(b.payment_status))
    
    stats.value.totalRevenue = completedBookings.reduce((sum, b) => sum + (b.programs?.price || 0), 0)
    stats.value.completedTransactions = completedBookings.length

    // 3. Fetch Withdrawals
    let wdQuery = supabase
      .from('withdrawals')
      .select(`
        id, amount, fee, net_amount, status, bank_name, bank_account, bank_holder, created_at,
        users (id, name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(50)
      
    if (statusFilter.value !== 'all' && activeTab.value === 'withdrawals') {
      wdQuery = wdQuery.eq('status', statusFilter.value)
    }

    const { data: wdData } = await wdQuery
    withdrawals.value = wdData || []

    stats.value.pendingWithdrawals = (wdData || []).filter(w => w.status === 'pending').length
    stats.value.totalWithdrawn = (wdData || [])
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + (w.net_amount || 0), 0)

  } catch (err) {
    console.error('Error fetching data:', err)
  } finally {
    loading.value = false
  }
}

async function approveWithdrawal(withdrawal) {
  if (!confirm(`Setujui pencairan sebesar ${formatCurrency(withdrawal.net_amount)} ke ${withdrawal.bank_name}?`)) return
  try {
    await supabase.from('withdrawals').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', withdrawal.id)
    await fetchData()
    alert('Pencairan berhasil disetujui!')
  } catch (err) {
    alert('Gagal memproses')
  }
}

async function rejectWithdrawal(withdrawal) {
  const reason = prompt('Masukkan alasan penolakan:')
  if (!reason) return
  
  try {
    await supabase.from('withdrawals').update({ status: 'rejected', admin_note: reason }).eq('id', withdrawal.id)
    await fetchData()
  } catch (err) {
    alert('Gagal menolak')
  }
}

function viewTransaction(txn) {
  selectedTransaction.value = txn
  showTransactionModal.value = true
}

function handleExport() {
  exportFinanceReport(transactions.value, 'csv')
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getStatusInfo(status) {
  const statuses = {
    // Mapped statuses (from booking conversion)
    completed: { label: 'Berhasil', class: 'success' },
    pending: { label: 'Menunggu', class: 'warning' },
    failed: { label: 'Gagal', class: 'error' },
    processing: { label: 'Diproses', class: 'info' },
    rejected: { label: 'Ditolak', class: 'error' },
    // Original booking statuses  
    paid: { label: 'Berhasil', class: 'success' },
    settlement: { label: 'Berhasil', class: 'success' },
    capture: { label: 'Berhasil', class: 'success' },
    unpaid: { label: 'Menunggu', class: 'warning' },
    cancelled: { label: 'Dibatalkan', class: 'error' },
    expire: { label: 'Kadaluarsa', class: 'error' }
  }
  return statuses[status] || { label: status, class: 'info' }
}

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value
  const lower = searchQuery.value.toLowerCase()
  return transactions.value.filter(t => 
    t.les_places?.name?.toLowerCase().includes(lower) || 
    t.students?.users?.name?.toLowerCase().includes(lower) ||
    t.id.toLowerCase().includes(lower)
  )
})

const filteredWithdrawals = computed(() => {
  if (!searchQuery.value) return withdrawals.value
  const lower = searchQuery.value.toLowerCase()
  return withdrawals.value.filter(w => 
    w.users?.name?.toLowerCase().includes(lower) || 
    w.bank_holder?.toLowerCase().includes(lower) ||
    w.bank_name?.toLowerCase().includes(lower)
  )
})
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <main class="main-content">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Laporan Keuangan
          </h1>
          <p class="subtitle">Analisis pendapatan, monitoring transaksi, dan kelola pencairan dana.</p>
        </div>
        <div class="header-actions">
          <select v-model="dateFilter" class="filter-select">
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
          </select>
          <button class="btn-export" @click="handleExport">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      <!-- Stats Grid -->
      <section class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-box green">
<span class="currency-symbol">Rp</span>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Pendapatan</span>
            <span class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</span>
            <span class="stat-trend positive">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              +12.5%
            </span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Transaksi Berhasil</span>
            <span class="stat-value">{{ stats.completedTransactions }}</span>
            <span class="stat-hint">dari total transaksi</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Pencairan Pending</span>
            <span class="stat-value">{{ stats.pendingWithdrawals }}</span>
            <span class="stat-hint">Butuh tindakan segera</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-box purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Dicairkan</span>
            <span class="stat-value">{{ formatCurrency(stats.totalWithdrawn) }}</span>
            <span class="stat-hint">Ke rekening pemilik</span>
          </div>
        </div>
      </section>

      <!-- Content Area -->
      <section class="content-card">
        <div class="tabs-header">
          <div class="tabs">
            <button :class="{ active: activeTab === 'transactions' }" @click="activeTab = 'transactions'">
              Transaksi Masuk
            </button>
            <button :class="{ active: activeTab === 'withdrawals' }" @click="activeTab = 'withdrawals'">
              Pencairan Dana
              <span v-if="stats.pendingWithdrawals > 0" class="badge-count">{{ stats.pendingWithdrawals }}</span>
            </button>
          </div>
          <div class="filters">
            <div class="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input v-model="searchQuery" type="text" placeholder="Cari ID, Nama, atau Bank...">
            </div>
            <select v-model="statusFilter" class="filter-select">
              <option value="all">Semua Status</option>
              <option value="completed">Berhasil</option>
              <option value="pending">Menunggu</option>
              <option value="failed">Gagal/Ditolak</option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Memuat data keuangan...</p>
        </div>

        <!-- Transactions Tab -->
        <div v-else-if="activeTab === 'transactions'" class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>ID Transaksi</th>
                <th>Siswa</th>
                <th>Tempat Les</th>
                <th>Jumlah</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="txn in filteredTransactions" :key="txn.id">
                <td><span class="id-badge">{{ txn.id.substring(0, 8) }}</span></td>
                <td>
                  <div class="user-cell">
                    <span class="name">{{ txn.students?.users?.name || '-' }}</span>
                    <span class="sub">{{ txn.students?.users?.email }}</span>
                  </div>
                </td>
                <td>{{ txn.les_places?.name || '-' }}</td>
                <td class="amount">{{ formatCurrency(txn.amount) }}</td>
                <td>{{ txn.payment_method || '-' }}</td>
                <td>
                  <span class="status-badge" :class="getStatusInfo(txn.payment_status).class">
                    {{ getStatusInfo(txn.payment_status).label }}
                  </span>
                </td>
                <td class="time">{{ formatDate(txn.created_at) }}</td>
                <td>
                  <button class="btn-icon" @click="viewTransaction(txn)" title="Detail">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
                </td>
              </tr>
              <tr v-if="filteredTransactions.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p>Tidak ada data transaksi ditemukan</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Withdrawals Tab -->
        <div v-else-if="activeTab === 'withdrawals'" class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Pemohon</th>
                <th>Bank Tujuan</th>
                <th>Jumlah Penarikan</th>
                <th>Biaya Admin</th>
                <th>Total Transfer</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="wd in filteredWithdrawals" :key="wd.id">
                <td>
                  <div class="user-cell">
                    <span class="name">{{ wd.users?.name || '-' }}</span>
                    <span class="role-badge-sm">{{ wd.users?.role }}</span>
                  </div>
                </td>
                <td>
                  <div class="bank-info">
                    <span class="bank-name">{{ wd.bank_name }}</span>
                    <span class="bank-acc">{{ wd.bank_account }}</span>
                    <span class="bank-holder">a.n {{ wd.bank_holder }}</span>
                  </div>
                </td>
                <td class="amount">{{ formatCurrency(wd.amount) }}</td>
                <td class="fee text-red">{{ formatCurrency(wd.fee) }}</td>
                <td class="net text-green">{{ formatCurrency(wd.net_amount) }}</td>
                <td>
                  <span class="status-badge" :class="getStatusInfo(wd.status).class">
                    {{ getStatusInfo(wd.status).label }}
                  </span>
                </td>
                <td>
                  <div v-if="wd.status === 'pending'" class="actions-group">
                    <button class="btn-action approve" @click="approveWithdrawal(wd)" title="Setujui">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                    <button class="btn-action reject" @click="rejectWithdrawal(wd)" title="Tolak">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <span v-else class="text-muted">-</span>
                </td>
              </tr>
              <tr v-if="filteredWithdrawals.length === 0">
                <td colspan="7" class="empty-state">
                  <p>Tidak ada data pencairan ditemukan</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <!-- Transaction Detail Modal -->
    <Teleport to="body">
      <div v-if="showTransactionModal" class="modal-overlay" @click.self="showTransactionModal = false">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Detail Transaksi</h3>
            <button class="close-btn" @click="showTransactionModal = false">&times;</button>
          </div>
          <div v-if="selectedTransaction" class="modal-body">
            <div class="txn-summary">
              <div class="summary-item">
                <span class="label">Total Bayar</span>
                <span class="value lg">{{ formatCurrency(selectedTransaction.amount) }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Status</span>
                <span class="status-badge" :class="getStatusInfo(selectedTransaction.payment_status).class">
                  {{ getStatusInfo(selectedTransaction.payment_status).label }}
                </span>
              </div>
            </div>
            
            <div class="txn-details-grid">
              <div class="detail-group">
                <h4>Informasi Siswa</h4>
                <div class="info-row"><span class="lbl">Nama:</span> <span>{{ selectedTransaction.students?.users?.name }}</span></div>
                <div class="info-row"><span class="lbl">Email:</span> <span>{{ selectedTransaction.students?.users?.email }}</span></div>
                <div class="info-row"><span class="lbl">Telepon:</span> <span>{{ selectedTransaction.students?.users?.phone || '-' }}</span></div>
              </div>
              <div class="detail-group">
                <h4>Informasi Pembayaran</h4>
                <div class="info-row"><span class="lbl">ID Txn:</span> <span class="mono">{{ selectedTransaction.id }}</span></div>
                <div class="info-row"><span class="lbl">Metode:</span> <span>{{ selectedTransaction.payment_method }}</span></div>
                <div class="info-row"><span class="lbl">Waktu:</span> <span>{{ formatDate(selectedTransaction.created_at) }}</span></div>
              </div>
              <div class="detail-group full">
                <h4>Tempat Les</h4>
                <div class="info-row"><span class="lbl">Nama:</span> <span>{{ selectedTransaction.les_places?.name }}</span></div>
                <div class="info-row"><span class="lbl">Kota:</span> <span>{{ selectedTransaction.les_places?.city || '-' }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; font-family: 'Inter', sans-serif; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; max-width: 1400px; margin: 0 auto; }

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 8px; letter-spacing: -0.5px; }
.header-left h1 svg { width: 32px; height: 32px; color: #0F172A; }
.subtitle { color: #64748B; font-size: 15px; }

.header-actions { display: flex; gap: 12px; align-items: center; }
.filter-select { padding: 10px 16px; border: 1px solid #E2E8F0; border-radius: 8px; background: white; font-size: 14px; font-weight: 500; color: #334155; cursor: pointer; outline: none; }
.btn-export { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: white; border: 1px solid #E2E8F0; border-radius: 8px; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.2s; }
.btn-export:hover { background: #F1F5F9; border-color: #CBD5E1; }
.btn-export svg { width: 18px; height: 18px; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
.stat-card { background: white; border-radius: 16px; padding: 24px; display: flex; align-items: flex-start; gap: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }

.stat-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon-box svg { width: 24px; height: 24px; }
.stat-icon-box.green { background: #F1F5F9; color: #0D5782; }
.stat-icon-box.blue { background: #F1F5F9; color: #0D5782; }
.stat-icon-box.orange { background: #F1F5F9; color: #0D5782; }
.stat-icon-box.purple { background: #F1F5F9; color: #0D5782; }

.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 24px; font-weight: 800; color: #1E293B; margin-bottom: 4px; }
.stat-hint, .stat-trend { font-size: 12px; color: #64748B; }
.stat-trend { display: flex; align-items: center; gap: 4px; font-weight: 600; }
.stat-trend.positive { color: #10B981; }
.stat-trend svg { width: 14px; height: 14px; }

/* Content Card */
.content-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }

.tabs-header { padding: 20px 24px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.tabs { display: flex; gap: 8px; background: #F1F5F9; padding: 4px; border-radius: 10px; }
.tabs button { padding: 8px 16px; border-radius: 8px; border: none; background: transparent; font-size: 14px; font-weight: 600; color: #64748B; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
.tabs button.active { background: white; color: #0F172A; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.badge-count { background: #EF4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; }

.filters { display: flex; gap: 12px; align-items: center; }
.search-box { position: relative; }
.search-box input { padding: 10px 16px 10px 40px; border: 1px solid #E2E8F0; border-radius: 8px; width: 260px; font-size: 14px; outline: none; }
.search-box svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: #94A3B8; }

/* Tables */
.table-container { overflow-x: auto; }
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { text-align: left; padding: 16px 24px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; color: #64748B; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.modern-table td { padding: 16px 24px; border-bottom: 1px solid #F1F5F9; color: #334155; font-size: 14px; vertical-align: middle; }
.modern-table tr:last-child td { border-bottom: none; }
.modern-table tr:hover { background: #F8FAFC; }

.id-badge { font-family: 'Monaco', monospace; background: #F1F5F9; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #475569; }
.user-cell { display: flex; flex-direction: column; }
.user-cell .name { font-weight: 600; color: #1E293B; }
.user-cell .sub { font-size: 12px; color: #64748B; }
.role-badge-sm { font-size: 10px; background: #E2E8F0; padding: 2px 6px; border-radius: 4px; width: fit-content; margin-top: 2px; text-transform: uppercase; }

.bank-info { display: flex; flex-direction: column; }
.bank-name { font-weight: 700; color: #1E293B; font-size: 13px; }
.bank-acc { font-family: monospace; color: #475569; }
.bank-holder { font-size: 12px; color: #64748B; }

.amount { font-family: 'Monaco', monospace; font-weight: 600; letter-spacing: -0.5px; }
.text-red { color: #EF4444; }
.text-green { color: #10B981; }

.status-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
.status-badge.success { background: #ECFDF5; color: #059669; }
.status-badge.warning { background: #FFF7ED; color: #EA580C; }
.status-badge.error { background: #FEF2F2; color: #DC2626; }
.status-badge.info { background: #EFF6FF; color: #2563EB; }

.btn-icon { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon:hover { background: #F1F5F9; color: #1E293B; }
.actions-group { display: flex; gap: 8px; }
.btn-action { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-action.approve { background: #ECFDF5; color: #059669; }
.btn-action.approve:hover { background: #D1FAE5; }
.btn-action.reject { background: #FEF2F2; color: #DC2626; }
.btn-action.reject:hover { background: #FEE2E2; }

/* Empty State */
.empty-state { padding: 60px; text-align: center; color: #64748B; }
.empty-content { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-content svg { width: 48px; height: 48px; opacity: 0.5; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.2s ease-out; }
.modal-card { background: white; width: 100%; max-width: 550px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); overflow: hidden; animation: slideUp 0.3s ease-out; }
.modal-header { padding: 24px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; }
.modal-header h3 { font-size: 18px; font-weight: 700; color: #1E293B; }
.close-btn { background: none; border: none; font-size: 24px; color: #64748B; cursor: pointer; }

.modal-body { padding: 24px; }
.txn-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 20px; background: #F1F5F9; border-radius: 12px; }
.summary-item { display: flex; flex-direction: column; gap: 4px; }
.summary-item .label { font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 600; }
.summary-item .value.lg { font-size: 20px; font-weight: 800; color: #1E293B; }

.txn-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.detail-group.full { grid-column: span 2; }
.detail-group h4 { font-size: 14px; font-weight: 600; color: #1E293B; margin-bottom: 12px; border-bottom: 2px solid #F1F5F9; padding-bottom: 6px; }
.info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
.info-row .lbl { color: #64748B; }
.info-row span:last-child { font-weight: 500; color: #334155; text-align: right; }
.mono { font-family: 'Monaco', monospace; font-size: 12px; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .txn-details-grid { grid-template-columns: 1fr; }
  .detail-group.full { grid-column: span 1; }
}

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; gap: 16px; align-items: stretch; }
  .header-actions { flex-direction: column; }
  .tabs-header { flex-direction: column; align-items: stretch; }
  .search-box input { width: 100%; }
}
  .currency-symbol {
    font-size: 18px;
    font-weight: 800;
    color: currentColor;
    line-height: 1;
  }
</style>
