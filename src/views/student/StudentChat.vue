<script setup>
import { ref, onMounted, watch, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChat } from '@/composables/useChat'
import { usePresence } from '@/composables/usePresence'
import Navbar from '@/components/Navbar.vue'

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
  unsubscribe,
  getAvailableChatPartners,
  getOrCreateChatRoom
} = useChat()

// Use shared presence tracking
const { 
  isUserOnline, 
  getStatusText,
  getLastActivityText,
  subscribeToPresence, 
  unsubscribeFromPresence 
} = usePresence()

// Computed to get the right chat rooms
const displayChatRooms = computed(() => {
  return chatRooms.value
})

// Computed to get the right messages
const displayMessages = computed(() => {
  return messages.value
})

const selectedRoom = ref(null)
const messagesLoading = ref(false)
const availablePartners = ref({ teachers: [], owners: [] })
const showNewChat = ref(false)
const newMessage = ref('')
const messagesContainer = ref(null)
const showMobileList = ref(true)

const currentParticipant = computed(() => {
  if (!selectedRoom.value) return null
  return selectedRoom.value.otherParticipant
})

// Get role label in Indonesian
function getRoleLabel(role) {
  switch(role) {
    case 'teacher': return 'Guru'
    case 'owner': return 'Owner'
    case 'student': return 'Siswa'
    default: return role || 'Pengguna'
  }
}

