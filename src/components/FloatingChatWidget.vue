<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChat } from '@/composables/useChat'
import { usePresence } from '@/composables/usePresence'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  userRole: {
    type: String,
    default: 'student'
  }
})

const router = useRouter()
const authStore = useAuthStore()
const {
  chatRooms,
  messages,
  loading,
  fetchChatRooms,
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  markAsRead,
  unsubscribe,
  getTotalUnreadCount
} = useChat()

// Use shared presence tracking
const { 
  isUserOnline, 
  getStatusText,
  subscribeToPresence, 
  unsubscribeFromPresence 
} = usePresence()

// Unread count with real-time updates
const unreadCount = ref(0)
let notificationChannel = null

// Computed to get the right chat rooms
const displayChatRooms = computed(() => {
  return chatRooms.value
})

// Computed to get the right messages
const displayMessages = computed(() => {
  return messages.value
})

const isOpen = ref(false)
const selectedRoom = ref(null)
const newMessage = ref('')
const messagesContainer = ref(null)
const messagesLoading = ref(false)

const currentParticipant = computed(() => {
  if (!selectedRoom.value) return null
  return selectedRoom.value.otherParticipant
})

// Subscribe to message notifications for real-time unread count
function subscribeToNotifications() {
  if (!authStore.user?.id) return
  
  notificationChannel = supabase
    .channel('chat-notifications-widget')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      },
      async (payload) => {
        // Only increment if message is for us (not sent by us)
        if (payload.new.sender_id !== authStore.user.id) {
          // Check if we're a participant in this room
          const { data: room } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('id', payload.new.room_id)
            .or(`participant_1.eq.${authStore.user.id},participant_2.eq.${authStore.user.id}`)
            .single()
          
          if (room) {
            // Don't increment if we're currently viewing this room
            if (selectedRoom.value?.id !== payload.new.room_id) {
              unreadCount.value++
            } else {
              // Auto-mark as read if in the room
              await markAsRead(room.id, authStore.user.id)
            }
            // Refresh chat rooms to update last message
            await fetchChatRooms(authStore.user.id)
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: 'is_read=eq.true'
      },
      async () => {
        // Refresh unread count when messages are marked as read
        unreadCount.value = await getTotalUnreadCount(authStore.user.id)
      }
    )
    .subscribe()
}

onMounted(async () => {
  if (authStore.user) {
    await fetchChatRooms(authStore.user.id)
    unreadCount.value = await getTotalUnreadCount(authStore.user.id)
    subscribeToNotifications()
    subscribeToPresence()
  }
})

watch(selectedRoom, async (room) => {
  if (room) {
    messagesLoading.value = true
    await fetchMessages(room.id)
    subscribeToMessages(room.id)
    await markAsRead(room.id, authStore.user.id)
    // Update unread count after marking as read
    unreadCount.value = await getTotalUnreadCount(authStore.user.id)
    messagesLoading.value = false
    await nextTick()
    scrollToBottom()
  }
})

watch(displayMessages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value && authStore.user) {
    await fetchChatRooms(authStore.user.id)
    unreadCount.value = await getTotalUnreadCount(authStore.user.id)
  }
}

function selectRoom(room) {
  selectedRoom.value = room
}

async function goBack() {
  selectedRoom.value = null
  // Refresh unread count when going back
  unreadCount.value = await getTotalUnreadCount(authStore.user.id)
}

async function handleSendMessage() {
  if (!selectedRoom.value || !newMessage.value.trim()) return
  
  const msg = newMessage.value.trim()
  newMessage.value = ''
  
  try {
    await sendMessage(selectedRoom.value.id, authStore.user.id, msg)
  } catch (err) {
    console.error('Error sending message:', err)
    newMessage.value = msg
  }
}

function openFullChat() {
  router.push(`/${props.userRole}/chat`)
  isOpen.value = false
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  const d = new Date(date)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Hari ini'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getRoleLabel(role) {
  switch(role) {
    case 'teacher': return 'Guru'
    case 'owner': return 'Pemilik'
    case 'student': return 'Siswa'
    default: return role || 'Pengguna'
  }
}

