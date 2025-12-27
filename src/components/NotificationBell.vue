<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  getNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead,
  subscribeToNotifications,
  getNotificationIcon
} from '@/services/notificationService'

const authStore = useAuthStore()
const isOpen = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const loading = ref(false)
let subscription = null

onMounted(async () => {
  if (authStore.user?.id) {
    await fetchNotifications()
    await fetchUnreadCount()
    setupRealtimeSubscription()
  }
})

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
})

async function fetchNotifications() {
  loading.value = true
  try {
    const result = await getNotifications(authStore.user.id, 10)
    if (result.success) {
      notifications.value = result.notifications
    }
  } catch (err) {
    console.error('Error fetching notifications:', err)
  } finally {
    loading.value = false
  }
}

async function fetchUnreadCount() {
  try {
    const result = await getUnreadCount(authStore.user.id)
    if (result.success) {
      unreadCount.value = result.count
    }
  } catch (err) {
    console.error('Error fetching unread count:', err)
  }
}

function setupRealtimeSubscription() {
  subscription = subscribeToNotifications(authStore.user.id, (newNotification) => {
    notifications.value.unshift(newNotification)
    unreadCount.value++
  })
}

async function handleNotificationClick(notification) {
  if (!notification.is_read) {
    await markAsRead(notification.id)
    notification.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  
  if (notification.link) {
    isOpen.value = false
    window.location.href = notification.link
  }
}

async function handleMarkAllRead() {
  await markAllAsRead(authStore.user.id)
  notifications.value.forEach(n => n.is_read = true)
  unreadCount.value = 0
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    fetchNotifications()
  }
}

function formatTime(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / 1000)
  
  if (diff < 60) return 'Baru saja'
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
  
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function closeOnClickOutside(e) {
  if (!e.target.closest('.notification-wrapper')) {
    isOpen.value = false
  }
}
</script>

<template>
  <div class="notification-wrapper" v-click-outside="closeOnClickOutside">
    <button class="bell-btn" @click="toggleDropdown">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <transition name="dropdown">
      <div v-if="isOpen" class="dropdown">
        <div class="dropdown-header">
          <h3>Notifikasi</h3>
          <button v-if="unreadCount > 0" class="mark-all-btn" @click="handleMarkAllRead">
            Tandai semua dibaca
          </button>
        </div>

        <div class="notification-list">
          <div v-if="loading" class="loading">
            <div class="spinner"></div>
          </div>

          <div v-else-if="notifications.length === 0" class="empty">
            <span class="empty-icon">🔔</span>
            <p>Belum ada notifikasi</p>
          </div>

          <div
            v-else
            v-for="notif in notifications"
            :key="notif.id"
            class="notification-item"
            :class="{ unread: !notif.is_read }"
            @click="handleNotificationClick(notif)"
          >
            <div class="notif-icon">{{ getNotificationIcon(notif.type) }}</div>
            <div class="notif-content">
              <p class="notif-title">{{ notif.title }}</p>
              <p class="notif-message">{{ notif.message }}</p>
              <span class="notif-time">{{ formatTime(notif.created_at) }}</span>
            </div>
            <div v-if="!notif.is_read" class="unread-dot"></div>
          </div>
        </div>

        <div class="dropdown-footer">
          <router-link to="/notifications" class="view-all" @click="isOpen = false">
            Lihat Semua Notifikasi
          </router-link>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.notification-wrapper {
  position: relative;
}

.bell-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f1f5f9;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.bell-btn:hover {
  background: #e2e8f0;
}

.bell-btn svg {
  width: 20px;
  height: 20px;
  color: #475569;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #dc2626;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.dropdown-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.mark-all-btn {
  font-size: 12px;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top-color: #1e293b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: #f8fafc;
}

.notification-item.unread {
  background: #f0f9ff;
}

.notif-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  background: #f1f5f9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.notif-message {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-time {
  font-size: 11px;
  color: #94a3b8;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #2563eb;
  border-radius: 50%;
  flex-shrink: 0;
}

.dropdown-footer {
  padding: 12px 20px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
}

.view-all {
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
}

.view-all:hover {
  text-decoration: underline;
}

/* Dropdown Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 480px) {
  .dropdown {
    width: 300px;
    right: -100px;
  }
}
</style>
