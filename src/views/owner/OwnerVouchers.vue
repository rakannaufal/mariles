<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import StatCard from '@/components/StatCard.vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

// Access
const authStore = useAuthStore()

// State
const vouchers = ref([])
const loading = ref(true)
const showModal = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const submitting = ref(false)
const error = ref('')
const lesPlaceId = ref(null)

// Filters
const searchQuery = ref('')
const filterStatus = ref('all') // 'all' | 'active' | 'inactive' | 'expired'

// Form
const form = ref({
  id: null,
  code: '',
  description: '',
  type: 'percent', // 'percent' | 'fixed'
  discount: 0,
  max_discount: null,
  min_purchase: 0,
  start_date: '',
  end_date: '',
  usage_limit: null,
  is_active: true
})

onMounted(async () => {
  await fetchLesPlaceId()
  if (lesPlaceId.value) {
    fetchVouchers()
  }
})

// Toast State
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

// Computed
const filteredVouchers = computed(() => {
  let result = vouchers.value

  // Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.code.toLowerCase().includes(query) || 
      v.description?.toLowerCase().includes(query)
    )
  }

  // Filter
  const now = new Date()
  if (filterStatus.value === 'active') {
    result = result.filter(v => v.is_active && new Date(v.end_date) > now && new Date(v.start_date) <= now)
  } else if (filterStatus.value === 'inactive') {
    result = result.filter(v => !v.is_active)
  } else if (filterStatus.value === 'expired') {
    result = result.filter(v => new Date(v.end_date) <= now)
  }

  return result
})

const stats = computed(() => {
  const total = vouchers.value.length
  const active = vouchers.value.filter(v => v.is_active).length
  const redeemed = vouchers.value.reduce((sum, v) => sum + (v.usage_count || 0), 0)
  return { total, active, redeemed }
})

async function fetchLesPlaceId() {
  try {
    // Get Owner ID
    const { data: owner } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (!owner) throw new Error('Owner profile not found')

    // Get Les Place ID
    const { data: lp } = await supabase
      .from('les_places')
      .select('id')
      .eq('owner_id', owner.id)
      .single()
    
    if (lp) {
      lesPlaceId.value = lp.id
    }
  } catch (err) {
    console.error('Error fetching owner data:', err)
  }
}