onUnmounted(() => {
  unsubscribe()
  if (notificationChannel) {
    supabase.removeChannel(notificationChannel)
  }
  unsubscribeFromPresence()
})
</script>

<template>
  <div class="floating-chat-container">
    <!-- Chat Widget Popup -->
    <transition name="popup">
      <div v-if="isOpen" class="chat-widget">
        <!-- Header -->
        <div class="widget-header">
          <button v-if="selectedRoom" class="back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div v-if="selectedRoom" class="header-participant">
            <div class="participant-avatar" :class="currentParticipant?.role">
              <img v-if="currentParticipant?.avatar_url" :src="currentParticipant.avatar_url" :alt="currentParticipant?.name">
              <span v-else>{{ currentParticipant?.name?.charAt(0)?.toUpperCase() }}</span>
              <span class="status-dot" :class="{ online: isUserOnline(currentParticipant?.id), offline: !isUserOnline(currentParticipant?.id) }"></span>
            </div>
            <div class="participant-info">
              <span class="participant-name">{{ currentParticipant?.name }}</span>
              <span class="participant-role">{{ getRoleLabel(currentParticipant?.role) }}</span>
            </div>
          </div>
          <span v-else class="header-title">Chat</span>
          <div class="header-actions">
            <button class="expand-btn" @click="openFullChat" title="Buka halaman penuh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
            <button class="close-btn" @click="isOpen = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="widget-content">
          <!-- Chat Room List -->
          <div v-if="!selectedRoom" class="room-list">
            <div v-if="loading" class="loading-state">
              <div class="spinner"></div>
            </div>
            <div v-else-if="displayChatRooms.length === 0" class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p>Belum ada percakapan</p>
            </div>
            <div v-else class="rooms">
              <button v-for="room in displayChatRooms" :key="room.id" class="room-item" @click="selectRoom(room)">
                <div class="room-avatar" :class="room.otherParticipant?.role">
                  <img v-if="room.otherParticipant?.avatar_url" :src="room.otherParticipant.avatar_url" :alt="room.otherParticipant?.name">
                  <span v-else>{{ room.otherParticipant?.name?.charAt(0)?.toUpperCase() }}</span>
                  <span class="status-dot" :class="{ online: isUserOnline(room.otherParticipant?.id), offline: !isUserOnline(room.otherParticipant?.id) }"></span>
                </div>
                <div class="room-info">
                  <div class="room-header-row">
                    <span class="room-name">{{ room.otherParticipant?.name || 'Unknown' }}</span>
                    <span class="role-badge" :class="room.otherParticipant?.role">{{ getRoleLabel(room.otherParticipant?.role) }}</span>
                  </div>
                  <p class="room-preview">{{ room.last_message || 'Belum ada pesan' }}</p>
                </div>
                <span class="room-time">{{ formatDate(room.last_message_at || room.created_at) }}</span>
              </button>
            </div>
          </div>

          <!-- Chat Messages -->
          <div v-else class="messages-view">
            <div class="messages-area" ref="messagesContainer">
              <div v-if="messagesLoading" class="loading-state">
                <div class="spinner"></div>
              </div>
              <div v-else class="messages">
                <div v-for="msg in displayMessages" :key="msg.id" 
                     class="message" :class="{ own: msg.sender_id === 'current-user' || msg.sender_id === authStore.user?.id }">
                  <div class="message-bubble">
                    <p>{{ msg.message }}</p>
                    <span class="message-time">{{ formatTime(msg.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Input -->
            <div class="message-input">
              <input 
                v-model="newMessage" 
                type="text" 
                placeholder="Ketik pesan..." 
                @keyup.enter="handleSendMessage"
              >
              <button class="send-btn" :disabled="!newMessage.trim()" @click="handleSendMessage">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Floating Button - Clean Design -->
    <button class="floating-btn" :class="{ active: isOpen, 'has-unread': unreadCount > 0 && !isOpen }" @click="toggleChat">
      <svg v-if="!isOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <!-- Unread Badge -->
      <span v-if="unreadCount > 0 && !isOpen" class="unread-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.floating-chat-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
}

/* Floating Button - Clean Circular Design */
.floating-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #0d5782;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(13, 87, 130, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible;
}

.floating-btn svg {
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease;
}

.floating-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(13, 87, 130, 0.5);
}

