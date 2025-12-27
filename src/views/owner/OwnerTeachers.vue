<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const teachers = ref([])
const categories = ref([]) // Store available categories
const inviteCodes = ref([])
const loading = ref(true)
const loadingCodes = ref(false)
const generatingCode = ref(false)
const showInviteModal = ref(false)
const showDetailModal = ref(false)
const selectedTeacher = ref(null)
const copiedCode = ref(null)
const owner = ref(null)
const lesPlace = ref(null)
const ownerType = ref(null)
const searchQuery = ref('')
const showEditModal = ref(false)
const editingTeacher = ref(null)
const selectedCategoryIds = ref([]) // For checkbox selection
const saving = ref(false)

// Check if owner is type "umum"
const isOwnerUmum = computed(() => ownerType.value === 'umum')

// Stats computed
const totalTeachers = computed(() => teachers.value.length)
const totalActive = computed(() => teachers.value.filter(t => t.is_active !== false).length)
const uniqueSpecializations = computed(() => {
  const specs = new Set()
  teachers.value.forEach(t => {
    if (t.specialization && t.specialization.length) {
      t.specialization.forEach(s => specs.add(s))
    }
  })
  return specs.size
})

// Filter teachers
const filteredTeachers = computed(() => {
  if (!searchQuery.value) return teachers.value
  const query = searchQuery.value.toLowerCase()
  return teachers.value.filter(t => 
    t.users?.name?.toLowerCase().includes(query) ||
    t.users?.email?.toLowerCase().includes(query) ||
    t.specialization?.some(s => s.toLowerCase().includes(query))
  )
})

onMounted(async () => {
  await fetchOwnerData()
  // Wait for owner data to get lesPlace info before fetching programs
  if (lesPlace.value?.id) {
    await Promise.all([
      fetchTeachers(),
      fetchPrograms()
    ])
  } else {
    await fetchTeachers()
  }
})

async function fetchPrograms() {
  try {
    if (!lesPlace.value?.id) return
    
    // Fetch programs specifically for THIS les place to assign teachers to
    const { data } = await supabase
      .from('programs')
      .select('id, name')
      .eq('les_place_id', lesPlace.value.id)
      .order('name')
      
    categories.value = data || []
  } catch (err) {
    console.error('Error fetching programs:', err)
  }
}

async function fetchOwnerData() {
  try {
    const { data: ownerData } = await supabase
      .from('owners')
      .select('id, owner_type')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (ownerData) {
      owner.value = ownerData
      ownerType.value = ownerData.owner_type
      
      // Fetch les place for this owner
      const { data: lesPlaceData } = await supabase
        .from('les_places')
        .select('id, name')
        .eq('owner_id', ownerData.id)
        .single()
      
      lesPlace.value = lesPlaceData
    }
  } catch (err) {
    console.error('Error fetching owner data:', err)
  }
}

