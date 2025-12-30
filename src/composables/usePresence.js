import { ref, shallowRef } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// Shared state across all components - using shallowRef to avoid deep reactivity
const onlineUsersSet = shallowRef(new Set()) // Simple Set for fast lookups
const lastSeenMap = shallowRef(new Map()) // userId -> last seen timestamp
let presenceChannel = null
let isInitialized = false
let subscriberCount = 0

// Debounce timer for batching updates
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
    updateTimer = setTimeout(flushUpdates, 100) // Batch updates every 100ms
  }
}

export function usePresence() {
  const authStore = useAuthStore()

  // Check if a user is online - simple synchronous lookup
  function isUserOnline(userId) {
    if (!userId) return false
    return onlineUsersSet.value.has(userId)
  }

  // Get last seen time for a user (returns null if never seen or currently online)
  function getLastSeen(userId) {
    if (!userId) return null
    if (isUserOnline(userId)) return null
    return lastSeenMap.value.get(userId) || null
  }

  // Format last seen time in Indonesian
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

  // Get last activity text - for both online and offline users
  // Online users show "Baru saja", offline users show time since last seen
  function getLastActivityText(userId) {
    if (!userId) return ''
    if (isUserOnline(userId)) return 'Baru saja'
    const lastSeenText = formatLastSeen(userId)
    return lastSeenText || ''
  }

  // Get status text (Online, or last seen time)
  function getStatusText(userId) {
    if (isUserOnline(userId)) return 'Online'
    const lastSeenText = formatLastSeen(userId)
    return lastSeenText ? `Terakhir dilihat ${lastSeenText}` : 'Offline'
  }

  // Subscribe to presence channel
  function subscribeToPresence() {
    if (!authStore.user?.id) return
    
    subscriberCount++
    
    // If already initialized, just increment subscriber count
    if (isInitialized && presenceChannel) {
      return
    }
    
    isInitialized = true
    
    // Use a single global channel name for all users
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
        // Store last seen time when user leaves
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

  // Unsubscribe from presence channel
  function unsubscribeFromPresence() {
    subscriberCount--
    
    // Only remove channel when no more subscribers
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
