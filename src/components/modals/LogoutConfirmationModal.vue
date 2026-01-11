<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true
  }
})

defineEmits(['close', 'confirm'])
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-body">
          <div class="icon-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>
          <h3>Yakin keluar?</h3>
          <p>Anda harus login kembali untuk mengakses akun Anda.</p>
        </div>
        
        <div class="modal-actions">
          <button class="btn-cancel" @click="$emit('close')">Tidak</button>
          <button class="btn-confirm" @click="$emit('confirm')">Keluar</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-body {
  margin-bottom: 24px;
}

.icon-warning {
  width: 60px;
  height: 60px;
  background: #FEE2E2;
  color: #DC2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.icon-warning svg {
  width: 30px;
  height: 30px;
}

h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
  margin-bottom: 8px;
}

p {
  color: #6B7280;
  font-size: 14px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

button {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: white;
  border: 1px solid #E5E7EB;
  color: #374151;
}

.btn-cancel:hover {
  background: #F3F4F6;
  border-color: #D1D5DB;
}

.btn-confirm {
  background: #DC2626;
  border: 1px solid #DC2626;
  color: white;
}

.btn-confirm:hover {
  background: #B91C1C;
  border-color: #B91C1C;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
}
</style>