async function fetchVouchers() {
  loading.value = true
  try {
    const { data, error: err } = await supabase
      .from('vouchers')
      .select('*')
      .eq('les_place_id', lesPlaceId.value)
      .order('created_at', { ascending: false })
    
    if (err) throw err
    vouchers.value = data
  } catch (err) {
    console.error('Error fetching vouchers:', err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  modalMode.value = 'create'
  form.value = {
    id: null,
    code: '',
    description: '',
    type: 'percent',
    discount: 0,
    max_discount: null,
    min_purchase: 0,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    usage_limit: null,
    is_active: true
  }
  showModal.value = true
}

function openEditModal(voucher) {
  modalMode.value = 'edit'
  form.value = {
    ...voucher,
    start_date: new Date(voucher.start_date).toISOString().slice(0, 16),
    end_date: new Date(voucher.end_date).toISOString().slice(0, 16)
  }
  showModal.value = true
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  form.value.code = 'PROMO-' + result
}

async function handleSubmit() {
  submitting.value = true
  error.value = ''
  
  try {
    if (!form.value.code) throw new Error('Kode voucher wajib diisi')
    if (form.value.discount <= 0) throw new Error('Nilai diskon harus lebih dari 0')
    if (!lesPlaceId.value) throw new Error('Les Place ID tidak ditemukan')

    const payload = {
      les_place_id: lesPlaceId.value,
      code: form.value.code.toUpperCase(),
      description: form.value.description,
      type: form.value.type,
      discount: form.value.discount,
      max_discount: form.value.max_discount || null,
      min_purchase: form.value.min_purchase || 0,
      start_date: new Date(form.value.start_date).toISOString(),
      end_date: new Date(form.value.end_date).toISOString(),
      usage_limit: form.value.usage_limit || null,
      is_active: form.value.is_active
    }

    if (modalMode.value === 'create') {
      const { error: err } = await supabase.from('vouchers').insert(payload)
      if (err) throw err
      toast('Voucher berhasil dibuat!', 'success')
    } else {
      // Security check: ensure we only update our own voucher
      const { error: err } = await supabase
        .from('vouchers')
        .update(payload)
        .eq('id', form.value.id)
        .eq('les_place_id', lesPlaceId.value) 
        
      if (err) throw err
      toast('Voucher berhasil diperbarui!', 'success')
    }

    showModal.value = false
    fetchVouchers()
  } catch (err) {
    error.value = err.message
    toast(err.message, 'error')
  } finally {
    submitting.value = false
  }
}

async function deleteVoucher(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus voucher ini? Tindakan ini tidak dapat dibatalkan.')) return
  
  try {
    const { error: err } = await supabase
      .from('vouchers')
      .delete()
      .eq('id', id)
      .eq('les_place_id', lesPlaceId.value)

    if (err) throw err
    fetchVouchers()
    toast('Voucher berhasil dihapus', 'success')
  } catch (err) {
    console.error('Error deleting voucher:', err)
    toast('Gagal menghapus voucher', 'error')
  }
}

async function toggleStatus(voucher) {
  try {
    const { error: err } = await supabase
      .from('vouchers')
      .update({ is_active: !voucher.is_active })
      .eq('id', voucher.id)
      .eq('les_place_id', lesPlaceId.value)
    
    if (err) throw err
    voucher.is_active = !voucher.is_active
    toast(voucher.is_active ? 'Voucher diaktifkan' : 'Voucher dinonaktifkan', 'success')
  } catch (err) {
    console.error('Error updating status:', err)
    toast('Gagal mengubah status', 'error')
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(price)
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getVoucherStatus(voucher) {
  if (!voucher.is_active) return { label: 'Non-aktif', class: 'status-inactive' }
  const now = new Date()
  const start = new Date(voucher.start_date)
  const end = new Date(voucher.end_date)
  
  if (now < start) return { label: 'Terjadwal', class: 'status-scheduled' }
  if (now > end) return { label: 'Berakhir', class: 'status-expired' }
  return { label: 'Aktif', class: 'status-active' }
}
</script>

<template>
  <div class="owner-layout">
    <Transition name="slide">
      <div v-if="showToast" :class="['toast', toastType]">{{ toastMessage }}</div>
    </Transition>
    
    <main class="main-content">
      <header class="page-header">
        <div>
          <h1>Voucher Saya</h1>
          <p>Kelola kode promo untuk siswa Anda</p>
        </div>
        <button class="btn-create" @click="openCreateModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Buat Voucher
        </button>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <StatCard 
            label="Total Voucher" 
            :value="stats.total" 
            icon-color="blue"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
            </template>
        </StatCard>

        <StatCard 
            label="Aktif" 
            :value="stats.active" 
            icon-color="green"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </template>
        </StatCard>

        <StatCard 
            label="Total Penukaran" 
            :value="stats.redeemed" 
            icon-color="purple"
        >
            <template #icon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
            </template>
        </StatCard>
      </div>

       <!-- Filters and Actions -->
       <div class="table-controls">
        <!-- Search -->
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Cari kode, deskripsi..." class="search-input">
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
          <button 
            v-for="opt in [
              { label: 'Semua', value: 'all' },
              { label: 'Aktif', value: 'active' },
              { label: 'Non-aktif', value: 'inactive' },
              { label: 'Berakhir', value: 'expired' }
            ]" 
            :key="opt.value"
            class="tab-pill"
            :class="{ active: filterStatus === opt.value }"
            @click="filterStatus = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="filteredVouchers.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
        </div>
        <h3>Belum ada voucher</h3>
        <p>Buat kode promo pertama Anda untuk menarik lebih banyak siswa!</p>
        <button class="btn-text" @click="openCreateModal">Buat voucher sekarang</button>
      </div>

      <div v-else class="vouchers-grid">
        <div v-for="voucher in filteredVouchers" :key="voucher.id" class="voucher-card" :class="{ 'inactive': !voucher.is_active }">
          <div class="card-header">
            <div class="code-wrap">
              <div class="voucher-code">{{ voucher.code }}</div>
               <span class="status-badge" :class="getVoucherStatus(voucher).class">
                {{ getVoucherStatus(voucher).label }}
              </span>
            </div>
            <div class="action-wrap">
              <label class="switch" title="Toggle Status">
                <input type="checkbox" :checked="voucher.is_active" @change="toggleStatus(voucher)">
                <span class="slider"></span>
              </label>
              <div class="dropdown">
                <button class="btn-icon" @click="openEditModal(voucher)" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="btn-icon delete" @click="deleteVoucher(voucher.id)" title="Hapus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div class="voucher-main">
            <div class="discount-display">
              <span class="discount-value">
                {{ voucher.type === 'percent' ? `${voucher.discount}%` : formatPrice(voucher.discount) }}
              </span>
              <span class="discount-label">Diskon</span>
            </div>
            <p class="desc">{{ voucher.description || 'Tidak ada deskripsi' }}</p>
          </div>

          <div class="meta-info">
            <div class="meta-row">
              <span class="label">Min. Beli</span>
              <span class="value">{{ formatPrice(voucher.min_purchase) }}</span>
            </div>
            <div class="meta-row">
              <span class="label">Maks. Potongan</span>
              <span class="value">{{ voucher.max_discount ? formatPrice(voucher.max_discount) : '∞' }}</span>
            </div>
            <div class="meta-row">
              <span class="label">Periode</span>
              <span class="value date">{{ formatDate(voucher.start_date) }} - {{ formatDate(voucher.end_date) }}</span>
            </div>
          </div>

          <div class="usage-bar">
            <div class="usage-info">
              <span>Terpakai: <b>{{ voucher.usage_count }}</b></span>
              <span v-if="voucher.usage_limit">dari {{ voucher.usage_limit }}</span>
              <span v-else>Tak Terbatas</span>
            </div>
            <div class="progress-bg">
              <div 
                class="progress-fill" 
                :style="{ width: voucher.usage_limit ? Math.min((voucher.usage_count / voucher.usage_limit) * 100, 100) + '%' : '100%' }"
                :class="{ 'unlimited': !voucher.usage_limit }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal Form -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ modalMode === 'create' ? 'Buat Voucher Baru' : 'Edit Voucher' }}</h2>
          <button class="close-btn" @click="showModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="voucher-form">
          <div class="form-section">
            <h3>Informasi Dasar</h3>
            <div class="form-group">
              <label>Kode Voucher</label>
              <div class="input-group">
                <input v-model="form.code" type="text" placeholder="CONTOH: PROMOAGUSTUS" required class="input uppercase">
                <button type="button" class="btn-secondary" @click="generateCode">Acak</button>
              </div>
              <span class="help-text">Kode unik yang akan dimasukkan oleh siswa.</span>
            </div>

            <div class="form-group">
              <label>Deskripsi</label>
              <textarea v-model="form.description" rows="2" placeholder="Promo spesial untuk kelas..."></textarea>
            </div>
          </div>

          <div class="form-section">
            <h3>Pengaturan Diskon</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Tipe Diskon</label>
                <div class="type-selector">
                  <label :class="{ active: form.type === 'percent' }">
                    <input type="radio" v-model="form.type" value="percent">
                    <span>Persentase (%)</span>
                  </label>
                  <label :class="{ active: form.type === 'fixed' }">
                    <input type="radio" v-model="form.type" value="fixed">
                    <span>Nominal (Rp)</span>
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>Nilai Diskon</label>
                <input v-model.number="form.discount" type="number" min="0" required class="input">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Min. Pembelian</label>
                <input v-model.number="form.min_purchase" type="number" min="0" value="0" class="input">
              </div>
              <div class="form-group" v-if="form.type === 'percent'">
                <label>Maks. Potongan</label>
                <input v-model.number="form.max_discount" type="number" min="0" placeholder="Opsional" class="input">
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Durasi & Batasan</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Mulai Berlaku</label>
                <input v-model="form.start_date" type="datetime-local" required class="input">
              </div>
              <div class="form-group">
                <label>Berakhir</label>
                <input v-model="form.end_date" type="datetime-local" required class="input">
              </div>
            </div>

            <div class="form-group">
              <label>Batas Penggunaan</label>
              <input v-model.number="form.usage_limit" type="number" min="1" placeholder="Jumlah maksimal penukaran" class="input">
            </div>
          </div>

          <div v-if="error" class="error-msg">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {{ error }}
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="showModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Menyimpan...' : 'Simpan Voucher' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.owner-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--background);
}

.main-content {
  flex: 1;
  padding: 32px;
  width: 100%;
  overflow-y: auto;
  max-width: 1200px;
  margin-right: auto; /* Align left (remove margin-left auto) */
  box-sizing: border-box; /* Ensure padding doesn't overflow width */
}

@media (max-width: 1024px) {
  .main-content {
    padding: 20px;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.page-header p {
  color: var(--text-secondary);
}

/* Stats Cards - Compact Inline */
.stats-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 24px; 
  margin-bottom: 24px; 
  width: 100%;
}
/* StatCard styling handled by component */

/* Table Controls / Filter Bar REVAMPED */
.table-controls {
  display: flex;
  justify-content: space-between; /* Search Left, Filters Right */
  align-items: center;
  gap: 24px;
  
  margin-bottom: 32px;
  background: white;
  padding: 12px;
  border-radius: 20px;
  box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05);
  border: 1px solid rgba(0,0,0,0.02);
  width: 100%;
}

/* 1. Search Box */
.search-box {
  position: relative;
  width: 100%;
  max-width: 320px; /* Limit width */
}

.search-box svg {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #9ca3af;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-input:focus {
  outline: none;
  background: white;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-light, rgba(59,130,246,0.1));
}

.search-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

/* 2. Filter Tabs - Segmented Style */
.filter-tabs {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 14px;
  width: fit-content;
  margin: 0; /* No auto margin, let flex handle it */
}

.tab-pill {
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-pill:hover {
  color: var(--text);
  background: rgba(255,255,255,0.6);
}

.tab-pill.active {
  background: white;
  color: var(--primary);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transform: scale(1.02);
}

/* 3. Action Button (Used in Header) */
.btn-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  height: 46px; 
  padding: 0 24px;
  
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 14px;
  
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-create:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
}

.btn-create:active {
  transform: translateY(0);
}

.btn-create svg {
  width: 20px;
  height: 20px;
}

/* Responsive Handling */
@media (max-width: 1024px) {
  .table-controls {
    flex-direction: column; /* Stack properly */
    align-items: stretch;
    gap: 16px;
    height: auto;
    padding: 16px;
  }
  
  .search-box {
    max-width: 100%;
  }
  
  .filter-tabs {
    width: 100%;
    justify-content: space-between;
    overflow-x: auto;
  }
  
  .tab-pill {
    flex: 1;
    text-align: center;
  }
}

/* Voucher Cards */
.vouchers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.voucher-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--border-light);
}

