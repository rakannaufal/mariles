<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const users = ref([])
const searchQuery = ref('')
const roleFilter = ref('all')
const currentPage = ref(1)
const itemsPerPage = 10
const totalUsers = ref(0)

// Stats
const stats = ref({
  total: 0,
  students: 0,
  teachers: 0,
  owners: 0,
  admins: 0
})

// Modal
const showModal = ref(false)
const selectedUser = ref(null)
const userDetails = ref(null)
const loadingDetails = ref(false)

onMounted(async () => {
  await fetchStats()
  await fetchUsers()
})

watch([roleFilter, currentPage], () => {
  fetchUsers()
})

async function fetchStats() {
  try {
    const { count: total } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: students } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student')
    const { count: teachers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher')
    const { count: owners } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'owner')
    const { count: admins } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin')
    
    stats.value = { total: total || 0, students: students || 0, teachers: teachers || 0, owners: owners || 0, admins: admins || 0 }
  } catch (err) {
    console.error('Error fetching stats:', err)
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    let query = supabase
      .from('users')
      .select('id, name, email, phone, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage - 1)

    if (roleFilter.value !== 'all') {
      query = query.eq('role', roleFilter.value)
    }

    if (searchQuery.value) {
      query = query.or(`name.ilike.%${searchQuery.value}%,email.ilike.%${searchQuery.value}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    users.value = data || []
    totalUsers.value = count || 0
  } catch (err) {
    console.error('Error fetching users:', err)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchUsers()
}

async function viewUserDetails(user) {
  selectedUser.value = user
  showModal.value = true
  loadingDetails.value = true

  try {
    // Fetch additional details based on role
    if (user.role === 'student') {
      const { data } = await supabase
        .from('students')
        .select('*, bookings(id, status, programs(name))')
        .eq('user_id', user.id)
        .single()
      userDetails.value = data
    } else if (user.role === 'teacher') {
      const { data } = await supabase
        .from('teachers')
        .select('*, les_places(name)')
        .eq('user_id', user.id)
        .single()
      userDetails.value = data
    } else if (user.role === 'owner') {
      const { data } = await supabase
        .from('owners')
        .select('*, les_places(id, name, is_verified)')
        .eq('user_id', user.id)
        .single()
      userDetails.value = data
    }
  } catch (err) {
    console.error('Error fetching user details:', err)
  } finally {
    loadingDetails.value = false
  }
}

async function deleteUser(user) {
  if (!confirm(`Hapus pengguna "${user.name}"? Tindakan ini tidak dapat dibatalkan.`)) return

  try {
    await supabase.from('users').delete().eq('id', user.id)
    await fetchUsers()
    await fetchStats()
    showModal.value = false
  } catch (err) {
    console.error('Error deleting user:', err)
    alert('Gagal menghapus pengguna')
  }
}

const totalPages = computed(() => Math.ceil(totalUsers.value / itemsPerPage))

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getRoleInfo(role) {
  const roles = {
    student: { label: 'Siswa', class: 'info' },
    teacher: { label: 'Guru', class: 'success' },
    owner: { label: 'Pemilik', class: 'warning' },
    admin: { label: 'Admin', class: 'error' }
  }
  return roles[role] || { label: role, class: 'info' }
}
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <main class="main-content">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Manajemen Pengguna
          </h1>
          <p class="subtitle">Kelola semua pengguna platform Mariles</p>
        </div>
      </header>

      <!-- Stats Cards -->
      <section class="stats-row">
        <div class="stat-mini" @click="roleFilter = 'all'; currentPage = 1" :class="{ active: roleFilter === 'all' }">
          <div class="stat-icon-box blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">Semua</span>
          </div>
        </div>
        <div class="stat-mini" @click="roleFilter = 'student'; currentPage = 1" :class="{ active: roleFilter === 'student' }">
          <div class="stat-icon-box cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.students }}</span>
            <span class="stat-label">Siswa</span>
          </div>
        </div>
        <div class="stat-mini" @click="roleFilter = 'teacher'; currentPage = 1" :class="{ active: roleFilter === 'teacher' }">
          <div class="stat-icon-box green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.teachers }}</span>
            <span class="stat-label">Guru</span>
          </div>
        </div>
        <div class="stat-mini" @click="roleFilter = 'owner'; currentPage = 1" :class="{ active: roleFilter === 'owner' }">
          <div class="stat-icon-box orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.owners }}</span>
            <span class="stat-label">Pemilik</span>
          </div>
        </div>
        <div class="stat-mini" @click="roleFilter = 'admin'; currentPage = 1" :class="{ active: roleFilter === 'admin' }">
          <div class="stat-icon-box red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.admins }}</span>
            <span class="stat-label">Admin</span>
          </div>
        </div>
      </section>

      <!-- Filters -->
      <section class="filters-bar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Cari nama atau email..."
            @keyup.enter="handleSearch"
          >
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''; handleSearch()">&times;</button>
        </div>
        <button class="btn-search" @click="handleSearch">Cari</button>
      </section>

      <!-- Table -->
      <section class="card table-card">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else>
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Role</th>
                  <th>Telepon</th>
                  <th>Bergabung</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>
                    <div class="user-cell">
                      <div class="avatar" :class="user.role">
                        {{ user.name?.charAt(0) || 'U' }}
                      </div>
                      <div>
                        <div class="user-name">{{ user.name || 'Tidak ada nama' }}</div>
                        <div class="user-email">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="role-badge" :class="getRoleInfo(user.role).class">
                      {{ getRoleInfo(user.role).label }}
                    </span>
                  </td>
                  <td>{{ user.phone || '-' }}</td>
                  <td class="text-muted">{{ formatDate(user.created_at) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-action view" @click="viewUserDetails(user)" title="Lihat Detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button class="btn-action delete" @click="deleteUser(user)" title="Hapus">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="users.length === 0">
                  <td colspan="5" class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    <p>Tidak ada pengguna ditemukan</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
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

      <!-- User Detail Modal -->
      <Teleport to="body">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal">
            <div class="modal-header">
              <h3>Detail Pengguna</h3>
              <button class="close-btn" @click="showModal = false">&times;</button>
            </div>
            <div v-if="selectedUser" class="modal-body">
              <div class="user-profile-header">
                <div class="avatar large" :class="selectedUser.role">
                  {{ selectedUser.name?.charAt(0) || 'U' }}
                </div>
                <div class="user-profile-info">
                  <h4>{{ selectedUser.name || 'Tidak ada nama' }}</h4>
                  <span class="role-badge" :class="getRoleInfo(selectedUser.role).class">
                    {{ getRoleInfo(selectedUser.role).label }}
                  </span>
                </div>
              </div>

              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Email</span>
                  <span class="detail-value">{{ selectedUser.email }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Telepon</span>
                  <span class="detail-value">{{ selectedUser.phone || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Bergabung</span>
                  <span class="detail-value">{{ formatDate(selectedUser.created_at) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">User ID</span>
                  <span class="detail-value code">{{ selectedUser.id }}</span>
                </div>
              </div>

              <!-- Role-specific details -->
              <div v-if="loadingDetails" class="loading-details">
                <div class="spinner-sm"></div>
                <span>Memuat detail...</span>
              </div>

              <div v-else-if="userDetails" class="extra-details">
                <h5>Informasi Tambahan</h5>
                
                <!-- Student details -->
                <div v-if="selectedUser.role === 'student' && userDetails.bookings">
                  <div class="detail-item">
                    <span class="detail-label">Total Booking</span>
                    <span class="detail-value">{{ userDetails.bookings?.length || 0 }} kelas</span>
                  </div>
                </div>

                <!-- Teacher details -->
                <div v-if="selectedUser.role === 'teacher'">
                  <div class="detail-item">
                    <span class="detail-label">Tempat Les</span>
                    <span class="detail-value">{{ userDetails.les_places?.name || '-' }}</span>
                  </div>
                </div>

                <!-- Owner details -->
                <div v-if="selectedUser.role === 'owner' && userDetails.les_places">
                  <div class="detail-item">
                    <span class="detail-label">Tempat Les</span>
                    <span class="detail-value">{{ userDetails.les_places?.length || 0 }} cabang</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showModal = false">Tutup</button>
              <button class="btn-danger" @click="deleteUser(selectedUser)">Hapus Pengguna</button>
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

/* Header */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.header-left h1 svg { width: 28px; height: 28px; color: #0A4568; }
.subtitle { font-size: 14px; color: #64748B; }

/* Stats Row */
.stats-row { display: flex; gap: 12px; margin-bottom: 24px; }
.stat-mini { flex: 1; display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: white; border: 2px solid #E2E8F0; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.stat-mini:hover { border-color: #CBD5E1; }
.stat-mini.active { border-color: #0A4568; background: #F0F9FF; }
.stat-icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon-box svg { width: 22px; height: 22px; }
.stat-icon-box.blue { background: #F1F5F9; color: #0D5782; }
.stat-icon-box.cyan { background: #F1F5F9; color: #0D5782; }
.stat-icon-box.green { background: #F1F5F9; color: #0D5782; }
.stat-icon-box.orange { background: #F1F5F9; color: #0D5782; }
.stat-icon-box.red { background: #F1F5F9; color: #0D5782; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 20px; font-weight: 700; color: #1E293B; }
.stat-label { font-size: 12px; color: #64748B; }

/* Filters */
.filters-bar { display: flex; gap: 12px; margin-bottom: 24px; }
.search-box { flex: 1; max-width: 400px; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; }
.search-box svg { width: 20px; height: 20px; color: #94A3B8; flex-shrink: 0; }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; }
.clear-btn { background: none; border: none; font-size: 20px; color: #94A3B8; cursor: pointer; }
.btn-search { padding: 12px 24px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-search:hover { background: #0D5A87; }

/* Card & Table */
.card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 24px; }
.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.table-responsive { overflow-x: auto; }
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { text-align: left; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; border-bottom: 1px solid #E2E8F0; }
.modern-table td { padding: 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #F1F5F9; }
.modern-table tr:hover { background: #F8FAFC; }

.user-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 16px; color: white; }
.avatar.student { background: linear-gradient(135deg, #3B82F6, #2563EB); }
.avatar.teacher { background: linear-gradient(135deg, #10B981, #059669); }
.avatar.owner { background: linear-gradient(135deg, #F59E0B, #D97706); }
.avatar.admin { background: linear-gradient(135deg, #EF4444, #DC2626); }
.avatar.large { width: 64px; height: 64px; font-size: 24px; }

.user-name { font-weight: 600; color: #1E293B; }
.user-email { font-size: 12px; color: #64748B; }

.role-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.role-badge.info { background: #DBEAFE; color: #2563EB; }
.role-badge.success { background: #D1FAE5; color: #059669; }
.role-badge.warning { background: #FEF3C7; color: #D97706; }
.role-badge.error { background: #FEE2E2; color: #DC2626; }

.text-muted { color: #64748B; }

.action-buttons { display: flex; gap: 8px; }
.btn-action { width: 32px; height: 32px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-action svg { width: 16px; height: 16px; }
.btn-action.view { background: #DBEAFE; color: #2563EB; }
.btn-action.view:hover { background: #BFDBFE; }
.btn-action.delete { background: #FEE2E2; color: #DC2626; }
.btn-action.delete:hover { background: #FECACA; }

.empty-state { text-align: center; padding: 40px; }
.empty-state svg { width: 48px; height: 48px; color: #94A3B8; margin-bottom: 12px; }
.empty-state p { color: #64748B; }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0; }
.pagination button { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination button svg { width: 18px; height: 18px; color: #475569; }
.page-info { font-size: 14px; color: #64748B; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 500px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E2E8F0; }
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn { background: none; border: none; font-size: 28px; color: #64748B; cursor: pointer; line-height: 1; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 24px; border-top: 1px solid #E2E8F0; }

.user-profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.user-profile-info h4 { font-size: 20px; font-weight: 600; color: #1E293B; margin-bottom: 8px; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-label { font-size: 12px; color: #64748B; }
.detail-value { font-size: 14px; font-weight: 500; color: #1E293B; }
.detail-value.code { font-family: monospace; font-size: 11px; background: #F1F5F9; padding: 4px 8px; border-radius: 4px; word-break: break-all; }

.extra-details { margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0; }
.extra-details h5 { font-size: 14px; font-weight: 600; color: #64748B; margin-bottom: 16px; }

.loading-details { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px; color: #64748B; }
.spinner-sm { width: 20px; height: 20px; border: 2px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; }

.btn-secondary { padding: 10px 20px; background: #F1F5F9; color: #475569; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-danger { padding: 10px 20px; background: #DC2626; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-danger:hover { background: #B91C1C; }

@media (max-width: 768px) {
  .stats-row { flex-direction: column; }
  .stat-mini { min-width: 100%; }
  .filters-bar { flex-direction: column; }
  .search-box { max-width: 100%; }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
