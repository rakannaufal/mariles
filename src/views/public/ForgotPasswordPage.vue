<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const email = ref('')
const loading = ref(false)
const message = ref({ type: '', text: '' })

async function handleResetRequest() {
  if (!email.value) return
  
  loading.value = true
  message.value = { type: '', text: '' }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: window.location.origin + '/update-password'
    })

    if (error) throw error

    message.value = { 
      type: 'success', 
      text: 'Link reset password telah dikirim ke email Anda. Silakan cek inbox/spam.' 
    }
  } catch (error) {
    message.value = { 
      type: 'error', 
      text: 'Gagal mengirim email: ' + error.message 
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Lupa Password?</h1>
      <p class="subtitle">Masukkan email Anda untuk menerima link reset password.</p>

      <form @submit.prevent="handleResetRequest" class="auth-form">
        <div class="form-group">
          <label>Email</label>
          <input 
            type="email" 
            v-model="email" 
            placeholder="nama@email.com" 
            required 
            class="input-field"
          />
        </div>

        <div v-if="message.text" :class="['alert', message.type]">
          {{ message.text }}
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Mengirim...' : 'Kirim Link Reset' }}
        </button>

        <router-link to="/login" class="back-link">Kembali ke Login</router-link>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background);
  padding: 20px;
}

.auth-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text);
}

.input-field {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary);
}

.btn-primary {
  width: 100%;
  padding: 12px;
  background: var(--secondary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--secondary-dark);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.back-link {
  color: var(--text-secondary);
  font-size: 14px;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.alert {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.alert.success {
  background: var(--success-bg);
  color: var(--success);
}

.alert.error {
  background: var(--error-bg);
  color: var(--error);
}
</style>
