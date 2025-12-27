<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(true)
const notifications = ref([])
const filter = ref('all')

onMounted(async () => {
  await fetchNotifications()
})

async function fetchNotifications() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authStore.user?.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    notifications.value = data || []
  } catch (err) {
    console.error('Error fetching notifications:', err)
  } finally {
    loading.value = false
  }
}

async function markAsRead(notification) {
  if (notification.is_read) return
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notification.id)
    
    notification.is_read = true
  } catch (err) {
    console.error('Error:', err)
  }
}

async function markAllAsRead() {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', authStore.user?.id)
      .eq('is_read', false)
    
    notifications.value.forEach(n => { n.is_read = true })
  } catch (err) {
    console.error('Error:', err)
  }
}

async function deleteNotification(notification) {
  try {
    await supabase.from('notifications').delete().eq('id', notification.id)
    notifications.value = notifications.value.filter(n => n.id !== notification.id)
  } catch (err) {
    console.error('Error:', err)
  }
}

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') return notifications.value.filter(n => !n.is_read)
  if (filter.value === 'read') return notifications.value.filter(n => n.is_read)
  return notifications.value
})

const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  if (diff < 60000) return 'Baru saja'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} hari lalu`
  
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatFullDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function getTypeLabel(type) {
  const labels = {
    verification_approved: 'Verifikasi Disetujui',
    verification_rejected: 'Verifikasi Ditolak',
    verification_pending: 'Menunggu Verifikasi',
    system: 'Sistem',
    info: 'Informasi'
  }
  return labels[type] || 'Notifikasi'
}

function getTypeClass(type) {
  const classes = {
    verification_approved: 'success',
    verification_rejected: 'error',
    verification_pending: 'warning',
    system: 'info',
    info: 'info'
  }
  return classes[type] || 'info'
}

// Extract rejection reason from message
function extractRejectionReason(message) {
  if (!message) return null
  const match = message.match(/Alasan:\s*(.+)$/i)
  return match ? match[1] : null
}
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar />

    <main class="main-content">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-info">
          <h1>Pusat Notifikasi</h1>
          <p>Pemberitahuan dari admin dan sistem untuk tempat les Anda</p>
        </div>
        <div class="header-actions" v-if="unreadCount > 0">
          <span class="unread-badge">{{ unreadCount }} belum dibaca</span>
          <button class="btn-mark-all" @click="markAllAsRead">
            Tandai Semua Dibaca
          </button>
        </div>
      </header>

      <!-- Filter Tabs -->
      <div class="filter-tabs">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
          Semua ({{ notifications.length }})
        </button>
        <button :class="{ active: filter === 'unread' }" @click="filter = 'unread'">
          Belum Dibaca ({{ unreadCount }})
        </button>
        <button :class="{ active: filter === 'read' }" @click="filter = 'read'">
          Sudah Dibaca
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat notifikasi...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <h3>Tidak Ada Notifikasi</h3>
      </div>

      <!-- Notifications List -->
      <div v-else class="notifications-list">
        <div 
          v-for="notif in filteredNotifications" 
          :key="notif.id" 
          class="notification-card"
          :class="{ unread: !notif.is_read }"
          @click="markAsRead(notif)"
        >
          <!-- Left Indicator -->
          <div class="status-indicator" :class="getTypeClass(notif.type)"></div>
          
          <!-- Main Content -->
          <div class="notification-body">
            <div class="notification-header">
              <span class="type-badge" :class="getTypeClass(notif.type)">
                {{ getTypeLabel(notif.type) }}
              </span>
              <span class="timestamp">{{ formatDate(notif.created_at) }}</span>
            </div>
            
            <h4 class="notification-title">{{ notif.title }}</h4>
            <p class="notification-message">{{ notif.message }}</p>
            
            <!-- Rejection Reason Box (if applicable) -->
            <div v-if="notif.type === 'verification_rejected'" class="rejection-box">
              <div class="rejection-label">Alasan Penolakan:</div>
              <p class="rejection-content">{{ extractRejectionReason(notif.message) || 'Tidak ada alasan yang diberikan' }}</p>
            </div>
            
            <div class="notification-footer">
              <span class="full-date">{{ formatFullDate(notif.created_at) }}</span>
              <div class="footer-actions">
                <button class="btn-delete" @click.stop="deleteNotification(notif)">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F1F5F9; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

/* Header */
.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid #E2E8F0;
}
.header-info h1 { font-size: 28px; font-weight: 700; color: #0F172A; margin-bottom: 6px; }
.header-info p { font-size: 15px; color: #64748B; }

.header-actions { display: flex; align-items: center; gap: 16px; }
.unread-badge { 
  background: #DC2626; 
  color: white; 
  padding: 8px 16px; 
  border-radius: 20px; 
  font-size: 13px; 
  font-weight: 600; 
}
.btn-mark-all { 
  padding: 10px 20px; 
  background: white; 
  border: 1px solid #E2E8F0; 
  border-radius: 8px; 
  font-size: 14px; 
  font-weight: 600; 
  color: #475569; 
  cursor: pointer; 
}
.btn-mark-all:hover { background: #F8FAFC; border-color: #CBD5E1; }

/* Filter Tabs */
.filter-tabs { 
  display: flex; 
  gap: 8px; 
  margin-bottom: 24px; 
}
.filter-tabs button { 
  padding: 12px 24px; 
  background: white; 
  border: 1px solid #E2E8F0; 
  border-radius: 8px; 
  font-size: 14px; 
  font-weight: 600; 
  color: #64748B; 
  cursor: pointer; 
  transition: all 0.2s; 
}
.filter-tabs button:hover { border-color: #CBD5E1; color: #475569; }
.filter-tabs button.active { 
  background: var(--secondary); 
  color: white; 
  border-color: var(--secondary); 
}

/* Loading & Empty */
.loading-state, .empty-state { 
  text-align: center; 
  padding: 80px 40px; 
  background: white; 
  border-radius: 12px; 
  border: 1px solid #E2E8F0; 
}
.spinner { 
  width: 40px; 
  height: 40px; 
  border: 3px solid #E2E8F0; 
  border-top-color: var(--secondary); 
  border-radius: 50%; 
  animation: spin 1s linear infinite; 
  margin: 0 auto 16px; 
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state h3 { font-size: 20px; font-weight: 700; color: #0F172A; margin-bottom: 8px; }
.empty-state p { color: #64748B; }

/* Notifications List */
.notifications-list { display: flex; flex-direction: column; gap: 16px; }

/* Notification Card */
.notification-card { 
  display: flex; 
  background: white; 
  border-radius: 12px; 
  border: 1px solid #E2E8F0; 
  overflow: hidden;
  cursor: pointer; 
  transition: all 0.2s; 
}
.notification-card:hover { 
  border-color: #CBD5E1; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.06); 
}
.notification-card.unread { 
  background: #F0F9FF; 
  border-color: #BAE6FD; 
}

/* Status Indicator */
.status-indicator { 
  width: 6px; 
  flex-shrink: 0; 
}
.status-indicator.success { background: #22C55E; }
.status-indicator.error { background: #DC2626; }
.status-indicator.warning { background: #F59E0B; }
.status-indicator.info { background: #3B82F6; }

/* Notification Body */
.notification-body { 
  flex: 1; 
  padding: 24px; 
}

.notification-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 12px; 
}

.type-badge { 
  padding: 6px 14px; 
  border-radius: 6px; 
  font-size: 12px; 
  font-weight: 700; 
  text-transform: uppercase; 
  letter-spacing: 0.5px; 
}
.type-badge.success { background: #D1FAE5; color: #059669; }
.type-badge.error { background: #FEE2E2; color: #DC2626; }
.type-badge.warning { background: #FEF3C7; color: #D97706; }
.type-badge.info { background: #DBEAFE; color: #2563EB; }

.timestamp { font-size: 13px; color: #94A3B8; }

.notification-title { 
  font-size: 18px; 
  font-weight: 700; 
  color: #0F172A; 
  margin-bottom: 8px; 
}

.notification-message { 
  font-size: 15px; 
  color: #475569; 
  line-height: 1.6; 
  margin-bottom: 16px; 
}

/* Rejection Box */
.rejection-box { 
  background: #FEF2F2; 
  border: 1px solid #FECACA; 
  border-radius: 8px; 
  padding: 16px; 
  margin-bottom: 16px; 
}
.rejection-label { 
  font-size: 12px; 
  font-weight: 700; 
  color: #991B1B; 
  text-transform: uppercase; 
  letter-spacing: 0.5px; 
  margin-bottom: 8px; 
}
.rejection-content { 
  font-size: 14px; 
  color: #7F1D1D; 
  line-height: 1.5; 
  margin: 0;
}

/* Footer */
.notification-footer { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding-top: 16px; 
  border-top: 1px solid #F1F5F9; 
}

.full-date { font-size: 13px; color: #94A3B8; }

.footer-actions { display: flex; gap: 12px; }

.btn-view { 
  padding: 8px 16px; 
  background: var(--secondary); 
  color: white; 
  border-radius: 6px; 
  font-size: 13px; 
  font-weight: 600; 
  text-decoration: none; 
}
.btn-view:hover { background: var(--secondary-dark); }

.btn-delete { 
  padding: 8px 16px; 
  background: transparent; 
  border: 1px solid #E2E8F0; 
  color: #64748B; 
  border-radius: 6px; 
  font-size: 13px; 
  font-weight: 600; 
  cursor: pointer; 
}
.btn-delete:hover { background: #FEE2E2; border-color: #FECACA; color: #DC2626; }

/* Responsive */
@media (max-width: 768px) {
  .main-content { padding: 16px; }
  .page-header { flex-direction: column; gap: 16px; }
  .header-actions { width: 100%; justify-content: flex-start; }
  .filter-tabs { flex-wrap: wrap; }
  .notification-footer { flex-direction: column; gap: 12px; align-items: flex-start; }
  .footer-actions { width: 100%; }
}
</style>
