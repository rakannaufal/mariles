<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const lesPlaces = ref([])
const searchQuery = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)
const itemsPerPage = 10
const totalItems = ref(0)

// Stats
const stats = ref({
  total: 0,
  verified: 0,
  pending: 0,
  rejected: 0
})

// Rejection modal
const showRejectModal = ref(false)
const rejectingPlace = ref(null)
const rejectionReason = ref('')

// Modal
const showModal = ref(false)
const selectedPlace = ref(null)
const loadingDetails = ref(false)
const placeDetails = ref(null)

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

onMounted(async () => {
  await fetchStats()
  await fetchLesPlaces()
})

watch([statusFilter, currentPage], () => {
  fetchLesPlaces()
})

async function fetchStats() {
  try {
    const { count: total } = await supabase.from('les_places').select('*', { count: 'exact', head: true })
    const { count: verified } = await supabase.from('les_places').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified')
    const { count: pending } = await supabase.from('les_places').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending')
    const { count: rejected } = await supabase.from('les_places').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected')
    
    stats.value = { total: total || 0, verified: verified || 0, pending: pending || 0, rejected: rejected || 0 }
  } catch (err) {
    console.error('Error:', err)
  }
}

async function fetchLesPlaces() {
  loading.value = true
  try {
    // Gunakan view yang sudah dibuat untuk bypass RLS
    let query = supabase
      .from('les_places_with_owner')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage - 1)

    if (statusFilter.value === 'verified') {
      query = query.eq('verification_status', 'verified')
    } else if (statusFilter.value === 'pending') {
      query = query.eq('verification_status', 'pending')
    } else if (statusFilter.value === 'rejected') {
      query = query.eq('verification_status', 'rejected')
    }

    if (searchQuery.value) {
      query = query.or(`name.ilike.%${searchQuery.value}%,city.ilike.%${searchQuery.value}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    lesPlaces.value = data || []
    totalItems.value = count || 0
  } catch (err) {
    console.error('Error fetching les places:', err)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchLesPlaces()
}

async function viewDetails(place) {
  selectedPlace.value = place
  showModal.value = true
  loadingDetails.value = true

  try {
    // Fetch detail dari view
    const { data, error } = await supabase
      .from('les_places_with_owner')
      .select('*')
      .eq('id', place.id)
      .single()
    
    if (error) throw error
    placeDetails.value = data
  } catch (err) {
    console.error('Error fetching details:', err)
  } finally {
    loadingDetails.value = false
  }
}

async function verifyPlace(place) {
  try {
    await supabase.from('les_places').update({ 
      verification_status: 'verified',
      rejection_reason: null 
    }).eq('id', place.id)
    
    // Send notification to owner using owner_user_id from the view
    const ownerUserId = place.owner_user_id
    console.log('Verifying place:', place.name, 'owner_user_id:', ownerUserId)
    
    if (ownerUserId) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: ownerUserId,
        type: 'verification_approved',
        title: 'Tempat Les Terverifikasi!',
        message: `Selamat! Tempat les "${place.name}" telah diverifikasi dan sekarang tampil di pencarian publik.`,
        link: '/owner/les',
        is_read: false,
        created_at: new Date().toISOString()
      })
      if (notifError) console.error('Notification error:', notifError)
      else console.log('Notification sent successfully to user:', ownerUserId)
    } else {
      console.warn('No owner_user_id found for place:', place.name)
    }
    
    await fetchStats()
    await fetchLesPlaces()
    
    if (placeDetails.value && placeDetails.value.id === place.id) {
      placeDetails.value = { ...placeDetails.value, verification_status: 'verified' }
    }
    
    showModal.value = false
    toast('Tempat les berhasil diverifikasi!', 'success')
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal memverifikasi', 'error')
  }
}

function openRejectModal(place) {
  rejectingPlace.value = place
  rejectionReason.value = ''
  showRejectModal.value = true
}

async function rejectPlace() {
  if (!rejectionReason.value.trim()) {
    toast('Alasan penolakan wajib diisi', 'error')
    return
  }
  
  try {
    await supabase.from('les_places').update({ 
      verification_status: 'rejected',
      rejection_reason: rejectionReason.value 
    }).eq('id', rejectingPlace.value.id)
    
    // Send notification to owner using owner_user_id from the view
    const ownerUserId = rejectingPlace.value.owner_user_id
    console.log('Rejecting place:', rejectingPlace.value.name, 'owner_user_id:', ownerUserId)
    
    if (ownerUserId) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: ownerUserId,
        type: 'verification_rejected',
        title: 'Verifikasi Ditolak',
        message: `Tempat les "${rejectingPlace.value.name}" tidak dapat diverifikasi. Alasan: ${rejectionReason.value}`,
        link: '/owner/les',
        is_read: false,
        created_at: new Date().toISOString()
      })
      if (notifError) console.error('Notification error:', notifError)
      else console.log('Rejection notification sent to user:', ownerUserId)
    } else {
      console.warn('No owner_user_id found for place:', rejectingPlace.value.name)
    }
    
    await fetchStats()
    await fetchLesPlaces()
    
    showRejectModal.value = false
    showModal.value = false
    toast('Tempat les ditolak', 'warning')
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal menolak', 'error')
  }
}

function getStatusInfo(status) {
  const statuses = {
    pending: { label: 'Menunggu', class: 'warning' },
    verified: { label: 'Terverifikasi', class: 'success' },
    rejected: { label: 'Ditolak', class: 'error' }
  }
  return statuses[status] || { label: status, class: 'info' }
}

async function deletePlace(place) {
  if (!confirm(`Hapus "${place.name}"? Semua data terkait akan dihapus.`)) return

  try {
    await supabase.from('les_places').delete().eq('id', place.id)
    await fetchLesPlaces()
    await fetchStats()
    showModal.value = false
    toast('Tempat les berhasil dihapus', 'success')
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal menghapus', 'error')
  }
}

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage))

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0)
}

function getOwnerName(place) {
  // View menggunakan struktur flat: owner_name langsung
  return place?.owner_name || '-'
}

function getOwnerEmail(place) {
  // View menggunakan struktur flat: owner_email langsung
  return place?.owner_email || '-'
}
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <!-- Toast -->
    <Transition name="slide">
      <div v-if="showToast" :class="['toast', toastType]">{{ toastMessage }}</div>
    </Transition>

    <main class="main-content">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Manajemen Tempat Les
          </h1>
          <p class="subtitle">Kelola dan verifikasi tempat les terdaftar</p>
        </div>
      </header>

      <!-- Stats -->
      <section class="stats-row">
        <div class="stat-mini" @click="statusFilter = 'all'; currentPage = 1" :class="{ active: statusFilter === 'all' }">
          <div class="stat-icon-box blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">Total</span>
          </div>
        </div>
        <div class="stat-mini" @click="statusFilter = 'verified'; currentPage = 1" :class="{ active: statusFilter === 'verified' }">
          <div class="stat-icon-box green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.verified }}</span>
            <span class="stat-label">Terverifikasi</span>
          </div>
        </div>
        <div class="stat-mini" @click="statusFilter = 'pending'; currentPage = 1" :class="{ active: statusFilter === 'pending' }">
          <div class="stat-icon-box orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">Pending</span>
          </div>
        </div>
        <div class="stat-mini" @click="statusFilter = 'rejected'; currentPage = 1" :class="{ active: statusFilter === 'rejected' }">
          <div class="stat-icon-box red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.rejected }}</span>
            <span class="stat-label">Ditolak</span>
          </div>
        </div>
      </section>

      <!-- Search -->
      <section class="filters-bar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Cari nama atau kota..." @keyup.enter="handleSearch">
        </div>
        <button class="btn-primary" @click="handleSearch">Cari</button>
      </section>

      <!-- Table -->
      <section class="card">
        <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

        <div v-else>
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Tempat Les</th>
                  <th>Lokasi</th>
                  <th>Pemilik</th>
                  <th>Email Pemilik</th>
                  <th>Tipe</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="place in lesPlaces" :key="place.id">
                  <td>
                    <div class="place-cell">
                      <div class="place-avatar">{{ place.name?.charAt(0) || 'L' }}</div>
                      <div>
                        <div class="place-name">{{ place.name }}</div>
                        <div class="place-date">{{ formatDate(place.created_at) }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ place.city || '-' }}, {{ place.province || '-' }}</td>
                  <td class="owner-name">{{ getOwnerName(place) }}</td>
                  <td class="owner-email">{{ getOwnerEmail(place) }}</td>
                  <td>
                    <span class="type-badge" :class="place.is_private ? 'private' : 'public'">
                      {{ place.is_private ? 'Pribadi' : 'Umum' }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" :class="getStatusInfo(place.verification_status).class">
                      {{ getStatusInfo(place.verification_status).label }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-action view" @click="viewDetails(place)" title="Lihat Detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <!-- Only show verify if pending or rejected -->
                      <button v-if="place.verification_status !== 'verified'" class="btn-action verify" @click="verifyPlace(place)" title="Verifikasi">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                      <!-- Only show reject if pending (not if already verified or rejected) -->
                      <button v-if="place.verification_status === 'pending'" class="btn-action reject" @click="openRejectModal(place)" title="Tolak">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </button>
                      <button class="btn-action delete" @click="deletePlace(place)" title="Hapus">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="lesPlaces.length === 0">
                  <td colspan="7" class="empty-state">
                    <div class="empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                    </div>
                    <p>Tidak ada data ditemukan</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="totalPages > 1" class="pagination">
            <button :disabled="currentPage === 1" @click="currentPage--">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span class="page-info">Halaman {{ currentPage }} dari {{ totalPages }}</span>
            <button :disabled="currentPage === totalPages" @click="currentPage++">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- Detail Modal -->
      <Teleport to="body">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal large">
            <div class="modal-header">
              <h3>Detail Tempat Les</h3>
              <button class="close-btn" @click="showModal = false">&times;</button>
            </div>
            <div v-if="loadingDetails" class="modal-loading"><div class="spinner"></div></div>
            <div v-else-if="placeDetails" class="modal-body">
              <div class="detail-header">
                <div class="place-avatar large">{{ placeDetails.name?.charAt(0) || 'L' }}</div>
                <div>
                  <h4>{{ placeDetails.name }}</h4>
                  <p>{{ placeDetails.city }}, {{ placeDetails.province }}</p>
                  <span class="status-badge" :class="getStatusInfo(placeDetails.verification_status).class">
                    {{ getStatusInfo(placeDetails.verification_status).label }}
                  </span>
                  <span v-if="placeDetails.verification_status === 'rejected'" class="rejection-reason">
                    Alasan: {{ placeDetails.rejection_reason }}
                  </span>
                </div>
              </div>

              <div class="section-title">Informasi Tempat Les</div>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Alamat</span>
                  <span class="value">{{ placeDetails.address || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Tipe</span>
                  <span class="value">{{ placeDetails.is_private ? 'Pribadi' : 'Umum' }} - {{ placeDetails.type || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Terdaftar</span>
                  <span class="value">{{ formatDate(placeDetails.created_at) }}</span>
                </div>
              </div>

              <div class="section-title">Informasi Pemilik</div>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">Nama Pemilik</span>
                  <span class="value highlight">{{ placeDetails.owner_name || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Email Pemilik</span>
                  <span class="value highlight">{{ placeDetails.owner_email || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Telepon Pemilik</span>
                  <span class="value">{{ placeDetails.owner_phone || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Nama Bisnis</span>
                  <span class="value">{{ placeDetails.business_name || '-' }}</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showModal = false">Tutup</button>
              <button v-if="placeDetails && placeDetails.verification_status !== 'verified'" class="btn-success" @click="verifyPlace(placeDetails)">
                Verifikasi
              </button>
              <button v-if="placeDetails && placeDetails.verification_status !== 'rejected'" class="btn-warning" @click="openRejectModal(placeDetails)">
                Tolak
              </button>
              <button class="btn-danger" @click="deletePlace(placeDetails)">Hapus</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Rejection Modal -->
      <Teleport to="body">
        <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
          <div class="modal small">
            <div class="modal-header">
              <h3>Tolak Verifikasi</h3>
              <button class="close-btn" @click="showRejectModal = false">&times;</button>
            </div>
            <div class="modal-body">
              <p style="margin-bottom: 16px;">Tempat les: <strong>{{ rejectingPlace?.name }}</strong></p>
              <label class="form-label">Alasan Penolakan *</label>
              <textarea v-model="rejectionReason" class="form-textarea" rows="4" placeholder="Jelaskan alasan penolakan..."></textarea>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showRejectModal = false">Batal</button>
              <button class="btn-danger" @click="rejectPlace">Tolak Verifikasi</button>
            </div>
          </div>
        </div>
      </Teleport>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

.page-header { margin-bottom: 24px; }
.page-header h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.page-header h1 svg { width: 28px; height: 28px; color: #0A4568; }
.subtitle { font-size: 14px; color: #64748B; }

/* Stats */
.stats-row { display: flex; gap: 16px; margin-bottom: 24px; }
.stat-mini { flex: 1; display: flex; align-items: center; gap: 14px; padding: 16px 20px; background: white; border: 2px solid #E2E8F0; border-radius: 14px; cursor: pointer; transition: all 0.2s; }
.stat-mini:hover { border-color: #CBD5E1; transform: translateY(-2px); }
.stat-mini.active { border-color: #0A4568; background: #F0F9FF; }
.stat-icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon-box svg { width: 22px; height: 22px; }
.stat-icon-box.blue { background: #DBEAFE; color: #3B82F6; }
.stat-icon-box.green { background: #D1FAE5; color: #10B981; }
.stat-icon-box.orange { background: #FEF3C7; color: #F59E0B; }
.stat-icon-box.purple { background: #EDE9FE; color: #8B5CF6; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 22px; font-weight: 700; color: #1E293B; }
.stat-label { font-size: 13px; color: #64748B; }

/* Filters */
.filters-bar { display: flex; gap: 12px; margin-bottom: 24px; }
.search-box { flex: 1; max-width: 400px; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; }
.search-box svg { width: 20px; height: 20px; color: #94A3B8; flex-shrink: 0; }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; background: transparent; }
.btn-primary { padding: 12px 24px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #0D5A87; }

/* Table */
.card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 24px; }
.table-responsive { overflow-x: auto; }
.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.modern-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.modern-table th { text-align: left; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; border-bottom: 1px solid #E2E8F0; white-space: nowrap; }
.modern-table td { padding: 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
.modern-table tr:hover { background: #F8FAFC; }

.place-cell { display: flex; align-items: center; gap: 12px; }
.place-avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #0A4568 0%, #0D5A87 100%); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 16px; flex-shrink: 0; }
.place-avatar.large { width: 56px; height: 56px; font-size: 22px; border-radius: 14px; }
.place-name { font-weight: 600; color: #1E293B; }
.place-date { font-size: 12px; color: #94A3B8; }

.owner-name { font-weight: 500; color: #1E293B; }
.owner-email { color: #64748B; font-size: 13px; }

.type-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.type-badge.private { background: #EDE9FE; color: #7C3AED; }
.type-badge.public { background: #DBEAFE; color: #2563EB; }

.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-badge.success { background: #D1FAE5; color: #059669; }
.status-badge.warning { background: #FEF3C7; color: #D97706; }

.action-buttons { display: flex; gap: 8px; }
.btn-action { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-action svg { width: 16px; height: 16px; }
.btn-action.view { background: #DBEAFE; color: #2563EB; }
.btn-action.view:hover { background: #BFDBFE; }
.btn-action.verify { background: #D1FAE5; color: #059669; }
.btn-action.verify:hover { background: #A7F3D0; }
.btn-action.delete { background: #FEE2E2; color: #DC2626; }
.btn-action.delete:hover { background: #FECACA; }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { margin-bottom: 16px; }
.empty-icon svg { width: 48px; height: 48px; color: #CBD5E1; }
.empty-state p { color: #64748B; font-size: 14px; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0; }
.pagination button { width: 36px; height: 36px; border: 1px solid #E2E8F0; background: white; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.pagination button:hover:not(:disabled) { background: #F1F5F9; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination button svg { width: 18px; height: 18px; color: #475569; }
.page-info { font-size: 14px; color: #64748B; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 640px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
.modal.large { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E2E8F0; }
.modal-header h3 { font-size: 18px; font-weight: 600; color: #1E293B; }
.close-btn { background: none; border: none; font-size: 28px; color: #64748B; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #1E293B; }
.modal-body { flex: 1; overflow-y: auto; padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 24px; border-top: 1px solid #E2E8F0; }
.modal-loading { display: flex; justify-content: center; padding: 60px; }

.detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #E2E8F0; }
.detail-header h4 { font-size: 20px; font-weight: 600; color: #1E293B; margin-bottom: 4px; }
.detail-header p { font-size: 14px; color: #64748B; margin-bottom: 8px; }

.section-title { font-size: 13px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; margin-top: 24px; }
.section-title:first-of-type { margin-top: 0; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item .label { font-size: 12px; color: #94A3B8; }
.detail-item .value { font-size: 14px; font-weight: 500; color: #1E293B; }
.detail-item .value.highlight { color: #0A4568; font-weight: 600; }

.programs-section { margin-top: 24px; }
.programs-list { display: flex; flex-direction: column; gap: 8px; }
.program-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #F8FAFC; border-radius: 8px; font-size: 14px; }
.program-item .price { font-weight: 600; color: #0A4568; }

.btn-secondary { padding: 10px 20px; background: #F1F5F9; color: #475569; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-secondary:hover { background: #E2E8F0; }
.btn-success { padding: 10px 20px; background: #10B981; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-success:hover { background: #059669; }
.btn-warning { padding: 10px 20px; background: #F59E0B; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-warning:hover { background: #D97706; }
.btn-danger { padding: 10px 20px; background: #DC2626; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-danger:hover { background: #B91C1C; }

/* Toast */
.toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; font-weight: 500; z-index: 200; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.toast.success { background: #D1FAE5; color: #059669; }
.toast.warning { background: #FEF3C7; color: #D97706; }
.toast.error { background: #FEE2E2; color: #DC2626; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s; }
.slide-enter-from, .slide-leave-to { transform: translateX(100px); opacity: 0; }

/* Reject button & misc */
.btn-action.reject { background: #FEF3C7; color: #D97706; }
.btn-action.reject:hover { background: #FDE68A; }
.rejection-reason { display: block; font-size: 12px; color: #DC2626; margin-top: 8px; font-style: italic; }
.form-label { display: block; font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 8px; }
.form-textarea { width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 10px; font-size: 14px; resize: vertical; font-family: inherit; }
.form-textarea:focus { outline: none; border-color: #0A4568; }
.modal.small { max-width: 480px; }
.stat-icon-box.red { background: #FEE2E2; color: #DC2626; }
.status-badge.error { background: #FEE2E2; color: #DC2626; }

@media (max-width: 1024px) {
  .stats-row { flex-wrap: wrap; }
  .stat-mini { flex: 1; min-width: 140px; }
}

@media (max-width: 768px) {
  .main-content { padding: 16px; }
  .stats-row { flex-direction: column; }
  .stat-mini { min-width: 100%; }
  .filters-bar { flex-direction: column; }
  .search-box { max-width: 100%; }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
