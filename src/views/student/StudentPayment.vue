<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import { createPayment } from '@/services/paymentService'
import { supabase } from '@/lib/supabase'
import { loadSnapScript } from '@/lib/midtrans'
import { getLevelLabel, getLevelColor, getTypeLabel, getTypeColor, getTypeBgColor } from '@/utils/badgeUtils'

// Import logos
import qrisLogo from '@/assets/payment-logos/qris.png'
import gopayLogo from '@/assets/payment-logos/gopay.png'
import shopeepayLogo from '@/assets/payment-logos/shopeepay.png'
import bcaLogo from '@/assets/payment-logos/bca.png'
import bniLogo from '@/assets/payment-logos/bni.png'
import briLogo from '@/assets/payment-logos/bri.png'
import mandiriLogo from '@/assets/payment-logos/mandiri.png'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const SERVICE_FEE = 5000
const isDev = import.meta.env.DEV

// States
const loading = ref(true)
const processing = ref(false)
const booking = ref(null)
const program = ref(null)
const lesPlace = ref(null)
const paymentResult = ref(null)
const errorMessage = ref('')
const selectedPaymentMethod = ref('qris')

// Voucher states
const voucherCode = ref('')
const voucherApplied = ref(null)
const voucherError = ref('')
const applyingVoucher = ref(false)

// Steps: 'checkout' | 'success' | 'pending' | 'error'
const currentStep = ref('checkout')



// Payment methods with local logos
const paymentMethods = [
  { id: 'qris', name: 'QRIS', desc: 'Scan QR dari aplikasi apapun', logo: qrisLogo, type: 'qris' },
  { id: 'gopay', name: 'GoPay', desc: 'Bayar dengan GoPay', logo: gopayLogo, type: 'ewallet' },
  { id: 'shopeepay', name: 'ShopeePay', desc: 'Bayar dengan ShopeePay', logo: shopeepayLogo, type: 'ewallet' },
  { id: 'bca_va', name: 'BCA Virtual Account', desc: 'Transfer via ATM/Mobile Banking', logo: bcaLogo, type: 'va' },
  { id: 'bni_va', name: 'BNI Virtual Account', desc: 'Transfer via ATM/Mobile Banking', logo: bniLogo, type: 'va' },
  { id: 'bri_va', name: 'BRI Virtual Account', desc: 'Transfer via ATM/Mobile Banking', logo: briLogo, type: 'va' },
  { id: 'mandiri_va', name: 'Mandiri Virtual Account', desc: 'Transfer via ATM/Mobile Banking', logo: mandiriLogo, type: 'va' },
]

// Grouped methods
const qrisMethods = computed(() => paymentMethods.filter(m => m.type === 'qris'))
const ewalletMethods = computed(() => paymentMethods.filter(m => m.type === 'ewallet'))
const vaMethods = computed(() => paymentMethods.filter(m => m.type === 'va'))

// Computed
const subtotal = computed(() => program.value?.price || 0)

const discountAmount = computed(() => {
  if (!voucherApplied.value) return 0
  const voucher = voucherApplied.value
  if (voucher.type === 'percent') {
    const discount = Math.floor(subtotal.value * voucher.discount / 100)
    return voucher.maxDiscount ? Math.min(discount, voucher.maxDiscount) : discount
  }
  return voucher.discount
})

const total = computed(() => Math.max(0, subtotal.value + SERVICE_FEE - discountAmount.value))

const formatPrice = (p) => new Intl.NumberFormat('id-ID', { 
  style: 'currency', 
  currency: 'IDR', 
  minimumFractionDigits: 0 
}).format(p)

