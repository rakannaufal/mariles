<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChat } from '@/composables/useChat'

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

// Unread count
const unreadCount = ref(0)

// Import dummy chat removed

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

onMounted(async () => {
  if (authStore.user) {
    await fetchChatRooms(authStore.user.id)
    unreadCount.value = await getTotalUnreadCount(authStore.user.id)
  }
})

watch(selectedRoom, async (room) => {
  if (room) {
    messagesLoading.value = true
    await fetchMessages(room.id)
    subscribeToMessages(room.id)
    await markAsRead(room.id, authStore.user.id)
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

function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value && authStore.user) {
    fetchChatRooms(authStore.user.id)
  }
}

function selectRoom(room) {
  selectedRoom.value = room
}

function goBack() {
  selectedRoom.value = null
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

onUnmounted(() => {
  unsubscribe()
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
            </div>
            <div class="participant-info">
              <span class="participant-name">{{ currentParticipant?.name }}</span>
              <span class="participant-role">{{ currentParticipant?.role === 'teacher' ? 'Guru' : 'Owner' }}</span>
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
                </div>
                <div class="room-info">
                  <span class="room-name">{{ room.otherParticipant?.name || 'Unknown' }}</span>
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

    <!-- Floating Button -->
    <button class="floating-btn" :class="{ active: isOpen, 'has-unread': unreadCount > 0 }" @click="toggleChat">
      <svg v-if="!isOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <span class="btn-label">Chat</span>
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
  z-index: 1000;
}

/* Floating Button */
.floating-btn {
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
  position: relative;
  overflow: visible;
}

.floating-btn svg {
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

.floating-btn:hover {
  width: 120px;
  border-radius: 30px;
  transform: translateY(-4px);
  box-shadow: 0 12px 35px rgba(13, 87, 130, 0.45);
}

.floating-btn:hover svg {
  transform: translateX(-16px);
}

.floating-btn:hover .btn-label {
  opacity: 1;
  transform: translateX(12px);
}

.floating-btn.active {
  background: #0d5782;
  width: 60px;
  border-radius: 50%;
}

.floating-btn.active:hover {
  width: 60px;
  border-radius: 50%;
}

.floating-btn.active svg {
  transform: none;
}

.floating-btn.has-unread {
  animation: attention-bounce 2s infinite;
}

.floating-btn.has-unread:hover, .floating-btn.active {
  animation: none;
}

@keyframes attention-bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
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
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.floating-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  animation: pulse-ring 2s infinite;
  z-index: -1;
}

.floating-btn.active::before {
  animation: none;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}

/* Chat Widget */
.chat-widget {
  position: absolute;
  bottom: 72px;
  right: 0;
  width: 360px;
  height: 480px;
  background: var(--surface);
  border-radius: var(--radius-2xl);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Popup Animation */
.popup-enter-active, .popup-leave-active {
  transition: all 0.3s ease;
}

.popup-enter-from, .popup-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Widget Header */
.widget-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--primary);
  color: white;
}

.back-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.header-participant {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
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
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
}

.participant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-info {
  display: flex;
  flex-direction: column;
}

.participant-name {
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.participant-role {
  font-size: var(--font-size-xs);
  opacity: 0.8;
}

.header-title {
  flex: 1;
  font-weight: 700;
  font-size: var(--font-size-base);
}

.header-actions {
  display: flex;
  gap: var(--spacing-xs);
}

.expand-btn, .close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.expand-btn:hover, .close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
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
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
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
  color: var(--text-muted);
  padding: var(--spacing-xl);
  text-align: center;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-state p {
  font-size: var(--font-size-sm);
}

.rooms {
  padding: var(--spacing-sm);
}

.room-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.room-item:hover {
  background: var(--background);
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
  flex-shrink: 0;
  overflow: hidden;
}

.room-avatar.owner {
  background: var(--secondary);
}

.room-avatar.teacher {
  background: var(--success);
}

.room-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--text);
  display: block;
  margin-bottom: 2px;
}

.room-preview {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-time {
  font-size: 10px;
  color: var(--text-muted);
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
  padding: var(--spacing-md);
  background: var(--background);
}

.messages {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.message {
  display: flex;
}

.message.own {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 80%;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  animation: bubbleIn 0.2s ease;
}

@keyframes bubbleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.message:not(.own) .message-bubble {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-bottom-left-radius: var(--radius-xs);
}

.message.own .message-bubble {
  background: var(--primary);
  color: white;
  border-bottom-right-radius: var(--radius-xs);
}

.message-bubble p {
  font-size: var(--font-size-sm);
  line-height: 1.4;
  margin-bottom: 2px;
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
  padding: 14px 16px;
  background: var(--surface);
  border-top: 1px solid var(--border-light);
}

.message-input input {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 24px;
  font-size: var(--font-size-sm);
  outline: none;
  transition: border-color var(--transition-fast);
  background: var(--background);
}

.message-input input:focus {
  border-color: var(--primary);
  background: white;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 18px;
  height: 18px;
}

/* Responsive */
@media (max-width: 480px) {
  .floating-chat-container {
    bottom: 16px;
    right: 16px;
  }

  .floating-btn {
    width: 56px;
    height: 56px;
  }

  .chat-widget {
    width: calc(100vw - 32px);
    height: 60vh;
    right: 0;
    bottom: 68px;
  }
}
</style>