.floating-btn:active {
  transform: scale(0.95);
}

.floating-btn.active {
  background: #0a4568;
}

.floating-btn.has-unread {
  animation: gentle-pulse 2s ease-in-out infinite;
}

@keyframes gentle-pulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(13, 87, 130, 0.4); }
  50% { box-shadow: 0 4px 30px rgba(13, 87, 130, 0.6); }
}

/* Unread Badge */
.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
  animation: badge-pop 0.3s ease;
}

@keyframes badge-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Chat Widget */
.chat-widget {
  position: absolute;
  bottom: 68px;
  right: 0;
  width: 360px;
  height: 480px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Popup Animation */
.popup-enter-active, .popup-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.popup-enter-from, .popup-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}

/* Widget Header */
.widget-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #0d5782 0%, #0a4568 100%);
  color: white;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.header-participant {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.participant-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
  position: relative;
}

.participant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.participant-name {
  font-weight: 600;
  font-size: 14px;
}

.participant-role {
  font-size: 11px;
  opacity: 0.85;
}

.header-title {
  flex: 1;
  font-weight: 700;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.expand-btn, .close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.expand-btn:hover, .close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.expand-btn svg, .close-btn svg {
  width: 16px;
  height: 16px;
}

/* Widget Content */
.widget-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #f8fafc;
}

/* Room List */
.room-list {
  flex: 1;
  overflow-y: auto;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 48px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #0d5782;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  padding: 32px;
  text-align: center;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}

.rooms {
  padding: 8px;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  width: 100%;
  text-align: left;
  background: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.room-item:hover {
  background: #f1f5f9;
}

.room-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  overflow: visible;
  background: #0d5782;
  position: relative;
}

.room-avatar.teacher {
  background: #10b981;
}

.room-avatar.owner {
  background: #6366f1;
}

.room-avatar.student {
  background: #f59e0b;
}

.room-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* Status Dot - Clean and compact */
.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.status-dot.online {
  background: #22c55e;
}

.status-dot.offline {
  background: #94a3b8;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.room-name {
  font-weight: 600;
  font-size: 14px;
  color: #1e293b;
}

.role-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.role-badge.teacher {
  background: #d1fae5;
  color: #059669;
}

.role-badge.owner {
  background: #e0e7ff;
  color: #4f46e5;
}

.role-badge.student {
  background: #fef3c7;
  color: #d97706;
}

.room-preview {
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-time {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

/* Messages View */
.messages-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8fafc;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message {
  display: flex;
}

.message.own {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 16px;
  animation: bubbleIn 0.2s ease;
}

@keyframes bubbleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.message:not(.own) .message-bubble {
  background: white;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
}

.message.own .message-bubble {
  background: #0d5782;
  color: white;
  border-bottom-right-radius: 4px;
}

.message-bubble p {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  display: block;
  text-align: right;
}

/* Message Input */
.message-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.message-input input {
  flex: 1;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #f8fafc;
}

.message-input input:focus {
  border-color: #0d5782;
  background: white;
  box-shadow: 0 0 0 3px rgba(13, 87, 130, 0.1);
}

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #0d5782;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #0a4568;
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-btn svg {
  width: 16px;
  height: 16px;
}

/* Responsive */
@media (max-width: 480px) {
  .floating-chat-container {
    bottom: 16px;
    right: 16px;
  }

  .floating-btn {
    width: 52px;
    height: 52px;
  }

  .chat-widget {
    width: calc(100vw - 32px);
    height: 60vh;
    right: 0;
    bottom: 64px;
  }
}
</style>
