<script setup>
import { ref, onMounted, computed } from 'vue'
import AdminSidebar from '@/components/AdminSidebar.vue'
import { supabase } from '@/lib/supabase'

// State
const vouchers = ref([])
const loading = ref(true)
const showModal = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const submitting = ref(false)
const error = ref('')

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

onMounted(() => {
  fetchVouchers()
})

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

async function fetchVouchers() {
  loading.value = true
  try {
    const { data, error: err } = await supabase
      .from('vouchers')
      .select('*')
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

    const payload = {
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
    } else {
      const { error: err } = await supabase
        .from('vouchers')
        .update(payload)
        .eq('id', form.value.id)
      if (err) throw err
    }

    showModal.value = false
    fetchVouchers()
  } catch (err) {
    error.value = err.message
  } finally {
    submitting.value = false
  }
}

async function deleteVoucher(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus voucher ini? Tindakan ini tidak dapat dibatalkan.')) return
  
  try {
    const { error: err } = await supabase.from('vouchers').delete().eq('id', id)
    if (err) throw err
    fetchVouchers()
  } catch (err) {
    console.error('Error deleting voucher:', err)
    alert('Gagal menghapus voucher')
  }
}

async function toggleStatus(voucher) {
  try {
    const { error: err } = await supabase
      .from('vouchers')
      .update({ is_active: !voucher.is_active })
      .eq('id', voucher.id)
    
    if (err) throw err
    voucher.is_active = !voucher.is_active
  } catch (err) {
    console.error('Error updating status:', err)
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
  <div class="admin-layout">
    <AdminSidebar />
    
    <main class="main-content">
      <header class="page-header">
        <div>
          <h1>Manajemen Voucher</h1>
          <p>Kelola kode promo dan diskon untuk siswa</p>
        </div>
        <button class="btn btn-primary" @click="openCreateModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Buat Voucher
        </button>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Voucher</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Aktif</span>
            <span class="stat-value">{{ stats.active }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Penukaran</span>
            <span class="stat-value">{{ stats.redeemed }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Cari kode voucher..." class="search-input">
        </div>
        <select v-model="filterStatus" class="filter-select">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Non-aktif</option>
          <option value="expired">Berakhir</option>
        </select>
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
        <h3>Tidak ada voucher ditemukan</h3>
        <p>Coba ubah filter pencarian Anda atau buat voucher baru</p>
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
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="btn-icon delete" @click="deleteVoucher(voucher.id)" title="Hapus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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
              <span class="discount-label">off</span>
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
              <span v-else>Unlimited</span>
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
                <input v-model="form.code" type="text" placeholder="CONTOH: SUPERHEMAT" required class="input uppercase">
                <button type="button" class="btn-secondary" @click="generateCode">Acak</button>
              </div>
              <span class="help-text">Kode unik yang akan dimasukkan oleh siswa.</span>
            </div>

            <div class="form-group">
              <label>Deskripsi</label>
              <textarea v-model="form.description" rows="2" placeholder="Contoh: Diskon spesial hari kemerdekaan"></textarea>
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
                <label>Nilai {{ form.type === 'percent' ? 'Persentase' : 'Nominal' }}</label>
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
              <input v-model.number="form.usage_limit" type="number" min="1" placeholder="Kosongkan jika tidak terbatas" class="input">
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
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--background);
  font-family: 'Inter', sans-serif;
}

.main-content {
  flex: 1;
  padding: 32px;
  /* Removed margin-left: 260px and fixed width because sidebar is sticky/flex, not fixed overlapping */
  width: 100%;
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

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 28px;
  height: 28px;
}

.stat-icon.purple { background: #F1F5F9; color: #0D5782; }
.stat-icon.green { background: #F1F5F9; color: #0D5782; }
.stat-icon.blue { background: #F1F5F9; color: #0D5782; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.search-wrap {
  flex: 1;
  position: relative;
}

.search-wrap svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 48px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.filter-select {
  padding: 0 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: white;
  font-size: 14px;
  min-width: 180px;
  cursor: pointer;
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
  font-family: 'Monaco', monospace;
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
</style>
