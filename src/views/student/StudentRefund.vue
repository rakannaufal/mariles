<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { requestRefund } from '@/services/paymentService'
import { daysUntil, isWithinRefundWindow } from '@/services/balanceService'
import StatCard from '@/components/StatCard.vue'

const authStore = useAuthStore()

// State
const loading = ref(true)
const eligibleTransactions = ref([])
const ineligibleTransactions = ref([])
const refundHistory = ref([])
const activeTab = ref('request')

// Modal state
const showRefundModal = ref(false)
const selectedTransaction = ref(null)
const refundReason = ref('')
const submitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref('')
const currentStep = ref(1)

// Get student ID from students table (same as useStudentData.js)
async function getStudentId() {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', authStore.user?.id)
    .single()
  return data?.id
}

// Fetch eligible transactions for refund (via bookings, same approach as useStudentData.js)
async function fetchTransactions() {
  try {
    loading.value = true
    
    const userId = authStore.user?.id
    if (!userId) {
      console.log('No user logged in')
      eligibleTransactions.value = []
      return
    }
    
    // Get student ID from students table (bookings use this ID)
    const studentId = await getStudentId()
    if (!studentId) {
      console.log('No student found for user')
      eligibleTransactions.value = []
      return
    }
    
    // Query bookings with paid status (same approach as useStudentData.js)
    const { data: bookingsData, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        payment_status,
        created_at,
        program_id,
        programs (
          id,
          name,
          price,
          les_places (
            id,
            name,
            photos
          )
        ),
        transactions (
          id,
          amount,
          payment_status,
          created_at
        )
      `)
      .eq('student_id', studentId)
      .in('payment_status', ['paid', 'settlement', 'completed'])
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Transform bookings to transaction-like format for refund
    const paidBookings = bookingsData?.map(b => {
      const latestTx = b.transactions?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))?.[0]
      // Calculate refund deadline (90 days from payment)
      const paymentDate = new Date(b.created_at)
      const refundDeadline = new Date(paymentDate.getTime() + 90 * 24 * 60 * 60 * 1000)
      const daysRemaining = daysUntil(refundDeadline.toISOString())
      
      return {
        id: latestTx?.id || b.id,
        booking_id: b.id,
        program_id: b.program_id,
        amount: latestTx?.amount || b.programs?.price || 0,
        payment_status: latestTx?.payment_status || b.payment_status,
        created_at: b.created_at,
        programs: b.programs,
        refund_deadline: refundDeadline.toISOString(),
        days_remaining: daysRemaining,
        is_expired: daysRemaining <= 0
      }
    }) || []

    // Get refunds that are pending or approved (already requested)
    const { data: refundsData } = await supabase
      .from('refunds')
      .select('transaction_id')
      .eq('student_id', userId) // refunds table might use user_id
      .in('status', ['pending', 'approved'])

    const refundedTxnIds = new Set(refundsData?.map(r => r.transaction_id) || [])
    
    // Filter out already refunded
    const completedTxns = paidBookings.filter(t => !refundedTxnIds.has(t.id))
    
    // Check progress for each program
    const programIds = completedTxns.map(t => t.program_id).filter(Boolean)
    const bookingIds = completedTxns.map(t => t.booking_id).filter(Boolean)
    
    if (programIds.length > 0 || bookingIds.length > 0) {
      // Collect program IDs that have ANY progress
      const programsWithProgress = new Set()
      
      // 1. Check material progress (modules: is_completed OR is_read, videos: watch_percentage > 0)
      const { data: materialProgress } = await supabase
        .from('material_progress')
        .select('material_id, is_completed, progress_percent, materials(program_id)')
        .eq('student_id', userId)
        .or('is_completed.eq.true,progress_percent.gt.0')
      
      materialProgress?.forEach(p => {
        if (p.materials?.program_id) {
          programsWithProgress.add(p.materials.program_id)
        }
      })
      
      // 2. Check quiz attempts (ANY attempt means progress)
      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, quizzes(program_id)')
        .eq('student_id', userId)
      
      quizAttempts?.forEach(a => {
        if (a.quizzes?.program_id) {
          programsWithProgress.add(a.quizzes.program_id)
        }
      })
      
      // 3. Check exercise submissions (ANY submission means progress)
      const { data: exerciseSubs } = await supabase
        .from('exercise_submissions')
        .select('material_id, course_materials(program_id)')
        .eq('student_id', userId)
      
      exerciseSubs?.forEach(s => {
        if (s.course_materials?.program_id) {
          programsWithProgress.add(s.course_materials.program_id)
        }
      })
      
      // 4. Check attendance (ANY attendance record means they attended class)
      if (bookingIds.length > 0) {
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('booking_id, status')
          .in('booking_id', bookingIds)
          .in('status', ['present', 'late']) // hadir atau telat = ada progress
        
        // Map booking_id to program_id for attendance
        const bookingToProgram = {}
        completedTxns.forEach(t => {
          if (t.booking_id && t.program_id) {
            bookingToProgram[t.booking_id] = t.program_id
          }
        })
        
        attendanceData?.forEach(a => {
          const programId = bookingToProgram[a.booking_id]
          if (programId) {
            programsWithProgress.add(programId)
          }
        })
      }
      
      // Separate eligible and ineligible
      eligibleTransactions.value = completedTxns.filter(t => !programsWithProgress.has(t.program_id))
      ineligibleTransactions.value = completedTxns.filter(t => programsWithProgress.has(t.program_id))
    } else {
      eligibleTransactions.value = completedTxns
      ineligibleTransactions.value = []
    }

  } catch (err) {
    console.error('Error fetching transactions:', err)
  } finally {
    loading.value = false
  }
}

async function fetchRefundHistory() {
  try {
    const userId = authStore.user?.id
    if (!userId) return
    
    const { data, error } = await supabase
      .from('refunds')
      .select(`
        id,
        amount,
        reason,
        status,
        admin_note,
        created_at,
        processed_at,
        transactions (
          description,
          programs (
            name,
            les_places (name)
          )
        )
      `)
      .eq('student_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    refundHistory.value = data || []
  } catch (err) {
    console.error('Error fetching refund history:', err)
  }
}

function openRefundModal(transaction) {
  selectedTransaction.value = transaction
  refundReason.value = ''
  submitSuccess.value = false
  submitError.value = ''
  currentStep.value = 1
  showRefundModal.value = true
}

function nextStep() {
  if (currentStep.value === 1) currentStep.value = 2
}

function prevStep() {
  if (currentStep.value === 2) currentStep.value = 1
}

async function submitRefund() {
  if (!selectedTransaction.value || !refundReason.value.trim()) {
    submitError.value = 'Mohon isi alasan refund'
    return
  }

  submitting.value = true
  submitError.value = ''

  try {
    const userId = authStore.user?.id
    if (!userId) {
      submitError.value = 'User tidak ditemukan'
      return
    }
    
    const result = await requestRefund({
      transactionId: selectedTransaction.value.id,
      studentId: userId,
      reason: refundReason.value.trim()
    })

    if (result.success) {
      submitSuccess.value = true
      currentStep.value = 3
      eligibleTransactions.value = eligibleTransactions.value.filter(t => t.id !== selectedTransaction.value.id)
      await fetchRefundHistory()
    } else {
      submitError.value = result.error || 'Gagal mengajukan refund'
    }
  } catch (err) {
    submitError.value = err.message || 'Terjadi kesalahan'
  } finally {
    submitting.value = false
  }
}

function closeModal() {
  showRefundModal.value = false
  currentStep.value = 1
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID').format(amount || 0)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function getStatusClass(status) {
  return { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' }[status] || ''
}

function getStatusLabel(status) {
  return { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }[status] || status
}

function getStatusIcon(status) {
  return { pending: '⏳', approved: '✅', rejected: '❌' }[status] || '📋'
}

function getPhoto(photos) {
  return photos?.[0] || null
}

const hasEligibleTransactions = computed(() => eligibleTransactions.value.length > 0)
const hasHistory = computed(() => refundHistory.value.length > 0)
const canSubmit = computed(() => refundReason.value.trim().length >= 20)

const pendingCount = computed(() => refundHistory.value.filter(r => r.status === 'pending').length)
const approvedCount = computed(() => refundHistory.value.filter(r => r.status === 'approved').length)

onMounted(() => {
  fetchTransactions()
  fetchRefundHistory()
})
</script>

<template>
  <div class="dashboard">
    <main class="main">
      <header class="page-header">
        <div>
          <h1>Pusat Refund</h1>
          <p>Kelola pengembalian dana untuk transaksi Anda</p>
        </div>
        <!-- View Toggle -->
        <div class="view-toggle">
          <button :class="{ active: activeTab === 'request' }" @click="activeTab = 'request'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            Ajukan Refund
            <span v-if="eligibleTransactions.filter(t => !t.is_expired).length" class="tab-badge">{{ eligibleTransactions.filter(t => !t.is_expired).length }}</span>
          </button>
          <button :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Riwayat
            <span v-if="refundHistory.length" class="tab-badge secondary">{{ refundHistory.length }}</span>
          </button>
        </div>
      </header>

      <!-- Stats Cards -->
      <!-- Stats Cards -->
      <div class="stats-row">
        <StatCard 
            label="Menunggu" 
            :value="pendingCount" 
            icon-color="orange"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </template>
        </StatCard>

        <StatCard 
            label="Disetujui" 
            :value="approvedCount" 
            icon-color="green"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </template>
        </StatCard>

        <StatCard 
            label="Bisa Refund" 
            :value="eligibleTransactions.filter(t => !t.is_expired).length" 
            icon-color="blue"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </template>
        </StatCard>

        <StatCard 
            label="Tidak Bisa" 
            :value="ineligibleTransactions.length" 
            icon-color="red"
        >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </template>
        </StatCard>
      </div>

      <!-- REQUEST TAB -->
      <template v-if="activeTab === 'request'">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="!hasEligibleTransactions && ineligibleTransactions.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h3>Tidak ada transaksi</h3>
          <p>Tidak ada transaksi yang bisa diajukan refund</p>
        </div>

        <template v-else>
          <!-- Bisa Direfund -->
          <div v-if="eligibleTransactions.filter(t => !t.is_expired).length > 0" class="refund-section">
            <div class="section-header success">
              <span class="section-icon">✓</span>
              <div>
                <h3>Bisa Direfund</h3>
                <p>Transaksi tanpa progress belajar</p>
              </div>
            </div>
            <div class="booking-list">
              <div v-for="txn in eligibleTransactions.filter(t => !t.is_expired)" :key="txn.id" class="booking-card">
                <img :src="getPhoto(txn.programs?.les_places?.photos) || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200'" :alt="txn.programs?.name" class="booking-image">
                <div class="booking-content">
                  <div class="booking-header">
                    <div>
                      <h3>{{ txn.programs?.name || 'Program' }}</h3>
                      <p class="booking-place">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {{ txn.programs?.les_places?.name || 'Tempat Les' }}
                      </p>
                    </div>
                    <span class="countdown-badge" :class="{ urgent: txn.days_remaining <= 7 }">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {{ txn.days_remaining }} hari
                    </span>
                  </div>
                  <div class="booking-details">
                    <div class="detail-item">
                      <span class="detail-label">Jumlah</span>
                      <span class="detail-value price">Rp {{ formatCurrency(txn.amount) }}</span>
                    </div>
                  </div>
                  <div class="booking-actions">
                    <button class="btn-primary" @click="openRefundModal(txn)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                      Ajukan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tidak Bisa Direfund -->
          <div v-if="ineligibleTransactions.length > 0" class="refund-section">
            <div class="section-header error">
              <span class="section-icon">✕</span>
              <div>
                <h3>Tidak Bisa Direfund</h3>
                <p>Sudah ada progress belajar</p>
              </div>
            </div>
            <div class="booking-list">
              <div v-for="txn in ineligibleTransactions" :key="txn.id" class="booking-card disabled">
                <img :src="getPhoto(txn.programs?.les_places?.photos) || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200'" :alt="txn.programs?.name" class="booking-image">
                <div class="booking-content">
                  <div class="booking-header">
                    <div>
                      <h3>{{ txn.programs?.name || 'Program' }}</h3>
                      <p class="booking-place">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {{ txn.programs?.les_places?.name || 'Tempat Les' }}
                      </p>
                    </div>
                    <span class="status-badge error">Ada Progress</span>
                  </div>
                  <div class="booking-details">
                    <div class="detail-item">
                      <span class="detail-label">Jumlah</span>
                      <span class="detail-value price">Rp {{ formatCurrency(txn.amount) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Expired -->
          <div v-if="eligibleTransactions.filter(t => t.is_expired).length > 0" class="refund-section">
            <div class="section-header warning">
              <span class="section-icon">⏰</span>
              <div>
                <h3>Window Habis</h3>
                <p>Lebih dari 90 hari sejak pembayaran</p>
              </div>
            </div>
            <div class="booking-list">
              <div v-for="txn in eligibleTransactions.filter(t => t.is_expired)" :key="txn.id" class="booking-card disabled">
                <img :src="getPhoto(txn.programs?.les_places?.photos) || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200'" :alt="txn.programs?.name" class="booking-image">
                <div class="booking-content">
                  <div class="booking-header">
                    <div>
                      <h3>{{ txn.programs?.name || 'Program' }}</h3>
                      <p class="booking-place">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {{ txn.programs?.les_places?.name || 'Tempat Les' }}
                      </p>
                    </div>
                    <span class="status-badge">Expired</span>
                  </div>
                  <div class="booking-details">
                    <div class="detail-item">
                      <span class="detail-label">Jumlah</span>
                      <span class="detail-value price">Rp {{ formatCurrency(txn.amount) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- HISTORY TAB -->
      <template v-if="activeTab === 'history'">
        <div v-if="!hasHistory" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <h3>Belum ada riwayat</h3>
          <p>Anda belum pernah mengajukan refund</p>
        </div>

        <div v-else class="history-section">
          <h2>Riwayat Pengajuan</h2>
          <div class="history-list">
            <div v-for="refund in refundHistory" :key="refund.id" class="history-item">
              <div class="history-icon" :class="getStatusClass(refund.status)">
                {{ getStatusIcon(refund.status) }}
              </div>
              <div class="history-info">
                <h4>{{ refund.transactions?.programs?.name || 'Transaksi' }}</h4>
                <p>{{ refund.transactions?.programs?.les_places?.name }}</p>
                <div class="history-meta">
                  <span>Rp {{ formatCurrency(refund.amount) }}</span>
                  <span class="divider">•</span>
                  <span>{{ formatDate(refund.created_at) }}</span>
                </div>
                <p class="history-reason"><strong>Alasan:</strong> {{ refund.reason }}</p>
                <div v-if="refund.admin_note" class="admin-note" :class="refund.status">
                  <strong>Admin:</strong> {{ refund.admin_note }}
                </div>
              </div>
              <div class="history-amount">
                <span class="status-badge-sm" :class="getStatusClass(refund.status)">
                  {{ getStatusLabel(refund.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showRefundModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <!-- Progress -->
          <div class="modal-progress">
            <div class="progress-step" :class="{ active: currentStep >= 1, done: currentStep > 1 }">
              <div class="step-circle">{{ currentStep > 1 ? '✓' : '1' }}</div>
              <span>Konfirmasi</span>
            </div>
            <div class="progress-line" :class="{ active: currentStep >= 2 }"></div>
            <div class="progress-step" :class="{ active: currentStep >= 2, done: currentStep > 2 }">
              <div class="step-circle">{{ currentStep > 2 ? '✓' : '2' }}</div>
              <span>Alasan</span>
            </div>
            <div class="progress-line" :class="{ active: currentStep >= 3 }"></div>
            <div class="progress-step" :class="{ active: currentStep >= 3 }">
              <div class="step-circle">3</div>
              <span>Selesai</span>
            </div>
          </div>

          <!-- Step 1 -->
          <div v-if="currentStep === 1" class="modal-content">
            <h2>Konfirmasi Refund</h2>
            <p class="modal-subtitle">Pastikan transaksi yang dipilih sudah benar</p>

            <div class="refund-preview">
              <img 
                :src="getPhoto(selectedTransaction?.programs?.les_places?.photos) || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=100'" 
                :alt="selectedTransaction?.programs?.name"
              >
              <div>
                <h4>{{ selectedTransaction?.programs?.name }}</h4>
                <p>{{ selectedTransaction?.programs?.les_places?.name }}</p>
                <span class="preview-amount">Rp {{ formatCurrency(selectedTransaction?.amount) }}</span>
              </div>
            </div>

            <div class="info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <p>Proses review membutuhkan 1-3 hari kerja</p>
            </div>

            <div class="modal-actions">
              <button class="btn-cancel" @click="closeModal">Batal</button>
              <button class="btn-primary" @click="nextStep">Lanjutkan</button>
            </div>
          </div>

          <!-- Step 2 -->
          <div v-if="currentStep === 2" class="modal-content">
            <h2>Alasan Refund</h2>
            <p class="modal-subtitle">Jelaskan mengapa Anda ingin refund</p>

            <div class="form-group">
              <label>Alasan Refund <span class="required">*</span></label>
              <textarea 
                v-model="refundReason"
                rows="4"
                placeholder="Jelaskan alasan refund Anda (min. 20 karakter)..."
                :disabled="submitting"
              ></textarea>
              <span class="char-count" :class="{ valid: refundReason.length >= 20 }">
                {{ refundReason.length }}/20
              </span>
            </div>

            <div v-if="submitError" class="error-alert">{{ submitError }}</div>

            <div class="modal-actions">
              <button class="btn-back" @click="prevStep" :disabled="submitting">Kembali</button>
              <button 
                class="btn-primary" 
                @click="submitRefund"
                :disabled="!canSubmit || submitting"
              >
                <span v-if="submitting" class="spinner"></span>
                {{ submitting ? 'Mengirim...' : 'Kirim' }}
              </button>
            </div>
          </div>

          <!-- Step 3 -->
          <div v-if="currentStep === 3" class="modal-content success">
            <div class="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Pengajuan Berhasil!</h2>
            <p>Permintaan refund Anda sedang diproses. Kami akan memberitahu Anda setelah admin meresponnya.</p>
            <button class="btn-primary" @click="closeModal">Selesai</button>
          </div>

          <button v-if="currentStep !== 3" class="modal-close" @click="closeModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </Teleport>
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
.tab-badge{background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:20px;font-size:12px;font-weight:600}
.tab-badge.secondary{background:var(--border-light);color:var(--text-muted)}


.stats-row { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 24px; 
  margin-bottom: 24px; 
  width: 100%;
}

/* StatCard styling handled by component */

.loading-state{display:flex;justify-content:center;padding:60px}
.loading-spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.empty-state{text-align:center;padding:60px 20px;background:white;border-radius:16px}
.empty-state svg{width:64px;height:64px;color:var(--text-muted);margin-bottom:16px}
.empty-state h3{font-size:18px;margin-bottom:8px}
.empty-state p{color:var(--text-secondary);margin-bottom:20px}

.refund-section{margin-bottom:24px}
.section-header{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:12px;margin-bottom:16px}
.section-header.success{background:rgba(34,197,94,0.1);border-left:4px solid #22c55e}
.section-header.error{background:rgba(239,68,68,0.1);border-left:4px solid #ef4444}
.section-header.warning{background:rgba(245,158,11,0.1);border-left:4px solid #f59e0b}
.section-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;background:white;border-radius:8px}
.section-header h3{font-size:15px;font-weight:600;color:var(--text);margin-bottom:2px}
.section-header p{font-size:12px;color:var(--text-secondary);margin:0}

.booking-list{display:flex;flex-direction:column;gap:20px}
.booking-card{display:flex;gap:20px;padding:20px;background:white;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.booking-card.disabled{opacity:0.7}
.booking-image{width:140px;height:140px;border-radius:12px;object-fit:cover;flex-shrink:0}
.booking-content{flex:1;display:flex;flex-direction:column}
.booking-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.booking-header h3{font-size:18px;font-weight:600;margin-bottom:4px}
.booking-place{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--text-secondary)}
.booking-place svg{width:14px;height:14px}

.booking-details{display:flex;gap:32px;padding:16px 0;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);margin-bottom:16px}
.detail-item{display:flex;flex-direction:column;gap:4px}
.detail-label{font-size:12px;color:var(--text-muted)}
.detail-value{font-size:14px;font-weight:500}
.detail-value.price{color:var(--secondary);font-weight:700}

.booking-actions{display:flex;gap:10px;flex-wrap:wrap}
.btn-primary{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;border:none;cursor:pointer;text-decoration:none;transition:all 0.2s;background:var(--secondary);color:white}
.btn-primary:hover{background:var(--primary)}
.btn-primary svg{width:16px;height:16px}
.btn-ghost{background:var(--background);color:var(--text)}
.btn-ghost:hover{background:var(--border)}

.status-badge{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;background:rgba(107,114,128,0.1);color:#6b7280}
.status-badge.success{background:rgba(34,197,94,0.1);color:#22c55e}
.status-badge.error{background:rgba(239,68,68,0.1);color:#ef4444}
.status-badge.warning{background:rgba(245,158,11,0.1);color:#f59e0b}

.countdown-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(59,130,246,0.1);color:#3b82f6;border-radius:20px;font-size:12px;font-weight:500}
.countdown-badge svg{width:14px;height:14px}
.countdown-badge.urgent{background:rgba(239,68,68,0.1);color:#ef4444;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}

.history-section{background:white;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.history-section h2{font-size:18px;font-weight:600;margin-bottom:20px}
.history-list{display:flex;flex-direction:column;gap:12px}
.history-item{display:flex;align-items:flex-start;gap:16px;padding:16px;background:var(--background);border-radius:12px}
.history-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;background:rgba(107,114,128,0.1)}
.history-icon.success,.history-icon.approved{background:rgba(34,197,94,0.1);color:#22c55e}
.history-icon.warning,.history-icon.pending{background:rgba(245,158,11,0.1);color:#f59e0b}
.history-icon.error,.history-icon.rejected{background:rgba(239,68,68,0.1);color:#ef4444}
.history-info{flex:1;min-width:0}
.history-info h4{font-size:14px;font-weight:600;margin-bottom:2px}
.history-info p{font-size:13px;color:var(--text-secondary);margin-bottom:4px}
.history-meta{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);margin-bottom:8px}
.history-meta .divider{color:var(--border)}
.history-reason{font-size:13px;color:var(--text-secondary);line-height:1.5}
.history-amount{text-align:right}
.status-badge-sm{display:inline-block;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600}
.status-badge-sm.success,.status-badge-sm.approved{background:rgba(34,197,94,0.1);color:#22c55e}
.status-badge-sm.warning,.status-badge-sm.pending{background:rgba(245,158,11,0.1);color:#f59e0b}
.status-badge-sm.error,.status-badge-sm.rejected{background:rgba(239,68,68,0.1);color:#ef4444}
.admin-note{margin-top:8px;padding:10px;border-radius:8px;font-size:13px}
.admin-note.approved{background:rgba(34,197,94,0.1);color:#166534}
.admin-note.rejected{background:rgba(239,68,68,0.1);color:#991b1b}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.modal{background:white;border-radius:16px;padding:0;max-width:480px;width:90%;position:relative;overflow:hidden}
.modal-close{position:absolute;top:12px;right:12px;background:var(--background);border:none;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);z-index:10}
.modal-close:hover{background:var(--border-light);color:var(--text)}
.modal-close svg{width:16px;height:16px}
.modal-progress{display:flex;align-items:center;justify-content:center;padding:20px;background:var(--background);border-bottom:1px solid var(--border-light)}
.progress-step{display:flex;flex-direction:column;align-items:center;gap:6px}
.step-circle{width:28px;height:28px;border-radius:50%;background:var(--border-light);color:var(--text-muted);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px}
.progress-step.active .step-circle{background:var(--primary);color:white}
.progress-step.done .step-circle{background:#22c55e;color:white}
.progress-step span{font-size:11px;color:var(--text-muted)}
.progress-step.active span{color:var(--primary);font-weight:500}
.progress-line{width:48px;height:2px;background:var(--border-light);margin:0 8px 20px}
.progress-line.active{background:var(--primary)}
.modal-content{padding:24px}
.modal-content h2{font-size:18px;font-weight:700;text-align:center;margin-bottom:8px}
.modal-subtitle{text-align:center;font-size:14px;color:var(--text-muted);margin-bottom:20px}
.refund-preview{display:flex;gap:14px;padding:16px;background:var(--background);border-radius:12px;margin-bottom:16px}
.refund-preview img{width:64px;height:64px;border-radius:10px;object-fit:cover}
.refund-preview h4{font-size:14px;font-weight:600;margin-bottom:2px}
.refund-preview p{font-size:12px;color:var(--text-secondary);margin-bottom:6px}
.preview-amount{font-size:16px;font-weight:700;color:var(--primary)}
.info-box{display:flex;align-items:center;gap:10px;padding:12px;background:rgba(59,130,246,0.1);border-radius:10px;margin-bottom:20px}
.info-box svg{width:20px;height:20px;color:#3b82f6;flex-shrink:0}
.info-box p{font-size:13px;color:#3b82f6;margin:0}
.form-group{margin-bottom:16px}
.form-group label{display:block;font-size:14px;font-weight:600;margin-bottom:8px}
.required{color:#ef4444}
.form-group textarea{width:100%;padding:12px;border:2px solid var(--border);border-radius:10px;font-size:14px;resize:vertical;font-family:inherit}
.form-group textarea:focus{outline:none;border-color:var(--primary)}
.char-count{display:block;text-align:right;font-size:12px;color:var(--text-muted);margin-top:6px}
.char-count.valid{color:#22c55e}
.error-alert{padding:12px;background:rgba(239,68,68,0.1);color:#dc2626;border-radius:10px;font-size:13px;margin-bottom:16px}
.modal-actions{display:flex;gap:12px;justify-content:flex-end}
.btn-cancel,.btn-back{padding:10px 18px;background:white;border:1px solid var(--border);border-radius:10px;font-size:14px;font-weight:500;color:var(--text-secondary);cursor:pointer}
.btn-cancel:hover,.btn-back:hover{background:var(--background)}
.btn-primary:disabled{background:var(--text-muted);cursor:not-allowed}
.spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.8s linear infinite}
.modal-content.success{text-align:center;padding:40px 24px}
.success-icon{width:80px;height:80px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;animation:pop 0.4s ease-out}
.success-icon svg{width:40px;height:40px;color:white}
@keyframes pop{0%{transform:scale(0)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
.modal-content.success h2{margin-bottom:8px}
.modal-content.success p{font-size:14px;color:var(--text-muted);margin-bottom:24px;line-height:1.5}

@media(max-width:1024px){.stats-row{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.stats-row{grid-template-columns:1fr}}
@media(max-width:768px){.booking-card{flex-direction:column}.booking-image{width:100%;height:160px}.booking-details{flex-wrap:wrap}.page-header{flex-direction:column}.view-toggle{width:100%}.view-toggle button{flex:1;justify-content:center}}
</style>
