<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: String,
    required: true
  },
  participant: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['send'])

const newMessage = ref('')
const messagesContainer = ref(null)

// Auto-scroll to bottom when new messages arrive
watch(() => props.messages.length, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

onMounted(() => {
  scrollToBottom()
})

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleSend() {
  const message = newMessage.value.trim()
  if (!message) return
  
  emit('send', message)
  newMessage.value = ''
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return 'Hari ini'
  }
  if (diff < 172800000 && date.getDate() === now.getDate() - 1) {
    return 'Kemarin'
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function shouldShowDate(index) {
  if (index === 0) return true
  const prevDate = new Date(props.messages[index - 1].created_at).toDateString()
  const currDate = new Date(props.messages[index].created_at).toDateString()
  return prevDate !== currDate
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="chat-window">
    <!-- Header -->
    <div v-if="participant" class="chat-header">
      <div class="participant-info">
        <div class="avatar">
          <img v-if="participant.avatar_url" :src="participant.avatar_url" :alt="participant.name" />
          <span v-else class="avatar-initials">{{ getInitials(participant.name) }}</span>
        </div>
        <div>
          <h4>{{ participant.name }}</h4>
          <span class="role">{{ participant.role === 'teacher' ? 'Guru' : participant.role === 'student' ? 'Siswa' : 'Owner' }}</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!participant" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <h3>Pilih Percakapan</h3>
      <p>Pilih percakapan dari daftar untuk mulai chat</p>
    </div>

    <!-- Messages -->
    <div v-else ref="messagesContainer" class="messages-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <template v-else>
        <div v-if="messages.length === 0" class="no-messages">
          <p>Belum ada pesan. Mulai percakapan!</p>
        </div>

        <template v-for="(message, index) in messages" :key="message.id">
          <!-- Date Separator -->
          <div v-if="shouldShowDate(index)" class="date-separator">
            <span>{{ formatDate(message.created_at) }}</span>
          </div>

          <!-- Message Bubble -->
          <div
            class="message"
            :class="{ 'own': message.sender_id === currentUserId }"
          >
            <div v-if="message.sender_id !== currentUserId" class="message-avatar">
              <img v-if="message.sender?.avatar_url" :src="message.sender.avatar_url" :alt="message.sender?.name" />
              <span v-else class="avatar-initials">{{ getInitials(message.sender?.name) }}</span>
            </div>
            
            <div class="message-content">
              <div class="bubble">
                <p>{{ message.message }}</p>
              </div>
              <span class="message-time">{{ formatTime(message.created_at) }}</span>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Input -->
    <div v-if="participant" class="message-input">
      <textarea
        v-model="newMessage"
        placeholder="Ketik pesan..."
        rows="1"
        @keydown="handleKeydown"
      ></textarea>
      <button class="send-btn" @click="handleSend" :disabled="!newMessage.trim()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background);
}

.chat-header {
  padding: var(--spacing-md) var(--spacing-lg);
  background: white;
  border-bottom: 1px solid var(--border);
}

.participant-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  color: white;
  font-weight: 600;
  font-size: var(--font-size-xs);
}

.participant-info h4 {
  font-weight: 600;
  margin: 0;
  font-size: var(--font-size-sm);
}

.role {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
  padding: var(--spacing-xl);
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: var(--spacing-lg);
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0 0 var(--spacing-sm);
  color: var(--text);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
}

.no-messages {
  text-align: center;
  color: var(--text-muted);
  padding: var(--spacing-xl);
}

.date-separator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--spacing-md) 0;
}

.date-separator span {
  background: var(--border-light);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.message {
  display: flex;
  gap: var(--spacing-sm);
  max-width: 75%;
}

.message.own {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message.own .message-content {
  align-items: flex-end;
}

.bubble {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-xl);
  background: white;
  box-shadow: var(--shadow-sm);
}

.message.own .bubble {
  background: var(--primary);
  color: white;
}

.bubble p {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  word-break: break-word;
}

.message-time {
  font-size: 10px;
  color: var(--text-muted);
}

.message-input {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  background: white;
  border-top: 1px solid var(--border);
}

.message-input textarea {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  resize: none;
  max-height: 100px;
  font-family: inherit;
}

.message-input textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.send-btn:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 20px;
  height: 20px;
}
</style>
