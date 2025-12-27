<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { createBulkNotifications, NOTIFICATION_TYPES } from '@/services/notificationService'

const loading = ref(true)
const sending = ref(false)

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// Form
const showModal = ref(false)
const notificationForm = ref({
  title: '',
  message: '',
  type: 'announcement',
  targetRoles: ['student', 'teacher', 'owner']
})

// Notifications history
const sentNotifications = ref([])

const notificationTypes = [
  { value: 'announcement', label: 'Pengumuman', desc: 'Informasi umum' },
  { value: 'promo', label: 'Promo', desc: 'Penawaran khusus' },
  { value: 'maintenance', label: 'Maintenance', desc: 'Jadwal perawatan' },
  { value: 'update', label: 'Update', desc: 'Fitur baru' }
]

const roleOptions = [
  { value: 'student', label: 'Siswa' },
  { value: 'teacher', label: 'Guru' },
  { value: 'owner', label: 'Pemilik' }
]

onMounted(async () => {
  await fetchNotifications()
})

async function fetchNotifications() {
  loading.value = true
  try {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, type, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    sentNotifications.value = data || []
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

function openModal() {
  notificationForm.value = {
    title: '',
    message: '',
    type: 'announcement',
    targetRoles: ['student', 'teacher', 'owner']
  }
  showModal.value = true
}

async function sendNotification() {
  if (!notificationForm.value.title || !notificationForm.value.message) {
    toast('Judul dan pesan harus diisi', 'error')
    return
  }

  if (notificationForm.value.targetRoles.length === 0) {
    toast('Pilih minimal satu target role', 'error')
    return
  }

  sending.value = true
  try {
    // Get all users with selected roles
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .in('role', notificationForm.value.targetRoles)

    if (!users || users.length === 0) {
      toast('Tidak ada pengguna yang cocok', 'warning')
      return
    }

    // Create bulk notifications
    const notifications = users.map(user => ({
      user_id: user.id,
      type: notificationForm.value.type,
      title: notificationForm.value.title,
      message: notificationForm.value.message,
      data: { from: 'admin', broadcast: true }
    }))

    await createBulkNotifications(notifications)
    
    toast(`Notifikasi berhasil dikirim ke ${users.length} pengguna!`, 'success')
    showModal.value = false
    await fetchNotifications()
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal mengirim notifikasi', 'error')
  } finally {
    sending.value = false
  }
}

function toggleRole(role) {
  const idx = notificationForm.value.targetRoles.indexOf(role)
  if (idx > -1) {
    notificationForm.value.targetRoles.splice(idx, 1)
  } else {
    notificationForm.value.targetRoles.push(role)
  }
}

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getTypeInfo(type) {
  const types = {
    announcement: { label: 'Pengumuman', class: 'blue' },
    promo: { label: 'Promo', class: 'green' },
    maintenance: { label: 'Maintenance', class: 'orange' },
    update: { label: 'Update', class: 'purple' }
  }
  return types[type] || { label: type, class: 'gray' }
}
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <Transition name="slide">
      <div v-if="showToast" :class="['toast', toastType]">{{ toastMessage }}</div>
    </Transition>

    <main class="main-content">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Broadcast Notifikasi
          </h1>
          <p class="subtitle">Kirim notifikasi ke semua pengguna platform</p>
        </div>
        <button class="btn-primary" @click="openModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Buat Notifikasi
        </button>
      </header>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <!-- Notifications List -->
      <section v-else class="card">
        <div class="card-header">
          <h3>Riwayat Notifikasi</h3>
        </div>

        <div v-if="sentNotifications.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          </div>
          <h3>Belum Ada Notifikasi</h3>
          <p>Klik "Buat Notifikasi" untuk mengirim broadcast pertama</p>
        </div>

        <div v-else class="notifications-list">
          <div v-for="notif in sentNotifications" :key="notif.id" class="notification-item">
            <div class="notif-icon-box" :class="getTypeInfo(notif.type).class">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div class="notif-content">
              <h4>{{ notif.title }}</h4>
              <p>{{ notif.message }}</p>
              <span class="notif-meta">
                <span class="type-badge" :class="getTypeInfo(notif.type).class">
                  {{ getTypeInfo(notif.type).label }}
                </span>
                <span class="date">{{ formatDate(notif.created_at) }}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Create Modal -->
      <Teleport to="body">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal">
            <div class="modal-header">
              <h3>Buat Notifikasi Broadcast</h3>
              <button class="close-btn" @click="showModal = false">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Judul Notifikasi</label>
                <input v-model="notificationForm.title" type="text" class="form-input" placeholder="contoh: Selamat Tahun Baru!">
              </div>
              
              <div class="form-group">
                <label>Pesan</label>
                <textarea v-model="notificationForm.message" rows="4" class="form-input" placeholder="Tulis pesan notifikasi..."></textarea>
              </div>

              <div class="form-group">
                <label>Tipe Notifikasi</label>
                <div class="type-options">
                  <button 
                    v-for="type in notificationTypes" 
                    :key="type.value"
                    class="type-option"
                    :class="{ active: notificationForm.type === type.value }"
                    @click="notificationForm.type = type.value"
                  >
                    <span class="type-name">{{ type.label }}</span>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>Target Pengguna</label>
                <div class="role-options">
                  <button 
                    v-for="role in roleOptions" 
                    :key="role.value"
                    class="role-option"
                    :class="{ active: notificationForm.targetRoles.includes(role.value) }"
                    @click="toggleRole(role.value)"
                  >
                    <span class="role-name">{{ role.label }}</span>
                    <svg v-if="notificationForm.targetRoles.includes(role.value)" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showModal = false">Batal</button>
              <button class="btn-primary" @click="sendNotification" :disabled="sending">
                {{ sending ? 'Mengirim...' : 'Kirim Notifikasi' }}
              </button>
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

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.page-header h1 svg { width: 28px; height: 28px; color: #0A4568; }
.subtitle { font-size: 14px; color: #64748B; }

.btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-primary svg { width: 18px; height: 18px; }
.btn-primary:disabled { opacity: 0.7; }

.stats-row { display: flex; gap: 20px; margin-bottom: 24px; }
.stat-card { display: flex; align-items: center; gap: 16px; padding: 24px 32px; background: white; border-radius: 16px; border: 1px solid #E2E8F0; }
.stat-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon-box svg { width: 24px; height: 24px; }
.stat-icon-box.blue { background: #DBEAFE; color: #3B82F6; }
.stat-value { display: block; font-size: 28px; font-weight: 700; color: #1E293B; }
.stat-label { font-size: 14px; color: #64748B; }

.loading-state { display: flex; justify-content: center; padding: 80px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Card & List */
.card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; }
.card-header { padding: 20px 24px; border-bottom: 1px solid #E2E8F0; }
.card-header h3 { font-size: 16px; font-weight: 600; }

.empty-state { text-align: center; padding: 60px; }
.empty-icon { margin-bottom: 16px; }
.empty-icon svg { width: 48px; height: 48px; color: #CBD5E1; }
.empty-state h3 { font-size: 18px; font-weight: 600; color: #1E293B; margin-bottom: 8px; }
.empty-state p { color: #64748B; }

.notifications-list { max-height: 600px; overflow-y: auto; }
.notification-item { display: flex; gap: 16px; padding: 20px 24px; border-bottom: 1px solid #F1F5F9; }
.notification-item:last-child { border-bottom: none; }
.notification-item:hover { background: #F8FAFC; }

.notif-icon-box { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notif-icon-box svg { width: 22px; height: 22px; }
.notif-icon-box.blue { background: #DBEAFE; color: #3B82F6; }
.notif-icon-box.green { background: #D1FAE5; color: #10B981; }
.notif-icon-box.orange { background: #FEF3C7; color: #F59E0B; }
.notif-icon-box.purple { background: #EDE9FE; color: #8B5CF6; }

.notif-content { flex: 1; }
.notif-content h4 { font-size: 15px; font-weight: 600; color: #1E293B; margin-bottom: 4px; }
.notif-content p { font-size: 14px; color: #64748B; margin-bottom: 8px; line-height: 1.5; }
.notif-meta { display: flex; align-items: center; gap: 12px; }
.type-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.type-badge.blue { background: #DBEAFE; color: #2563EB; }
.type-badge.green { background: #D1FAE5; color: #059669; }
.type-badge.orange { background: #FEF3C7; color: #D97706; }
.type-badge.purple { background: #EDE9FE; color: #7C3AED; }
.date { font-size: 12px; color: #94A3B8; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 560px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E2E8F0; }
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn { background: none; border: none; font-size: 28px; color: #64748B; cursor: pointer; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; gap: 12px; padding: 20px 24px; border-top: 1px solid #E2E8F0; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; resize: none; }
.form-input:focus { outline: none; border-color: #0A4568; }

.type-options, .role-options { display: flex; gap: 8px; flex-wrap: wrap; }
.type-option, .role-option { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #F8FAFC; border: 2px solid #E2E8F0; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.type-option:hover, .role-option:hover { border-color: #CBD5E1; }
.type-option.active, .role-option.active { border-color: #0A4568; background: #F0F9FF; }
.type-name, .role-name { font-size: 13px; font-weight: 500; }
.check-icon { width: 16px; height: 16px; color: #10B981; }

.btn-secondary { flex: 1; padding: 12px; background: #F1F5F9; color: #475569; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

/* Toast */
.toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; font-weight: 500; z-index: 200; }
.toast.success { background: #D1FAE5; color: #059669; }
.toast.warning { background: #FEF3C7; color: #D97706; }
.toast.error { background: #FEE2E2; color: #DC2626; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s; }
.slide-enter-from, .slide-leave-to { transform: translateX(100px); opacity: 0; }
</style>
