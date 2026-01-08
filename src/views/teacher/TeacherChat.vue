<script setup>
import { ref, onMounted, watch, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChat } from '@/composables/useChat'

const route = useRoute()
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
  unsubscribe
} = useChat()

const selectedRoom = ref(null)
const messagesLoading = ref(false)
const newMessage = ref('')
const messagesContainer = ref(null)
const showMobileList = ref(true)

const currentParticipant = computed(() => {
  if (!selectedRoom.value) return null
  return selectedRoom.value.otherParticipant
})

onMounted(async () => {
  if (authStore.user) {
    await fetchChatRooms(authStore.user.id)
    
    const roomId = route.query.room
    if (roomId) {
      const room = chatRooms.value.find(r => r.id === roomId)
      if (room) {
        selectedRoom.value = room
        showMobileList.value = false
      }
    }
  }
})

watch(selectedRoom, async (room) => {
  if (room) {
    messagesLoading.value = true
    await fetchMessages(room.id)
    subscribeToMessages(room.id)
    await markAsRead(room.id, authStore.user.id)
    messagesLoading.value = false
    
    if (route.query.room !== room.id) {
      router.replace({ query: { room: room.id } })
    }
    
    await nextTick()
    scrollToBottom()
  }
})

watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleSelectRoom(room) {
  selectedRoom.value = room
  showMobileList.value = false
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

function formatTime(date) {
  return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (d.toDateString() === today.toDateString()) return 'Hari ini'
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function shouldShowDateSeparator(index) {
  if (index === 0) return true
  const curr = new Date(messages.value[index].created_at).toDateString()
  const prev = new Date(messages.value[index - 1].created_at).toDateString()
  return curr !== prev
}

function goBack() {
  router.push('/teacher/dashboard')
}

onUnmounted(() => {
  unsubscribe()
})
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="header">
        <h1>Chat Siswa</h1>
      </header>

      <!-- Chat Content -->
      <div class="chat-content">
      <!-- Conversations List -->
      <aside class="conversations-panel" :class="{ 'mobile-hidden': !showMobileList }">
        <div class="panel-header">
          <h2>Percakapan Siswa</h2>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <!-- Conversation List -->
        <div v-else class="conversation-list">
          <div v-if="chatRooms.length === 0" class="empty-conversations">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p>Belum ada percakapan dengan siswa</p>
            <span class="hint">Siswa akan memulai chat dengan Anda melalui halaman detail les atau booking</span>
          </div>

          <button v-for="room in chatRooms" :key="room.id" 
                  class="conversation-item" 
                  :class="{ active: selectedRoom?.id === room.id }"
                  @click="handleSelectRoom(room)">
            <div class="conv-avatar">
              <img v-if="room.otherParticipant?.avatar_url" :src="room.otherParticipant.avatar_url" :alt="room.otherParticipant?.name">
              <span v-else>{{ room.otherParticipant?.name?.charAt(0)?.toUpperCase() }}</span>
              <span class="online-dot"></span>
            </div>
            <div class="conv-info">
              <div class="conv-header">
                <span class="conv-name">{{ room.otherParticipant?.name || 'Siswa' }}</span>
                <span class="conv-time">{{ formatDate(room.last_message_at || room.created_at) }}</span>
              </div>
              <div class="conv-preview">
                <span class="role-badge">Siswa</span>
                <p>{{ room.last_message || 'Belum ada pesan' }}</p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <!-- Chat Window -->
      <div class="chat-window" :class="{ 'mobile-visible': !showMobileList }">
        <template v-if="selectedRoom">
          <!-- Chat Header -->
          <div class="window-header">
            <button class="mobile-back" @click="showMobileList = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="participant-info">
              <div class="participant-avatar">
                <img v-if="currentParticipant?.avatar_url" :src="currentParticipant.avatar_url" :alt="currentParticipant?.name">
                <span v-else>{{ currentParticipant?.name?.charAt(0)?.toUpperCase() }}</span>
              </div>
              <div class="participant-details">
                <h3>{{ currentParticipant?.name }}</h3>
                <span class="participant-role">Siswa</span>
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div class="messages-container" ref="messagesContainer">
            <div v-if="messagesLoading" class="messages-loading">
              <div class="spinner"></div>
            </div>
            
            <div v-else class="messages-list">
              <template v-for="(msg, index) in messages" :key="msg.id">
                <div v-if="shouldShowDateSeparator(index)" class="date-separator">
                  <span>{{ formatDate(msg.created_at) }}</span>
                </div>
                <div class="message" :class="{ own: msg.sender_id === authStore.user?.id }">
                  <div class="message-bubble">
                    <p>{{ msg.message }}</p>
                    <span class="message-time">{{ formatTime(msg.created_at) }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Message Input -->
          <div class="message-input-container">
            <div class="input-wrapper">
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
        </template>

        <!-- Empty State -->
        <div v-else class="empty-chat">
          <div class="empty-illustration">
            <svg class="main-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2>Chat dengan Siswa</h2>
          <p>Pilih percakapan dari daftar untuk membalas pesan siswa.</p>
        </div>
      </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Dashboard Layout */
.dashboard {
  display: flex;
  min-height: 100vh;
  background: var(--background);
}

.main {
  flex: 1;
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100vh;
  overflow: hidden;
}

.header {
  margin-bottom: var(--spacing-lg);
  flex-shrink: 0;
}

.header h1 {
  font-size: var(--font-size-2xl);
}

/* Main Content */
.chat-content {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

/* Conversations Panel */
.conversations-panel {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid var(--border-light);
}

.panel-header h2 {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--text);
}

/* Conversation List */
.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-conversations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: var(--secondary);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-conversations p {
  color: var(--text-muted);
  margin-bottom: 8px;
}

.empty-conversations .hint {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  max-width: 250px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-bottom: 8px;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
}

.conversation-item:hover {
  background: #eff6ff;
}

.conversation-item.active {
  background: rgba(13, 87, 130, 0.08);
}

.conv-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: var(--font-size-lg);
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

.conv-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.online-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: var(--secondary);
  border: 2px solid white;
  border-radius: 50%;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.conv-name {
  font-weight: 600;
  color: var(--text);
  font-size: var(--font-size-sm);
}

.conv-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.conv-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-badge {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  background: rgba(13, 87, 130, 0.15);
  color: var(--secondary);
}

.conv-preview p {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* Chat Window */
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  min-width: 0;
}

.window-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: rgba(13, 87, 130, 0.05); /* Secondary with opacity */
  border-bottom: 1px solid var(--border-light);
}

.mobile-back {
  display: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--border-light);
  border: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.mobile-back svg {
  width: 20px;
  height: 20px;
}

.participant-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.participant-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: var(--font-size-lg);
  overflow: hidden;
}

.participant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-details h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 2px;
}