async function fetchTeachers() {
  loading.value = true
  try {
    if (!owner.value) return

    const { data, error } = await supabase
      .from('teachers')
      .select('*, users(name, email, phone, avatar_url, gender, birth_date)')
      .eq('owner_id', owner.value.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    teachers.value = data || []
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

async function fetchInviteCodes() {
  loadingCodes.value = true
  try {
    if (!owner.value) return

    const { data } = await supabase
      .from('teacher_invite_codes')
      .select('*, used_by_teacher:used_by(id, users(name))')
      .eq('owner_id', owner.value.id)
      .order('created_at', { ascending: false })

    inviteCodes.value = data || []
  } catch (err) {
    console.error('Error fetching invite codes:', err)
  } finally {
    loadingCodes.value = false
  }
}

async function openInviteModal() {
  showInviteModal.value = true
  await fetchInviteCodes()
}

async function generateNewCode() {
  if (!owner.value) return
  
  generatingCode.value = true
  try {
    const { data, error } = await supabase.rpc('generate_teacher_invite_code', {
      p_owner_id: owner.value.id,
      p_les_place_id: lesPlace.value?.id || null
    })
    
    if (error) throw error
    
    await fetchInviteCodes()
  } catch (err) {
    console.error('Error generating code:', err)
    alert('Gagal generate kode. Silakan coba lagi.')
  } finally {
    generatingCode.value = false
  }
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    copiedCode.value = code
    setTimeout(() => {
      copiedCode.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isExpired(expiresAt) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function getCodeStatus(code) {
  if (code.is_used) return { label: 'Digunakan', class: 'status-used' }
  if (isExpired(code.expires_at)) return { label: 'Kadaluarsa', class: 'status-expired' }
  return { label: 'Aktif', class: 'status-active' }
}

function openTeacherDetail(teacher) {
  selectedTeacher.value = teacher
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedTeacher.value = null
}

function openEditTeacher(teacher) {
  editingTeacher.value = teacher
  // Map existing specializations to category selection if names match
  // Or simply start fresh? Better to try match.
  selectedCategoryIds.value = []
  
  if (teacher.specialization && teacher.specialization.length) {
    // Find categories that match the specialization names
    categories.value.forEach(cat => {
      if (teacher.specialization.includes(cat.name)) {
        selectedCategoryIds.value.push(cat.name)
      }
    })
  }
  showEditModal.value = true
}

async function updateTeacher() {
  saving.value = true
  try {
    // Save selected category NAMES as specialization array
    // This keeps compatibility with existing structure while forcing structured input
    const updates = {
      specialization: selectedCategoryIds.value
    }
    
    const { error } = await supabase
      .from('teachers')
      .update(updates)
      .eq('id', editingTeacher.value.id)
      
    if (error) throw error
    
    // Update local data
    const idx = teachers.value.findIndex(t => t.id === editingTeacher.value.id)
    if (idx !== -1) {
      teachers.value[idx] = { ...teachers.value[idx], ...updates }
    }
    
    showEditModal.value = false
    editingTeacher.value = null
    alert('Penugasan guru berhasil diperbarui')
  } catch (err) {
    console.error('Error updating teacher:', err)
    alert('Gagal memperbarui data guru')
  } finally {
    saving.value = false
  }
}

function calculateAge(birthDate) {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar />

    <main class="main">
      <header class="header">
        <div class="header-left">
          <h1>Kelola Guru</h1>
          <p class="header-desc">Manajemen data guru dan pengajar di tempat les Anda</p>
        </div>
        <button v-if="isOwnerUmum" class="btn btn-primary" @click="openInviteModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Generate Kode Undangan
        </button>
      </header>
      
      <!-- Stats Overview -->
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalTeachers }}</span>
            <span class="stat-label">Total Guru</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalActive }}</span>
            <span class="stat-label">Guru Aktif</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ uniqueSpecializations }}</span>
            <span class="stat-label">Spesialisasi</span>
          </div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" type="text" placeholder="Cari nama, email, atau spesialisasi guru...">
        </div>
      </div>

      <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

      <div v-else-if="filteredTeachers.length" class="teachers-grid">
        <div v-for="teacher in filteredTeachers" :key="teacher.id" class="teacher-card">
          <div class="card-header">
            <div class="teacher-avatar">
              <img :src="teacher.users?.avatar_url || `https://ui-avatars.com/api/?name=${teacher.users?.name}&background=0a4568&color=fff`" :alt="teacher.users?.name">
            </div>
            <div class="teacher-status" :class="teacher.is_active !== false ? 'active' : 'inactive'">
              {{ teacher.is_active !== false ? 'Aktif' : 'Nonaktif' }}
            </div>
          </div>
          
          <div class="card-body">
            <h3 class="teacher-name">{{ teacher.users?.name || 'Nama Tidak Tersedia' }}</h3>
            <p class="teacher-role">{{ teacher.specialization?.[0] || 'Guru Umum' }}</p>
            
            <div class="teacher-details">
              <div class="detail-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>{{ teacher.experience_years || 0 }} tahun pengalaman</span>
              </div>
              <div class="detail-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span class="truncate">{{ teacher.users?.email }}</span>
              </div>
            </div>
          </div>
          
          <div class="card-footer grid-2">
            <button class="btn btn-outline" @click="openTeacherDetail(teacher)">Detail</button>
            <button class="btn btn-primary" @click="openEditTeacher(teacher)">Edit</button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div v-if="searchQuery">
          <h3>Tidak ditemukan</h3>
          <p>Tidak ada guru yang cocok dengan pencarian "{{ searchQuery }}"</p>
        </div>
        <div v-else>
          <h3>Belum ada guru</h3>
          <p v-if="isOwnerUmum">Generate kode undangan untuk mengundang guru bergabung dengan tempat les Anda</p>
          <p v-else>Sebagai owner pribadi, Anda adalah guru di tempat les ini</p>
          <button v-if="isOwnerUmum" class="btn btn-primary" @click="openInviteModal">+ Generate Kode Undangan</button>
        </div>
      </div>
    </main>

    <!-- Invite Code Modal -->
    <div v-if="showInviteModal" class="modal-overlay" @click.self="showInviteModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Kode Undangan Guru</h2>
          <button class="modal-close" @click="showInviteModal = false">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="invite-info">
            <div class="info-icon">💡</div>
            <p>Generate kode undangan untuk mengundang guru bergabung. Kode berlaku selama <strong>7 hari</strong>.</p>
          </div>
          
          <button 
            class="btn btn-primary btn-generate" 
            @click="generateNewCode" 
            :disabled="generatingCode"
          >
            <span v-if="generatingCode">Generating...</span>
            <span v-else>+ Generate Kode Baru</span>
          </button>
          
          <div v-if="loadingCodes" class="loading-state"><div class="loading-spinner"></div></div>
          
          <div v-else-if="inviteCodes.length" class="invite-codes-list">
            <div 
              v-for="code in inviteCodes" 
              :key="code.id" 
              class="invite-code-item"
              :class="{ 'is-used': code.is_used, 'is-expired': isExpired(code.expires_at) && !code.is_used }"
            >
              <div class="code-top">
                <span class="code-value">{{ code.code }}</span>
                <span class="code-status" :class="getCodeStatus(code).class">
                  {{ getCodeStatus(code).label }}
                </span>
              </div>
              <div class="code-bottom">
                <div class="code-meta">
                  <span v-if="code.is_used && code.used_by_teacher?.users?.name">
                    Digunakan: {{ code.used_by_teacher.users.name }}
                  </span>
                  <span v-else-if="!code.is_used && !isExpired(code.expires_at)" class="text-valid">
                    Berlaku s/d {{ formatDate(code.expires_at) }}
                  </span>
                  <span v-else-if="isExpired(code.expires_at)" class="text-expired">
                    Kadaluarsa: {{ formatDate(code.expires_at) }}
                  </span>
                </div>
                <button 
                  v-if="!code.is_used && !isExpired(code.expires_at)"
                  class="btn-copy"
                  @click="copyCode(code.code)"
                >
                  <svg v-if="copiedCode !== code.code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span v-else>Ok!</span>
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-codes">
            <div class="empty-icon-small">🎟️</div>
            <p>Belum ada kode undangan.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Teacher Detail Modal -->
    <div v-if="showDetailModal && selectedTeacher" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h2>Detail Guru</h2>
          <button class="modal-close" @click="closeDetailModal">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="detail-header-profile">
             <div class="detail-avatar">
              <img :src="selectedTeacher.users?.avatar_url || `https://ui-avatars.com/api/?name=${selectedTeacher.users?.name}&background=0a4568&color=fff&size=150`" :alt="selectedTeacher.users?.name">
            </div>
            <div class="detail-header-info">
              <h3 class="detail-name">{{ selectedTeacher.users?.name || 'N/A' }}</h3>
              <p class="detail-subtitle">{{ selectedTeacher.specialization?.join(', ') || 'Guru Umum' }}</p>
              <span class="status-badge" :class="selectedTeacher.is_active !== false ? 'active' : 'inactive'">
                {{ selectedTeacher.is_active !== false ? 'Aktif Mengajar' : 'Tidak Aktif' }}
              </span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4 class="detail-section-title">Informasi Pribadi</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ selectedTeacher.users?.email || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Telepon</span>
                <span class="detail-value">{{ selectedTeacher.users?.phone || '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Jenis Kelamin</span>
                <span class="detail-value">
                  {{ selectedTeacher.users?.gender === 'male' ? 'Laki-laki' : selectedTeacher.users?.gender === 'female' ? 'Perempuan' : '-' }}
                </span>
              </div>
              <div class="detail-item" v-if="selectedTeacher.users?.birth_date">
                <span class="detail-label">Umur</span>
                <span class="detail-value">{{ calculateAge(selectedTeacher.users?.birth_date) }} tahun</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
             <h4 class="detail-section-title">Kualifikasi</h4>
             <div class="detail-grid">
               <div class="detail-item">
                <span class="detail-label">Pengalaman</span>
                <span class="detail-value">{{ selectedTeacher.experience_years || 0 }} tahun</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Pendidikan Terakhir</span>
                <span class="detail-value">{{ selectedTeacher.education || '-' }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Tanggal Bergabung</span>
                <span class="detail-value">{{ formatDate(selectedTeacher.created_at) }}</span>
              </div>
             </div>
          </div>
          
          <div v-if="selectedTeacher.bio" class="detail-bio">
            <span class="detail-label">Bio / Deskripsi Diri</span>
            <p>{{ selectedTeacher.bio }}</p>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Edit Teacher Assignment Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal edit-modal">
        <div class="modal-header">
          <h2>Tugaskan Guru</h2>
          <button class="modal-close" @click="showEditModal = false">&times;</button>
        </div>
        <div class="modal-body form-body">
          <p class="text-sm text-muted mb-4">Pilih <strong>Program</strong> yang akan diajar oleh <strong>{{ editingTeacher?.users?.name }}</strong>:</p>
          
          <div class="categories-grid">
            <label v-for="cat in categories" :key="cat.id" class="checkbox-item">
              <input 
                type="checkbox" 
                :value="cat.name"
                v-model="selectedCategoryIds"
              >
              <span class="checkbox-label">{{ cat.name }}</span>
            </label>
          </div>

          <div v-if="categories.length === 0" class="text-center p-4">
            <span class="text-xs text-muted">Belum ada program tersedia di tempat les ini.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showEditModal = false">Batal</button>
          <button class="btn btn-primary" @click="updateTeacher" :disabled="saving">
            {{ saving ? 'Menyimpan...' : 'Simpan Penugasan' }}
          </button>
        </div>
      </div>
    </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.main{flex:1;padding:var(--spacing-xl);overflow-y:auto}

/* Header */
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--spacing-xl);flex-wrap:wrap;gap:var(--spacing-md)}
.header h1{font-size:var(--font-size-2xl);margin-bottom:4px}
.header-desc{color:var(--text-muted);font-size:var(--font-size-sm)}
.btn-icon{width:18px;height:18px;margin-right:8px}

/* Stats Overview */
.stats-overview{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--spacing-md);margin-bottom:var(--spacing-xl)}
.stat-card{background:white;padding:var(--spacing-lg);border-radius:var(--radius-xl);display:flex;align-items:center;gap:var(--spacing-md);box-shadow:var(--shadow-sm)}
.stat-icon{width:48px;height:48px;border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center}
.stat-icon.primary{background:#eff6ff;color:var(--primary)}
.stat-icon.success{background:#f0fdf4;color:var(--success)}
.stat-icon.warning{background:#fffbeb;color:var(--warning)}
.stat-icon svg{width:24px;height:24px}
.stat-info{display:flex;flex-direction:column}
.stat-value{font-size:24px;font-weight:700;color:var(--text)}
.stat-label{font-size:13px;color:var(--text-muted)}

/* Toolbar */
.toolbar{margin-bottom:var(--spacing-lg)}
.search-box{position:relative;max-width:400px}
.search-box svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:20px;height:20px;color:var(--text-muted)}
.search-box input{width:100%;padding:10px 10px 10px 40px;border:1px solid var(--border);border-radius:var(--radius-lg);font-size:var(--font-size-sm);transition:border-color 0.2s}
.search-box input:focus{outline:none;border-color:var(--primary)}

/* Teachers Grid */
.teachers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--spacing-lg)}
.teacher-card{background:white;border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-sm);transition:all 0.2s ease;border:1px solid var(--border-light)}
.teacher-card:hover{box-shadow:var(--shadow-md);transform:translateY(-4px)}

