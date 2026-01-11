<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// State
const loading = ref(true)
const saving = ref(false)
const lesPlace = ref(null)
const showPasswordModal = ref(false)
const showDeleteModal = ref(false)

// Settings form
const settings = ref({
  email_notifications: true,
  new_registration_notifications: true,
  payment_notifications: true,
  review_notifications: true,
  quiz_weight: 60,
  latihan_weight: 40,
  passing_grade: 70
})

// Password form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordError = ref('')
const passwordSuccess = ref(false)

// Fetch les place and settings
async function fetchSettings() {
  loading.value = true
  try {
    // Get owner's les place
    const { data: ownerData } = await supabase
      .from('owners')
      .select('id')
      .eq('user_id', authStore.user.id)
      .single()

    if (ownerData) {
      const { data: lesData } = await supabase
        .from('les_places')
        .select('id, name, settings')
        .eq('owner_id', ownerData.id)
        .single()

      if (lesData) {
        lesPlace.value = lesData
        // Merge with saved settings
        if (lesData.settings) {
          settings.value = { ...settings.value, ...lesData.settings }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching settings:', err)
  } finally {
    loading.value = false
  }
}

// Save settings
async function saveSettings() {
  if (!lesPlace.value) return
  
  // Validate weights sum to 100
  if (settings.value.quiz_weight + settings.value.latihan_weight !== 100) {
    alert('Bobot Quiz + Latihan harus berjumlah 100%')
    return
  }
  
  saving.value = true
  try {
    const { error } = await supabase
      .from('les_places')
      .update({
        settings: {
          email_notifications: settings.value.email_notifications,
          new_registration_notifications: settings.value.new_registration_notifications,
          payment_notifications: settings.value.payment_notifications,
          review_notifications: settings.value.review_notifications,
          quiz_weight: settings.value.quiz_weight,
          latihan_weight: settings.value.latihan_weight,
          passing_grade: settings.value.passing_grade
        }
      })
      .eq('id', lesPlace.value.id)

    if (error) throw error
    alert('Pengaturan berhasil disimpan!')
  } catch (err) {
    console.error('Error saving settings:', err)
    alert('Gagal menyimpan: ' + err.message)
  } finally {
    saving.value = false
  }
}

// Change password
async function changePassword() {
  passwordError.value = ''
  passwordSuccess.value = false
  
  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = 'Password minimal 6 karakter'
    return
  }
  
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'Konfirmasi password tidak cocok'
    return
  }
  
  saving.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.value.newPassword
    })
    
    if (error) throw error
    
    passwordSuccess.value = true
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    setTimeout(() => {
      showPasswordModal.value = false
      passwordSuccess.value = false
    }, 2000)
  } catch (err) {
    passwordError.value = err.message
  } finally {
    saving.value = false
  }
}

// Delete account
async function deleteAccount() {
  if (!confirm('Yakin ingin menghapus akun? Semua data akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.')) return
  if (!confirm('Apakah Anda benar-benar yakin? Data tidak dapat dipulihkan kembali.')) return
  
  try {
    // Hard delete via Edge Function
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: authStore.user.id }
    })

    if (error) throw error
    if (data && !data.success) throw new Error(data.error || 'Gagal menghapus akun')
    
    await authStore.signOut()
    window.location.href = '/'
  } catch (err) {
    console.error('Delete account error:', err)
    alert('Gagal menghapus akun: ' + err.message)
  }
}

// Computed for weight validation
const weightsValid = computed(() => {
  return settings.value.quiz_weight + settings.value.latihan_weight === 100
})

onMounted(fetchSettings)
</script>

