<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref({ type: '', text: '' })

// Ensure session exists (handled by router guard + hash parsing ideally, but double check)
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    message.value = { type: 'error', text: 'Sesi tidak valid atau kadaluarsa. Silakan request reset password ulang.' }
  }
})

async function handleUpdatePassword() {
  if (password.value !== confirmPassword.value) {
    message.value = { type: 'error', text: 'Konfirmasi password tidak cocok' }
    return
  }

  if (password.value.length < 6) {
    message.value = { type: 'error', text: 'Password minimal 6 karakter' }
    return
  }

  loading.value = true
  message.value = { type: '', text: '' }

  try {
    const { error } = await supabase.auth.updateUser({
      password: password.value
    })

    if (error) throw error

    message.value = { type: 'success', text: 'Password berhasil diubah! Mengalihkan ke login...' }
    
    setTimeout(() => {
      router.push('/login')
    }, 2000)

  } catch (error) {
    message.value = { type: 'error', text: 'Gagal mengubah password: ' + error.message }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Buat Password Baru</h1>
      <p class="subtitle">Amankan akun Anda dengan password baru.</p>

      <form @submit.prevent="handleUpdatePassword" class="auth-form">
        <div class="form-group">
          <label>Password Baru</label>
          <input 
            type="password" 
            v-model="password" 
            placeholder="Minimal 6 karakter" 
            required 
            class="input-field"
          />
        </div>
        
        <div class="form-group">
          <label>Konfirmasi Password</label>
          <input 
            type="password" 
            v-model="confirmPassword" 
            placeholder="Ulangi password baru" 
            required 
            class="input-field"
          />
        </div>

        <div v-if="message.text" :class="['alert', message.type]">
          {{ message.text }}
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Menyimpan...' : 'Simpan Password' }}
        </button>
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
