<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStudentData } from '@/composables/useStudentData'
import { useAuthStore } from '@/stores/auth'
import StudentSidebar from '@/components/StudentSidebar.vue'
import { supabase } from '@/lib/supabase'
import { loadSnapScript } from '@/lib/midtrans'
import { createPayment } from '@/services/paymentService'

const router = useRouter()
const authStore = useAuthStore()
const { loading, bookings, paymentHistory, fetchBookings, fetchPaymentHistory, cancelBooking } = useStudentData()

// Utility Functions
function formatPrice(value) {
  if (!value) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatDate(date, options = {}) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options
  })
}

function getStatusClass(status) {
  const classes = {
    active: 'success',
    confirmed: 'success',
    pending: 'warning',
    completed: 'info',
    cancelled: 'error',
    rejected: 'error'
  }
  return classes[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    active: 'Aktif',
    confirmed: 'Terkonfirmasi',
    pending: 'Menunggu',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    rejected: 'Ditolak'
  }
  return texts[status] || status
}

const activeView = ref('bookings') // bookings or history
const activeTab = ref('all')
const showCancelModal = ref(false)
const showDetailModal = ref(false)
const selectedBooking = ref(null)
const cancelling = ref(false)

onMounted(async () => {
  await fetchBookings()
  await fetchPaymentHistory()
})

// Filter out cancelled/expired bookings from active list
const activeBookings = computed(() => {
  return bookings.value.filter(b => 
    b.status !== 'cancelled' && 
    b.payment_status !== 'failed' // 'failed' is used for cancelled in DB
  )
})

// Get cancelled/expired bookings for history (status='cancelled' OR payment_status='failed')
const cancelledBookings = computed(() => {
  return bookings.value.filter(b => 
    b.status === 'cancelled' || 
    b.payment_status === 'failed'
  )
})

const filteredBookings = computed(() => {
  if (activeTab.value === 'all') return activeBookings.value
  return activeBookings.value.filter(b => b.status === activeTab.value)
})

const stats = computed(() => ({
  all: activeBookings.value.length,
  active: activeBookings.value.filter(b => b.status === 'active').length,
  pending: activeBookings.value.filter(b => b.status === 'pending').length,
  completed: activeBookings.value.filter(b => b.status === 'completed').length
}))

const totalPaid = computed(() => {
  return paymentHistory.value
    .filter(p => p.transaction_status === 'settlement')
    .reduce((sum, p) => sum + p.gross_amount, 0)
})

// Merge payment history and cancelled bookings
const allHistoryTransactions = computed(() => {
  // 1. Format payment history items
  const historyItems = paymentHistory.value.map(p => ({
    ...p,
    isCancelled: false,
    date: new Date(p.created_at)
  }))

  // 2. Format cancelled bookings to match history structure
  const cancelledItems = cancelledBookings.value.map(b => ({
    id: b.id,
    transaction_status: b.payment_status === 'failed' ? 'cancelled' : b.payment_status, // map 'failed' back to 'cancelled' for display if needed, or keep as is
    gross_amount: b.actualAmount || (b.program?.price || 0) + 5000,
    program_name: b.program?.name,
    les_place_name: b.program?.les_place?.name,
    created_at: b.created_at,
    payment_type: null, // No payment type for cancelled bookings generally
    order_id: null,
    isCancelled: true,
    date: new Date(b.created_at)
  }))

  // 3. Combine and sort by date descending
  return [...historyItems, ...cancelledItems].sort((a, b) => b.date - a.date)
})

function getPaymentStatusClass(status) {
  const classes = { 
    settlement: 'paid', 
    paid: 'paid',
    pending: 'unpaid', 
    expire: 'failed',
    expired: 'failed',
    cancelled: 'failed',
    deny: 'failed',
    failed: 'failed'
  }
  return classes[status] || 'unpaid'
}

