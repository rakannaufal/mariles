<script setup>
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
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id)

    if (!error) {
      notification.is_read = true
    }
  } catch (err) {
    console.error('Error marking as read:', err)
  }
}

async function markAllAsRead() {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', authStore.user?.id)
      .eq('is_read', false)

    if (!error) {
      notifications.value.forEach(n => n.is_read = true)
    }
  } catch (err) {
    console.error('Error marking all as read:', err)
  }
}

async function deleteNotification(notification) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification.id)

    if (!error) {
      notifications.value = notifications.value.filter(n => n.id !== notification.id)
    }
  } catch (err) {
    console.error('Error deleting notification:', err)
  }
}

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') return notifications.value.filter(n => !n.is_read)
  if (filter.value === 'read') return notifications.value.filter(n => n.is_read)
  return notifications.value
})

const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

function formatDate(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTypeConfig(type) {
  const configs = {
    info: { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'blue', label: 'Info' },
    success: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green', label: 'Berhasil' },
    warning: { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'yellow', label: 'Peringatan' },
    error: { icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'red', label: 'Error' },
    payment: { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'purple', label: 'Pembayaran' },
    schedule: { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'indigo', label: 'Jadwal' },
    
    // New types
    program_purchased: { icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z', color: 'green', label: 'Program Dibeli' },
    report_investigating: { icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', color: 'blue', label: 'Investigasi Laporan' },
    report_resolved: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'green', label: 'Laporan Selesai' },
    report_dismissed: { icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'gray', label: 'Laporan Ditolak' },
    content_removed: { icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', color: 'red', label: 'Konten Dihapus' }
  }
  return configs[type] || configs.info
}
</script>

<template>
  <div class="dashboard">

    <main class="main-content">
      <!-- Header -->
      <header class="page-header">
        <div class="header-content">
          <div class="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div class="header-text">
            <h1>Pusat Notifikasi</h1>
            <p>Pemberitahuan dan update terbaru untuk aktivitas belajar Anda</p>
          </div>
        </div>
        <div class="header-actions">
          <span v-if="unreadCount > 0" class="unread-indicator">
            {{ unreadCount }} belum dibaca
          </span>
          <button v-if="unreadCount > 0" class="btn-mark-all" @click="markAllAsRead">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Tandai Semua Dibaca
          </button>
        </div>
      </header>

      <!-- Filter Tabs -->
      <div class="filter-section">
        <div class="filter-tabs">
          <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path></svg>
            Semua
            <span class="badge">{{ notifications.length }}</span>
          </button>
          <button :class="{ active: filter === 'unread' }" @click="filter = 'unread'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
            Belum Dibaca
            <span class="badge highlight" v-if="unreadCount > 0">{{ unreadCount }}</span>
            <span class="badge" v-else>0</span>
          </button>
          <button :class="{ active: filter === 'read' }" @click="filter = 'read'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Sudah Dibaca
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content-area">
        <!-- Loading State -->
        <div v-if="loading" class="state-container">
          <div class="loading-spinner"></div>
          <h3>Memuat notifikasi...</h3>
          <p>Mohon tunggu sebentar</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredNotifications.length === 0" class="state-container empty">
          <div class="empty-illustration">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          </div>
          <h3>{{ filter === 'all' ? 'Belum Ada Notifikasi' : filter === 'unread' ? 'Semua Sudah Dibaca!' : 'Tidak Ada yang Sudah Dibaca' }}</h3>
          <p>{{ filter === 'all' ? 'Notifikasi tentang kelas, pembayaran, dan aktivitas Anda akan muncul di sini' : filter === 'unread' ? 'Anda sudah membaca semua notifikasi' : 'Klik notifikasi untuk menandai sebagai dibaca' }}</p>
        </div>

        <!-- Notifications List -->
        <div v-else class="notifications-list">
          <TransitionGroup name="list">
            <div 
              v-for="notif in filteredNotifications" 
              :key="notif.id" 
              class="notification-card"
              :class="{ unread: !notif.is_read, [getTypeConfig(notif.type).color]: true }"
              @click="markAsRead(notif)"
            >
              <div class="notif-indicator" :class="getTypeConfig(notif.type).color"></div>
              
              <div class="notif-icon" :class="getTypeConfig(notif.type).color">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path :d="getTypeConfig(notif.type).icon"></path>
                </svg>
              </div>
              
              <div class="notif-body">
                <div class="notif-header">
                  <h4>{{ notif.title }}</h4>
                  <span v-if="!notif.is_read" class="new-badge">Baru</span>
                </div>
                <p class="notif-message">{{ notif.message }}</p>
                <div class="notif-footer">
                  <span class="notif-type" :class="getTypeConfig(notif.type).color">
                    {{ getTypeConfig(notif.type).label }}
                  </span>
                  <span class="notif-time">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {{ formatDate(notif.created_at) }}
                  </span>
                </div>
              </div>
              
              <div class="notif-actions">
                <button class="btn-action delete" @click.stop="deleteNotification(notif)" title="Hapus">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </TransitionGroup>
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
  align-items: center; 
  margin-bottom: 28px;
  padding: 24px 28px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.header-content { display: flex; align-items: center; gap: 20px; }

.header-icon { 
  width: 56px; 
  height: 56px; 
  background: linear-gradient(135deg, #0A4568, #1E6B8C);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.header-icon svg { width: 28px; height: 28px; color: white; }

.header-text h1 { font-size: 24px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.header-text p { font-size: 14px; color: #64748B; }

.header-actions { display: flex; align-items: center; gap: 16px; }

.unread-indicator { 
  padding: 8px 16px; 
  background: #FEF3C7; 
  color: #B45309; 
  font-size: 13px; 
  font-weight: 600; 
  border-radius: 20px; 
}

.btn-mark-all { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  padding: 12px 20px; 
  background: #0A4568; 
  color: white; 
  border: none; 
  border-radius: 10px; 
  font-size: 14px; 
  font-weight: 600; 
  cursor: pointer; 
  transition: all 0.2s; 
}
.btn-mark-all:hover { background: #083350; transform: translateY(-1px); }
.btn-mark-all svg { width: 18px; height: 18px; }

/* Stats Row */
.stats-row { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 20px; 
  margin-bottom: 24px; 
}

.stat-card { 
  display: flex; 
  align-items: center; 
  gap: 16px; 
  padding: 20px 24px; 
  background: white; 
  border-radius: 14px; 
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.stat-icon { 
  width: 50px; 
  height: 50px; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}
.stat-icon svg { width: 26px; height: 26px; }
.stat-icon.all { background: #DBEAFE; color: #3B82F6; }
.stat-icon.unread { background: #FEF3C7; color: #D97706; }
.stat-icon.read { background: #D1FAE5; color: #059669; }

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 20px; font-weight: 700; color: #1E293B; line-height: 1; }
.stat-label { font-size: 13px; color: #64748B; margin-top: 4px; }

/* Filter Section */
.filter-section { margin-bottom: 24px; }

.filter-tabs { 
  display: flex; 
  gap: 12px; 
  padding: 6px;
  background: white;
  border-radius: 12px;
  width: fit-content;
}

.filter-tabs button { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  padding: 12px 20px; 
  background: transparent;
  border: none; 
  border-radius: 8px; 
  font-size: 14px; 
  font-weight: 500; 
  color: #64748B; 
  cursor: pointer; 
  transition: all 0.2s; 
}
.filter-tabs button svg { width: 18px; height: 18px; }
.filter-tabs button:hover { background: #F8FAFC; color: #334155; }
.filter-tabs button.active { background: #0A4568; color: white; }

.badge { 
  padding: 2px 8px; 
  background: #E2E8F0; 
  border-radius: 20px; 
  font-size: 12px; 
  font-weight: 600; 
}
.filter-tabs button.active .badge { background: rgba(255,255,255,0.2); color: white; }
.badge.highlight { background: #EF4444; color: white; }

/* Content Area */
.content-area { 
  background: white; 
  border-radius: 16px; 
  padding: 24px;
  min-height: 400px;
}

/* States */
.state-container { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  padding: 80px 40px; 
  text-align: center; 
}

.loading-spinner { 
  width: 48px; 
  height: 48px; 
  border: 4px solid #E2E8F0; 
  border-top-color: #0A4568; 
  border-radius: 50%; 
  animation: spin 1s linear infinite; 
  margin-bottom: 20px; 
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-illustration { 
  width: 120px; 
  height: 120px; 
  background: linear-gradient(135deg, #F1F5F9, #E2E8F0);
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  margin-bottom: 24px; 
}
.empty-illustration svg { width: 56px; height: 56px; color: #94A3B8; }

.state-container h3 { font-size: 20px; font-weight: 600; color: #1E293B; margin-bottom: 8px; }
.state-container p { font-size: 14px; color: #64748B; max-width: 360px; }

/* Notification Cards */
.notifications-list { display: flex; flex-direction: column; gap: 12px; }

.notification-card { 
  display: flex; 
  align-items: flex-start; 
  gap: 16px; 
  padding: 20px;
  background: #F8FAFC;
  border-radius: 14px; 
  cursor: pointer; 
  transition: all 0.2s;
  position: relative;
  border: 1px solid transparent;
}
.notification-card:hover { 
  background: white; 
  border-color: #E2E8F0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
  transform: translateY(-2px);
}
.notification-card.unread { 
  background: white; 
  border-left: 4px solid #3B82F6;
}

.notif-indicator { 
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 14px 0 0 14px;
}
.notif-indicator.blue { background: #3B82F6; }
.notif-indicator.green { background: #10B981; }
.notif-indicator.yellow { background: #F59E0B; }
.notif-indicator.red { background: #EF4444; }
.notif-indicator.purple { background: #8B5CF6; }
.notif-indicator.indigo { background: #6366F1; }

.notif-icon { 
  width: 48px; 
  height: 48px; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  flex-shrink: 0; 
}
.notif-icon svg { width: 24px; height: 24px; }
.notif-icon.blue { background: #DBEAFE; color: #3B82F6; }
.notif-icon.green { background: #D1FAE5; color: #10B981; }
.notif-icon.yellow { background: #FEF3C7; color: #F59E0B; }
.notif-icon.red { background: #FEE2E2; color: #EF4444; }
.notif-icon.purple { background: #EDE9FE; color: #8B5CF6; }
.notif-icon.indigo { background: #E0E7FF; color: #6366F1; }

.notif-body { flex: 1; min-width: 0; }

.notif-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.notif-header h4 { font-size: 15px; font-weight: 600; color: #1E293B; }

.new-badge { 
  padding: 3px 8px; 
  background: #3B82F6; 
  color: white; 
  font-size: 10px; 
  font-weight: 700; 
  border-radius: 4px; 
  text-transform: uppercase; 
}

.notif-message { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 10px; }

.notif-footer { display: flex; align-items: center; gap: 16px; }

.notif-type { 
  padding: 4px 10px; 
  border-radius: 6px; 
  font-size: 11px; 
  font-weight: 600; 
}
.notif-type.blue { background: #DBEAFE; color: #1D4ED8; }
.notif-type.green { background: #D1FAE5; color: #047857; }
.notif-type.yellow { background: #FEF3C7; color: #B45309; }
.notif-type.red { background: #FEE2E2; color: #B91C1C; }
.notif-type.purple { background: #EDE9FE; color: #7C3AED; }
.notif-type.indigo { background: #E0E7FF; color: #4338CA; }

.notif-time { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #94A3B8; }
.notif-time svg { width: 14px; height: 14px; }

.notif-actions { display: flex; gap: 8px; flex-shrink: 0; }

.btn-action { 
  padding: 10px; 
  background: transparent; 
  border: none; 
  border-radius: 8px; 
  cursor: pointer; 
  transition: all 0.2s; 
  color: #94A3B8;
}
.btn-action svg { width: 18px; height: 18px; }
.btn-action.delete:hover { background: #FEE2E2; color: #DC2626; }

/* Animations */
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(-20px); }

@media (max-width: 1024px) {
  .main-content { padding: 20px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .stats-row { grid-template-columns: 1fr; }
  .filter-tabs { flex-wrap: wrap; }
}
</style>
