<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  chatRoute: {
    type: String,
    default: '/student/chat'
  }
})

const router = useRouter()
const authStore = useAuthStore()
const unreadCount = ref(0)
let subscription = null

onMounted(async () => {
  await fetchUnreadCount()
  subscribeToNewMessages()
})

onUnmounted(() => {
  if (subscription) {
    supabase.removeChannel(subscription)
  }
})

async function fetchUnreadCount() {
  if (!authStore.user?.id) return
  
  try {
    // Get all rooms user is part of
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id')
      .or(`participant_1.eq.${authStore.user.id},participant_2.eq.${authStore.user.id}`)
    
    if (!rooms || rooms.length === 0) {
      unreadCount.value = 0
      return
    }
    
    const roomIds = rooms.map(r => r.id)
    
    // Count unread messages
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('room_id', roomIds)
      .neq('sender_id', authStore.user.id)
      .eq('is_read', false)
    
    unreadCount.value = count || 0
  } catch (err) {
    console.error('Error fetching unread count:', err)
  }
}

function subscribeToNewMessages() {
  if (!authStore.user?.id) return
  
  subscription = supabase
    .channel('floating-chat-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      async (payload) => {
        // Check if this message is for us (not sent by us)
        if (payload.new.sender_id !== authStore.user.id) {
          // Check if we're in this room
          const { data: room } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('id', payload.new.room_id)
            .or(`participant_1.eq.${authStore.user.id},participant_2.eq.${authStore.user.id}`)
            .single()
          
          if (room) {
            unreadCount.value++
          }
        }
      }
    )
    .subscribe()
}

function openChat() {
  router.push(props.chatRoute)
}
</script>

<template>
  <button class="floating-chat-btn" @click="openChat" :class="{ 'has-unread': unreadCount > 0 }" title="Chat">
    <!-- Chat Icon -->
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <span class="btn-label">Chat</span>
    
    <!-- Unread Badge -->
    <span v-if="unreadCount > 0" class="unread-badge">
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </span>
  </button>
</template>

<style scoped>
.floating-chat-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #0d5782;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(13, 87, 130, 0.35);
  transition: all 0.3s ease;
  z-index: 9999;
  overflow: visible;
}

.floating-chat-btn svg {
  width: 28px;
  height: 28px;
  transition: all 0.3s ease;
}

.btn-label {
  position: absolute;
  opacity: 0;
  transform: translateX(10px);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.floating-chat-btn:hover {
  width: 120px;
  border-radius: 30px;
  transform: translateY(-4px);
  box-shadow: 0 12px 35px rgba(13, 87, 130, 0.45);
}

.floating-chat-btn:hover svg {
  transform: translateX(-16px);
}

.floating-chat-btn:hover .btn-label {
  opacity: 1;
  transform: translateX(12px);
}

.floating-chat-btn:active {
  transform: translateY(-2px);
}

/* Bounce animation when has unread */
.floating-chat-btn.has-unread {
  animation: attention-bounce 2s infinite;
}

.floating-chat-btn.has-unread:hover {
  animation: none;
}

@keyframes attention-bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* Unread Badge */
.unread-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.5);
  animation: pulse-badge 2s infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* Pulse ring effect - disable to prevent click interference */
.floating-chat-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: #0d5782;
  animation: pulse-ring 2s infinite;
  z-index: -1;
  pointer-events: none;
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.15);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .floating-chat-btn {
    bottom: 16px;
    right: 16px;
    width: 56px;
    height: 56px;
  }

  .floating-chat-btn:hover {
    width: 56px;
    border-radius: 50%;
  }

  .floating-chat-btn:hover svg {
    transform: none;
  }

  .floating-chat-btn:hover .btn-label {
    opacity: 0;
  }
  
  .unread-badge {
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    font-size: 10px;
    border-width: 2px;
  }
}
</style>