function getPaymentStatusText(status) {
  const texts = { 
    settlement: 'Lunas', 
    paid: 'Lunas',
    pending: 'Belum Bayar', 
    expire: 'Kedaluwarsa',
    expired: 'Kedaluwarsa',
    cancelled: 'Dibatalkan',
    deny: 'Ditolak',
    failed: 'Gagal'
  }
  return texts[status] || 'Belum Bayar'
}

function getPaymentTypeText(type) {
  const types = { bank_transfer: 'Transfer Bank', e_wallet: 'E-Wallet', credit_card: 'Kartu Kredit', qris: 'QRIS' }
  return types[type] || type
}

function openCancelModal(booking) {
  selectedBooking.value = booking
  showCancelModal.value = true
}

function openDetailModal(booking) {
  selectedBooking.value = booking
  showDetailModal.value = true
}

async function handleCancel() {
  if (!selectedBooking.value) return
  cancelling.value = true
  await cancelBooking(selectedBooking.value.id)
  cancelling.value = false
  showCancelModal.value = false
  selectedBooking.value = null
}

const processingPayment = ref(null) // Track which booking is processing

// Resume payment - directly open Midtrans popup
async function resumePayment(booking) {
  processingPayment.value = booking.id
  
  try {
    // 1. Check if there's an existing transaction with snap_token
    console.log('Fetching existing transaction for booking:', booking.id)
    
    const { data: existingTx, error: txError } = await supabase
      .from('transactions')
      .select('id, snap_token, midtrans_order_id, payment_status')
      .eq('booking_id', booking.id)
      .in('payment_status', ['pending', 'created'])
      .order('created_at', { ascending: false })
      .limit(1)
    
    console.log('Existing transaction:', existingTx, 'Error:', txError)
    
    let snapToken = existingTx?.[0]?.snap_token
    
    // 2. If no existing transaction or no snap_token, create new payment with GoPay (for QRIS)
    if (!snapToken) {
      console.log('No snap_token found, creating new payment...')
      const result = await createPayment({
        lesPlaceId: booking.program?.les_place?.id || booking.les_place_id,
        studentId: authStore.user?.id,
        bookingId: booking.id,
        programId: booking.program?.id || booking.program_id,
        amount: (booking.program?.price || 0) + 5000, // price + service fee
        description: `Pembayaran ${booking.program?.name}`,
        customerDetails: {
          first_name: authStore.userProfile?.name || 'Student',
          email: authStore.user?.email,
          phone: authStore.userProfile?.phone || ''
        },
        preferredPayment: 'gopay' // Default to GoPay/QRIS for resume
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Gagal membuat pembayaran')
      }
      snapToken = result.snapToken
    }
    
    console.log('Using snap_token:', snapToken)
    
    // 3. Load Midtrans script and open popup
    await loadSnapScript()
    
    if (window.snap && snapToken) {
      window.snap.pay(snapToken, {
        onSuccess: async (result) => {
          console.log('Payment success:', result)
          await fetchBookings() // Refresh data
          processingPayment.value = null
        },
        onPending: async (result) => {
          console.log('Payment pending:', result)
          await fetchBookings()
          processingPayment.value = null
        },
        onError: async (result) => {
          console.error('Payment error:', result)
          
          // Check if expired - move to history
          if (result?.status_code === '407' || result?.transaction_status === 'expire') {
            const confirmCancel = confirm('Pembayaran telah expired. Batalkan booking ini? (akan masuk ke History Pembayaran)')
            if (confirmCancel) {
              await cancelBooking(booking.id, 'expired')
              await fetchBookings()
            }
          } else {
            alert('Pembayaran gagal. Silakan coba lagi.')
          }
          processingPayment.value = null
        },
        onClose: async () => {
          console.log('Payment popup closed')
          processingPayment.value = null
          // Refresh to get latest status
          await fetchBookings()
        }
      })
    }
  } catch (err) {
    console.error('Resume payment error:', err)
    
    // Check if error is due to expired transaction
    if (err.message?.includes('expired') || err.message?.includes('Expired')) {
      const confirmCancel = confirm('Pembayaran telah expired. Batalkan booking ini? (akan masuk ke History Pembayaran)')
      if (confirmCancel) {
        await cancelBooking(booking.id, 'expired')
        await fetchBookings()
      }
    } else {
      alert('Terjadi kesalahan: ' + err.message)
    }
    processingPayment.value = null
  }
}

function goToClass(booking) {
  router.push(`/student/myclass/${booking.id}`)
}

// Calculate payment deadline (24 hours from booking creation)
function getPaymentDeadline(createdAt) {
  if (!createdAt) return null
  const deadline = new Date(createdAt)
  deadline.setHours(deadline.getHours() + 24)
  return deadline
}

// Format time remaining
function getTimeRemaining(createdAt) {
  const deadline = getPaymentDeadline(createdAt)
  if (!deadline) return null
  
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  
  if (diff <= 0) return 'Kedaluwarsa'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours} jam ${minutes} menit lagi`
  }
  return `${minutes} menit lagi`
}

// Check if payment is expired
function isPaymentExpired(createdAt) {
  const deadline = getPaymentDeadline(createdAt)
  if (!deadline) return false
  return new Date() > deadline
}
</script>

<template>
  <div class="dashboard">
    <StudentSidebar />

    <main class="main">
      <header class="page-header">
        <div>
          <h1>Booking & Pembayaran</h1>
          <p>Kelola pendaftaran dan pembayaran les kamu</p>
        </div>
        <!-- View Toggle -->
        <div class="view-toggle">
          <button :class="{ active: activeView === 'bookings' }" @click="activeView = 'bookings'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Booking
          </button>
          <button :class="{ active: activeView === 'history' }" @click="activeView = 'history'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            History Pembayaran
          </button>
        </div>
      </header>

      <!-- BOOKING VIEW -->
      <template v-if="activeView === 'bookings'">
        <!-- Stats Cards -->
        <div class="stats-row">
          <button :class="['stat-card', { active: activeTab === 'all' }]" @click="activeTab = 'all'">
            <span class="stat-value">{{ stats.all }}</span>
            <span class="stat-label">Semua</span>
          </button>
          <button :class="['stat-card', { active: activeTab === 'active' }]" @click="activeTab = 'active'">
            <span class="stat-value">{{ stats.active }}</span>
            <span class="stat-label">Aktif</span>
          </button>
          <button :class="['stat-card', { active: activeTab === 'pending' }]" @click="activeTab = 'pending'">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">Menunggu</span>
          </button>
          <button :class="['stat-card', { active: activeTab === 'completed' }]" @click="activeTab = 'completed'">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">Selesai</span>
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>

        <!-- Booking List -->
        <div v-else-if="filteredBookings.length" class="booking-list">
          <div v-for="booking in filteredBookings" :key="booking.id" class="booking-card">
            <img :src="booking.program?.les_place?.photos?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200'" :alt="booking.program?.les_place?.name" class="booking-image">
            
            <div class="booking-content">
              <div class="booking-header">
                <div>
                  <span class="booking-subject">{{ booking.program?.subject || 'Program' }}</span>
                  <h3>{{ booking.program?.name }}</h3>
                  <p class="booking-place">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ booking.program?.les_place?.name }}
                  </p>
                </div>
                <span class="status-badge" :class="getStatusClass(booking.status)">
                  {{ getStatusText(booking.status) }}
                </span>
              </div>

              <div class="booking-details">
                <div class="detail-item">
                  <span class="detail-label">Program Dipilih</span>
                  <span class="detail-value program-name">{{ booking.program?.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tanggal Daftar</span>
                  <span class="detail-value">{{ formatDate(booking.created_at) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Biaya Program</span>
                  <span class="detail-value">{{ formatPrice(booking.program?.price) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Biaya Layanan</span>
                  <span class="detail-value">{{ formatPrice(5000) }}</span>
                </div>
                <div v-if="booking.hasDiscount" class="detail-item">
                  <span class="detail-label">Diskon Voucher</span>
                  <span class="detail-value discount">-{{ formatPrice((booking.program?.price || 0) + 5000 - booking.actualAmount) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Total Bayar</span>
                  <span class="detail-value price">
                    <span v-if="booking.hasDiscount" class="original-price">{{ formatPrice((booking.program?.price || 0) + 5000) }}</span>
                    {{ formatPrice(booking.actualAmount || (booking.program?.price || 0) + 5000) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status Pembayaran</span>
                  <span class="payment-badge" :class="getPaymentStatusClass(booking.payment_status)">
                    {{ getPaymentStatusText(booking.payment_status) }}
                  </span>
                </div>
              </div>
              
              <!-- Payment Deadline Warning - Show for unpaid bookings -->
              <div 
                v-if="booking.payment_status !== 'paid' && booking.payment_status !== 'settlement'" 
                class="deadline-warning"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Segera selesaikan pembayaran Anda</span>
              </div>

              <div class="booking-actions">
                <button v-if="booking.status === 'active'" class="btn-primary" @click="goToClass(booking)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Masuk Kelas
                </button>
              <!-- Always show payment button for unpaid bookings -->
                <button 
                  v-if="booking.payment_status !== 'paid' && booking.payment_status !== 'settlement'" 
                  class="btn-warning" 
                  :disabled="processingPayment === booking.id"
                  @click="resumePayment(booking)"
                >
                  <span v-if="processingPayment === booking.id" class="spinner"></span>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  {{ processingPayment === booking.id ? 'Memproses...' : 'Lanjutkan Pembayaran' }}
                </button>
                <button class="btn-ghost" @click="openDetailModal(booking)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  Detail
                </button>
                <button v-if="booking.status === 'pending'" class="btn-danger" @click="openCancelModal(booking)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <h3>Tidak ada booking</h3>
          <p>Belum ada pendaftaran dengan status ini</p>
          <router-link to="/search" class="btn btn-primary">Cari Tempat Les</router-link>
        </div>
      </template>

      <!-- HISTORY VIEW -->
      <template v-else>
        <!-- Summary -->
        <div class="history-summary">
          <div class="summary-card">
            <div class="summary-icon info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div>
              <h3>{{ paymentHistory.filter(p => p.transaction_status === 'settlement').length }}</h3>
              <p>Transaksi Berhasil</p>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <h3>{{ paymentHistory.filter(p => p.transaction_status === 'pending').length }}</h3>
              <p>Menunggu Pembayaran</p>
            </div>
          </div>
          <!-- Cancelled Summary -->
          <div class="summary-card">
            <div class="summary-icon failed">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div>
              <h3>{{ cancelledBookings.length }}</h3>
              <p>Dibatalkan</p>
            </div>
          </div>
        </div>

        <!-- Payment History List (Merged) -->
        <div class="history-section">
          <h2>Riwayat Transaksi</h2>
          <div class="history-list">
            <div v-for="item in allHistoryTransactions" :key="item.id || item.order_id" 
                 class="history-item" 
                 :class="{ cancelled: item.isCancelled }">
              
              <div class="history-icon" :class="[getPaymentStatusClass(item.transaction_status), { 'cancelled-icon': item.isCancelled }]">
                <svg v-if="item.transaction_status === 'settlement' || item.transaction_status === 'paid'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <svg v-else-if="item.transaction_status === 'pending'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              
              <div class="history-info">
                <h4>{{ item.program_name }}</h4>
                <p>{{ item.les_place_name }}</p>
                <div class="history-meta">
                  <span>{{ formatDate(item.created_at, { hour: '2-digit', minute: '2-digit' }) }}</span>
                  <span v-if="item.payment_type" class="divider">•</span>
                  <span v-if="item.payment_type">{{ getPaymentTypeText(item.payment_type) }}</span>
                  <span v-if="item.order_id" class="divider">•</span>
                  <span v-if="item.order_id" class="order-id">{{ item.order_id }}</span>
                </div>
              </div>
              
              <div class="history-amount">
                <span class="amount" :class="{ 'cancelled-amount': item.isCancelled }">{{ formatPrice(item.gross_amount) }}</span>
                <span class="status-badge-sm" :class="[getPaymentStatusClass(item.transaction_status), { 'failed': item.isCancelled }]">
                  {{ getPaymentStatusText(item.transaction_status) }}
                </span>
              </div>
            </div>
            
            <!-- Empty History State -->
            <div v-if="allHistoryTransactions.length === 0" class="empty-state">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
               <h3>Belum ada riwayat transaksi</h3>
               <p>Semua transaksi pembayaranmu akan muncul di sini</p>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- Cancel Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal">
        <h3>Batalkan Booking?</h3>
        <p>Apakah kamu yakin ingin membatalkan booking untuk <strong>{{ selectedBooking?.program?.name }}</strong>?</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showCancelModal = false">Tidak</button>
          <button class="btn-danger" :disabled="cancelling" @click="handleCancel">
            {{ cancelling ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h3>Detail Booking</h3>
          <button class="close-btn" @click="showDetailModal = false">×</button>
        </div>
        
        <div class="detail-content">
          <img :src="selectedBooking?.program?.les_place?.photos?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400'" class="detail-image" alt="Les Place">
          
          <div class="detail-section">
            <h4>Program</h4>
            <p class="detail-value highlight">{{ selectedBooking?.program?.name }}</p>
          </div>
          
          <div class="detail-section">
            <h4>Tempat Les</h4>
            <p class="detail-value">{{ selectedBooking?.program?.les_place?.name }}</p>
            <p class="detail-sub">{{ selectedBooking?.program?.les_place?.address }}</p>
          </div>
          
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Tanggal Daftar</h4>
              <p class="detail-value">{{ formatDate(selectedBooking?.created_at) }}</p>
            </div>
            <div class="detail-section">
              <h4>Status Booking</h4>
              <span class="status-badge" :class="getStatusClass(selectedBooking?.status)">
                {{ getStatusText(selectedBooking?.status) }}
              </span>
            </div>
          </div>
          
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Biaya Program</h4>
              <p class="detail-value price">{{ formatPrice(selectedBooking?.program?.price) }}</p>
            </div>
            <div class="detail-section">
              <h4>Status Pembayaran</h4>
              <span class="payment-badge" :class="getPaymentStatusClass(selectedBooking?.payment_status)">
                {{ getPaymentStatusText(selectedBooking?.payment_status) }}
              </span>
            </div>
          </div>
          
          <div v-if="selectedBooking?.program?.description" class="detail-section">
            <h4>Deskripsi Program</h4>
            <p class="detail-sub">{{ selectedBooking?.program?.description }}</p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-ghost" @click="showDetailModal = false">Tutup</button>
          <router-link 
            :to="`/les/${selectedBooking?.program?.les_place?.id}`" 
            class="btn-primary"
            @click="showDetailModal = false"
          >
            Lihat Tempat Les
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.main{flex:1;padding:24px}
.page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:16px}
.page-header h1{font-size:24px;font-weight:700;margin-bottom:4px}
.page-header p{color:var(--text-secondary);font-size:14px}

.view-toggle{display:flex;background:white;border-radius:12px;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.view-toggle button{display:flex;align-items:center;gap:8px;padding:10px 18px;border:none;background:transparent;border-radius:10px;font-size:14px;font-weight:500;color:var(--text-secondary);cursor:pointer;transition:all 0.2s}
.view-toggle button svg{width:18px;height:18px}
.view-toggle button.active{background:var(--secondary);color:white}
.view-toggle button:hover:not(.active){background:var(--background)}

.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.stat-card{padding:20px;background:white;border:2px solid transparent;border-radius:16px;text-align:center;cursor:pointer;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.stat-card:hover{border-color:var(--border)}
.stat-card.active{border-color:var(--secondary);background:rgba(10,69,104,0.05)}
.stat-value{display:block;font-size:24px;font-weight:700;color:var(--secondary)}
.stat-label{font-size:14px;color:var(--text-secondary)}

.loading-state{display:flex;justify-content:center;padding:60px}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.booking-list{display:flex;flex-direction:column;gap:20px}
.booking-card{display:flex;gap:20px;padding:20px;background:white;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.booking-image{width:140px;height:140px;border-radius:12px;object-fit:cover;flex-shrink:0}
.booking-content{flex:1;display:flex;flex-direction:column}

.booking-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.booking-subject{display:inline-block;font-size:11px;font-weight:600;color:var(--primary);background:rgba(10,69,104,0.1);padding:4px 10px;border-radius:20px;margin-bottom:6px}
.booking-header h3{font-size:18px;font-weight:600;margin-bottom:4px}
.booking-place{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--text-secondary)}
.booking-place svg{width:14px;height:14px}

.status-badge{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600}
.status-badge.success{background:rgba(34,197,94,0.1);color:#22c55e}
.status-badge.warning{background:rgba(245,158,11,0.1);color:#f59e0b}
.status-badge.info{background:rgba(59,130,246,0.1);color:#3b82f6}
.status-badge.error{background:rgba(239,68,68,0.1);color:#ef4444}

.booking-details{display:flex;gap:32px;padding:16px 0;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);margin-bottom:16px}
.detail-item{display:flex;flex-direction:column;gap:4px}
.detail-label{font-size:12px;color:var(--text-muted)}
.detail-value{font-size:14px;font-weight:500}
.detail-value.price{color:var(--secondary);font-weight:700}
.detail-value.discount{color:#22c55e;font-weight:600}
.detail-value.program-name{color:var(--primary);font-weight:600}
.original-price{text-decoration:line-through;color:var(--text-muted);font-size:12px;font-weight:400;margin-right:6px}
.payment-badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
.payment-badge.paid{background:rgba(34,197,94,0.1);color:#22c55e}
.payment-badge.unpaid{background:rgba(245,158,11,0.1);color:#f59e0b}
.payment-badge.failed{background:rgba(239,68,68,0.1);color:#ef4444}

.booking-actions{display:flex;gap:10px;flex-wrap:wrap}
.btn-primary,.btn-warning,.btn-ghost,.btn-danger{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;border:none;cursor:pointer;text-decoration:none;transition:all 0.2s}
.btn-primary{background:var(--secondary);color:white}
.btn-primary:hover{background:var(--primary)}
.btn-warning{background:#f59e0b;color:white}
.btn-warning:hover{opacity:0.9}
.btn-ghost{background:var(--background);color:var(--text)}
.btn-ghost:hover{background:var(--border)}
.btn-danger{background:transparent;color:#ef4444;border:1px solid #ef4444}
.btn-danger:hover{background:#ef4444;color:white}
.btn-primary svg,.btn-warning svg,.btn-ghost svg,.btn-danger svg{width:16px;height:16px}
.btn-warning:disabled{opacity:0.7;cursor:not-allowed}
.spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Deadline & Expired Warnings */
.deadline-warning{display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:10px;margin-bottom:16px;color:#b45309;font-size:13px}
.deadline-warning svg{width:18px;height:18px;flex-shrink:0}
.deadline-warning strong{color:#92400e}
.expired-warning{display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:10px;margin-bottom:16px;color:#dc2626;font-size:13px}
.expired-warning svg{width:18px;height:18px;flex-shrink:0}

/* HISTORY STYLES */
.history-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.summary-card{display:flex;align-items:center;gap:16px;padding:20px;background:white;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.summary-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.summary-icon svg{width:24px;height:24px}
.summary-icon.success{background:rgba(34,197,94,0.1);color:#22c55e}
.summary-icon.info{background:rgba(59,130,246,0.1);color:#3b82f6}
.summary-icon.warning{background:rgba(245,158,11,0.1);color:#f59e0b}
.summary-card h3{font-size:20px;font-weight:700}
.summary-card p{font-size:13px;color:var(--text-secondary)}

.history-section{background:white;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.history-section h2{font-size:18px;font-weight:600;margin-bottom:20px}
.history-list{display:flex;flex-direction:column;gap:12px}
.history-item{display:flex;align-items:center;gap:16px;padding:16px;background:var(--background);border-radius:12px}
.history-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.history-icon svg{width:20px;height:20px}
.history-icon.paid{background:rgba(34,197,94,0.1);color:#22c55e}
.history-icon.unpaid{background:rgba(245,158,11,0.1);color:#f59e0b}
.history-icon.failed{background:rgba(239,68,68,0.1);color:#ef4444}
.history-info{flex:1;min-width:0}
.history-info h4{font-size:14px;font-weight:600;margin-bottom:2px}
.history-info p{font-size:13px;color:var(--text-secondary);margin-bottom:4px}
.history-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted)}
.history-meta .divider{color:var(--border)}
.history-meta .order-id{font-family:monospace;font-size:11px}
.history-amount{text-align:right}
.history-amount .amount{display:block;font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px}
.status-badge-sm{display:inline-block;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600}
.status-badge-sm.paid{background:rgba(34,197,94,0.1);color:#22c55e}
.status-badge-sm.unpaid{background:rgba(245,158,11,0.1);color:#f59e0b}
.status-badge-sm.failed{background:rgba(239,68,68,0.1);color:#ef4444}

/* Cancelled Section Styles */
.cancelled-section{margin-top:24px;border:1px solid rgba(239,68,68,0.2)}
.cancelled-section h2{color:#dc2626}
.history-item.cancelled{background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.1)}
.cancelled-icon{background:rgba(239,68,68,0.1)!important;color:#ef4444!important}
.cancelled-amount{color:#dc2626!important;text-decoration:line-through}

.empty-state{text-align:center;padding:60px 20px;background:white;border-radius:16px}
.empty-state svg{width:64px;height:64px;color:var(--text-muted);margin-bottom:16px}
.empty-state h3{font-size:18px;margin-bottom:8px}
.empty-state p{color:var(--text-secondary);margin-bottom:20px}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal{background:white;border-radius:16px;padding:24px;max-width:400px;width:90%}
.modal h3{font-size:18px;font-weight:600;margin-bottom:12px}
.modal p{font-size:14px;color:var(--text-secondary);margin-bottom:20px}
.modal-actions{display:flex;gap:12px;justify-content:flex-end}

/* Detail Modal */
.detail-modal{max-width:500px;padding:0;overflow:hidden}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid var(--border-light)}
.modal-header h3{margin:0}
.close-btn{background:none;border:none;font-size:28px;color:var(--text-muted);cursor:pointer;line-height:1}
.close-btn:hover{color:var(--text)}
.detail-content{padding:24px;max-height:60vh;overflow-y:auto}
.detail-image{width:100%;height:160px;object-fit:cover;border-radius:12px;margin-bottom:20px}
.detail-section{margin-bottom:16px}
.detail-section h4{font-size:12px;color:var(--text-muted);font-weight:500;margin-bottom:6px;text-transform:uppercase}
.detail-section .detail-value{font-size:15px;font-weight:600;color:var(--text)}
.detail-section .detail-value.highlight{color:var(--primary);font-size:18px}
.detail-section .detail-value.price{color:var(--secondary);font-size:20px;font-weight:700}
.detail-section .detail-sub{font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.5}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.modal-footer{display:flex;gap:12px;justify-content:flex-end;padding:16px 24px;border-top:1px solid var(--border-light);background:var(--background)}

@media(max-width:1024px){.stats-row{grid-template-columns:repeat(2,1fr)}.history-summary{grid-template-columns:1fr}}
@media(max-width:768px){.booking-card{flex-direction:column}.booking-image{width:100%;height:160px}.booking-details{flex-wrap:wrap}.page-header{flex-direction:column}}
</style>
