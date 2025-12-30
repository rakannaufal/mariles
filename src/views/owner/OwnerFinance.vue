<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { requestWithdrawal, processWithdrawal, getUserBalance, getWithdrawalHistory } from '@/services/paymentService'
import { exportFinanceReport } from '@/services/exportService'

const authStore = useAuthStore()


// Data
const loading = ref(true)
const activeTab = ref('overview')
const lesPlaces = ref([])
const selectedLesPlace = ref(null)
const transactions = ref([])
const teacherPayments = ref([])
const teachers = ref([])
const paymentSchedules = ref([])

// Summary
const summary = ref({
  totalIncome: 0,
  monthlyIncome: 0,
  pendingIncome: 0,
  totalPaidToTeachers: 0,
  pendingTeacherPayments: 0
})

// Les Place Info
const lesPlace = ref({
  id: '',
  name: '',
  is_private: false,
  balance: 0,
  pendingTeacherPayments: 0
})

// Withdrawals
// Withdrawals
const withdrawals = ref([])
const withdrawAmount = ref('')
const withdrawMethod = ref('bank') // 'bank' or 'ewallet'
const withdrawing = ref(false)
const withdrawError = ref('')

// Owner Bank Info from Profile
const ownerBankInfo = ref({
  bank_name: '', bank_account: '', bank_holder: '',
  ewallet_type: '', ewallet_number: ''
})

// Filters
const dateFilter = ref('month')
const statusFilter = ref('')

