<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const isOwner = computed(() => route.path.startsWith('/owner'))
const authStore = useAuthStore()

// Tabs - guru can withdraw their earnings
const activeTab = ref('overview')
const tabs = [
  { id: 'overview', label: 'Ringkasan', icon: 'chart' },
  { id: 'history', label: 'Riwayat Gaji', icon: 'list' },
  { id: 'withdraw', label: 'Pencairan', icon: 'wallet' }
]

// Data
const loading = ref(true)
const payments = ref([])
const lesPlace = ref(null)
const selectedMonth = ref('all')

// Summary
const summary = ref({
  totalEarnings: 0,
  monthlyEarnings: 0,
  pendingPayments: 0,
  withdrawableBalance: 0,
  lastPayment: null,
  totalSessions: 0,
  bonusCount: 0
})

// Withdrawals
const withdrawals = ref([])
const withdrawAmount = ref('')
const withdrawMethod = ref('bank') // 'bank' or 'ewallet'
const withdrawing = ref(false)
const withdrawError = ref('')
const withdrawSuccess = ref(false)

// Teacher Bank Info from Profile
const teacherBankInfo = ref({
  bank_name: '', bank_account: '', bank_holder: '',
  ewallet_type: '', ewallet_number: ''
})

// Get months for filter
const availableMonths = computed(() => {
  const months = new Set()
  payments.value.forEach(p => {
    if (p.payment_period) {
      months.add(p.payment_period)
    }
  })
  return Array.from(months).sort().reverse()
})

// Filtered payments
const filteredPayments = computed(() => {
  if (selectedMonth.value === 'all') return payments.value
  return payments.value.filter(p => p.payment_period === selectedMonth.value)
})

// Monthly breakdown chart data
const monthlyData = computed(() => {
  const data = {}
  payments.value.filter(p => p.payment_status === 'completed').forEach(p => {
    const period = p.payment_period || 'Unknown'
    if (!data[period]) data[period] = 0
    data[period] += p.amount
  })
  return Object.entries(data).slice(0, 6).reverse()
})

const maxMonthly = computed(() => {
  return Math.max(...monthlyData.value.map(d => d[1]), 1)
})

onMounted(async () => {
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    console.log('Fetching teacher payments for user_id:', authStore.user.id)
    
    const { data: tp, error: tpErr } = await supabase
      .from('teacher_payments')
      .select('*, les_places(name)')
      .eq('teacher_id', authStore.user.id)
      .order('created_at', { ascending: false })
    
    console.log('Teacher payments result:', tp, 'Error:', tpErr)
    
    payments.value = tp || []
    
    if (tp?.length) {
      lesPlace.value = { name: tp[0].les_places?.name }
    }

    const completed = tp?.filter(p => p.payment_status === 'completed') || []
    const pending = tp?.filter(p => p.payment_status === 'pending') || []
    const bonuses = tp?.filter(p => p.payment_type === 'bonus') || []
    
    const now = new Date()
    const thisMonth = tp?.filter(p => {
      const paidDate = new Date(p.paid_date)
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
    }) || []
    
    summary.value = {
      totalEarnings: completed.reduce((sum, p) => sum + p.amount, 0),
      monthlyEarnings: thisMonth.reduce((sum, p) => sum + p.amount, 0),
      pendingPayments: pending.reduce((sum, p) => sum + p.amount, 0),
      // Saldo dapat dicairkan = total diterima (completed payments)
      withdrawableBalance: completed.reduce((sum, p) => sum + p.amount, 0),
      lastPayment: completed.length ? completed[0].paid_date : null,
      totalSessions: completed.length,
      bonusCount: bonuses.length
    }
    
    // Fetch teacher bank info from profile
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('bank_name, bank_account, bank_holder, ewallet_type, ewallet_number')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (teacherData) {
      teacherBankInfo.value = {
        bank_name: teacherData.bank_name || '',
        bank_account: teacherData.bank_account || '',
        bank_holder: teacherData.bank_holder || '',
        ewallet_type: teacherData.ewallet_type || '',
        ewallet_number: teacherData.ewallet_number || ''
      }
      // Set default method based on what's available
      if (teacherData.bank_name && teacherData.bank_account) {
        withdrawMethod.value = 'bank'
      } else if (teacherData.ewallet_type && teacherData.ewallet_number) {
        withdrawMethod.value = 'ewallet'
      }
    }
    
    // Fetch teacher's withdrawal history
    await fetchWithdrawals()
  } catch (err) {
    console.error('Error fetching data:', err)
  } finally {
    loading.value = false
  }
}

