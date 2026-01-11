<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

// Logout State
const logoutLoading = ref(false)

// Password State
const passwordForm = ref({
  password: '',
  confirmPassword: ''
})
const passwordLoading = ref(false)
const passwordMessage = ref({ type: '', text: '' })

async function handleLogout() {
  if (!confirm('Apakah Anda yakin ingin keluar dari akun?')) return

  logoutLoading.value = true
  try {
    await authStore.signOut()
    router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
    alert('Gagal keluar: ' + error.message)
  } finally {
    logoutLoading.value = false
  }
}

async function handleUpdatePassword() {
  if (passwordForm.value.password !== passwordForm.value.confirmPassword) {
    passwordMessage.value = { type: 'error', text: 'Konfirmasi password tidak cocok' }
    return
  }
  
  if (passwordForm.value.password.length < 6) {
    passwordMessage.value = { type: 'error', text: 'Password minimal 6 karakter' }
    return
  }

  passwordLoading.value = true
  passwordMessage.value = { type: '', text: '' }

  try {
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.value.password
    })

    if (error) throw error

    passwordMessage.value = { type: 'success', text: 'Password berhasil diperbarui!' }
    passwordForm.value.password = ''
    passwordForm.value.confirmPassword = ''
    
    // Clear success message after 3s
    setTimeout(() => {
       if (passwordMessage.value.type === 'success') passwordMessage.value = { type: '', text: '' }
    }, 3000)

  } catch (error) {
    passwordMessage.value = { type: 'error', text: 'Gagal update password: ' + error.message }
  } finally {
    passwordLoading.value = false
  }
}

async function deleteAccount() {
  if (!confirm('Yakin ingin menghapus akun? Semua data akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.')) return
  if (!confirm('Apakah Anda benar-benar yakin? Data tidak dapat dipulihkan kembali.')) return
  
  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: authStore.user.id }
    })

    if (error) throw error
    if (data && !data.success) throw new Error(data.error || 'Gagal menghapus akun')
    
    await authStore.signOut()
    router.push('/')
  } catch (err) {
    console.error('Delete account error:', err)
    alert('Gagal menghapus akun: ' + err.message)
  }
}
</script>

<template>
  <div class="dashboard">
    <main class="main">
      <header class="page-header">
        <h1>Pengaturan Akun</h1>
        <p>Kelola keamanan dan sesi akun Anda</p>
      </header>

      <div class="settings-grid">
        
        <!-- Security Section -->
        <section class="settings-card">
          <div class="card-header">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
               <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
             </svg>
             <h2>Keamanan Password</h2>
          </div>
          
          <div class="card-content">
             <p class="section-desc">Perbarui password akun Anda secara berkala untuk keamanan.</p>

             <div class="form-group">
               <label>Password Baru</label>
               <input type="password" v-model="passwordForm.password" placeholder="Minimal 6 karakter" class="input-field" />
             </div>
             <div class="form-group">
               <label>Konfirmasi Password</label>
               <input type="password" v-model="passwordForm.confirmPassword" placeholder="Ulangi password baru" class="input-field" />
             </div>
             
             <div v-if="passwordMessage.text" :class="['alert', passwordMessage.type]">
                <svg v-if="passwordMessage.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {{ passwordMessage.text }}
             </div>

             <div class="action-row">
               <button class="btn-primary" @click="handleUpdatePassword" :disabled="passwordLoading || !passwordForm.password">
                 <span v-if="passwordLoading" class="spinner"></span>
                 {{ passwordLoading ? 'Menyimpan...' : 'Perbarui Password' }}
               </button>
             </div>
          </div>
        </section>



        <!-- Delete Account -->
        <section class="settings-card danger">
          <div class="card-header">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
               <line x1="18" y1="9" x2="12" y2="15"></line>
               <line x1="12" y1="9" x2="18" y2="15"></line>
             </svg>
             <h2>Hapus Akun</h2>
          </div>
          <div class="card-content">
             <p class="section-desc">Menghapus akun Anda secara permanen. Semua data histori les, transaksi, dan profil akan hilang dan tidak dapat dikembalikan.</p>
             <button class="btn-delete" @click="deleteAccount">
               Hapus Akun Permanen
             </button>
          </div>
        </section>

        <!-- Logout Zone -->
        <section class="settings-card">
          <div class="card-header">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
               <polyline points="16 17 21 12 16 7"/>
               <line x1="21" y1="12" x2="9" y2="12"/>
             </svg>
             <h2>Keluar dari Sesi</h2>
          </div>
          <div class="card-content">
             <p class="section-desc">Keluar dari aplikasi di perangkat ini. Anda perlu login kembali untuk mengakses akun.</p>
             <button class="btn-logout" @click="handleLogout" :disabled="logoutLoading">
               {{ logoutLoading ? 'Keluar...' : 'Keluar Akun' }}
             </button>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: var(--background);
}

.main {
  flex: 1;
  padding: 32px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.page-header p {
  color: #64748b;
  font-size: 14px;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border: 1px solid #e2e8f0;
}

.settings-card.danger {
  border-color: #fee2e2;
  background: #fffafa;
}

.settings-card.danger .card-header svg {
  color: #ef4444;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header svg {
  width: 24px;
  height: 24px;
  color: #0d5782;
}

.card-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-desc {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 8px;
  line-height: 1.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.input-field {
  padding: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #0d5782;
  box-shadow: 0 0 0 3px rgba(13, 87, 130, 0.1);
}

.action-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn-primary {
  padding: 12px 24px;
  background: #0d5782;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #0a4568;
}

.btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.btn-logout {
  padding: 12px 24px;
  background: white;
  color: #ef4444;
  border: 1px solid #ef4444;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #ef4444;
  color: white;
}

.btn-delete {
  padding: 12px 24px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  transition: all 0.2s;
}
.btn-delete:hover {
  background: #b91c1c;
}

.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
}

.alert svg {
  width: 20px;
  height: 20px;
}

.alert.success {
  background: #dcfce7;
  color: #16a34a;
}

.alert.error {
  background: #fee2e2;
  color: #dc2626;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