onMounted(async () => {
  if (authStore.user) {
    await fetchChatRooms(authStore.user.id)
    availablePartners.value = await getAvailableChatPartners(authStore.user.id)
    subscribeToPresence()
    
    const roomId = route.query.room
    if (roomId) {
      const room = chatRooms.value.find(r => r.id === roomId)
      if (room) {
        selectedRoom.value = room
        showMobileList.value = false
      } else {
        await fetchChatRooms(authStore.user.id)
        const newRoom = chatRooms.value.find(r => r.id === roomId)
        if (newRoom) {
          selectedRoom.value = newRoom
          showMobileList.value = false
        }
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
    
    showNewChat.value = false
    
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

async function handleStartChat(partner, lesPlaceId = null) {
  try {
    const room = await getOrCreateChatRoom(authStore.user.id, partner.id, lesPlaceId)
    await fetchChatRooms(authStore.user.id)
    const newRoom = chatRooms.value.find(r => r.id === room.id)
    if (newRoom) {
      selectedRoom.value = newRoom
      showMobileList.value = false
    }
  } catch (err) {
    console.error('Error starting chat:', err)
    alert('Gagal memulai chat')
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
  const msgs = displayMessages.value
  const curr = new Date(msgs[index].created_at).toDateString()
  const prev = new Date(msgs[index - 1].created_at).toDateString()
  return curr !== prev
}

function goBack() {
  router.back()
}

onUnmounted(() => {
  unsubscribe()
  unsubscribeFromPresence()
})
</script>

<template>
  <div class="chat-page">
    <!-- Navbar -->
    <Navbar />
    
    <!-- Page Title -->
    <div class="page-title-section">
      <div class="page-title-content">
        <svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h1>Chat</h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="chat-content">
      <!-- Conversations List -->
      <aside class="conversations-panel" :class="{ 'mobile-hidden': !showMobileList }">
        <div class="panel-header">
          <h2>Percakapan</h2>
          <button v-if="availablePartners.teachers.length || availablePartners.owners.length" 
                  class="new-chat-btn" @click="showNewChat = !showNewChat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <!-- New Chat Panel -->
        <div v-if="showNewChat" class="new-chat-panel">
          <div class="new-chat-header">
            <h3>Mulai Chat Baru</h3>
            <button class="close-btn" @click="showNewChat = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div v-if="availablePartners.owners.length" class="partner-section">
            <span class="section-label">Owner Tempat Les</span>
            <div class="partner-grid">
              <button v-for="owner in availablePartners.owners" :key="owner.id" 
                      class="partner-card" @click="handleStartChat(owner, owner.lesPlaceId)">
                <div class="partner-avatar owner">
                  <img v-if="owner.avatar_url" :src="owner.avatar_url" :alt="owner.name">
                  <span v-else>{{ owner.name?.charAt(0)?.toUpperCase() }}</span>
                </div>
                <span class="partner-name">{{ owner.name }}</span>
                <span class="partner-place">{{ owner.lesPlaceName }}</span>
              </button>
            </div>
          </div>

          <div v-if="availablePartners.teachers.length" class="partner-section">
            <span class="section-label">Guru Anda</span>
            <div class="partner-grid">
              <button v-for="teacher in availablePartners.teachers" :key="teacher.id" 
                      class="partner-card" @click="handleStartChat(teacher)">
                <div class="partner-avatar teacher">
                  <img v-if="teacher.avatar_url" :src="teacher.avatar_url" :alt="teacher.name">
                  <span v-else>{{ teacher.name?.charAt(0)?.toUpperCase() }}</span>
                </div>
                <span class="partner-name">{{ teacher.name }}</span>
                <span class="partner-place">Guru</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <!-- Conversation List -->
        <div v-else class="conversation-list">
          <div v-if="displayChatRooms.length === 0" class="empty-conversations">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p>Belum ada percakapan</p>
            <button v-if="availablePartners.teachers.length || availablePartners.owners.length" 
                    class="start-chat-btn" @click="showNewChat = true">
              Mulai Chat Baru
            </button>
          </div>

          <button v-for="room in displayChatRooms" :key="room.id" 
                  class="conversation-item" 
                  :class="{ active: selectedRoom?.id === room.id }"
                  @click="handleSelectRoom(room)">
            <div class="conv-avatar" :class="room.otherParticipant?.role">
              <img v-if="room.otherParticipant?.avatar_url" :src="room.otherParticipant.avatar_url" :alt="room.otherParticipant?.name">
              <span v-else>{{ room.otherParticipant?.name?.charAt(0)?.toUpperCase() }}</span>
            </div>
            <div class="conv-info">
              <div class="conv-header">
                <span class="conv-name">{{ room.otherParticipant?.name || 'Unknown' }}</span>
                <span class="role-badge" :class="room.otherParticipant?.role">{{ getRoleLabel(room.otherParticipant?.role) }}</span>
                <span class="conv-status">{{ getLastActivityText(room.otherParticipant?.id) }}</span>
              </div>
              <div class="conv-preview">
                <p>{{ room.last_message || 'Belum ada pesan' }}</p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <!-- Chat Window -->
      <main class="chat-window" :class="{ 'mobile-visible': !showMobileList }">
        <template v-if="selectedRoom">
          <!-- Chat Header -->
          <div class="window-header">
            <button class="mobile-back" @click="showMobileList = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="participant-info">
              <div class="participant-avatar" :class="currentParticipant?.role">
                <img v-if="currentParticipant?.avatar_url" :src="currentParticipant.avatar_url" :alt="currentParticipant?.name">
                <span v-else>{{ currentParticipant?.name?.charAt(0)?.toUpperCase() }}</span>
                <span class="status-dot" :class="{ online: isUserOnline(currentParticipant?.id), offline: !isUserOnline(currentParticipant?.id) }"></span>
              </div>
              <div class="participant-details">
                <div class="participant-header-row">
                  <h3>{{ currentParticipant?.name }}</h3>
                  <span class="status-text" :class="{ online: isUserOnline(currentParticipant?.id) }">{{ getStatusText(currentParticipant?.id) }}</span>
                </div>
                <span class="participant-role">{{ getRoleLabel(currentParticipant?.role) }}</span>
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div class="messages-container" ref="messagesContainer">
            <div v-if="messagesLoading" class="messages-loading">
              <div class="spinner"></div>
            </div>
            
            <div v-else class="messages-list">
              <template v-for="(msg, index) in displayMessages" :key="msg.id">
                <div v-if="shouldShowDateSeparator(index)" class="date-separator">
                  <span>{{ formatDate(msg.created_at) }}</span>
                </div>
                <div class="message" :class="{ own: msg.sender_id === 'current-user' || msg.sender_id === authStore.user?.id }">
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
              <line x1="9" y1="10" x2="15" y2="10"/>
              <line x1="12" y1="7" x2="12" y2="13"/>
            </svg>
          </div>
          <h2>Pilih Percakapan</h2>
          <p>Pilih percakapan dari daftar atau mulai chat baru dengan guru atau owner tempat les.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Base Layout */
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  padding-top: 64px;
  overflow: hidden;
}

/* Page Title Section */
.page-title-section {
  padding: 16px 24px;
  flex-shrink: 0;
}

.page-title-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  width: 28px;
  height: 28px;
  color: var(--primary);
}

.page-title-content h1 {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--text);
}

/* Main Content */
.chat-content {
  flex: 1;
  display: flex;
  margin: 0 24px 24px;
  gap: 20px;
  position: relative;
  min-height: 0;
  overflow: hidden;
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

.new-chat-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--primary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 4px 15px rgba(136, 208, 228, 0.4);
}

.new-chat-btn:hover {
  transform: scale(1.1) rotate(90deg);
}

.new-chat-btn svg {
  width: 20px;
  height: 20px;
}

/* New Chat Panel */
.new-chat-panel {
  background: var(--background);
  padding: 20px;
  border-bottom: 1px solid var(--border-light);
}

.new-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.new-chat-header h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text);
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--border-light);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn svg {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
}

.partner-section {
  margin-bottom: 16px;
}

.partner-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 12px;
}

