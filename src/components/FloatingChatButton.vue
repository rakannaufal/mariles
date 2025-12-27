<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function openChat() {
  router.push('/student/chat')
}
</script>

<template>
  <button class="floating-chat-btn" @click="openChat" title="Chat">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <span class="btn-label">Chat</span>
  </button>
</template>

<style scoped>
.floating-chat-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(13, 87, 130, 0.35);
  transition: all var(--transition-base);
  z-index: 1000;
  overflow: hidden;
}

.floating-chat-btn svg {
  width: 28px;
  height: 28px;
  transition: all var(--transition-base);
}

.btn-label {
  position: absolute;
  opacity: 0;
  transform: translateX(10px);
  font-size: var(--font-size-sm);
  font-weight: 600;
  white-space: nowrap;
  transition: all var(--transition-base);
}

.floating-chat-btn:hover {
  width: 120px;
  border-radius: var(--radius-xl);
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

/* Pulse animation for attention */
.floating-chat-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: inherit;
  animation: pulse-ring 2s infinite;
  z-index: -1;
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

@media (max-width: 768px) {
  .floating-chat-btn {
    bottom: 16px;
    right: 16px;
    width: 56px;
    height: 56px;
  }

  .floating-chat-btn:hover {
    width: 56px;
    border-radius: var(--radius-full);
  }

  .floating-chat-btn:hover svg {
    transform: none;
  }

  .floating-chat-btn:hover .btn-label {
    opacity: 0;
  }
}
</style>