async function fetchWithdrawals() {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', authStore.user.id)
      .order('requested_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching withdrawals:', error)
      return
    }
    
    withdrawals.value = data || []
  } catch (err) {
    console.error('Error fetching withdrawals:', err)
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)
}

function formatShortCurrency(amount) {
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}rb`
  return `Rp ${amount}`
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPeriod(period) {
  if (!period || period === 'undefined' || period === 'null') return '-'
  const parts = period.split('-')
  if (parts.length < 2) return period // Return as-is if not YYYY-MM format
  const [year, month] = parts
  const monthNum = parseInt(month)
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return period
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${months[monthNum - 1]} ${year}`
}

function formatPeriodShort(period) {
  if (!period) return '-'
  const [year, month] = period.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${months[parseInt(month) - 1]}`
}

function getStatusClass(status) {
  const classes = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    processing: 'info'
  }
  return classes[status] || 'default'
}

function getStatusLabel(status) {
  const labels = {
    completed: 'Diterima',
    pending: 'Menunggu',
    failed: 'Gagal',
    processing: 'Diproses'
  }
  return labels[status] || status
}

function getTypeLabel(type) {
  const labels = {
    salary: 'Gaji Mengajar',
    bonus: 'Bonus',
    deduction: 'Potongan'
  }
  return labels[type] || type
}

function getTypeIcon(type) {
  const icons = {
    salary: 'briefcase',
    bonus: 'gift',
    deduction: 'minus'
  }
  return icons[type] || 'circle'
}

const maxWithdraw = computed(() => summary.value.withdrawableBalance || 0)

async function handleWithdraw() {
  withdrawError.value = ''
  withdrawSuccess.value = false
  const amount = parseInt(withdrawAmount.value)
  
  // Get fee based on method
  const fee = withdrawMethod.value === 'ewallet' ? 2500 : 5000
  
  if (!amount || amount < 10000) {
    withdrawError.value = 'Minimal pencairan Rp 10.000'
    return
  }
  
  // Check if payment method is set up
  if (withdrawMethod.value === 'bank' && !teacherBankInfo.value.bank_name) {
    withdrawError.value = 'Anda belum mengatur rekening bank. Atur di Profil.'
    return
  }
  
  if (withdrawMethod.value === 'ewallet' && !teacherBankInfo.value.ewallet_type) {
    withdrawError.value = 'Anda belum mengatur e-wallet. Atur di Profil.'
    return
  }
  
  if (amount > maxWithdraw.value) {
    withdrawError.value = 'Saldo tidak mencukupi'
    return
  }
  
  withdrawing.value = true
  
  try {
    // Get teacher's les_place_id
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('les_place_id')
      .eq('user_id', authStore.user.id)
      .single()
    
    // Auto-detect payment method: prefer bank, fallback to e-wallet
    let bankName, bankAccount, bankHolder
    const useBank = teacherBankInfo.value.bank_name
    const useEwallet = teacherBankInfo.value.ewallet_type
    
    if (!useBank && !useEwallet) {
      withdrawError.value = 'Anda belum mengatur metode pembayaran. Atur di Profil.'
      withdrawing.value = false
      return
    }
    
    if (useBank) {
      bankName = teacherBankInfo.value.bank_name
      bankAccount = teacherBankInfo.value.bank_account
      bankHolder = teacherBankInfo.value.bank_holder
    } else {
      bankName = teacherBankInfo.value.ewallet_type
      bankAccount = teacherBankInfo.value.ewallet_number
      bankHolder = teacherBankInfo.value.bank_holder || ''
    }
    
    // Insert to withdrawals table
    const { data: newWithdrawal, error } = await supabase
      .from('withdrawals')
      .insert({
        user_id: authStore.user.id,
        les_place_id: teacherData?.les_place_id || null,
        amount: amount,
        fee: fee,
        net_amount: amount - fee,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_holder: bankHolder,
        status: 'completed',
        requester_type: 'teacher',
        requested_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Withdraw error:', error)
      withdrawError.value = 'Gagal mengajukan pencairan: ' + error.message
      return
    }
    
    // Update local state
    withdrawals.value.unshift(newWithdrawal)
    summary.value.withdrawableBalance -= amount
    
    // Reset form
    withdrawAmount.value = ''
    withdrawSuccess.value = true
    
    // Reload withdrawals data
    await fetchWithdrawals()
    
    setTimeout(() => withdrawSuccess.value = false, 5000)
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

    <main class="main">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M12 12h.01"/>
              <path d="M17 12h.01"/>
              <path d="M7 12h.01"/>
            </svg>
            Keuangan
          </h1>
          <p class="subtitle">Kelola pendapatan dan pencairan dana Anda</p>
        </div>
        <div class="header-badge" v-if="lesPlace">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          {{ lesPlace.name }}
        </div>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Memuat data keuangan...</p>
      </div>

      <div v-else>
        <!-- Stats Cards -->
        <section class="stats-grid simplified">
          <div class="stat-card primary">
            <div class="stat-icon">
              <span class="rp-icon">Rp</span>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatCurrency(summary.totalEarnings) }}</span>
              <span class="stat-label">Total Diterima</span>
            </div>
          </div>
          
          <div class="stat-card green">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ formatCurrency(summary.monthlyEarnings) }}</span>
              <span class="stat-label">Bulan Ini</span>
            </div>
          </div>
          
          <div class="stat-card purple">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ payments.filter(p => p.payment_status === 'completed').length }}x</span>
              <span class="stat-label">Pembayaran Selesai</span>
            </div>
          </div>
        </section>

        <!-- Tabs -->
        <section class="tabs-section">
          <div class="tabs">
            <button v-for="tab in tabs" :key="tab.id" 
                    :class="['tab', { active: activeTab === tab.id }]"
                    @click="activeTab = tab.id">
              {{ tab.label }}
            </button>
          </div>
        </section>

        <!-- Overview Tab -->
        <section v-if="activeTab === 'overview'" class="tab-content">
          <div class="overview-grid">
            <!-- Payment Summary Card -->
            <div class="panel-card">
              <h3>Ringkasan Pembayaran</h3>
              <div class="payment-summary">
                <div class="summary-item">
                  <div class="summary-icon green">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div class="summary-info">
                    <span class="summary-label">Terakhir Diterima</span>
                    <span class="summary-value">{{ summary.lastPayment ? formatDate(summary.lastPayment) : 'Belum ada' }}</span>
                  </div>
                </div>
                <div class="summary-item">
                  <div class="summary-icon purple">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                  </div>
                  <div class="summary-info">
                    <span class="summary-label">Tempat Les</span>
                    <span class="summary-value">{{ lesPlace?.name || 'Belum ada' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Transactions -->
          <div class="panel-card">
            <div class="panel-header">
              <h3>Transaksi Terakhir</h3>
              <button class="btn-link" @click="activeTab = 'history'">Lihat Semua</button>
            </div>
            <div v-if="payments.length" class="transactions-list">
              <div v-for="payment in payments.slice(0, 5)" :key="payment.id" class="transaction-item">
                <div class="tx-icon" :class="payment.payment_type">
                  <svg v-if="payment.payment_type === 'salary'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  <svg v-else-if="payment.payment_type === 'bonus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                </div>
                <div class="tx-info">
                  <span class="tx-title">{{ getTypeLabel(payment.payment_type) }}</span>
                  <span class="tx-date">{{ formatPeriod(payment.payment_period) }}</span>
                </div>
                <div class="tx-amount" :class="{ positive: payment.payment_type !== 'deduction', negative: payment.payment_type === 'deduction' }">
                  {{ payment.payment_type === 'deduction' ? '-' : '+' }}{{ formatCurrency(payment.amount) }}
                </div>
                <span class="tx-status" :class="getStatusClass(payment.payment_status)">
                  {{ getStatusLabel(payment.payment_status) }}
                </span>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>Belum ada transaksi</p>
            </div>
          </div>
        </section>

        <!-- History Tab -->
        <section v-else-if="activeTab === 'history'" class="tab-content">
          <div class="panel-card">
            <div class="panel-header">
              <h3>Riwayat Pembayaran</h3>
              <select v-model="selectedMonth" class="filter-select">
                <option value="all">Semua Periode</option>
                <option v-for="month in availableMonths" :key="month" :value="month">
                  {{ formatPeriod(month) }}
                </option>
              </select>
            </div>
            
            <div v-if="filteredPayments.length" class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Tipe</th>
                    <th>Jumlah</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="payment in filteredPayments" :key="payment.id">
                    <td>
                      <span class="period-text">{{ formatPeriod(payment.payment_period) }}</span>
                    </td>
                    <td>
                      <span class="type-badge" :class="payment.payment_type">
                        {{ getTypeLabel(payment.payment_type) }}
                      </span>
                    </td>
                    <td>
                      <span class="amount-value" :class="{ positive: payment.payment_type !== 'deduction', negative: payment.payment_type === 'deduction' }">
                        {{ payment.payment_type === 'deduction' ? '-' : '+' }}{{ formatCurrency(payment.amount) }}
                      </span>
                    </td>
                    <td>{{ formatDate(payment.paid_date || payment.scheduled_date) }}</td>
                    <td>
                      <span class="status-badge" :class="getStatusClass(payment.payment_status)">
                        {{ getStatusLabel(payment.payment_status) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-else class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              <h4>Belum ada riwayat pembayaran</h4>
              <p>Riwayat pembayaran akan muncul di sini</p>
            </div>
          </div>
        </section>

        <!-- Withdraw Tab -->
        <section v-else-if="activeTab === 'withdraw'" class="tab-content">
          <div class="withdraw-layout">
            <!-- Balance Card -->
            <div class="panel-card balance-card">
              <div class="balance-header">
                <span class="rp-icon lg">Rp</span>
                <div class="balance-info">
                  <span class="balance-label">Saldo Dapat Dicairkan</span>
                  <span class="balance-value">{{ formatCurrency(summary.withdrawableBalance) }}</span>
                </div>
              </div>
              <div class="balance-note">
                Dana langsung ditransfer ke rekening Anda
              </div>
            </div>
            
            <!-- Withdraw Form -->
            <div class="panel-card">
              <h3>Cairkan Dana</h3>
              
              <div v-if="withdrawSuccess" class="alert success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <div>
                  <strong>Pencairan Berhasil!</strong>
                  <p>Dana akan ditransfer ke rekening Anda</p>
                </div>
              </div>
              
              <div class="withdraw-form">
                <!-- Payment Method Display -->
                <div class="bank-info-display">
                  <label>Rekening Tujuan</label>
                  
                  <!-- Show Bank if set -->
                  <div v-if="teacherBankInfo.bank_name" class="bank-card">
                    <div class="bank-logo">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <line x1="2" y1="10" x2="22" y2="10"/>
                      </svg>
                    </div>
                    <div class="bank-details">
                      <span class="bank-type">Transfer Bank</span>
                      <span class="bank-name">{{ teacherBankInfo.bank_name }}</span>
                      <span class="bank-account">{{ teacherBankInfo.bank_account }}</span>
                      <span class="bank-holder">a.n {{ teacherBankInfo.bank_holder }}</span>
                    </div>
                    <button class="btn-change" @click="$router.push('/teacher/profile')">Ubah</button>
                  </div>
                  
                  <!-- Show E-Wallet if set and no bank -->
                  <div v-else-if="teacherBankInfo.ewallet_type" class="bank-card ewallet">
                    <div class="bank-logo ewallet">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="M6 8h4M6 12h8M6 16h6"/>
                      </svg>
                    </div>
                    <div class="bank-details">
                      <span class="bank-type">E-Wallet</span>
                      <span class="bank-name">{{ teacherBankInfo.ewallet_type }}</span>
                      <span class="bank-account">{{ teacherBankInfo.ewallet_number }}</span>
                    </div>
                    <button class="btn-change" @click="$router.push('/teacher/profile')">Ubah</button>
                  </div>
                  
                  <!-- No payment method set -->
                  <div v-else class="no-bank-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p>Anda belum mengatur metode pembayaran</p>
                    <span class="hint">Atur rekening bank atau e-wallet di halaman profil</span>
                    <button class="btn-primary-sm" @click="$router.push('/teacher/profile')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Atur di Profil
                    </button>
                  </div>
                </div>
                
                <!-- Amount Input -->
                <div class="form-group amount-input-group">
                  <label>Jumlah Pencairan</label>
                  <div class="amount-input-wrapper">
                    <span class="currency-prefix">Rp</span>
                    <input 
                      type="text" 
                      v-model="withdrawAmount" 
                      placeholder="Masukkan jumlah"
                      @input="withdrawAmount = withdrawAmount.replace(/[^0-9]/g, '')"
                    >
                  </div>
                  <div class="input-hints">
                    <span class="min-hint">Min. Rp 10.000</span>
                    <span class="max-hint">Maks. {{ formatCurrency(maxWithdraw) }}</span>
                  </div>
                  <div class="amount-hints">
                    <button 
                      v-for="pct in [25, 50, 75, 100]" 
                      :key="pct"
                      :class="{ active: withdrawAmount == Math.floor(maxWithdraw * pct / 100) }"
                      @click="withdrawAmount = Math.floor(maxWithdraw * pct / 100)"
                    >
                      {{ pct }}%
                    </button>
                  </div>
                </div>
                
                <!-- Summary -->
                <div class="withdraw-summary">
                  <div class="summary-row">
                    <span>Jumlah Pencairan</span>
                    <span>{{ formatCurrency(parseInt(withdrawAmount) || 0) }}</span>
                  </div>
                  <div class="summary-row">
                    <span>Biaya Admin</span>
                    <span class="fee">- {{ formatCurrency(5000) }}</span>
                  </div>
                  <div class="summary-row total">
                    <span>Total Diterima</span>
                    <span>{{ formatCurrency(Math.max(0, (parseInt(withdrawAmount) || 0) - 5000)) }}</span>
                  </div>
                </div>
                
                <p v-if="withdrawError" class="error-text">{{ withdrawError }}</p>
                
                <button 
                  class="btn-withdraw"
                  :disabled="withdrawing || !withdrawAmount || parseInt(withdrawAmount) < 10000 || !teacherBankInfo.bank_name"
                  @click="handleWithdraw"
                >
                  <span v-if="withdrawing" class="loading-spinner-sm"></span>
                  {{ withdrawing ? 'Memproses...' : 'Cairkan Sekarang' }}
                </button>
              </div>
            </div>
          </div>
          
          <!-- Withdrawal History -->
          <div class="panel-card" style="margin-top: 24px;">
            <h3>Riwayat Pencairan</h3>
            <div v-if="withdrawals.length" class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jumlah</th>
                    <th>Bank</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="wd in withdrawals" :key="wd.id">
                    <td>{{ formatDate(wd.requested_at || wd.created_at) }}</td>
                    <td class="amount-value positive">{{ formatCurrency(wd.net_amount || wd.amount) }}</td>
                    <td>{{ wd.bank_name }} ***{{ wd.bank_account?.slice(-4) || '' }}</td>
                    <td><span class="status-badge" :class="getStatusClass(wd.status)">{{ getStatusLabel(wd.status) }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-state small">
              <p>Belum ada riwayat pencairan</p>
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

.header-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.header-badge svg { width: 18px; height: 18px; color: #0d5782; }

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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stats-grid.simplified {
  grid-template-columns: repeat(3, 1fr);
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg { width: 26px; height: 26px; }

.rp-icon {
  font-size: 20px;
  font-weight: 800;
}

.rp-icon.lg { font-size: 20px; }

.stat-card.primary .stat-icon { background: #F1F5F9; color: #0D5782; }
.stat-card.green .stat-icon { background: #F1F5F9; color: #0D5782; }
.stat-card.orange .stat-icon { background: #F1F5F9; color: #0D5782; }
.stat-card.purple .stat-icon { background: #F1F5F9; color: #0D5782; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 20px; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 13px; color: #64748b; }

/* Tabs */
.tabs-section { margin-bottom: 24px; }

.tabs {
  display: inline-flex;
  background: white;
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s;
}

.tab:hover { color: #0d5782; }
.tab.active { background: #0d5782; color: white; }

/* Overview Grid */
.overview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

/* Payment Summary */
.payment-summary { display: flex; flex-direction: column; gap: 16px; }
.summary-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; }
.summary-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.summary-icon svg { width: 22px; height: 22px; }
.summary-icon.green { background: #dcfce7; color: #16a34a; }
.summary-icon.purple { background: #f3e8ff; color: #9333ea; }
.summary-info { display: flex; flex-direction: column; }
.summary-label { font-size: 13px; color: #64748b; }
.summary-value { font-size: 16px; font-weight: 600; color: #1e293b; }

/* Panel Card */
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

.btn-link {
  background: none;
  border: none;
  color: #0d5782;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-link:hover { text-decoration: underline; }

/* Chart */
.chart-card { min-height: 280px; }

.chart-container { padding: 20px 0; }

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 180px;
  gap: 16px;
}

.chart-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.chart-bar {
  width: 100%;
  max-width: 60px;
  background: linear-gradient(to top, #0d5782, #3b82f6);
  border-radius: 8px 8px 0 0;
  min-height: 20px;
  position: relative;
  transition: height 0.3s ease;
}

.bar-value {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

.bar-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

/* Quick Stats */
.quick-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.qs-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
}

.qs-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qs-icon svg { width: 20px; height: 20px; }
.qs-icon.blue { background: #dbeafe; color: #2563eb; }
.qs-icon.green { background: #dcfce7; color: #16a34a; }
.qs-icon.orange { background: #fed7aa; color: #ea580c; }
.qs-icon.purple { background: #f3e8ff; color: #9333ea; }

.qs-info { display: flex; flex-direction: column; }
.qs-value { font-size: 16px; font-weight: 700; color: #1e293b; }
.qs-label { font-size: 12px; color: #64748b; }

/* Transactions List */
.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 12px;
}

.tx-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tx-icon svg { width: 20px; height: 20px; }
.tx-icon.salary { background: #dbeafe; color: #2563eb; }
.tx-icon.bonus { background: #dcfce7; color: #16a34a; }
.tx-icon.deduction { background: #fee2e2; color: #dc2626; }

.tx-info { flex: 1; }
.tx-title { display: block; font-weight: 600; color: #1e293b; font-size: 14px; }
.tx-date { font-size: 12px; color: #64748b; }

.tx-amount {
  font-size: 15px;
  font-weight: 700;
}

.tx-amount.positive { color: #16a34a; }
.tx-amount.negative { color: #dc2626; }

.tx-status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.tx-status.success { background: #dcfce7; color: #16a34a; }
.tx-status.warning { background: #fef3c7; color: #d97706; }
.tx-status.info { background: #dbeafe; color: #2563eb; }

/* Table */
.table-container { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 14px 16px;
  text-align: left;
}

.data-table th {
  background: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.data-table tr:not(:last-child) td {
  border-bottom: 1px solid #f1f5f9;
}

.period-text { font-weight: 500; }

.amount-value {
  font-weight: 700;
}

.amount-value.positive { color: #16a34a; }
.amount-value.negative { color: #dc2626; }

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.type-badge.salary { background: #dbeafe; color: #2563eb; }
.type-badge.bonus { background: #dcfce7; color: #16a34a; }
.type-badge.deduction { background: #fee2e2; color: #dc2626; }

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.success { background: #dcfce7; color: #16a34a; }
.status-badge.warning { background: #fef3c7; color: #d97706; }
.status-badge.error { background: #fee2e2; color: #dc2626; }
.status-badge.info { background: #dbeafe; color: #2563eb; }

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

/* Withdraw Tab */
.withdraw-grid, .withdraw-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
}

.balance-card {
  background: linear-gradient(135deg, #0d5782, #1e40af);
  color: white;
}

.balance-card h3 { color: rgba(255,255,255,0.8); }

.balance-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.balance-header .rp-icon {
  width: 56px;
  height: 56px;
  background: rgba(255,255,255,0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.balance-info { display: flex; flex-direction: column; }
.balance-label { font-size: 13px; opacity: 0.8; }
.balance-value { font-size: 28px; font-weight: 700; }

.balance-note {
  font-size: 12px;
  opacity: 0.7;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0d5782;
}

.form-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Amount Input Group - Premium Design */
.amount-input-group {
  margin-bottom: 20px;
}
.amount-input-group > label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

.amount-input-wrapper {
  display: flex;
  align-items: stretch;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  overflow: hidden;
  transition: all 0.2s;
}
.amount-input-wrapper:focus-within {
  border-color: #0d5782;
  background: white;
  box-shadow: 0 0 0 4px rgba(13, 87, 130, 0.08);
}

.currency-prefix {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  background: linear-gradient(135deg, #0d5782, #1e40af);
  color: white;
  font-size: 16px;
  font-weight: 700;
  min-width: 60px;
}

.amount-input-wrapper input {
  flex: 1;
  border: none;
  padding: 18px 16px;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  background: transparent;
  min-width: 0;
}
.amount-input-wrapper input::placeholder {
  color: #94a3b8;
  font-weight: 400;
  font-size: 15px;
}
.amount-input-wrapper input:focus { outline: none; }
/* Hide number input spinners */
.amount-input-wrapper input::-webkit-outer-spin-button,
.amount-input-wrapper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.amount-input-wrapper input[type=number] { -moz-appearance: textfield; }

.input-hints {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding: 0 4px;
  font-size: 13px;
}
.min-hint { color: #64748b; }
.max-hint { color: #0d5782; font-weight: 600; }

.input-with-prefix {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.input-prefix {
  padding: 12px 14px;
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
  border-right: 1px solid #e2e8f0;
}

.input-with-prefix input {
  flex: 1;
  border: none;
  padding: 12px;
}

.input-with-prefix input:focus { outline: none; }

.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
}

.alert svg { width: 20px; height: 20px; flex-shrink: 0; }
.alert.error { background: #fee2e2; color: #dc2626; }
.alert.success { background: #dcfce7; color: #16a34a; }

.fee-summary {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #64748b;
  padding: 6px 0;
}

.fee-row.total {
  font-weight: 700;
  color: #1e293b;
  border-top: 1px solid #e2e8f0;
  margin-top: 8px;
  padding-top: 12px;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-submit:hover { background: #0a4568; }
.btn-submit:disabled { background: #94a3b8; cursor: not-allowed; }

.spinner-sm {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #94a3b8;
}

.empty-state svg { width: 64px; height: 64px; margin-bottom: 16px; color: #cbd5e1; }
.empty-state h4 { font-size: 16px; color: #64748b; margin-bottom: 4px; }
.empty-state p { font-size: 14px; }
.empty-state.small { padding: 24px; }

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .overview-grid { grid-template-columns: 1fr; }
  .withdraw-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .main { padding: 16px; }
  .page-header { flex-direction: column; gap: 16px; }
  .stats-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}

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

/* Bank Info Display */
.bank-info-display {
  margin-bottom: 24px;
}
.bank-info-display label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
}
.bank-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  background: linear-gradient(135deg, #0d5782, #1e40af);
  border-radius: 14px;
  color: white;
}
.bank-logo {
  width: 50px;
  height: 50px;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bank-logo svg { width: 24px; height: 24px; }
.bank-details { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.bank-details .bank-type { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; }
.bank-details .bank-name { font-size: 16px; font-weight: 600; }
.bank-details .bank-account { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
.bank-details .bank-holder { font-size: 12px; opacity: 0.7; }

/* E-Wallet Card Variant */
.bank-card.ewallet { background: linear-gradient(135deg, #059669, #047857); }
.bank-logo.ewallet { background: rgba(255,255,255,0.25); }
.btn-change {
  padding: 8px 14px;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-change:hover { background: rgba(255,255,255,0.3); }

.no-bank-info {
  text-align: center;
  padding: 32px 24px;
  background: #fef3c7;
  border: 2px dashed #fbbf24;
  border-radius: 14px;
}
.no-bank-info svg {
  width: 40px;
  height: 40px;
  color: #d97706;
  margin-bottom: 12px;
}
.no-bank-info p {
  font-size: 16px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
}
.no-bank-info .hint {
  display: block;
  font-size: 13px;
  color: #b45309;
  margin-bottom: 16px;
}
.btn-primary-sm {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #0d5782, #1e40af);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary-sm:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(13, 87, 130, 0.3); }
.btn-primary-sm svg { width: 16px; height: 16px; }

/* Amount Hints */
.amount-hints {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.amount-hints button {
  flex: 1;
  padding: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}
.amount-hints button:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
  color: #0d5782;
}
.amount-hints button.active {
  background: linear-gradient(135deg, #0d5782, #1e40af);
  border-color: #0d5782;
  color: white;
}

/* Withdraw Summary */
.withdraw-summary {
  background: #f8fafc;
  border-radius: 12px;
  padding: 18px;
  margin: 20px 0;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #64748b;
  padding: 8px 0;
}
.summary-row .fee { color: #dc2626; }
.summary-row.total {
  font-size: 16px;
  font-weight: 700;
  color: #0d5782;
  border-top: 1px solid #e2e8f0;
  margin-top: 8px;
  padding-top: 14px;
}

/* Withdraw Button */
.btn-withdraw {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #0d5782, #1e40af);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
}
.btn-withdraw:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(13, 87, 130, 0.3); }
.btn-withdraw:disabled { background: #94a3b8; cursor: not-allowed; transform: none; box-shadow: none; }

/* Error and Success Text */
.error-text { font-size: 14px; color: #dc2626; margin-bottom: 12px; }
.success-text { font-size: 14px; color: #16a34a; margin-bottom: 12px; }

/* Rp Icon Large */
.rp-icon.lg {
  width: 56px;
  height: 56px;
  font-size: 22px;
  background: rgba(255,255,255,0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

/* Withdraw Form Spacing */
.withdraw-form { display: flex; flex-direction: column; }
.withdraw-form .form-group { margin-bottom: 20px; }
</style>