// Fetch booking data
async function fetchData() {
  loading.value = true
  errorMessage.value = ''
  
  try {
    const bookingId = route.params.bookingId
    
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        programs (
          id, name, price, price_type, duration_months, 
          sessions_per_week, level, description, subject
        ),
        les_places (
          id, name, address, city, photos, type
        )
      `)
      .eq('id', bookingId)
      .single()
    
    if (bookingError) {
      console.error('Error fetching booking:', bookingError)
      errorMessage.value = 'Data booking tidak ditemukan'
      return
    }
    
    if (bookingData) {
      booking.value = bookingData
      program.value = bookingData.programs
      lesPlace.value = bookingData.les_places
    }
  } catch (err) { 
    console.error('Error:', err)
    errorMessage.value = err.message
  } finally { 
    loading.value = false 
  }
}

// Voucher functions
async function applyVoucher() {
  voucherError.value = ''
  
  if (!voucherCode.value.trim()) {
    voucherError.value = 'Masukkan kode voucher'
    return
  }
  
  applyingVoucher.value = true
  
  try {
    const code = voucherCode.value.trim().toUpperCase()
    
    // Check voucher in database
    const { data: voucher, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      // Match either global voucher (null) or specific to this les place
      .or(`les_place_id.is.null,les_place_id.eq.${lesPlace.value.id}`)
      .single()
    
    if (error || !voucher) {
      throw new Error('Kode voucher tidak valid atau tidak ditemukan')
    }

    // Check date validity
    const now = new Date()
    if (new Date(voucher.start_date) > now) {
      throw new Error('Voucher belum berlaku')
    }
    if (new Date(voucher.end_date) < now) {
      throw new Error('Voucher sudah kadaluarsa')
    }

    // Check usage limit
    if (voucher.usage_limit && voucher.usage_count >= voucher.usage_limit) {
      throw new Error('Kuota voucher sudah habis')
    }

    // Check minimum purchase
    if (voucher.min_purchase && subtotal.value < voucher.min_purchase) {
      throw new Error(`Minimal pembelian untuk voucher ini adalah ${formatPrice(voucher.min_purchase)}`)
    }

    voucherApplied.value = voucher
    voucherCode.value = ''
    voucherError.value = ''

  } catch (err) {
    voucherError.value = err.message
  } finally {
    applyingVoucher.value = false
  }
}

function removeVoucher() {
  voucherApplied.value = null
  voucherCode.value = ''
  voucherError.value = ''
}

// Handle payment with Midtrans Snap
async function handlePayment() {
  if (!booking.value || !program.value) {
    errorMessage.value = 'Data pembayaran tidak lengkap'
    return
  }
  
  processing.value = true
  errorMessage.value = ''
  
  try {
    // Use user ID directly (not students.id) because transactions RLS expects auth.uid()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Silakan login terlebih dahulu')
    
    const result = await createPayment({
      lesPlaceId: lesPlace.value?.id,
      studentId: userId, // Use user_id directly for RLS compatibility
      bookingId: booking.value?.id,
      programId: program.value?.id,
      amount: total.value,
      description: `Pembayaran ${program.value?.name} - ${lesPlace.value?.name}`,
      customerDetails: {
        first_name: authStore.userProfile?.name || 'Student',
        email: authStore.user?.email,
        phone: authStore.userProfile?.phone || ''
      },
      preferredPayment: selectedPaymentMethod.value // Pass selected payment method
    })
    
    if (!result.success) throw new Error(result.error || 'Gagal membuat pembayaran')
    
    // Handle Free Payment (amount 0)
    if (result.isFree) {
      paymentResult.value = {
        orderId: result.orderId,
        amount: 0,
        transactionId: result.transaction?.id,
        paymentType: 'free'
      }
      currentStep.value = 'success'
      await updateBookingStatus('confirmed') // Wait for status update
      processing.value = false
      return
    }

    await loadSnapScript()
    
    if (window.snap && result.snapToken) {
      window.snap.pay(result.snapToken, {
        onSuccess: (snapResult) => {
          paymentResult.value = {
            orderId: result.orderId,
            amount: total.value,
            transactionId: snapResult.transaction_id,
            paymentType: snapResult.payment_type
          }
          currentStep.value = 'success'
          updateBookingStatus('confirmed')
        },
        onPending: (snapResult) => {
          paymentResult.value = {
            orderId: result.orderId,
            amount: total.value,
            transactionId: snapResult.transaction_id
          }
          currentStep.value = 'pending'
        },
        onError: () => {
          errorMessage.value = 'Pembayaran gagal. Silakan coba lagi.'
          currentStep.value = 'error'
        },
        onClose: () => {
          if (currentStep.value === 'checkout') processing.value = false
        }
      })
    } else {
      throw new Error('Midtrans Snap tidak tersedia')
    }
  } catch (err) {
    console.error('Payment error:', err)
    errorMessage.value = err.message
    currentStep.value = 'error'
  } finally {
    processing.value = false
  }
}

// Dev function to simulate success
async function simulateDevSuccess() {
  if (!import.meta.env.DEV) return
  if (!booking.value) return
  
  const confirm = window.confirm('DEV MODE: Simulasikan pembayaran sukses?')
  if (!confirm) return

  processing.value = true
  try {
    // Simulate transaction
    const orderId = `DEV-${Date.now()}`
    
    // Create completed transaction in DB
    await supabase.from('transactions').insert({
      les_place_id: lesPlace.value?.id,
      student_id: authStore.user?.id,
      booking_id: booking.value?.id,
      program_id: program.value?.id,
      amount: total.value,
      net_amount: total.value,
      payment_status: 'completed',
      midtrans_order_id: orderId,
      description: `DEV PAYMENT ${program.value?.name}`
    })

    paymentResult.value = {
        orderId: orderId,
        amount: total.value,
        transactionId: 'DEV-TRX-ID',
        paymentType: 'dev-simulation'
    }
    
    await updateBookingStatus('confirmed')
    currentStep.value = 'success'
  } catch (err) {
    alert(err.message)
  } finally {
    processing.value = false
  }
}

async function updateBookingStatus(status) {
  try {
    await supabase
      .from('bookings')
      .update({ status, payment_status: status === 'confirmed' ? 'paid' : 'pending' })
      .eq('id', booking.value?.id)
  } catch (err) { console.error('Error updating booking:', err) }
}

function goToMyClass() { router.push('/student/myclass') }
function goToBookings() { router.push('/student/bookings') }
function goHome() { router.push('/') }
function retryPayment() { currentStep.value = 'checkout'; errorMessage.value = '' }

onMounted(fetchData)
</script>

<template>
  <div class="payment-page">
    <Navbar />
    
    <main class="payment-main container">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
        <p>Memuat data pembayaran...</p>
      </div>
      
      <!-- SUCCESS -->
      <div v-else-if="currentStep === 'success'" class="result-state success">
        <div class="result-icon success">✓</div>
        <h1>Pembayaran Berhasil!</h1>
        <p class="result-subtitle">Terima kasih, pembayaran Anda telah dikonfirmasi</p>
        <div class="result-details">
          <div class="detail-row"><span>Order ID</span><span>{{ paymentResult?.orderId }}</span></div>
          <div class="detail-row"><span>Program</span><span>{{ program?.name }}</span></div>
          <div class="detail-row"><span>Tempat Les</span><span>{{ lesPlace?.name }}</span></div>
          <div class="detail-row total"><span>Total Dibayar</span><span>{{ formatPrice(paymentResult?.amount) }}</span></div>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" @click="goToMyClass">Mulai Belajar</button>
          <button class="btn btn-outline" @click="goHome">Kembali ke Home</button>
        </div>
      </div>
      
      <!-- PENDING -->
      <div v-else-if="currentStep === 'pending'" class="result-state pending">
        <div class="result-icon pending">⏳</div>
        <h1>Menunggu Pembayaran</h1>
        <p class="result-subtitle">Silakan selesaikan pembayaran Anda</p>
        <div class="result-note">
          <p>📧 Instruksi pembayaran telah dikirim ke email Anda</p>
          <p>⏰ Selesaikan pembayaran dalam 24 jam</p>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary" @click="goToBookings">Lihat Pesanan Saya</button>
          <button class="btn btn-outline" @click="goHome">Kembali ke Home</button>
        </div>
      </div>
      
      <!-- ERROR -->
      <div v-else-if="currentStep === 'error'" class="result-state error">
        <div class="result-icon error">✕</div>
        <h1>Pembayaran Gagal</h1>
        <p class="result-subtitle">{{ errorMessage || 'Terjadi kesalahan' }}</p>
        <div class="result-actions">
          <button class="btn btn-primary" @click="retryPayment">Coba Lagi</button>
          <button class="btn btn-outline" @click="goHome">Kembali ke Home</button>
        </div>
      </div>
      
      <!-- CHECKOUT -->
      <div v-else class="payment-layout">
        <div class="payment-content">
          <h1>Pembayaran</h1>
          
          <!-- Error -->
          <div v-if="errorMessage" class="error-banner">
            <span>⚠️</span>
            <p>{{ errorMessage }}</p>
            <button @click="errorMessage = ''">×</button>
          </div>
          
          <!-- Program Detail -->
          <div class="section-card">
            <h2>Detail Program</h2>
            <div class="program-info">
              <div class="program-header">
                <h3>{{ program?.name || 'Memuat...' }}</h3>
                <div class="badges-row">
                  <span v-if="program?.level" class="level-badge" :style="{ backgroundColor: getLevelColor(program.level) }">
                    {{ getLevelLabel(program.level) }}
                  </span>
                  <span v-if="lesPlace?.type" class="type-badge" :style="{ backgroundColor: getTypeBgColor(lesPlace.type), color: getTypeColor(lesPlace.type) }">
                    {{ getTypeLabel(lesPlace.type) }}
                  </span>
                </div>
              </div>
              <p class="les-name">{{ lesPlace?.name }}</p>
              <p class="les-address">{{ lesPlace?.address }}, {{ lesPlace?.city }}</p>
              <div class="program-meta">
                <div class="meta-item" v-if="program?.duration_months">
                  <span class="label">Durasi</span>
                  <span class="value">{{ program.duration_months }} bulan</span>
                </div>
                <div class="meta-item" v-if="program?.sessions_per_week">
                  <span class="label">Pertemuan</span>
                  <span class="value">{{ program.sessions_per_week }}x/minggu</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Payment Methods -->
          <div class="section-card">
            <h2>Pilih Metode Pembayaran</h2>
            
            <!-- QRIS -->
            <div class="method-group">
              <h3 class="group-title">📱 QRIS</h3>
              <div class="method-list">
                <label 
                  v-for="m in qrisMethods" 
                  :key="m.id" 
                  class="method-option" 
                  :class="{ selected: selectedPaymentMethod === m.id }"
                >
                  <input type="radio" :value="m.id" v-model="selectedPaymentMethod">
                  <img :src="m.logo" :alt="m.name" class="method-logo">
                  <div class="method-info">
                    <span class="method-name">{{ m.name }}</span>
                    <span class="method-desc">{{ m.desc }}</span>
                  </div>
                  <span v-if="selectedPaymentMethod === m.id" class="check">✓</span>
                </label>
              </div>
            </div>
            
            <!-- E-Wallet -->
            <div class="method-group">
              <h3 class="group-title">💳 E-Wallet</h3>
              <div class="method-list">
                <label 
                  v-for="m in ewalletMethods" 
                  :key="m.id" 
                  class="method-option" 
                  :class="{ selected: selectedPaymentMethod === m.id }"
                >
                  <input type="radio" :value="m.id" v-model="selectedPaymentMethod">
                  <img :src="m.logo" :alt="m.name" class="method-logo">
                  <div class="method-info">
                    <span class="method-name">{{ m.name }}</span>
                    <span class="method-desc">{{ m.desc }}</span>
                  </div>
                  <span v-if="selectedPaymentMethod === m.id" class="check">✓</span>
                </label>
              </div>
            </div>
            
            <!-- Virtual Account -->
            <div class="method-group">
              <h3 class="group-title">🏦 Virtual Account</h3>
              <div class="method-list">
                <label 
                  v-for="m in vaMethods" 
                  :key="m.id" 
                  class="method-option" 
                  :class="{ selected: selectedPaymentMethod === m.id }"
                >
                  <input type="radio" :value="m.id" v-model="selectedPaymentMethod">
                  <img :src="m.logo" :alt="m.name" class="method-logo">
                  <div class="method-info">
                    <span class="method-name">{{ m.name }}</span>
                    <span class="method-desc">{{ m.desc }}</span>
                  </div>
                  <span v-if="selectedPaymentMethod === m.id" class="check">✓</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <aside class="payment-sidebar">
          <div class="summary-card">
            <h3>Ringkasan</h3>
            <div class="summary-item">
              <span>Harga Program</span>
              <span>{{ formatPrice(subtotal) }}</span>
            </div>
            <div class="summary-item">
              <span>Biaya Layanan</span>
              <span>{{ formatPrice(SERVICE_FEE) }}</span>
            </div>
            
            <!-- Voucher Applied -->
            <div v-if="voucherApplied" class="voucher-applied">
              <div class="voucher-info">
                <span class="voucher-tag">🎟️ {{ voucherApplied.code }}</span>
                <button class="voucher-remove" @click="removeVoucher">×</button>
              </div>
              <div class="summary-item discount">
                <span>Diskon</span>
                <span>-{{ formatPrice(discountAmount) }}</span>
              </div>
            </div>
            
            <div class="summary-divider"></div>
            <div class="summary-item total">
              <span>Total</span>
              <span>{{ formatPrice(total) }}</span>
            </div>
            
            <!-- Voucher Input -->
            <div v-if="!voucherApplied" class="voucher-section">
              <div class="voucher-input-wrap">
                <input 
                  type="text" 
                  v-model="voucherCode" 
                  placeholder="Kode Voucher"
                  class="voucher-input"
                  @keyup.enter="applyVoucher"
                >
                <button 
                  class="voucher-btn" 
                  @click="applyVoucher" 
                  :disabled="applyingVoucher"
                >
                  {{ applyingVoucher ? '...' : 'Pakai' }}
                </button>
              </div>
              <p v-if="voucherError" class="voucher-error">{{ voucherError }}</p>
            </div>
            
            <button 
              class="btn btn-primary pay-btn" 
              :disabled="processing || !program" 
              @click="handlePayment"
            >
              <span v-if="processing" class="spinner"></span>
              {{ processing ? 'Memproses...' : `Bayar ${formatPrice(total)}` }}
            </button>
          </div>
        </aside>
      </div>
    </main>
    
    <Footer />
  </div>
</template>

<style scoped>
.payment-page{min-height:100vh;background:var(--background)}
.payment-main{padding-top:100px;padding-bottom:60px}
.container{max-width:1000px;margin:0 auto;padding:0 var(--spacing-xl)}
.loading-state{text-align:center;padding:80px 0}
.loader{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}

/* Result States */
.result-state{text-align:center;padding:60px 20px;max-width:500px;margin:0 auto}
.result-icon{width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 24px;animation:scaleIn .3s ease}
.result-icon.success{background:var(--success);color:white}
.result-icon.pending{background:#f59e0b;color:white}
.result-icon.error{background:var(--error);color:white}
@keyframes scaleIn{from{transform:scale(0)}to{transform:scale(1)}}
.result-state h1{font-size:28px;margin-bottom:8px}
.result-state.success h1{color:var(--success)}
.result-state.pending h1{color:#f59e0b}
.result-state.error h1{color:var(--error)}
.result-subtitle{color:var(--text-muted);margin-bottom:24px}
.result-details{background:white;border-radius:var(--radius-xl);padding:20px;margin-bottom:24px;text-align:left;box-shadow:var(--shadow-sm)}
.detail-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-light);font-size:14px}
.detail-row:last-child{border:none}
.detail-row.total{font-weight:700;font-size:18px;color:var(--primary);padding-top:16px}
.result-note{background:#fef3c7;padding:20px;border-radius:16px;margin-bottom:24px;text-align:left}
.result-note p{font-size:14px;margin:8px 0;color:#92400e}
.result-actions{display:flex;flex-direction:column;gap:12px}

/* Error Banner */
.error-banner{display:flex;align-items:center;gap:12px;background:var(--error-bg);border:1px solid var(--error);color:var(--error);padding:12px 16px;border-radius:var(--radius-lg);margin-bottom:20px}
.error-banner span{font-size:20px}
.error-banner p{flex:1;font-size:14px;margin:0}
.error-banner button{background:none;border:none;font-size:20px;cursor:pointer;color:var(--error)}

/* Layout */
.payment-layout{display:grid;grid-template-columns:1fr 360px;gap:var(--spacing-xl);align-items:start}
.payment-content h1{font-size:28px;margin-bottom:24px;color:var(--text)}
.section-card{background:white;border-radius:var(--radius-xl);padding:var(--spacing-lg);margin-bottom:var(--spacing-lg);box-shadow:var(--shadow-sm)}
.section-card h2{font-size:16px;font-weight:600;margin-bottom:16px;color:var(--text)}

/* Program Info */
.program-header{display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap}
.program-header h3{font-size:20px;margin:0;color:var(--text)}
.badges-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.level-badge{padding:4px 12px;border-radius:var(--radius-full);color:white;font-size:12px;font-weight:600}
.type-badge{padding:4px 12px;border-radius:var(--radius-full);font-size:12px;font-weight:600}
.les-name{font-weight:600;color:var(--text-secondary);margin-bottom:4px}
.les-address{font-size:14px;color:var(--text-muted);margin-bottom:12px}
.program-meta{display:flex;gap:32px;padding-top:12px;border-top:1px solid var(--border-light)}
.meta-item{display:flex;flex-direction:column;gap:4px}
.meta-item .label{font-size:12px;color:var(--text-muted)}
.meta-item .value{font-weight:600;font-size:15px;color:var(--text)}

/* Payment Methods */
.method-group{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border-light)}
.method-group:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}
.group-title{font-size:14px;font-weight:600;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:6px}
.method-list{display:flex;flex-direction:column;gap:8px}
.method-option{display:flex;align-items:center;gap:12px;padding:14px 16px;border:2px solid var(--border-light);border-radius:var(--radius-lg);cursor:pointer;transition:all .2s;background:white}
.method-option:hover{border-color:var(--primary)}
.method-option.selected{border-color:var(--primary);background:rgba(136,208,228,0.08)}
.method-option input{display:none}
.method-logo{width:48px;height:32px;object-fit:contain;flex-shrink:0}
.method-info{flex:1;display:flex;flex-direction:column}
.method-name{font-weight:500;font-size:14px;color:var(--text)}
.method-desc{font-size:12px;color:var(--text-muted)}
.check{width:22px;height:22px;background:var(--primary);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold}

/* Sidebar */
.payment-sidebar{position:sticky;top:100px}
.summary-card{background:white;border-radius:var(--radius-xl);padding:var(--spacing-lg);box-shadow:var(--shadow-lg)}
.summary-card h3{font-size:18px;font-weight:600;margin-bottom:20px}
.summary-item{display:flex;justify-content:space-between;padding:10px 0;font-size:14px;color:var(--text-secondary)}
.summary-item.total{font-size:20px;font-weight:700;color:var(--text);padding-top:16px}
.summary-item.discount{color:#22c55e;font-weight:600}
.summary-divider{height:1px;background:var(--border-light);margin:8px 0}

/* Voucher */
.voucher-section{margin-top:16px;padding-top:16px;border-top:1px dashed var(--border-light)}
.voucher-input-wrap{display:flex;gap:8px}
.voucher-input{flex:1;padding:12px;border:2px solid var(--border-light);border-radius:var(--radius-lg);font-size:14px;text-transform:uppercase}
.voucher-input:focus{outline:none;border-color:var(--primary)}
.voucher-input::placeholder{text-transform:none}
.voucher-btn{padding:12px 20px;background:var(--secondary);color:white;border:none;border-radius:var(--radius-lg);font-weight:600;cursor:pointer;transition:all .2s}
.voucher-btn:hover:not(:disabled){background:var(--primary)}
.voucher-btn:disabled{opacity:0.6}
.voucher-error{color:var(--error);font-size:12px;margin-top:8px}
.voucher-hint{font-size:11px;color:var(--text-muted);margin-top:8px}
.voucher-applied{margin-top:12px;padding:12px;background:rgba(34,197,94,0.08);border-radius:var(--radius-lg);border:1px solid rgba(34,197,94,0.2)}
.voucher-info{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.voucher-tag{font-size:13px;font-weight:600;color:#22c55e}
.voucher-remove{background:none;border:none;font-size:20px;color:var(--text-muted);cursor:pointer;line-height:1}
.voucher-remove:hover{color:var(--error)}

.pay-btn{width:100%;padding:16px;margin-top:20px;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:var(--radius-lg);transition:all .2s}
.pay-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(136,208,228,0.4)}
.spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite}
.secure-text{text-align:center;font-size:12px;color:var(--text-muted);margin-top:16px}

/* Buttons */
.btn{padding:14px 24px;border-radius:var(--radius-lg);font-weight:600;font-size:15px;cursor:pointer;transition:all .2s;border:none}
.btn-primary{background:var(--primary);color:white}
.btn-primary:hover:not(:disabled){background:var(--primary-dark)}
.btn-primary:disabled{opacity:0.6;cursor:not-allowed}
.btn-outline{background:transparent;border:2px solid var(--border);color:var(--text)}
.btn-outline:hover{border-color:var(--primary);color:var(--primary)}

@media(max-width:900px){
  .payment-layout{grid-template-columns:1fr}
  .payment-sidebar{position:fixed;bottom:0;left:0;right:0;z-index:100}
  .summary-card{border-radius:var(--radius-xl) var(--radius-xl) 0 0;padding:20px}
  .payment-content{padding-bottom:240px}
  .summary-card h3,.summary-item:not(.total){display:none}
  .summary-divider{display:none}
}
</style>
