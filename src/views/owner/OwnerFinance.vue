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

// Teacher Payment Modal
const showPaymentModal = ref(false)
const selectedTeacher = ref(null)
const paymentAmount = ref('')
const paymentPeriod = ref('')
const payingTeacher = ref(false)
const paymentError = ref('')

// Confirmation Modal
const showConfirmModal = ref(false)
const confirmPaymentData = ref(null)

// Payment Detail Modal
const showPaymentDetailModal = ref(false)
const selectedPaymentDetail = ref(null)

// Delete Confirmation Modal
const showDeleteModal = ref(false)
const paymentToDelete = ref(null)
const deleting = ref(false)

// Teacher Withdraw Requests
const teacherWithdrawRequests = ref([])
const processingWithdrawId = ref(null)

// Filters
const dateFilter = ref('month')
const statusFilter = ref('')

// Tabs - hide teacher-related tabs for pribadi owner
const tabs = computed(() => {
  const baseTabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'transactions', label: 'Transaksi Siswa' },
  ]
  // Add teacher tab only for non-private (umum) owners
  if (!lesPlace.value.is_private) {
    baseTabs.push({ id: 'teachers', label: 'Pembayaran Guru' })
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
        lesPlace.value.balance = 0
      }

      // Get all programs for this les_place
      const { data: programsData } = await supabase
        .from('programs')
        .select('id, name, price')
        .eq('les_place_id', selectedLesPlace.value)
      
      const programIds = (programsData || []).map(p => p.id)
      const programMap = Object.fromEntries((programsData || []).map(p => [p.id, p]))

      // PRIMARY SOURCE: Fetch bookings with payment status (consistent with OwnerRegistrations)
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id, status, payment_status, created_at, start_date,
          students(id, users(id, name, email)),
          programs(id, name, price)
        `)
        .in('program_id', programIds.length > 0 ? programIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })
      
      // Map bookings to transaction-like format for display
      const successStatuses = ['paid', 'settlement', 'capture']
      
      transactions.value = (bookingsData || []).map(booking => ({
        id: booking.id,
        booking_id: booking.id,
        student_id: booking.students?.id,
        program_id: booking.programs?.id,
        amount: booking.programs?.price || 0,
        net_amount: Math.round((booking.programs?.price || 0) * 0.9), // 10% platform fee
        platform_fee: Math.round((booking.programs?.price || 0) * 0.1),
        payment_status: successStatuses.includes(booking.payment_status) ? 'completed' : booking.payment_status,
        payment_method: '-',
        created_at: booking.created_at,
        students: { name: booking.students?.users?.name },
        programs: { name: booking.programs?.name }
      }))

      // Calculate summary from bookings (source of truth)
      const completedBookings = (bookingsData || []).filter(b => successStatuses.includes(b.payment_status))
      const pendingBookings = (bookingsData || []).filter(b => b.payment_status === 'pending' || b.payment_status === 'unpaid')
      
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthlyBookings = completedBookings.filter(b => new Date(b.created_at) >= startOfMonth)
      
      // Calculate with platform fee deducted (10%)
      const totalIncome = completedBookings.reduce((sum, b) => sum + Math.round((b.programs?.price || 0) * 0.9), 0)
      const monthlyIncome = monthlyBookings.reduce((sum, b) => sum + Math.round((b.programs?.price || 0) * 0.9), 0)
      const pendingIncome = pendingBookings.reduce((sum, b) => sum + (b.programs?.price || 0), 0)

      // Update balance from completed bookings
      lesPlace.value.balance = totalIncome

      summary.value = {
        totalIncome,
        monthlyIncome,
        pendingIncome,
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
      
      // Fetch teachers for teacher payments tab (only for non-private owners)
      if (!lesPlace.value.is_private) {
        await fetchTeachers()
        await fetchTeacherWithdrawRequests()
      }
  } catch (err) {
    console.error('Error fetching data:', err)
  } finally {
    loading.value = false
  }
}

// Fetch teachers for this les place
async function fetchTeachers() {
  try {
    // Get owner id first
    const { data: ownerData } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    console.log('Owner data for teachers:', ownerData)
    if (!ownerData) {
      console.log('No owner found')
      return
    }
    
    // Use same query as OwnerTeachers.vue
    const { data, error } = await supabase
      .from('teachers')
      .select('*, users(name, email)')
      .eq('owner_id', ownerData.id)
      .order('created_at', { ascending: false })
    
    console.log('Teachers query result:', data, 'Error:', error)
    
    if (error) {
      console.error('Teachers fetch error:', error)
      return
    }
    
    teachers.value = (data || []).map(t => ({
      id: t.id,
      user_id: t.user_id,
      name: t.users?.name || 'Unknown',
      email: t.users?.email || '',
      salary: t.salary || 0
    }))
    
    console.log('Teachers mapped:', teachers.value)
  } catch (err) {
    console.error('Error fetching teachers:', err)
  }
}

// Open payment modal for a teacher
function openPaymentModal(teacher) {
  selectedTeacher.value = teacher
  paymentAmount.value = teacher.salary || ''
  paymentPeriod.value = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  paymentError.value = ''
  showPaymentModal.value = true
}

// Pay teacher salary - Step 1: Show confirmation modal
function payTeacher() {
  if (!selectedTeacher.value || !paymentAmount.value) return
  
  const amount = parseInt(paymentAmount.value)
  if (amount <= 0) {
    paymentError.value = 'Jumlah pembayaran harus lebih dari 0'
    return
  }
  
  if (amount > lesPlace.value.balance) {
    paymentError.value = 'Saldo tidak mencukupi'
    return
  }
  
  // Show confirmation modal
  confirmPaymentData.value = {
    teacher: selectedTeacher.value,
    amount: amount,
    period: paymentPeriod.value
  }
  showConfirmModal.value = true
}

// Pay teacher salary - Step 2: Process after confirmation
async function confirmPayTeacher() {
  if (!confirmPaymentData.value) return
  
  const { teacher, amount, period } = confirmPaymentData.value
  
  payingTeacher.value = true
  paymentError.value = ''
  showConfirmModal.value = false
  
  try {
    
    // Insert teacher payment record
    // Note: teacher_id references users table, not teachers table
    const { error: paymentErr } = await supabase
      .from('teacher_payments')
      .insert({
        teacher_id: teacher.user_id, // Use user_id, not teachers.id
        les_place_id: selectedLesPlace.value,
        amount: amount,
        payment_period: period,
        payment_status: 'completed',
        paid_date: new Date().toISOString(),
        scheduled_date: new Date().toISOString()
      })
    
    if (paymentErr) throw paymentErr
    
    // Deduct balance from les_places
    const newBalance = (lesPlace.value.balance || 0) - amount
    const { error: balanceErr } = await supabase
      .from('les_places')
      .update({ balance: newBalance })
      .eq('id', selectedLesPlace.value)
    
    console.log('Balance update result:', balanceErr ? 'FAILED' : 'SUCCESS', 'New balance:', newBalance)
    if (balanceErr) {
      console.error('Error updating balance:', balanceErr)
    }
    
    // Update teacher's salary as the default for next payment
    console.log('Updating salary for teacher.id:', teacher.id, 'Amount:', amount)
    const { error: salaryErr, data: salaryData } = await supabase
      .from('teachers')
      .update({ salary: amount })
      .eq('id', teacher.id)
      .select()
    
    console.log('Salary update result:', salaryErr ? 'FAILED' : 'SUCCESS', 'Data:', salaryData)
    if (salaryErr) {
      console.error('Error updating teacher salary:', salaryErr)
    }
    
    // Update local state
    lesPlace.value.balance = newBalance
    summary.value.totalPaidToTeachers += amount
    
    // Update teacher salary in local list
    const teacherIdx = teachers.value.findIndex(t => t.id === teacher.id)
    console.log('Updating local teacher at index:', teacherIdx, 'Teacher id:', teacher.id)
    if (teacherIdx !== -1) {
      teachers.value[teacherIdx].salary = amount
    }
    
    // Close modal and refresh
    showPaymentModal.value = false
    selectedTeacher.value = null
    await fetchData()
    
  } catch (err) {
    console.error('Error paying teacher:', err)
    paymentError.value = 'Gagal memproses pembayaran: ' + err.message
  } finally {
    payingTeacher.value = false
  }
}

// View payment detail
function viewPaymentDetail(payment) {
  selectedPaymentDetail.value = payment
  showPaymentDetailModal.value = true
}

// Delete payment - Step 1: Show confirmation modal
function deletePayment(payment) {
  paymentToDelete.value = payment
  showDeleteModal.value = true
}

// Delete payment - Step 2: Process after confirmation
async function confirmDeletePayment() {
  if (!paymentToDelete.value) return
  
  const payment = paymentToDelete.value
  deleting.value = true
  
  try {
    // Delete payment record
    const { error: deleteErr } = await supabase
      .from('teacher_payments')
      .delete()
      .eq('id', payment.id)
    
    if (deleteErr) throw deleteErr
    
    // Restore balance to les_places
    const newBalance = (lesPlace.value.balance || 0) + payment.amount
    await supabase
      .from('les_places')
      .update({ balance: newBalance })
      .eq('id', selectedLesPlace.value)
    
    // Update local state
    lesPlace.value.balance = newBalance
    summary.value.totalPaidToTeachers -= payment.amount
    
    // Close modal and refresh data
    showDeleteModal.value = false
    paymentToDelete.value = null
    await fetchData()
    
  } catch (err) {
    console.error('Error deleting payment:', err)
  } finally {
    deleting.value = false
  }
}

// Fetch teacher withdraw requests for this owner's les place
async function fetchTeacherWithdrawRequests() {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*, users(name, email)')
      .eq('les_place_id', lesPlace.value.id)
      .eq('requester_type', 'teacher')
      .order('requested_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching teacher withdrawals:', error)
      return
    }
    
    teacherWithdrawRequests.value = data || []
  } catch (err) {
    console.error('Error fetching teacher withdrawals:', err)
  }
}

// Approve teacher withdraw request
async function approveWithdrawRequest(request) {
  if (processingWithdrawId.value) return
  processingWithdrawId.value = request.id
  
  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({ 
        status: 'approved',
        processed_at: new Date().toISOString()
      })
      .eq('id', request.id)
    
    if (error) {
      console.error('Error approving withdrawal:', error)
      alert('Gagal menyetujui pencairan: ' + error.message)
      return
    }
    
    // Refresh data
    await fetchTeacherWithdrawRequests()
  } catch (err) {
    console.error('Error approving withdrawal:', err)
  } finally {
    processingWithdrawId.value = null
  }
}

// Reject teacher withdraw request
async function rejectWithdrawRequest(request) {
  if (processingWithdrawId.value) return
  const reason = prompt('Alasan penolakan:')
  if (!reason) return
  
  processingWithdrawId.value = request.id
  
  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({ 
        status: 'rejected',
        processed_at: new Date().toISOString(),
        notes: reason
      })
      .eq('id', request.id)
    
    if (error) {
      console.error('Error rejecting withdrawal:', error)
      alert('Gagal menolak pencairan: ' + error.message)
      return
    }
    
    // Refresh data
    await fetchTeacherWithdrawRequests()
  } catch (err) {
    console.error('Error rejecting withdrawal:', err)
  } finally {
    processingWithdrawId.value = null
  }
}

// Mark withdraw as completed (after manual transfer)
async function completeWithdrawRequest(request) {
  if (processingWithdrawId.value) return
  if (!confirm(`Apakah Anda sudah mentransfer Rp ${request.net_amount?.toLocaleString('id-ID')} ke ${request.bank_name} ${request.bank_account}?`)) return
  
  processingWithdrawId.value = request.id
  
  try {
    const { error } = await supabase
      .from('withdrawals')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', request.id)
    
    if (error) {
      console.error('Error completing withdrawal:', error)
      alert('Gagal menyelesaikan pencairan: ' + error.message)
      return
    }
    
    // Refresh data
    await fetchTeacherWithdrawRequests()
  } catch (err) {
    console.error('Error completing withdrawal:', err)
  } finally {
    processingWithdrawId.value = null
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
    // Normalized statuses
    completed: 'status-success',
    pending: 'status-warning',
    failed: 'status-error',
    processing: 'status-info',
    // Original booking statuses
    paid: 'status-success',
    settlement: 'status-success',
    capture: 'status-success',
    unpaid: 'status-warning',
    cancelled: 'status-error',
    expire: 'status-error'
  }
  return classes[status] || 'status-default'
}

function getStatusLabel(status) {
  const labels = {
    // Normalized statuses
    completed: 'Selesai',
    pending: 'Menunggu',
    failed: 'Gagal',
    processing: 'Diproses',
    // Original booking statuses
    paid: 'Selesai',
    settlement: 'Selesai',
    capture: 'Selesai',
    unpaid: 'Menunggu',
    cancelled: 'Gagal',
    expire: 'Gagal'
  }
  return labels[status] || status
}

const filteredTransactions = computed(() => {
  if (!statusFilter.value) return transactions.value
  
  const successStatuses = ['completed', 'paid', 'settlement', 'capture']
  const pendingStatuses = ['pending', 'unpaid']
  const failedStatuses = ['failed', 'cancelled', 'expire']
  
  if (statusFilter.value === 'completed') {
    return transactions.value.filter(t => successStatuses.includes(t.payment_status))
  } else if (statusFilter.value === 'pending') {
    return transactions.value.filter(t => pendingStatuses.includes(t.payment_status))
  } else if (statusFilter.value === 'failed') {
    return transactions.value.filter(t => failedStatuses.includes(t.payment_status))
  }
  return transactions.value
})

// Computed: Available Balance = Total Income - Teacher Payments - Withdrawals
const availableBalance = computed(() => {
  const totalIncome = summary.value.totalIncome || 0
  const paidToTeachers = summary.value.totalPaidToTeachers || 0
  // TODO: Add total withdrawals when withdrawal feature is complete
  const totalWithdrawals = 0
  return totalIncome - paidToTeachers - totalWithdrawals
})

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
            Export
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
          <div class="summary-card highlight">
            <div class="card-icon balance">
              <span style="font-weight: 800; font-size: 20px;">Rp</span>
            </div>
            <div class="card-info">
              <span class="card-label">Saldo Tersedia</span>
              <span class="card-value success">{{ formatCurrency(availableBalance) }}</span>
              <span class="card-hint">Setelah potongan platform 10% & gaji guru</span>
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
                    <option value="pending">Menunggu</option>
                    <option value="failed">Gagal</option>
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
                    <tr v-for="txn in filteredTransactions" :key="txn.id">
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

          <!-- Teacher Payments Tab (Merged) -->
          <div v-if="activeTab === 'teachers'" class="tab-panel">
            <!-- Daftar Guru -->
            <div class="panel-card full" style="margin-bottom: 24px;">
              <div class="panel-header">
                <h3>Daftar Guru & Gaji</h3>
                <button class="btn btn-outline" @click="fetchTeachers">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  Refresh
                </button>
              </div>
              <div v-if="teachers.length" class="teacher-grid">
                <div v-for="teacher in teachers" :key="teacher.id" class="teacher-card">
                  <div class="teacher-info">
                    <div class="teacher-avatar">{{ teacher.name?.charAt(0) || '?' }}</div>
                    <div class="teacher-details">
                      <h4>{{ teacher.name }}</h4>
                      <span class="teacher-email">{{ teacher.email }}</span>
                    </div>
                  </div>
                  <div class="teacher-salary">
                    <span class="salary-label">Gaji Bulanan</span>
                    <span class="salary-amount">{{ formatCurrency(teacher.salary) }}</span>
                  </div>
                  <button class="btn btn-primary btn-sm" @click="openPaymentModal(teacher)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Bayar Gaji
                  </button>
                </div>
              </div>
              <div v-else class="empty-state">
                <p>Belum ada guru terdaftar. Tambahkan guru di menu Kelola Guru.</p>
              </div>
            </div>

            <!-- Riwayat Pembayaran -->
            <div class="panel-card full">
              <div class="panel-header">
                <h3>Riwayat Pembayaran Guru</h3>
              </div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th>Guru</th>
                      <th>Jumlah</th>
                      <th>Dibayar</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="payment in teacherPayments" :key="payment.id">
                      <td>{{ payment.payment_period || '-' }}</td>
                      <td>{{ payment.teacher_name || payment.teacher?.name || '-' }}</td>
                      <td class="amount-cell">{{ formatCurrency(payment.amount) }}</td>
                      <td>{{ formatDate(payment.paid_date) }}</td>
                      <td><span class="status-badge" :class="getStatusClass(payment.payment_status)">{{ getStatusLabel(payment.payment_status) }}</span></td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn btn-sm btn-outline" @click="viewPaymentDetail(payment)" title="Lihat Detail">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          <button class="btn btn-sm btn-danger" @click="deletePayment(payment)" title="Hapus">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!teacherPayments.length">
                      <td colspan="6" class="empty-cell">Belum ada riwayat pembayaran</td>
                    </tr>
                  </tbody>
                </table>
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
                
                  <!-- Amount Input - Premium Design -->
                  <div class="form-group amount-input-group">
                    <label>Jumlah Pencairan</label>
                    <div class="amount-input-wrapper">
                      <span class="currency-prefix">Rp</span>
                      <input 
                        v-model="withdrawAmount" 
                        type="text" 
                        placeholder="Masukkan jumlah"
                        @input="withdrawAmount = withdrawAmount.toString().replace(/[^0-9]/g, '')"
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
                        type="button"
                      >
                        {{ pct }}%
                      </button>
                    </div>
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

    <!-- Teacher Payment Modal -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="showPaymentModal = false">
      <div class="modal payment-modal">
        <div class="modal-header">
          <h3>Bayar Gaji Guru</h3>
          <button class="modal-close" @click="showPaymentModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedTeacher" class="teacher-preview">
            <div class="teacher-avatar large">{{ selectedTeacher.name?.charAt(0) || '?' }}</div>
            <div class="teacher-info-modal">
              <h4>{{ selectedTeacher.name }}</h4>
              <p>{{ selectedTeacher.email }}</p>
            </div>
          </div>
          
          <div class="form-group">
            <label>Periode Pembayaran</label>
            <input v-model="paymentPeriod" type="text" class="form-input" placeholder="Contoh: Januari 2026">
          </div>
          
          <div class="form-group">
            <label>Jumlah Pembayaran (Rp)</label>
            <input v-model.number="paymentAmount" type="number" class="form-input" placeholder="Masukkan jumlah">
            <span v-if="selectedTeacher?.salary > 0" class="form-hint">Gaji default: {{ formatCurrency(selectedTeacher.salary) }}</span>
          </div>
          
          <div class="balance-info">
            <span>Saldo Tersedia:</span>
            <strong>{{ formatCurrency(lesPlace.balance) }}</strong>
          </div>
          
          <div v-if="paymentError" class="alert alert-error">{{ paymentError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showPaymentModal = false">Batal</button>
          <button 
            class="btn btn-primary" 
            @click="payTeacher"
            :disabled="payingTeacher || !paymentAmount"
          >
            <span v-if="payingTeacher" class="loading-spinner-sm"></span>
            {{ payingTeacher ? 'Memproses...' : 'Bayar Sekarang' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal confirm-modal">
        <div class="modal-header">
          <h3>Konfirmasi Pembayaran</h3>
          <button class="modal-close" @click="showConfirmModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p class="confirm-text">Apakah Anda yakin ingin melakukan pembayaran ini?</p>
          
          <div class="confirm-details">
            <div class="confirm-row">
              <span class="confirm-label">Guru</span>
              <span class="confirm-value">{{ confirmPaymentData?.teacher?.name }}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Periode</span>
              <span class="confirm-value">{{ confirmPaymentData?.period }}</span>
            </div>
            <div class="confirm-row highlight">
              <span class="confirm-label">Jumlah</span>
              <span class="confirm-value amount">{{ formatCurrency(confirmPaymentData?.amount || 0) }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showConfirmModal = false">Batal</button>
          <button class="btn btn-primary" @click="confirmPayTeacher" :disabled="payingTeacher">
            <span v-if="payingTeacher" class="loading-spinner-sm"></span>
            {{ payingTeacher ? 'Memproses...' : 'Ya, Bayar Sekarang' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Payment Detail Modal -->
    <div v-if="showPaymentDetailModal && selectedPaymentDetail" class="modal-overlay" @click.self="showPaymentDetailModal = false">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h3>Detail Pembayaran</h3>
          <button class="modal-close" @click="showPaymentDetailModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-card">
            <div class="detail-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div class="detail-amount">{{ formatCurrency(selectedPaymentDetail.amount) }}</div>
            <div class="detail-status"><span class="status-badge" :class="getStatusClass(selectedPaymentDetail.payment_status)">{{ getStatusLabel(selectedPaymentDetail.payment_status) }}</span></div>
          </div>
          
          <div class="detail-rows">
            <div class="detail-row">
              <span class="detail-label">Guru</span>
              <span class="detail-value">{{ selectedPaymentDetail.teacher_name || selectedPaymentDetail.teacher?.name || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Periode</span>
              <span class="detail-value">{{ selectedPaymentDetail.payment_period || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tanggal Dibayar</span>
              <span class="detail-value">{{ formatDate(selectedPaymentDetail.paid_date) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ID Transaksi</span>
              <span class="detail-value mono">{{ selectedPaymentDetail.id?.substring(0, 8) }}...</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="showPaymentDetailModal = false">Tutup</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal && paymentToDelete" class="modal-overlay">
      <div class="modal delete-modal">
        <div class="modal-header">
          <h3>Hapus Pembayaran</h3>
          <button class="modal-close" @click="showDeleteModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="delete-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </div>
          <p class="delete-text">Apakah Anda yakin ingin menghapus pembayaran ini?</p>
          
          <div class="confirm-details">
            <div class="confirm-row">
              <span class="confirm-label">Guru</span>
              <span class="confirm-value">{{ paymentToDelete.teacher_name || paymentToDelete.teacher?.name }}</span>
            </div>
            <div class="confirm-row">
              <span class="confirm-label">Periode</span>
              <span class="confirm-value">{{ paymentToDelete.payment_period }}</span>
            </div>
            <div class="confirm-row highlight-danger">
              <span class="confirm-label">Jumlah</span>
              <span class="confirm-value amount-danger">{{ formatCurrency(paymentToDelete.amount) }}</span>
            </div>
          </div>
          
          <div class="delete-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Saldo akan dikembalikan ke akun Anda.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showDeleteModal = false">Batal</button>
          <button class="btn btn-danger-solid" @click="confirmDeletePayment" :disabled="deleting">
            <span v-if="deleting" class="loading-spinner-sm"></span>
            {{ deleting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>
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
.card-icon.balance { background: #dcfce7; color: #16a34a; }
.summary-card.highlight { border: 2px solid #16a34a; background: linear-gradient(135deg, #f0fdf4, white); }
.card-value.success { color: #16a34a; }
.card-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 4px; }
.card-value { font-size: 20px; font-weight: 700; color: #1e293b; }
.card-hint { display: block; font-size: 11px; color: #94a3b8; margin-top: 4px; }

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

/* Premium Amount Input */
.amount-input-group { margin-bottom: 20px; }
.amount-input-group > label { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 12px; }
.amount-input-wrapper {
  display: flex;
  align-items: stretch;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  overflow: hidden;
  transition: all 0.2s;
}
.amount-input-wrapper:focus-within { border-color: #0d5782; background: white; box-shadow: 0 0 0 4px rgba(13, 87, 130, 0.08); }
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
.amount-input-wrapper input::placeholder { color: #94a3b8; font-weight: 400; font-size: 15px; }
.amount-input-wrapper input:focus { outline: none; }
.amount-input-wrapper input::-webkit-outer-spin-button,
.amount-input-wrapper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.input-hints { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 0 4px; font-size: 13px; }
.min-hint { color: #64748b; }
.max-hint { color: #0d5782; font-weight: 600; }
.amount-hints { display: flex; gap: 8px; margin-top: 12px; }
.amount-hints button {
  flex: 1;
  padding: 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}
.amount-hints button:hover { background: #e2e8f0; border-color: #cbd5e1; color: #0d5782; }
.amount-hints button.active { background: linear-gradient(135deg, #0d5782, #1e40af); border-color: #0d5782; color: white; }

.alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.alert-warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
.alert-error { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }

.btn-block { width: 100%; justify-content: center; }
.loading-spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

.btn-export { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border: 1px solid var(--border); border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.btn-export svg { width: 16px; height: 16px; }
.btn-export:hover { background: var(--background); border-color: var(--primary); color: var(--primary); }

/* Teacher Grid & Cards */
.teacher-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.teacher-card { background: #f8fafc; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.teacher-info { display: flex; align-items: center; gap: 12px; }
.teacher-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #0a4568, #1e6b99); color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; }
.teacher-avatar.large { width: 60px; height: 60px; font-size: 24px; }
.teacher-details h4 { font-size: 15px; font-weight: 600; margin: 0 0 2px 0; }
.teacher-email { font-size: 12px; color: #64748b; }
.teacher-salary { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border-radius: 8px; }
.salary-label { font-size: 12px; color: #64748b; }
.salary-amount { font-size: 16px; font-weight: 700; color: #16a34a; }

/* Payment Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
.modal-close { width: 32px; height: 32px; border-radius: 8px; border: none; background: #f1f5f9; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-close:hover { background: #e2e8f0; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 20px; border-top: 1px solid #e2e8f0; }
.teacher-preview { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; margin-bottom: 20px; }
.teacher-info-modal h4 { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; }
.teacher-info-modal p { font-size: 13px; color: #64748b; margin: 0; }
.balance-info { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0fdf4; border-radius: 8px; margin-bottom: 16px; }
.balance-info span { font-size: 13px; color: #64748b; }
.balance-info strong { font-size: 16px; color: #16a34a; }
.empty-cell { text-align: center; color: #94a3b8; padding: 20px !important; }

/* Confirmation Modal */
.confirm-modal { max-width: 380px; }
.confirm-icon { display: flex; justify-content: center; margin-bottom: 16px; }
.confirm-icon svg { width: 48px; height: 48px; color: #f59e0b; }
.confirm-text { text-align: center; font-size: 15px; color: #475569; margin-bottom: 20px; }
.confirm-details { background: #f8fafc; border-radius: 12px; padding: 16px; }
.confirm-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
.confirm-row:last-child { border-bottom: none; }
.confirm-row.highlight { background: #f0fdf4; margin: 12px -16px -16px; padding: 16px; border-radius: 0 0 12px 12px; }
.confirm-label { font-size: 13px; color: #64748b; }
.confirm-value { font-size: 14px; font-weight: 600; color: #1e293b; }
.confirm-value.amount { font-size: 18px; color: #16a34a; }

/* Detail Modal */
.detail-modal { max-width: 400px; }
.detail-card { text-align: center; padding: 24px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; margin-bottom: 20px; }
.detail-icon { width: 48px; height: 48px; margin: 0 auto 12px; }
.detail-icon.success { color: #16a34a; }
.detail-icon svg { width: 100%; height: 100%; }
.detail-amount { font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.detail-rows { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 8px; }
.detail-label { font-size: 13px; color: #64748b; }
.detail-value { font-size: 14px; font-weight: 600; color: #1e293b; }
.detail-value.mono { font-family: monospace; font-size: 12px; color: #64748b; }

/* Action Buttons */
.action-buttons { display: flex; gap: 6px; }
.btn-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
.btn-danger:hover { background: #dc2626; color: white; }

/* Delete Modal */
.delete-modal { max-width: 380px; }
.delete-icon { display: flex; justify-content: center; margin-bottom: 16px; }
.delete-icon svg { width: 48px; height: 48px; color: #dc2626; }
.delete-text { text-align: center; font-size: 15px; color: #475569; margin-bottom: 20px; }
.delete-warning { display: flex; align-items: center; gap: 8px; padding: 12px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; margin-top: 16px; font-size: 13px; color: #92400e; }
.confirm-row.highlight-danger { background: #fee2e2; margin: 12px -16px -16px; padding: 16px; border-radius: 0 0 12px 12px; }
.confirm-value.amount-danger { font-size: 18px; color: #dc2626; }
.btn-danger-solid { background: #dc2626; color: white; border: none; }
.btn-danger-solid:hover { background: #b91c1c; }
.btn-danger-solid:disabled { background: #fca5a5; }
</style>