.voucher-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1);
  border-color: var(--primary-light);
}

.voucher-card.inactive {
  opacity: 0.7;
  background: #f9fafb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.code-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voucher-code {
  font-weight: 700;
  font-size: 20px;
  color: var(--primary);
  letter-spacing: 1px;
}

.status-badge {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 600;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active { background: #dcfce7; color: #16a34a; }
.status-inactive { background: #f3f4f6; color: #6b7280; }
.status-expired { background: #fee2e2; color: #dc2626; }
.status-scheduled { background: #fef3c7; color: #d97706; }

.action-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dropdown {
  display: flex;
  gap: 4px;
}

.voucher-main {
  flex: 1;
}

.discount-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.discount-value {
  font-size: 36px;
  font-weight: 800;
  color: var(--text);
  line-height: 1;
}

.discount-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
}

.desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.meta-info {
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.meta-row .label { color: var(--text-secondary); }
.meta-row .value { font-weight: 600; color: var(--text); }
.meta-row .value.date { font-size: 12px; }

.usage-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.usage-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.progress-bg {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill.unlimited {
  background: linear-gradient(90deg, var(--primary) 0%, #a855f7 100%);
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon svg {
  width: 18px;
  height: 18px;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: var(--primary);
}

.btn-icon.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: var(--text);
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.voucher-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

.input, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.input:focus, textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.input-group {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  padding: 0 16px;
  border: 1px solid var(--border);
  background: white;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: var(--text-secondary);
}

.help-text {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.type-selector {
  display: flex;
  background: var(--background);
  padding: 4px;
  border-radius: 8px;
  gap: 4px;
}

.type-selector label {
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  transition: all 0.2s;
}

.type-selector label.active {
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  color: var(--primary);
  font-weight: 600;
}

.type-selector input {
  display: none;
}

.error-msg {
  background: #fee2e2;
  color: #dc2626;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  background: white;
  border-radius: 16px;
  border: 1px dashed var(--border);
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: var(--text-secondary);
}

.empty-icon svg {
  width: 32px;
  height: 32px;
}

/* Spinner */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin: 100px auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {opacity: 0; width: 0; height: 0;}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--border);
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider { background-color: var(--primary); }
input:checked + .slider:before { transform: translateX(20px); }

/* Toast Notifications */
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  padding: 16px 24px;
  border-radius: 12px;
  font-weight: 600;
  z-index: 9999;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
}

.toast.success {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.toast.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
