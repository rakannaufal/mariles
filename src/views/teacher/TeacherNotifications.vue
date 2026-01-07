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
    
    notifications.value.forEach(n => n.is_read = true)
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
  
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTypeClass(type) {
  const classes = { info: 'info', warning: 'warning', success: 'success', error: 'error' }
  return classes[type] || 'info'
}
</script>

<template>
  <div class="dashboard">

    <main class="main-content">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            Notifikasi
          </h1>
          <p class="subtitle">Pemberitahuan terbaru untuk Anda</p>
        </div>
        <div class="header-actions" v-if="unreadCount > 0">
          <button class="btn-secondary" @click="markAllAsRead">
            Tandai semua dibaca
          </button>
        </div>
      </header>

      <div class="filter-tabs">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">
          Semua <span class="count">{{ notifications.length }}</span>
        </button>
        <button :class="{ active: filter === 'unread' }" @click="filter = 'unread'">
          Belum Dibaca <span class="count" :class="{ highlight: unreadCount > 0 }">{{ unreadCount }}</span>
        </button>
        <button :class="{ active: filter === 'read' }" @click="filter = 'read'">
          Sudah Dibaca
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat notifikasi...</p>
      </div>

      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <h3>Tidak ada notifikasi</h3>
        <p>Anda akan menerima pemberitahuan di sini</p>
      </div>

      <div v-else class="notifications-list">
        <div 
          v-for="notif in filteredNotifications" 
          :key="notif.id" 
          class="notification-item"
          :class="{ unread: !notif.is_read }"
          @click="markAsRead(notif)"
        >
          <div class="notif-icon" :class="getTypeClass(notif.type)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="notif-content">
            <h4>{{ notif.title }}</h4>
            <p>{{ notif.message }}</p>
            <span class="notif-time">{{ formatDate(notif.created_at) }}</span>
          </div>
          <div class="notif-actions">
            <router-link v-if="notif.link" :to="notif.link" class="btn-link">Lihat</router-link>
            <button class="btn-delete" @click.stop="deleteNotification(notif)" title="Hapus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.header-left h1 svg { width: 28px; height: 28px; color: var(--primary); }
.subtitle { font-size: 14px; color: #64748B; }

.btn-secondary { padding: 10px 20px; background: #F1F5F9; color: #475569; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

.filter-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.filter-tabs button { padding: 10px 20px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; font-weight: 500; color: #64748B; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.filter-tabs button.active { background: var(--primary); color: white; border-color: var(--primary); }
.count { background: #F1F5F9; padding: 2px 8px; border-radius: 20px; font-size: 12px; }
.filter-tabs button.active .count { background: rgba(255,255,255,0.2); color: white; }
.count.highlight { background: #DC2626; color: white; }

.loading-state, .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 1px solid #E2E8F0; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-icon svg { width: 48px; height: 48px; color: #CBD5E1; margin-bottom: 16px; }
.empty-state h3 { font-size: 18px; font-weight: 600; color: #1E293B; margin-bottom: 8px; }
.empty-state p { color: #64748B; }

.notifications-list { display: flex; flex-direction: column; gap: 12px; }
.notification-item { display: flex; gap: 16px; padding: 20px; background: white; border-radius: 12px; border: 1px solid #E2E8F0; cursor: pointer; transition: all 0.2s; position: relative; }
.notification-item:hover { border-color: #CBD5E1; }
.notification-item.unread { background: #F0F9FF; border-color: #BAE6FD; }

.notif-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notif-icon svg { width: 24px; height: 24px; }
.notif-icon.info { background: #DBEAFE; color: #2563EB; }
.notif-icon.success { background: #D1FAE5; color: #059669; }
.notif-icon.warning { background: #FEF3C7; color: #D97706; }
.notif-icon.error { background: #FEE2E2; color: #DC2626; }

.notif-content { flex: 1; min-width: 0; }
.notif-content h4 { font-size: 16px; font-weight: 600; color: #1E293B; margin-bottom: 4px; }
.notif-content p { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 8px; }
.notif-time { font-size: 12px; color: #94A3B8; }

.notif-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.btn-link { padding: 6px 12px; background: var(--primary); color: white; border-radius: 6px; font-size: 13px; font-weight: 500; text-decoration: none; }
.btn-delete { width: 32px; height: 32px; background: transparent; border: none; color: #94A3B8; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.btn-delete:hover { background: #FEE2E2; color: #DC2626; }
.btn-delete svg { width: 16px; height: 16px; }

@media (max-width: 768px) {
  .main-content { padding: 16px; }
  .notification-item { flex-direction: column; }
}
</style>