// Tabs - hide teacher-related tabs for pribadi owner
const tabs = computed(() => {
  const baseTabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'transactions', label: 'Transaksi Siswa' },
  ]
  // Add teacher tabs only for non-private (umum) owners
  if (!lesPlace.value.is_private) {
    baseTabs.push(
      { id: 'teachers', label: 'Pembayaran Guru' },
      { id: 'schedules', label: 'Jadwal Pembayaran' }
    )
  }
  baseTabs.push({ id: 'withdraw', label: 'Pencairan' })
  return baseTabs
})

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
      // First get owner ID from owners table
      const { data: ownerData } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', authStore.user.id)
        .single()
      
      if (!ownerData) {
        console.error('Owner not found')
        loading.value = false
        return
      }

      // Fetch les places using owner.id
      const { data: lp } = await supabase
        .from('les_places')
        .select('id, name, is_private')
        .eq('owner_id', ownerData.id)
      
      lesPlaces.value = lp || []
      if (lp?.length) {
        selectedLesPlace.value = lp[0].id
        lesPlace.value.id = lp[0].id
        lesPlace.value.name = lp[0].name
        lesPlace.value.is_private = lp[0].is_private || false
        lesPlace.value.balance = 0 // Will be calculated from transactions
      }

      // Fetch transactions
      const { data: txn } = await supabase
        .from('transactions')
        .select('*, students:student_id(name), programs:program_id(name)')
        .eq('les_place_id', selectedLesPlace.value)
        .order('created_at', { ascending: false })
      
      transactions.value = txn || []

      // Calculate summary from transactions
      const successStatuses = ['completed', 'paid', 'settlement', 'capture']
      const completedTxns = (txn || []).filter(t => successStatuses.includes(t.payment_status))
      const pendingTxns = (txn || []).filter(t => t.payment_status === 'pending')
      
      // Calculate monthly income (this month only)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyTxns = completedTxns.filter(t => new Date(t.created_at) >= startOfMonth)
      
      let totalIncome = completedTxns.reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0)
      let monthlyIncome = monthlyTxns.reduce((sum, t) => sum + (t.net_amount || t.amount || 0), 0)

      // Fallback: If no transactions, calculate from paid bookings
      if (totalIncome === 0 && selectedLesPlace.value) {
        const { data: paidBookings } = await supabase
          .from('bookings')
          .select('created_at, programs!inner(price, les_place_id)')
          .eq('programs.les_place_id', selectedLesPlace.value)
          .in('payment_status', ['paid', 'settlement', 'capture'])
        
        totalIncome = (paidBookings || []).reduce((sum, b) => sum + (b.programs?.price || 0), 0)
        
        // Monthly from bookings
        const monthlyBookings = (paidBookings || []).filter(b => new Date(b.created_at) >= startOfMonth)
        monthlyIncome = monthlyBookings.reduce((sum, b) => sum + (b.programs?.price || 0), 0)
      }

      summary.value = {
        totalIncome,
        monthlyIncome,
        pendingIncome: pendingTxns.reduce((sum, t) => sum + (t.amount || 0), 0),
        totalPaidToTeachers: 0,
        pendingTeacherPayments: 0
      }

      // Fetch teacher payments
      const { data: tp } = await supabase
        .from('teacher_payments')
        .select('*, teacher:teacher_id(name)')
        .eq('les_place_id', selectedLesPlace.value)
        .order('created_at', { ascending: false })
      
      teacherPayments.value = tp || []
      
      // Calculate teacher payment summaries
      const paidToTeachers = (tp || []).filter(p => p.payment_status === 'completed')
      const pendingTeacher = (tp || []).filter(p => p.payment_status === 'pending')
      summary.value.totalPaidToTeachers = paidToTeachers.reduce((sum, p) => sum + (p.amount || 0), 0)
      summary.value.pendingTeacherPayments = pendingTeacher.reduce((sum, p) => sum + (p.amount || 0), 0)
      lesPlace.value.pendingTeacherPayments = summary.value.pendingTeacherPayments
      
      // Fetch owner bank info from profile
      const { data: ownerBankData } = await supabase
        .from('owners')
        .select('bank_name, bank_account, bank_holder, ewallet_type, ewallet_number')
        .eq('user_id', authStore.user.id)
        .single()
      
      if (ownerBankData) {
        ownerBankInfo.value = {
          bank_name: ownerBankData.bank_name || '',
          bank_account: ownerBankData.bank_account || '',
          bank_holder: ownerBankData.bank_holder || '',
          ewallet_type: ownerBankData.ewallet_type || '',
          ewallet_number: ownerBankData.ewallet_number || ''
        }
        // Set default method
        if (ownerBankData.bank_name && ownerBankData.bank_account) {
          withdrawMethod.value = 'bank'
        } else if (ownerBankData.ewallet_type && ownerBankData.ewallet_number) {
          withdrawMethod.value = 'ewallet'
        }
      }
  } catch (err) {
    console.error('Error fetching data:', err)
  } finally {
    loading.value = false
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getStatusClass(status) {
  const classes = {
    completed: 'status-success',
    pending: 'status-warning',
    failed: 'status-error',
    processing: 'status-info'
  }
  return classes[status] || 'status-default'
}

function getStatusLabel(status) {
  const labels = {
    completed: 'Selesai',
    pending: 'Menunggu',
    failed: 'Gagal',
    processing: 'Diproses'
  }
  return labels[status] || status
}

// Computed: Withdrawable balance (only if covers pending teacher payments or is private)
const withdrawableBalance = computed(() => {
  if (lesPlace.value.is_private) {
    return lesPlace.value.balance
  }
  return Math.max(0, lesPlace.value.balance - lesPlace.value.pendingTeacherPayments)
})

const maxWithdraw = computed(() => withdrawableBalance.value)

async function handleWithdraw() {
  withdrawError.value = ''
  const amount = parseInt(withdrawAmount.value)
  
  if (!amount || amount < 10000) {
    withdrawError.value = 'Minimal pencairan Rp 10.000'
    return
  }
  
  if (!withdrawBank.value) {
    withdrawError.value = 'Pilih bank tujuan'
    return
  }
  
  if (!withdrawAccountNumber.value || withdrawAccountNumber.value.length < 5) {
    withdrawError.value = 'Masukkan nomor rekening yang valid'
    return
  }
  
  if (!withdrawAccountHolder.value) {
    withdrawError.value = 'Masukkan nama pemilik rekening'
    return
  }
  
  if (amount > withdrawableBalance.value) {
    if (!lesPlace.value.is_private) {
      withdrawError.value = 'Saldo tidak cukup. Pastikan sisa saldo cukup untuk membayar gaji guru.'
    } else {
      withdrawError.value = 'Saldo tidak mencukupi'
    }
    return
  }
  
  withdrawing.value = true
  
  try {
    if (USE_DUMMY) {
      // Simulate withdraw for dummy mode
      await new Promise(resolve => setTimeout(resolve, 1500))
      lesPlace.value.balance -= amount
      withdrawals.value.unshift({
        id: Date.now().toString(),
        amount,
        fee: 5000,
        net_amount: amount - 5000,
        status: 'processing',
        requested_date: new Date().toISOString(),
        completed_date: null,
        bank_name: withdrawBank.value.toUpperCase(),
        bank_account: '***' + withdrawAccountNumber.value.slice(-4),
        bank_holder: withdrawAccountHolder.value,
        iris_reference_key: `IRIS-SIM-${Date.now()}`
      })
      
      // Simulate Iris processing
      setTimeout(() => {
        if (withdrawals.value[0]) {
          withdrawals.value[0].status = 'completed'
          withdrawals.value[0].completed_date = new Date().toISOString()
        }
      }, 3000)
      
      // Reset form
      withdrawAmount.value = ''
      withdrawBank.value = ''
      withdrawAccountNumber.value = ''
      withdrawAccountHolder.value = ''
      
    } else {
      // Real withdrawal via paymentService
      const result = await requestWithdrawal({
        userId: authStore.user.id,
        lesPlaceId: lesPlace.value.id,
        amount: amount,
        bankName: withdrawBank.value,
        bankAccount: withdrawAccountNumber.value,
        bankHolder: withdrawAccountHolder.value
      })
      
      if (!result.success) {
        withdrawError.value = result.error || 'Gagal memproses pencairan'
        return
      }
      
      // Trigger Iris processing
      if (result.withdrawal?.id) {
        const irisResult = await processWithdrawal(result.withdrawal.id)
        if (!irisResult.success) {
          console.warn('Iris processing warning:', irisResult.error)
          // Don't fail - withdrawal is created, Iris will retry
        }
      }
      
      // Refresh data and reset form
      await fetchData()
      withdrawAmount.value = ''
      withdrawBank.value = ''
      withdrawAccountNumber.value = ''
      withdrawAccountHolder.value = ''
    }
  } catch (err) {
    console.error('Withdraw error:', err)
    withdrawError.value = 'Terjadi kesalahan. Silakan coba lagi.'
  } finally {
    withdrawing.value = false
  }
}
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar />

    <main class="main">
      <header class="header">
        <div class="header-content">
          <h1>Keuangan</h1>
          <p class="subtitle">Kelola pendapatan dan pembayaran guru</p>
        </div>
        <div class="header-actions">
          <button class="btn-export" @click="exportData">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Ekspor
          </button>
        </div>
        <select v-if="lesPlaces.length > 1" v-model="selectedLesPlace" class="select-input" @change="fetchData">
          <option v-for="lp in lesPlaces" :key="lp.id" :value="lp.id">{{ lp.name }}</option>
        </select>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <div v-else class="content">
        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="card-icon income">
              <span style="font-weight: 800; font-size: 20px;">Rp</span>
            </div>
            <div class="card-info">
              <span class="card-label">Total Pendapatan</span>
              <span class="card-value">{{ formatCurrency(summary.totalIncome) }}</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="card-icon monthly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="card-info">
              <span class="card-label">Bulan Ini</span>
              <span class="card-value">{{ formatCurrency(summary.monthlyIncome) }}</span>
            </div>
          </div>
          
          <div class="summary-card">
            <div class="card-icon pending">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="card-info">
              <span class="card-label">Pending</span>
              <span class="card-value">{{ formatCurrency(summary.pendingIncome) }}</span>
            </div>
          </div>
          
          <!-- Only show teacher payment card for non-private owners -->
          <div v-if="!lesPlace.is_private" class="summary-card">
            <div class="card-icon paid">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="card-info">
              <span class="card-label">Dibayar ke Guru</span>
              <span class="card-value">{{ formatCurrency(summary.totalPaidToTeachers) }}</span>
            </div>
          </div>
        </div>

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
            <div class="panel-grid">
              <!-- Recent Transactions -->
              <div class="panel-card">
                <div class="panel-header">
                  <h3>Transaksi Terbaru</h3>
                  <button class="btn-link" @click="activeTab = 'transactions'">Lihat Semua</button>
                </div>
                <div class="transaction-list">
                  <div v-for="txn in transactions.slice(0, 5)" :key="txn.id" class="transaction-item">
                    <div class="txn-info">
                      <span class="txn-name">{{ txn.student_name || txn.students?.name }}</span>
                      <span class="txn-program">{{ txn.program_name || txn.programs?.name }}</span>
                    </div>
                    <div class="txn-amount">
                      <span class="amount">{{ formatCurrency(txn.amount) }}</span>
                      <span class="status" :class="getStatusClass(txn.payment_status)">{{ getStatusLabel(txn.payment_status) }}</span>
                    </div>
                  </div>
                  <div v-if="!transactions.length" class="empty-state">
                    <p>Belum ada transaksi</p>
                  </div>
                </div>
              </div>

              <!-- Upcoming Payments - Only show for non-private owners -->
              <div v-if="!lesPlace.is_private" class="panel-card">
                <div class="panel-header">
                  <h3>Pembayaran Guru Mendatang</h3>
                  <button class="btn-link" @click="activeTab = 'teachers'">Lihat Semua</button>
                </div>
                <div class="payment-list">
                  <div v-for="payment in teacherPayments.filter(p => p.payment_status === 'pending').slice(0, 5)" :key="payment.id" class="payment-item">
                    <div class="payment-info">
                      <span class="payment-name">{{ payment.teacher_name || payment.teacher?.name }}</span>
                      <span class="payment-period">{{ payment.payment_period }}</span>
                    </div>
                    <div class="payment-amount">
                      <span class="amount">{{ formatCurrency(payment.amount) }}</span>
                      <span class="date">{{ formatDate(payment.scheduled_date) }}</span>
                    </div>
                  </div>
                  <div v-if="!teacherPayments.filter(p => p.payment_status === 'pending').length" class="empty-state">
                    <p>Tidak ada pembayaran pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Transactions Tab -->
          <div v-if="activeTab === 'transactions'" class="tab-panel">
            <div class="panel-card full">
              <div class="panel-header">
                <h3>Transaksi Siswa</h3>
                <div class="filters">
                  <select v-model="statusFilter" class="filter-select">
                    <option value="">Semua Status</option>
                    <option value="completed">Selesai</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Siswa</th>
                      <th>Program</th>
                      <th>Metode</th>
                      <th>Jumlah</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="txn in transactions" :key="txn.id">
                      <td>{{ formatDate(txn.payment_date || txn.created_at) }}</td>
                      <td>{{ txn.student_name || txn.students?.name || '-' }}</td>
                      <td>{{ txn.program_name || txn.programs?.name || '-' }}</td>
                      <td>{{ txn.payment_method || '-' }}</td>
                      <td class="amount-cell">{{ formatCurrency(txn.amount) }}</td>
                      <td><span class="status-badge" :class="getStatusClass(txn.payment_status)">{{ getStatusLabel(txn.payment_status) }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Teacher Payments Tab -->
          <div v-if="activeTab === 'teachers'" class="tab-panel">
            <div class="panel-card full">
              <div class="panel-header">
                <h3>Riwayat Pembayaran Guru</h3>
                <button class="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Tambah Pembayaran
                </button>
              </div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Guru</th>
                      <th>Jumlah</th>
                      <th>Jadwal</th>
                      <th>Dibayar</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="payment in teacherPayments" :key="payment.id">
                      <td>{{ payment.payment_period }}</td>
                      <td>{{ payment.teacher_name || payment.teacher?.name }}</td>
                      <td class="amount-cell">{{ formatCurrency(payment.amount) }}</td>
                      <td>{{ formatDate(payment.scheduled_date) }}</td>
                      <td>{{ formatDate(payment.paid_date) }}</td>
                      <td><span class="status-badge" :class="getStatusClass(payment.payment_status)">{{ getStatusLabel(payment.payment_status) }}</span></td>
                      <td>
                        <button v-if="payment.payment_status === 'pending'" class="btn btn-sm btn-outline">Bayar</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Schedules Tab -->
          <div v-if="activeTab === 'schedules'" class="tab-panel">
            <div class="panel-card full">
              <div class="panel-header">
                <h3>Jadwal Pembayaran Otomatis</h3>
                <button class="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Atur Jadwal
                </button>
              </div>
              <div class="schedule-list">
                <div v-for="teacher in teachers" :key="teacher.id" class="schedule-card">
                  <div class="schedule-info">
                    <div class="teacher-avatar">{{ teacher.name?.charAt(0) }}</div>
                    <div class="teacher-details">
                      <h4>{{ teacher.name }}</h4>
                      <span class="specializations">{{ teacher.specializations?.join(', ') }}</span>
                    </div>
                  </div>
                  <div class="schedule-salary">
                    <span class="salary-label">Gaji Bulanan</span>
                    <span class="salary-amount">{{ formatCurrency(teacher.salary) }}</span>
                  </div>
                  <div class="schedule-actions">
                    <span class="schedule-date">Setiap tanggal 5</span>
                    <button class="btn btn-sm btn-outline">Edit</button>
                  </div>
                </div>
                <div v-if="!teachers.length" class="empty-state">
                  <p>Belum ada guru terdaftar</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Withdraw Tab -->
          <div v-if="activeTab === 'withdraw'" class="tab-panel">
            <div class="panel-grid">
              <!-- Balance Card -->
              <div class="panel-card">
                <div class="panel-header">
                  <h3>Saldo Tersedia</h3>
                </div>
                <div class="balance-display">
                  <div class="balance-main">
                    <span class="balance-label">Total Saldo</span>
                    <span class="balance-value">{{ formatCurrency(lesPlace.balance) }}</span>
                  </div>
                  <div v-if="!lesPlace.is_private" class="balance-detail">
                    <div class="detail-row">
                      <span>Kewajiban Gaji Guru:</span>
                      <span class="text-warning">-{{ formatCurrency(lesPlace.pendingTeacherPayments) }}</span>
                    </div>
                    <div class="detail-row total">
                      <span>Dapat Dicairkan:</span>
                      <span class="text-success">{{ formatCurrency(withdrawableBalance) }}</span>
                    </div>
                  </div>
                  <div v-else class="private-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Les Private - Tidak ada kewajiban gaji
                  </div>
                </div>
              </div>
              
              <!-- Withdraw Form -->
              <div class="panel-card">
                <div class="panel-header">
                  <h3>Cairkan Dana</h3>
                </div>
                <div class="withdraw-form">
                  <!-- Payment Method Selector -->
                  <div class="payment-method-selector">
                    <label>Metode Pencairan</label>
                    <div class="method-tabs">
                      <button :class="['method-tab', { active: withdrawMethod === 'bank' }]" 
                              :disabled="!ownerBankInfo.bank_name"
                              @click="withdrawMethod = 'bank'">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        Bank Transfer
                      </button>
                      <button :class="['method-tab', { active: withdrawMethod === 'ewallet' }]" 
                              :disabled="!ownerBankInfo.ewallet_type"
                              @click="withdrawMethod = 'ewallet'">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                        </svg>
                        E-Wallet
                      </button>
                    </div>
                  </div>
                  
                  <!-- Selected Payment Info -->
                  <div v-if="withdrawMethod === 'bank' && ownerBankInfo.bank_name" class="selected-payment-card bank">
                    <div class="payment-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                    </div>
                    <div class="payment-details">
                      <span class="payment-type">{{ ownerBankInfo.bank_name }}</span>
                      <span class="payment-number">{{ ownerBankInfo.bank_account }}</span>
                      <span class="payment-holder">a.n {{ ownerBankInfo.bank_holder }}</span>
                    </div>
                    <router-link to="/owner/profile" class="edit-link">Ubah</router-link>
                  </div>
                  
                  <div v-else-if="withdrawMethod === 'ewallet' && ownerBankInfo.ewallet_type" class="selected-payment-card ewallet">
                    <div class="payment-icon ewallet">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                      </svg>
                    </div>
                    <div class="payment-details">
                      <span class="payment-type">{{ ownerBankInfo.ewallet_type }}</span>
                      <span class="payment-number">{{ ownerBankInfo.ewallet_number }}</span>
                    </div>
                    <router-link to="/owner/profile" class="edit-link">Ubah</router-link>
                  </div>
                  
                  <div v-else class="no-payment-method">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>Anda belum mengatur metode pembayaran</p>
                    <router-link to="/owner/profile" class="btn-setup">Atur di Profil</router-link>
                  </div>
                
                  <div class="form-group">
                    <label>Jumlah Pencairan</label>
                    <input 
                      v-model="withdrawAmount" 
                      type="number" 
                      class="form-input" 
                      placeholder="Masukkan jumlah"
                      :max="maxWithdraw"
                    >
                    <span v-if="maxWithdraw > 0" class="form-hint">Maksimal: {{ formatCurrency(maxWithdraw) }}</span>
                  </div>
                  
                  <div v-if="withdrawError" class="alert alert-error">{{ withdrawError }}</div>
                  
                  <!-- Warning about teacher salary only for non-private owners -->
                  <div v-if="!lesPlace.is_private && lesPlace.pendingTeacherPayments > 0" class="alert alert-warning">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Saldo minimal {{ formatCurrency(lesPlace.pendingTeacherPayments) }} harus tersisa untuk membayar gaji guru.
                  </div>
                  
                  <div class="fee-info">
                    <span>Biaya admin:</span>
                    <span>Rp 5.000</span>
                  </div>
                  
                  <button 
                    class="btn btn-primary btn-block" 
                    :disabled="withdrawing || !withdrawAmount || (!ownerBankInfo.bank_name && !ownerBankInfo.ewallet_type) || withdrawableBalance <= 0"
                    @click="handleWithdraw"
                  >
                    <span v-if="withdrawing" class="loading-spinner-sm"></span>
                    {{ withdrawing ? 'Memproses via Midtrans Iris...' : 'Cairkan Sekarang' }}
                  </button>
                  
                  <p class="withdraw-note">Dana akan ditransfer dalam 1-3 hari kerja via Midtrans Iris</p>
                </div>
              </div>
            </div>
            
            <!-- Withdrawal History -->
            <div class="panel-card full" style="margin-top: 24px;">
              <div class="panel-header">
                <h3>Riwayat Pencairan</h3>
              </div>
              <div v-if="withdrawals.length" class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jumlah</th>
                      <th>Bank</th>
                      <th>Status</th>
                      <th>Selesai</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="wd in withdrawals" :key="wd.id">
                      <td>{{ formatDate(wd.requested_date) }}</td>
                      <td class="amount-cell">{{ formatCurrency(wd.amount) }}</td>
                      <td>{{ wd.bank_name }} - {{ wd.bank_account }}</td>
                      <td><span class="status-badge" :class="getStatusClass(wd.status)">{{ getStatusLabel(wd.status) }}</span></td>
                      <td>{{ formatDate(wd.completed_date) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="empty-state">
                <p>Belum ada riwayat pencairan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #f8fafc; }
.main { flex: 1; padding: 24px; overflow-x: auto; }

.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.subtitle { color: #64748b; font-size: 14px; }
.select-input { padding: 8px 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0a4568; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Summary Cards */
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.summary-card { background: white; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.card-icon svg { width: 24px; height: 24px; }
.card-icon.income { background: #dcfce7; color: #16a34a; }
.card-icon.monthly { background: #dbeafe; color: #2563eb; }
.card-icon.pending { background: #fef3c7; color: #d97706; }
.card-icon.paid { background: #f3e8ff; color: #9333ea; }
.card-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 4px; }
.card-value { font-size: 20px; font-weight: 700; color: #1e293b; }

/* Tabs */
.tabs-container { background: white; border-radius: 12px; padding: 4px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.tabs { display: flex; gap: 4px; }
.tab { padding: 12px 20px; border: none; background: none; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
.tab:hover { color: #0a4568; background: #f8fafc; }
.tab.active { background: #0a4568; color: white; }

/* Panel Cards */
.panel-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.panel-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.panel-card.full { grid-column: span 2; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
.panel-header h3 { font-size: 16px; font-weight: 600; }
.btn-link { color: #0a4568; font-size: 13px; font-weight: 500; background: none; border: none; cursor: pointer; }

/* Transaction List */
.transaction-list { display: flex; flex-direction: column; gap: 12px; }
.transaction-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; }
.txn-name { display: block; font-weight: 500; font-size: 14px; }
.txn-program { font-size: 12px; color: #64748b; }
.txn-amount { text-align: right; }
.txn-amount .amount { display: block; font-weight: 600; font-size: 14px; }

/* Payment List */
.payment-list { display: flex; flex-direction: column; gap: 12px; }
.payment-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border-radius: 8px; }
.payment-name { display: block; font-weight: 500; font-size: 14px; }
.payment-period { font-size: 12px; color: #64748b; }
.payment-amount { text-align: right; }
.payment-amount .amount { display: block; font-weight: 600; font-size: 14px; }
.payment-amount .date { font-size: 12px; color: #64748b; }

/* Status */
.status, .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
.status-success { background: #dcfce7; color: #16a34a; }
.status-warning { background: #fef3c7; color: #d97706; }
.status-error { background: #fee2e2; color: #dc2626; }
.status-info { background: #dbeafe; color: #2563eb; }

/* Table */
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
.data-table th { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
.amount-cell { font-weight: 600; }

/* Schedule Cards */
.schedule-list { display: flex; flex-direction: column; gap: 12px; }
.schedule-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; }
.schedule-info { display: flex; align-items: center; gap: 12px; flex: 1; }
.teacher-avatar { width: 40px; height: 40px; background: #0a4568; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.teacher-details h4 { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.specializations { font-size: 12px; color: #64748b; }
.schedule-salary { text-align: center; padding: 0 24px; }
.salary-label { display: block; font-size: 11px; color: #64748b; margin-bottom: 2px; }
.salary-amount { font-size: 16px; font-weight: 700; color: #16a34a; }
.schedule-actions { display: flex; align-items: center; gap: 12px; }
.schedule-date { font-size: 12px; color: #64748b; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
.btn-primary { background: #0a4568; color: white; }
.btn-primary:hover { background: #083654; }
.btn-outline { background: transparent; border: 2px solid #e2e8f0; color: #475569; }
.btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.filters { display: flex; gap: 12px; }
.filter-select { padding: 8px 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 13px; }

.empty-state { text-align: center; padding: 24px; color: #94a3b8; }


/* Payment Method Selector */
.payment-method-selector { margin-bottom: 20px; }
.payment-method-selector label { display: block; font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 10px; }
.method-tabs { display: flex; gap: 10px; }
.method-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border: 2px solid #e2e8f0; border-radius: 10px; background: white; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; }
.method-tab:hover:not(:disabled) { border-color: #0d5782; color: #0d5782; }
.method-tab.active { border-color: #0d5782; background: #f0f9ff; color: #0d5782; }
.method-tab:disabled { opacity: 0.5; cursor: not-allowed; }
.method-tab svg { width: 20px; height: 20px; }

/* Selected Payment Card */
.selected-payment-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 12px; margin-bottom: 20px; }
.selected-payment-card.bank { background: linear-gradient(135deg, #0d5782, #1e40af); color: white; }
.selected-payment-card.ewallet { background: linear-gradient(135deg, #16a34a, #15803d); color: white; }
.payment-icon { width: 44px; height: 44px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.payment-icon svg { width: 22px; height: 22px; }
.payment-details { flex: 1; }
.payment-type { display: block; font-size: 14px; opacity: 0.8; }
.payment-number { display: block; font-size: 18px; font-weight: 700; letter-spacing: 1px; }
.payment-holder { font-size: 12px; opacity: 0.7; }
.edit-link { padding: 6px 12px; background: rgba(255,255,255,0.2); border-radius: 8px; font-size: 12px; font-weight: 600; color: white; text-decoration: none; }
.edit-link:hover { background: rgba(255,255,255,0.3); }

/* No Payment Method */
.no-payment-method { text-align: center; padding: 32px; background: #fef3c7; border: 2px dashed #fbbf24; border-radius: 12px; margin-bottom: 20px; }
.no-payment-method svg { width: 40px; height: 40px; color: #d97706; margin-bottom: 12px; }
.no-payment-method p { font-size: 14px; color: #92400e; margin-bottom: 12px; }
.btn-setup { display: inline-block; padding: 8px 16px; background: #d97706; color: white; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; }
.btn-setup:hover { background: #b45309; }

@media (max-width: 1200px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { 
  .summary-grid { grid-template-columns: 1fr; } 
  .panel-grid { grid-template-columns: 1fr; }
  .panel-card.full { grid-column: span 1; }
  .tabs { overflow-x: auto; }
}

/* Withdraw Tab Styles */
.balance-display { padding: 20px 0; }
.balance-main { text-align: center; margin-bottom: 20px; }
.balance-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 4px; }
.balance-value { font-size: 32px; font-weight: 700; color: #1e293b; }
.balance-detail { background: #f8fafc; padding: 16px; border-radius: 8px; }
.detail-row { display: flex; justify-content: space-between; font-size: 14px; padding: 8px 0; }
.detail-row.total { border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 16px; font-weight: 600; }
.text-warning { color: #d97706; }
.text-success { color: #16a34a; font-weight: 700; }
.private-badge { display: flex; align-items: center; justify-content: center; gap: 8px; background: #dbeafe; color: #2563eb; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500; }

.withdraw-form { padding: 8px 0; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 6px; }
.form-input { width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px; }
.form-input:focus { outline: none; border-color: #0a4568; }
.form-hint { display: block; font-size: 12px; color: #64748b; margin-top: 6px; }

.alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.alert-warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
.alert-error { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }

.btn-block { width: 100%; justify-content: center; }
.loading-spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

.btn-export { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border: 1px solid var(--border); border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.btn-export svg { width: 16px; height: 16px; }
.btn-export:hover { background: var(--background); border-color: var(--primary); color: var(--primary); }
</style>