.card-header{padding:var(--spacing-lg);display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:0}
.teacher-avatar{width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid var(--background)}
.teacher-avatar img{width:100%;height:100%;object-fit:cover}
.teacher-status{font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--radius-full)}
.teacher-status.active{background:#f0fdf4;color:var(--success)}
.teacher-status.inactive{background:#fef2f2;color:var(--error)}

.card-body{padding:var(--spacing-lg)}
.teacher-name{font-size:var(--font-size-md);font-weight:600;color:var(--text);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.teacher-role{font-size:var(--font-size-xs);color:var(--primary);font-weight:500;margin-bottom:var(--spacing-md);text-transform:uppercase;letter-spacing:0.5px}

.teacher-details{display:flex;flex-direction:column;gap:8px}
.detail-row{display:flex;align-items:center;gap:8px;font-size:var(--font-size-sm);color:var(--text-secondary)}
.detail-row svg{width:16px;height:16px;color:var(--text-muted)}
.truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.card-footer{padding:var(--spacing-md) var(--spacing-lg);border-top:1px solid var(--border-light);background:#fafafa}
.card-footer.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.btn-full{width:100%;justify-content:center}

/* Categories Grid for Checkboxes */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.checkbox-item:hover {
  border-color: var(--primary);
  background: #f0f9ff;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-right: 10px;
  accent-color: var(--primary);
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.info-box {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 10px;
  margin-top: 16px;
  color: #92400e;
}

.text-sm { font-size: 14px; }
.text-xs { font-size: 12px; }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.text-center { text-align: center; }
.p-4 { padding: 16px; }

/* Existing Edit Modal Styles */
.edit-modal {
  max-width: 500px;
  width: 100%;
}

.edit-modal .modal-body {
  padding: 24px 32px;
}

.edit-modal .modal-footer {
  padding: 20px 32px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8fafc;
}

.edit-modal .btn {
  padding: 10px 20px;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.edit-modal .btn-primary {
  background: var(--primary);
  color: white;
}

.edit-modal .btn-primary:hover {
  background: var(--primary-dark);
}

.edit-modal .btn-outline {
  background: white;
  border: 1px solid var(--border);
  color: var(--text);
}

.edit-modal .btn-outline:hover {
  background: #f9fafb;
  border-color: var(--text-secondary);
}

/* Loading & Empty */
.loading-state{display:flex;justify-content:center;padding:var(--spacing-3xl)}
.loading-spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.empty-state{background:white;border-radius:var(--radius-xl);padding:40px;text-align:center;box-shadow:var(--shadow-sm)}
.empty-icon{margin-bottom:var(--spacing-md);display:flex;justify-content:center;color:var(--text-muted)}
.empty-icon svg{width:64px;height:64px}
.empty-state h3{font-size:var(--font-size-lg);margin-bottom:8px;color:var(--text)}
.empty-state p{color:var(--text-secondary);margin-bottom:24px;font-size:var(--font-size-sm)}

/* Modal Styles */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:var(--spacing-md)}
.modal{background:white;border-radius:var(--radius-xl);width:100%;max-width:550px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow-lg)}
.modal-header{display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-lg);border-bottom:1px solid var(--border)}
.modal-header h2{font-size:var(--font-size-lg);margin:0;font-weight:700}
.modal-close{background:transparent;border:none;font-size:24px;cursor:pointer;color:var(--text-muted);width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-md)}
.modal-close:hover{background:var(--background)}
.modal-body{padding:0;overflow-y:auto;flex:1}

/* Invite Modal */
.invite-info{background:#eff6ff;padding:var(--spacing-lg);margin:var(--spacing-lg);border-radius:var(--radius-lg);display:flex;gap:var(--spacing-md);align-items:flex-start}
.info-icon{font-size:20px}
.invite-info p{margin:0;font-size:var(--font-size-sm);color:#1e40af;line-height:1.5}
.btn-generate{width:calc(100% - 40px);margin:0 20px 20px}

.invite-codes-list{padding:0 20px 20px;display:flex;flex-direction:column;gap:12px}
.invite-code-item{border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
.invite-code-item.is-used{background:#f9fafb;opacity:0.8}
.invite-code-item.is-expired{background:#fff1f2;border-color:#fecaca}

.code-top{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#fafafa;border-bottom:1px solid var(--border-light)}
.invite-code-item.is-expired .code-top{background:#fff1f2}
.code-value{font-family:monospace;font-size:18px;font-weight:700;letter-spacing:1px;color:var(--text)}

.code-status{font-size:10px;text-transform:uppercase;font-weight:700;padding:2px 8px;border-radius:10px}
.status-active{background:#dcfce7;color:#15803d}
.status-used{background:#dbeafe;color:#1d4ed8}
.status-expired{background:#fee2e2;color:#b91c1c}

.code-bottom{padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
.code-meta{font-size:12px;color:var(--text-muted)}
.text-valid{color:var(--success)}
.text-expired{color:var(--error)}

.btn-copy{border:1px solid var(--border);background:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px;color:var(--text-secondary)}
.btn-copy:hover{border-color:var(--primary);color:var(--primary)}
.btn-copy svg{width:14px;height:14px}

.no-codes{text-align:center;padding:40px;color:var(--text-muted)}
.empty-icon-small{font-size:32px;margin-bottom:8px}

/* Detail Modal Profile */
.detail-header-profile{padding:30px 20px;background:linear-gradient(to right, #0a4568, #0ea5e9);color:white;display:flex;align-items:center;gap:20px}
.detail-avatar{width:80px;height:80px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);overflow:hidden;flex-shrink:0}
.detail-avatar img{width:100%;height:100%;object-fit:cover}
.detail-header-info{flex:1}
.detail-name{font-size:20px;font-weight:700;margin:0 0 4px 0}
.detail-subtitle{opacity:0.9;font-size:14px;margin:0 0 10px 0}
.status-badge{font-size:11px;padding:2px 10px;border-radius:12px;background:rgba(255,255,255,0.2);font-weight:600}
.status-badge.active{background:#dcfce7;color:#15803d}

.detail-section{padding:20px;border-bottom:1px solid var(--border-light)}
.detail-section-title{font-size:14px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:0 0 16px 0}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.detail-item.full-width{grid-column:1 / -1}

.detail-label{display:block;font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase}
.detail-value{font-size:14px;font-weight:500;color:var(--text)}

.detail-bio{padding:20px;background:#f8fafc}
.detail-bio p{margin:0;font-size:14px;line-height:1.6;color:var(--text-secondary)}

@media(max-width:768px){.dashboard{flex-direction:column}.main{padding:var(--spacing-md)}.detail-header-profile{flex-direction:column;text-align:center}.detail-grid{grid-template-columns:1fr}}
</style>
