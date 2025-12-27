<script setup>
import { computed } from 'vue'

const props = defineProps({
  rooms: {
    type: Array,
    default: () => []
  },
  selectedRoomId: {
    type: String,
    default: null
  },
  currentUserId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select'])

function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  // Today
  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  // This week
  if (diff < 604800000) {
    return date.toLocaleDateString('id-ID', { weekday: 'short' })
  }
  // Older
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="chat-list">
    <div class="chat-list-header">
      <h3>Pesan</h3>
    </div>
    
    <div v-if="rooms.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <p>Belum ada percakapan</p>
    </div>

    <div v-else class="rooms-container">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-item"
        :class="{ active: room.id === selectedRoomId }"
        @click="emit('select', room)"
      >
        <div class="avatar">
          <img
            v-if="room.otherParticipant?.avatar_url"
            :src="room.otherParticipant.avatar_url"
            :alt="room.otherParticipant?.name"
          />
          <span v-else class="avatar-initials">
            {{ getInitials(room.otherParticipant?.name) }}
          </span>
        </div>
        
        <div class="room-info">
          <div class="room-header">
            <span class="room-name">{{ room.otherParticipant?.name || 'Unknown' }}</span>
            <span class="room-time">{{ formatTime(room.last_message_at) }}</span>
          </div>
          <div class="room-preview">
            <span class="role-badge" :class="room.otherParticipant?.role">
              {{ room.otherParticipant?.role === 'teacher' ? 'Guru' : room.otherParticipant?.role === 'student' ? 'Siswa' : 'Owner' }}
            </span>
            <p class="last-message">{{ room.last_message || 'Belum ada pesan' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-right: 1px solid var(--border);
}

.chat-list-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border);
}

.chat-list-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.rooms-container {
  flex: 1;
  overflow-y: auto;
}

.room-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--border-light);
}

.room-item:hover {
  background: var(--background);
}

.room-item.active {
  background: var(--primary-bg);
  border-left: 3px solid var(--primary);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
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
  font-size: var(--font-size-sm);
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.room-name {
  font-weight: 600;
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.room-time {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

.room-preview {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.role-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  flex-shrink: 0;
}

.role-badge.teacher {
  background: #dcfce7;
  color: #16a34a;
}

.role-badge.student {
  background: #dbeafe;
  color: #2563eb;
}

.role-badge.owner {
  background: #fef3c7;
  color: #d97706;
}

.last-message {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
</style>
