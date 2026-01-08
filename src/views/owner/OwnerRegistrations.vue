<script setup>
import { ref, onMounted, computed } from 'vue'
import StatCard from '@/components/StatCard.vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const registrations = ref([])
const loading = ref(true)
const filter = ref('all')

// Modal
const showModal = ref(false)
const selectedBooking = ref(null)
const cancelReason = ref('')
const cancelling = ref(false)

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

onMounted(async () => {
  await fetchRegistrations()
})

async function fetchRegistrations() {
  loading.value = true
  try {
    // Step 1: Get owner ID
    const { data: owner } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (!owner) return

    // Step 2: Get les_place for this owner
    const { data: lesPlace } = await supabase
      .from('les_places')
      .select('id')
      .eq('owner_id', owner.id)
      .single()
    
    if (!lesPlace) {
      registrations.value = []
      return
    }

    // Step 3: Get all programs for this les_place
    const { data: programsData } = await supabase
      .from('programs')
      .select('id')
      .eq('les_place_id', lesPlace.id)
    
    if (!programsData || programsData.length === 0) {
      registrations.value = []
      return
    }

    const programIds = programsData.map(p => p.id)

    // Step 4: Get bookings for these programs only
    const { data } = await supabase
      .from('bookings')
      .select(`
        id, status, payment_status, created_at, start_date, notes,
        students(id, users(id, name, email, phone, avatar_url)),
        programs(id, name, price, les_places(id, name))
      `)
      .in('program_id', programIds)
      .order('created_at', { ascending: false })

    registrations.value = data || []
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

const filteredRegistrations = computed(() => {
  if (filter.value === 'all') return registrations.value
  if (filter.value === 'paid') {
    return registrations.value.filter(reg => ['paid', 'settlement', 'capture'].includes(reg.payment_status))
  }
  if (filter.value === 'active') {
    return registrations.value.filter(reg => ['active', 'confirmed'].includes(reg.status))
  }
  return registrations.value.filter(reg => reg.status === filter.value)
})

const stats = computed(() => ({
  total: registrations.value.length,
  pending: registrations.value.filter(r => r.status === 'pending').length,
  active: registrations.value.filter(r => ['active', 'confirmed'].includes(r.status)).length,
  cancelled: registrations.value.filter(r => r.status === 'cancelled').length
}))

function openCancelModal(booking) {
  selectedBooking.value = booking
  cancelReason.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  selectedBooking.value = null
  cancelReason.value = ''
}

async function confirmCancel() {
  if (!selectedBooking.value) return
  
  cancelling.value = true
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        notes: cancelReason.value || 'Dibatalkan oleh owner'
      })
      .eq('id', selectedBooking.value.id)

    if (error) throw error

    // Update local state
    const index = registrations.value.findIndex(r => r.id === selectedBooking.value.id)
    if (index !== -1) {
      registrations.value[index].status = 'cancelled'
      registrations.value[index].notes = cancelReason.value
    }

    toast('Pendaftaran berhasil dibatalkan', 'success')
    closeModal()
  } catch (err) {
    console.error('Error cancelling booking:', err)
    toast('Gagal membatalkan pendaftaran', 'error')
  } finally {
    cancelling.value = false
  }
}

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)
}