.partner-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.partner-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--surface);
  border: 2px solid transparent;
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-base);
  min-width: 90px;
  box-shadow: var(--shadow-sm);
}

.partner-card:hover {
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.partner-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  margin-bottom: 8px;
  overflow: hidden;
}

.partner-avatar.owner {
  background: var(--secondary);
}

.partner-avatar.teacher {
  background: var(--success);
}

.partner-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.partner-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text);
  text-align: center;
}

.partner-place {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-align: center;
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  color: var(--primary);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-conversations p {
  color: var(--text-muted);
  margin-bottom: 20px;
}

.start-chat-btn {
  padding: 12px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.start-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
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
  background: rgba(136, 208, 228, 0.1);
}

.conversation-item.active {
  background: rgba(136, 208, 228, 0.15);
}

.conv-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
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

.conv-avatar.owner {
  background: var(--secondary);
}

.conv-avatar.teacher {
  background: #10b981;
}

.conv-avatar.student {
  background: #f59e0b;
}

.conv-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* Status Dot - Clean compact design */
.status-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
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

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-header {
  display: flex;
  align-items: center;
  gap: 8px;
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
  flex-shrink: 0;
}

.conv-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Role Badge - Compact pill style */
.role-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.role-badge.owner {
  background: #e0e7ff;
  color: #4f46e5;
}

.role-badge.teacher {
  background: #d1fae5;
  color: #059669;
}

.role-badge.student {
  background: #fef3c7;
  color: #d97706;
}

/* Status text in conversation list */
.conv-status {
  font-size: 11px;
  color: #94a3b8;
  margin-left: auto;
  flex-shrink: 0;
}

.conv-status.online {
  color: #22c55e;
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
  background: rgba(136, 208, 228, 0.08);
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
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: var(--font-size-lg);
  overflow: visible;
  position: relative;
}

.participant-avatar.owner {
  background: #6366f1;
}

.participant-avatar.teacher {
  background: #10b981;
}

.participant-avatar.student {
  background: #f59e0b;
}

.participant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.participant-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.participant-details h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text);
}

.status-text {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #94a3b8;
}

.status-text.online {
  background: #dcfce7;
  color: #16a34a;
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
  border-top-color: var(--primary);
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
  background: var(--primary);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
  box-shadow: 0 4px 15px rgba(136, 208, 228, 0.3);
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
  background: var(--background);
  border-radius: var(--radius-xl);
  border: 2px solid transparent;
  transition: all var(--transition-base);
}

.input-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(136, 208, 228, 0.2);
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
  background: var(--primary);
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
  box-shadow: var(--shadow-glow);
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
  color: var(--primary);
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