.participant-role {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: transparent;
}

.messages-loading {
  display: flex;
  justify-content: center;
  padding: 48px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--secondary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.date-separator {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}

.date-separator span {
  padding: 6px 16px;
  background: var(--border-light);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: 500;
}

.message {
  display: flex;
  margin-bottom: 12px;
}

.message.own {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 14px 18px;
  border-radius: var(--radius-xl);
  position: relative;
  animation: bubbleIn 0.3s ease;
}

@keyframes bubbleIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message:not(.own) .message-bubble {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-bottom-left-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
}

.message.own .message-bubble {
  background: var(--secondary);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
  box-shadow: 0 4px 15px rgba(13, 87, 130, 0.3);
}

.message-bubble p {
  font-size: var(--font-size-sm);
  line-height: 1.5;
  margin-bottom: 4px;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  display: block;
  text-align: right;
}

/* Message Input */
.message-input-container {
  padding: 20px 24px;
  background: var(--surface);
  border-top: 1px solid var(--border-light);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f1f5f9;
  border-radius: var(--radius-xl);
  border: 2px solid transparent;
  transition: all var(--transition-base);
}

.input-wrapper:focus-within {
  border-color: var(--secondary);
  box-shadow: 0 0 0 4px rgba(13, 87, 130, 0.1);
}

.input-wrapper input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  outline: none;
  color: var(--text);
}

.input-wrapper input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--secondary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all var(--transition-base);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(13, 87, 130, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 22px;
  height: 22px;
}

/* Empty Chat State */
.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  text-align: center;
}

.empty-illustration {
  margin-bottom: 32px;
}

.main-icon {
  width: 120px;
  height: 120px;
  color: var(--secondary);
}

.empty-chat h2 {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text);
  margin-bottom: 12px;
}

.empty-chat p {
  color: var(--text-muted);
  max-width: 300px;
  line-height: 1.6;
}

/* Loading State */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 48px;
}

/* Responsive */
@media (max-width: 900px) {
  .chat-content {
    margin: 0 16px 16px;
  }

  .conversations-panel {
    position: absolute;
    inset: 0;
    width: 100%;
    border-radius: 0;
    z-index: 20;
    transition: transform var(--transition-slow);
  }

  .conversations-panel.mobile-hidden {
    transform: translateX(-100%);
  }

  .chat-window {
    position: absolute;
    inset: 0;
    border-radius: 0;
    z-index: 10;
  }

  .chat-window.mobile-visible {
    z-index: 25;
  }

  .mobile-back {
    display: flex;
  }

  .chat-header {
    padding: 12px 16px;
  }

  .brand-text {
    font-size: var(--font-size-lg);
  }
}
</style>