function getStatusConfig(status) {
  const configs = {
    pending: { label: 'Menunggu', color: 'yellow', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    active: { label: 'Aktif', color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    confirmed: { label: 'Terkonfirmasi', color: 'green', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    completed: { label: 'Selesai', color: 'blue', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    cancelled: { label: 'Dibatalkan', color: 'red', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' }
  }
  return configs[status] || { label: status, color: 'gray', icon: '' }
}

function getPaymentConfig(status) {
  const configs = {
    paid: { label: 'Lunas', color: 'green' },
    settlement: { label: 'Lunas', color: 'green' },
    capture: { label: 'Lunas', color: 'green' },
    pending: { label: 'Belum Bayar', color: 'yellow' },
    failed: { label: 'Gagal', color: 'red' },
    expire: { label: 'Kadaluarsa', color: 'red' }
  }
  return configs[status] || { label: 'Menunggu', color: 'gray' }
}
</script>

<template>
  <div class="dashboard">

    <!-- Toast -->
    <Transition name="slide">
      <div v-if="showToast" :class="['toast', toastType]">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toastMessage }}
      </div>
    </Transition>

    <!-- Cancel Modal -->
    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3>Batalkan Pendaftaran</h3>
            <p>Apakah Anda yakin ingin membatalkan pendaftaran ini?</p>
          </div>
          
          <div class="modal-body" v-if="selectedBooking">
            <div class="booking-info">
              <div class="info-row">
                <span class="label">Siswa</span>
                <span class="value">{{ selectedBooking.students?.users?.name }}</span>
              </div>
              <div class="info-row">
                <span class="label">Program</span>
                <span class="value">{{ selectedBooking.programs?.name }}</span>
              </div>
              <div class="info-row">
                <span class="label">Harga</span>
                <span class="value">{{ formatCurrency(selectedBooking.programs?.price) }}</span>
              </div>
            </div>

            <div class="form-group">
              <label>Alasan Pembatalan (opsional)</label>
              <textarea v-model="cancelReason" rows="3" placeholder="Contoh: Jadwal penuh, tidak memenuhi syarat, dll."></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="closeModal" :disabled="cancelling">Batal</button>
            <button class="btn-danger" @click="confirmCancel" :disabled="cancelling">
              <svg v-if="cancelling" class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg>
              {{ cancelling ? 'Memproses...' : 'Ya, Batalkan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <main class="main-content">
      <!-- Header -->
      <header class="page-header">
        <div class="header-info">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Pendaftaran Siswa
          </h1>
          <p>Kelola pendaftaran dan siswa baru di tempat les Anda</p>
        </div>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
      <div class="stats-grid">
        <StatCard 
            label="Total Pendaftaran" 
            :value="stats.total" 
            icon-color="blue"
            :active="filter === 'all'"
            @click="filter = 'all'"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </template>
        </StatCard>
        
        <StatCard 
            label="Menunggu" 
            :value="stats.pending" 
            icon-color="yellow"
            :active="filter === 'pending'"
            @click="filter = 'pending'"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </template>
        </StatCard>

        <StatCard 
            label="Aktif" 
            :value="stats.active" 
            icon-color="green"
            :active="filter === 'active'"
            @click="filter = 'active'"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </template>
        </StatCard>

        <StatCard 
            label="Dibatalkan" 
            :value="stats.cancelled" 
            icon-color="red"
            :active="filter === 'cancelled'"
            @click="filter = 'cancelled'"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </template>
        </StatCard>
      </div>
      </div>

      <!-- Content -->
      <div class="content-card">
        <div class="card-header">
          <h2>Daftar Pendaftaran</h2>
          <div class="filter-tabs">
            <button :class="{ active: filter === 'all' }" @click="filter = 'all'">Semua</button>
            <button :class="{ active: filter === 'pending' }" @click="filter = 'pending'">Menunggu</button>
            <button :class="{ active: filter === 'active' }" @click="filter = 'active'">Aktif</button>
            <button :class="{ active: filter === 'paid' }" @click="filter = 'paid'">Lunas</button>
            <button :class="{ active: filter === 'cancelled' }" @click="filter = 'cancelled'">Dibatalkan</button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Memuat data pendaftaran...</p>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredRegistrations.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <h3>Belum ada pendaftaran</h3>
          <p>Pendaftaran siswa baru akan muncul di sini</p>
        </div>

        <!-- Table -->
        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th width="50">No</th>
                <th>Siswa</th>
                <th>Program</th>
                <th>Harga</th>
                <th>Tanggal</th>
                <th>Pembayaran</th>
                <th>Status</th>
                <th width="120">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(reg, index) in filteredRegistrations" :key="reg.id" :class="{ cancelled: reg.status === 'cancelled' }">
                <td class="center muted">{{ index + 1 }}</td>
                <td>
                  <div class="student-info">
                    <div class="student-avatar">
                      <img v-if="reg.students?.users?.avatar_url" :src="reg.students.users.avatar_url" :alt="reg.students.users.name">
                      <span v-else>{{ reg.students?.users?.name?.charAt(0) || '?' }}</span>
                    </div>
                    <div class="student-details">
                      <strong>{{ reg.students?.users?.name || 'N/A' }}</strong>
                      <span class="email">{{ reg.students?.users?.email }}</span>
                      <span v-if="reg.students?.users?.phone" class="phone">{{ reg.students?.users?.phone }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="program-info">
                    <strong>{{ reg.programs?.name }}</strong>
                    <span class="les-name">{{ reg.programs?.les_places?.name }}</span>
                  </div>
                </td>
                <td>
                  <span class="price">{{ formatCurrency(reg.programs?.price) }}</span>
                </td>
                <td>
                  <span class="date">{{ formatDate(reg.created_at) }}</span>
                </td>
                <td>
                  <span class="badge" :class="getPaymentConfig(reg.payment_status).color">
                    {{ getPaymentConfig(reg.payment_status).label }}
                  </span>
                </td>
                <td>
                  <span class="status-badge" :class="getStatusConfig(reg.status).color">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path :d="getStatusConfig(reg.status).icon"/>
                    </svg>
                    {{ getStatusConfig(reg.status).label }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button 
                      v-if="reg.status !== 'cancelled' && reg.status !== 'completed'" 
                      class="btn-action cancel" 
                      @click="openCancelModal(reg)"
                      title="Batalkan Pendaftaran"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      Batalkan
                    </button>
                    <span v-else-if="reg.status === 'cancelled'" class="cancelled-text">Dibatalkan</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F1F5F9; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

/* Header */
.page-header { margin-bottom: 28px; }
.page-header h1 { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.page-header h1 svg { width: 28px; height: 28px; color: #0A4568; }
.page-header p { font-size: 14px; color: #64748B; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }

/* Stats Cards - Compact Inline */
.stats-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 24px; 
  margin-bottom: 24px; 
  width: 100%;
}
/* StatCard styling handled by component */
.stat-card:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 6px 20px rgba(0,0,0,0.08); 
}
.stat-card.active { 
  border-color: #0A4568; 
  box-shadow: 0 6px 20px rgba(10,69,104,0.15); 
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.stat-icon { 
  width: 56px; 
  height: 56px; 
  border-radius: 14px; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon svg { width: 26px; height: 26px; }
.stat-icon.blue { background: #F1F5F9; color: #0D5782; }
.stat-icon.yellow { background: #F1F5F9; color: #0D5782; }
.stat-icon.green { background: #F1F5F9; color: #0D5782; }
.stat-icon.red { background: #F1F5F9; color: #0D5782; }

.stat-info { display: flex; flex-direction: column; gap: 2px; }
.stat-value { font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1; }
.stat-label { font-size: 13px; color: #64748B; font-weight: 500; }

/* Content Card */
.content-card { background: white; border-radius: 16px; overflow: hidden; }

.card-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E2E8F0; }
.card-header h2 { font-size: 18px; font-weight: 600; color: #1E293B; }

.filter-tabs { display: flex; gap: 8px; }
.filter-tabs button { padding: 8px 16px; background: #F1F5F9; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; color: #64748B; cursor: pointer; transition: all 0.2s; }
.filter-tabs button:hover { background: #E2E8F0; color: #334155; }
.filter-tabs button.active { background: #0A4568; color: white; }

/* Table */
.table-wrapper { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; }
th, td { padding: 16px 20px; text-align: left; border-bottom: 1px solid #E2E8F0; }
th { background: #F8FAFC; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }

tr:hover { background: #F8FAFC; }
tr.cancelled { opacity: 0.6; }

.center { text-align: center; }
.muted { color: #94A3B8; font-size: 13px; }

/* Student Info */
.student-info { display: flex; align-items: center; gap: 12px; }
.student-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #0A4568, #3498db); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; overflow: hidden; }
.student-avatar img { width: 100%; height: 100%; object-fit: cover; }
.student-details { display: flex; flex-direction: column; }
.student-details strong { font-size: 14px; color: #1E293B; }
.student-details .email { font-size: 12px; color: #64748B; }
.student-details .phone { font-size: 11px; color: #94A3B8; }

/* Program Info */
.program-info { display: flex; flex-direction: column; }
.program-info strong { font-size: 14px; color: #1E293B; }
.program-info .les-name { font-size: 12px; color: #64748B; }

.price { font-weight: 600; color: #059669; }
.date { font-size: 13px; color: #64748B; }

/* Badges */
.badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.badge.green { background: #D1FAE5; color: #047857; }
.badge.yellow { background: #FEF3C7; color: #B45309; }
.badge.red { background: #FEE2E2; color: #B91C1C; }
.badge.gray { background: #F1F5F9; color: #64748B; }

.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.status-badge svg { width: 14px; height: 14px; }
.status-badge.green { background: #D1FAE5; color: #047857; }
.status-badge.yellow { background: #FEF3C7; color: #B45309; }
.status-badge.red { background: #FEE2E2; color: #B91C1C; }
.status-badge.blue { background: #DBEAFE; color: #1D4ED8; }

/* Actions */
.actions { display: flex; gap: 8px; }
.btn-action { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border: none; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn-action svg { width: 14px; height: 14px; }
.btn-action.cancel { background: #FEE2E2; color: #DC2626; }
.btn-action.cancel:hover { background: #DC2626; color: white; }
.cancelled-text { font-size: 12px; color: #94A3B8; font-style: italic; }

/* States */
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; text-align: center; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon { width: 80px; height: 80px; background: #F1F5F9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.empty-icon svg { width: 40px; height: 40px; color: #94A3B8; }
.empty-state h3 { font-size: 18px; color: #334155; margin-bottom: 8px; }
.empty-state p { font-size: 14px; color: #64748B; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden; }
.modal-header { padding: 28px 28px 20px; text-align: center; }
.modal-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.modal-icon svg { width: 32px; height: 32px; }
.modal-icon.warning { background: #FEF3C7; color: #D97706; }
.modal-header h3 { font-size: 20px; font-weight: 700; color: #1E293B; margin-bottom: 8px; }
.modal-header p { font-size: 14px; color: #64748B; }

.modal-body { padding: 0 28px 24px; }
.booking-info { background: #F8FAFC; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
.info-row:last-child { border-bottom: none; }
.info-row .label { font-size: 13px; color: #64748B; }
.info-row .value { font-size: 14px; font-weight: 600; color: #1E293B; }

.form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.form-group textarea { width: 100%; padding: 12px; border: 1px solid #D1D5DB; border-radius: 10px; font-size: 14px; resize: vertical; font-family: inherit; }
.form-group textarea:focus { outline: none; border-color: #0A4568; }

.modal-footer { display: flex; gap: 12px; padding: 20px 28px; border-top: 1px solid #E2E8F0; }
.modal-footer button { flex: 1; padding: 14px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
.btn-secondary { background: #F1F5F9; color: #475569; border: none; }
.btn-secondary:hover { background: #E2E8F0; }
.btn-danger { background: #DC2626; color: white; border: none; }
.btn-danger:hover { background: #B91C1C; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-danger .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

/* Toast */
.toast { position: fixed; top: 20px; right: 20px; display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-radius: 10px; font-weight: 500; font-size: 14px; z-index: 200; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.toast svg { width: 18px; height: 18px; }
.toast.success { background: #D1FAE5; color: #059669; }
.toast.error { background: #FEE2E2; color: #DC2626; }

/* Transitions */
.slide-enter-active, .slide-leave-active { transition: all 0.3s; }
.slide-enter-from, .slide-leave-to { transform: translateX(100px); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: all 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { 
  .main-content { padding: 16px; } 
  .stats-grid { grid-template-columns: 1fr; }
  .card-header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .filter-tabs { flex-wrap: wrap; }
}
</style>
