import { ref, shallowRef } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// State bersama di semua komponen - gunakan shallowRef untuk menghindari reaktivitas dalam
const onlineUsersSet = shallowRef(new Set()) // Set sederhana untuk pencarian cepat
const lastSeenMap = shallowRef(new Map()) // userId -> timestamp terakhir dilihat
let presenceChannel = null
let isInitialized = false
let subscriberCount = 0

// Timer debounce untuk batch update
let updateTimer = null
let pendingOnlineUsers = new Set()
let hasPendingUpdate = false

function flushUpdates() {
  if (hasPendingUpdate) {
    onlineUsersSet.value = new Set(pendingOnlineUsers)
    hasPendingUpdate = false
  }
  updateTimer = null
}

function scheduleUpdate() {
  hasPendingUpdate = true
  if (!updateTimer) {
    updateTimer = setTimeout(flushUpdates, 100) // Batch update setiap 100ms
  }
}

export function usePresence() {
  const authStore = useAuthStore()

  // Cek apakah pengguna online - pencarian sinkron sederhana
  function isUserOnline(userId) {
    if (!userId) return false
    return onlineUsersSet.value.has(userId)
  }

  // Dapatkan waktu terakhir dilihat untuk pengguna (kembalikan null jika belum pernah dilihat atau sedang online)
  function getLastSeen(userId) {
    if (!userId) return null
    if (isUserOnline(userId)) return null
    return lastSeenMap.value.get(userId) || null
  }

  // Format waktu terakhir dilihat dalam bahasa Indonesia
  function formatLastSeen(userId) {
    const lastSeen = getLastSeen(userId)
    if (!lastSeen) return null
    
    const date = new Date(lastSeen)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} menit lalu`
    if (diffHours < 24) return `${diffHours} jam lalu`
    if (diffDays < 7) return `${diffDays} hari lalu`
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  // Dapatkan teks aktivitas terakhir - untuk pengguna online dan offline
  // Pengguna online menampilkan "Baru saja", pengguna offline menampilkan waktu sejak terakhir dilihat
  function getLastActivityText(userId) {
    if (!userId) return ''
    if (isUserOnline(userId)) return 'Baru saja'
    const lastSeenText = formatLastSeen(userId)
    return lastSeenText || ''
  }

  // Dapatkan teks status (Online, atau waktu terakhir dilihat)
  function getStatusText(userId) {
    if (isUserOnline(userId)) return 'Online'
    const lastSeenText = formatLastSeen(userId)
    return lastSeenText ? `Terakhir dilihat ${lastSeenText}` : 'Offline'
  }

  // Berlangganan ke channel presence
  function subscribeToPresence() {
    if (!authStore.user?.id) return
    
    subscriberCount++
    
    // Jika sudah diinisialisasi, hanya tambah subscriber count
    if (isInitialized && presenceChannel) {
      return
    }
    
    isInitialized = true
    
    // Gunakan nama channel global tunggal untuk semua pengguna
    presenceChannel = supabase.channel('mariles-online-users', {
      config: {
        presence: {
          key: authStore.user.id
        }
      }
    })
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        pendingOnlineUsers = new Set(Object.keys(state))
        scheduleUpdate()
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        pendingOnlineUsers.add(key)
        scheduleUpdate()
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // Simpan waktu terakhir dilihat saat pengguna keluar
        const newLastSeen = new Map(lastSeenMap.value)
        newLastSeen.set(key, new Date().toISOString())
        lastSeenMap.value = newLastSeen
        
        pendingOnlineUsers.delete(key)
        scheduleUpdate()
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ 
            user_id: authStore.user.id, 
            online_at: new Date().toISOString() 
          })
        }
      })
  }

  // Berhenti berlangganan dari channel presence
  function unsubscribeFromPresence() {
    subscriberCount--
    
    // Hanya hapus channel saat tidak ada subscriber lagi
    if (subscriberCount <= 0 && presenceChannel) {
      if (updateTimer) {
        clearTimeout(updateTimer)
        updateTimer = null
      }
      supabase.removeChannel(presenceChannel)
      presenceChannel = null
      isInitialized = false
      subscriberCount = 0
      pendingOnlineUsers = new Set()
      hasPendingUpdate = false
    }
  }

  return {
    onlineUsers: onlineUsersSet,
    lastSeenMap,
    isUserOnline,
    getLastSeen,
    formatLastSeen,
    getLastActivityText,
    getStatusText,
    subscribeToPresence,
    unsubscribeFromPresence
  }
}