<template>
  <div class="dashboard">

    <main class="main">
      <header class="header">
        <h1>Pengaturan</h1>
        <p class="subtitle">Kelola pengaturan tempat les Anda</p>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat pengaturan...</p>
      </div>

      <div v-else class="settings-container">
        <!-- Notification Settings -->
        <div class="settings-card">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            Notifikasi
          </h3>
          
          <div class="setting-item">
            <div class="setting-info">
              <strong>Email Notifikasi</strong>
              <p>Terima notifikasi via email</p>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.email_notifications">
              <span class="slider"></span>
            </label>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <strong>Pendaftaran Baru</strong>
              <p>Notifikasi saat ada siswa mendaftar</p>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.new_registration_notifications">
              <span class="slider"></span>
            </label>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <strong>Pembayaran</strong>
              <p>Notifikasi saat ada pembayaran masuk</p>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.payment_notifications">
              <span class="slider"></span>
            </label>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <strong>Review Baru</strong>
              <p>Notifikasi saat ada review dari siswa</p>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.review_notifications">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- Grading Settings -->
        <div class="settings-card">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Pengaturan Nilai
          </h3>
          
          <div class="setting-item vertical">
            <div class="setting-info">
              <strong>Bobot Quiz</strong>
              <p>Persentase nilai quiz terhadap nilai akhir</p>
            </div>
            <div class="input-group">
              <input type="number" v-model.number="settings.quiz_weight" min="0" max="100">
              <span>%</span>
            </div>
          </div>
          
          <div class="setting-item vertical">
            <div class="setting-info">
              <strong>Bobot Latihan</strong>
              <p>Persentase nilai latihan terhadap nilai akhir</p>
            </div>
            <div class="input-group">
              <input type="number" v-model.number="settings.latihan_weight" min="0" max="100">
              <span>%</span>
            </div>
          </div>
          
          <div v-if="!weightsValid" class="weight-warning">
            ⚠️ Total bobot harus 100% (saat ini: {{ settings.quiz_weight + settings.latihan_weight }}%)
          </div>
          
          <div class="setting-item vertical">
            <div class="setting-info">
              <strong>KKM (Kriteria Ketuntasan Minimal)</strong>
              <p>Nilai minimum untuk dinyatakan lulus</p>
            </div>
            <div class="input-group">
              <input type="number" v-model.number="settings.passing_grade" min="0" max="100">
              <span>nilai</span>
            </div>
          </div>
          
          <button class="btn btn-primary" @click="saveSettings" :disabled="saving || !weightsValid">
            {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
          </button>
        </div>

        <!-- Account Settings -->
        <div class="settings-card">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Akun
          </h3>
          
          <div class="setting-item">
            <div class="setting-info">
              <strong>Ubah Password</strong>
              <p>Perbarui password akun Anda</p>
            </div>
            <button class="btn btn-outline btn-sm" @click="showPasswordModal = true">Ubah</button>
          </div>
          
          <div class="setting-item danger">
            <div class="setting-info">
              <strong>Hapus Akun</strong>
              <p>Hapus akun dan semua data secara permanen</p>
            </div>
            <button class="btn btn-error btn-sm" @click="deleteAccount">Hapus</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Password Modal -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Ubah Password</h2>
          <button class="close-btn" @click="showPasswordModal = false">&times;</button>
        </div>
        <form @submit.prevent="changePassword" class="modal-body">
          <div v-if="passwordSuccess" class="success-message">
            ✅ Password berhasil diubah!
          </div>
          <template v-else>
            <div class="form-group">
              <label>Password Baru</label>
              <input type="password" v-model="passwordForm.newPassword" placeholder="Minimal 6 karakter" required>
            </div>
            <div class="form-group">
              <label>Konfirmasi Password</label>
              <input type="password" v-model="passwordForm.confirmPassword" placeholder="Ulangi password baru" required>
            </div>
            <div v-if="passwordError" class="error-message">{{ passwordError }}</div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="showPasswordModal = false">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Ubah Password' }}
              </button>
            </div>
          </template>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #f8fafc; }
.main { flex: 1; padding: 24px 32px; }
.header { margin-bottom: 24px; }
.header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; }
.subtitle { color: #64748b; font-size: 14px; margin: 0; }

.loading-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d5782; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.settings-container { display: flex; flex-direction: column; gap: 20px; max-width: 700px; }
.settings-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.settings-card h3 { font-size: 18px; font-weight: 700; margin: 0 0 20px; display: flex; align-items: center; gap: 10px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
.settings-card h3 svg { width: 22px; height: 22px; color: #0d5782; }

.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f1f5f9; }
.setting-item:last-child { border-bottom: none; }
.setting-item.vertical { flex-direction: column; align-items: flex-start; gap: 12px; }
.setting-item.danger .setting-info strong { color: #dc2626; }
.setting-info strong { display: block; font-size: 15px; margin-bottom: 4px; }
.setting-info p { color: #64748b; font-size: 13px; margin: 0; }

.toggle { position: relative; width: 52px; height: 28px; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 28px; transition: 0.3s; }
.slider::before { content: ''; position: absolute; height: 22px; width: 22px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.toggle input:checked + .slider { background: #0d5782; }
.toggle input:checked + .slider::before { transform: translateX(24px); }

.input-group { display: flex; align-items: center; gap: 8px; }
.input-group input { width: 80px; padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 16px; font-weight: 600; text-align: center; }
.input-group input:focus { outline: none; border-color: #0d5782; }
.input-group span { color: #64748b; font-size: 14px; }

.weight-warning { background: #fef3c7; color: #b45309; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin: 12px 0; }

.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: linear-gradient(135deg, #0d5782, #0a4568); color: white; width: 100%; justify-content: center; margin-top: 16px; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(13, 87, 130, 0.3); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #f1f5f9; color: #475569; }
.btn-outline { background: transparent; border: 2px solid #e2e8f0; color: #475569; }
.btn-outline:hover { border-color: #0d5782; color: #0d5782; }
.btn-error { background: #dc2626; color: white; }
.btn-sm { padding: 8px 16px; font-size: 13px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 420px; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h2 { font-size: 20px; font-weight: 700; margin: 0; }
.close-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f1f5f9; font-size: 24px; cursor: pointer; }
.modal-body { padding: 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #475569; }
.form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; }
.form-group input:focus { outline: none; border-color: #0d5782; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
.error-message { background: #fee2e2; color: #dc2626; padding: 12px 16px; border-radius: 10px; font-size: 14px; margin-bottom: 16px; }
.success-message { background: #dcfce7; color: #16a34a; padding: 20px; border-radius: 12px; text-align: center; font-weight: 600; }

@media (max-width: 768px) {
  .main { padding: 16px; }
}
</style>
