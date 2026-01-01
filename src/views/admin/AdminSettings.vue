<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const saving = ref(false)

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// Settings sections
const platformSettings = ref({
  platform_name: 'Mariles',
  tagline: 'Platform Les Terbaik di Indonesia',
  support_email: 'support@mariles.id',
  support_phone: '+62 812 3456 7890',
  whatsapp_number: '+6281234567890'
})

const feeSettings = ref({
  platform_fee_percent: 10,
  withdrawal_fee: 5000,
  min_withdrawal: 50000,
  max_withdrawal: 10000000
})

const notificationSettings = ref({
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  marketing_emails: false
})

const securitySettings = ref({
  two_factor_enabled: false,
  session_timeout: 24,
  max_login_attempts: 5,
  require_email_verification: true
})

onMounted(async () => {
  await loadSettings()
})

async function loadSettings() {
  loading.value = true
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('*')
      .single()

    if (data) {
      platformSettings.value = { ...platformSettings.value, ...data.platform }
      feeSettings.value = { ...feeSettings.value, ...data.fees }
      notificationSettings.value = { ...notificationSettings.value, ...data.notifications }
      securitySettings.value = { ...securitySettings.value, ...data.security }
    }
  } catch (err) {
    console.log('Using default settings')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast('Pengaturan berhasil disimpan!', 'success')
  } catch (err) {
    toast('Gagal menyimpan', 'error')
  } finally {
    saving.value = false
  }
}

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <Transition name="slide">
      <div v-if="showToast" :class="['toast', toastType]">{{ toastMessage }}</div>
    </Transition>

    <main class="main-content">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Pengaturan Platform
          </h1>
          <p class="subtitle">Konfigurasi umum dan parameter sistem</p>
        </div>
        <button class="btn-save" @click="saveSettings" :disabled="saving">
          {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </header>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="settings-grid">
        <!-- Platform Info -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon-box blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
              <h3>Informasi Platform</h3>
              <p>Nama dan kontak platform</p>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Nama Platform</label>
              <input v-model="platformSettings.platform_name" type="text" class="form-input">
            </div>
            <div class="form-group">
              <label>Tagline</label>
              <input v-model="platformSettings.tagline" type="text" class="form-input">
            </div>
            <div class="form-group">
              <label>Email Support</label>
              <input v-model="platformSettings.support_email" type="email" class="form-input">
            </div>
            <div class="form-group">
              <label>Telepon Support</label>
              <input v-model="platformSettings.support_phone" type="tel" class="form-input">
            </div>
          </div>
        </section>

        <!-- Fee Settings -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon-box green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <h3>Pengaturan Biaya</h3>
              <p>Komisi dan biaya transaksi</p>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Komisi Platform (%)</label>
              <input v-model.number="feeSettings.platform_fee_percent" type="number" min="0" max="50" class="form-input">
            </div>
            <div class="form-group">
              <label>Biaya Pencairan (Rp)</label>
              <input v-model.number="feeSettings.withdrawal_fee" type="number" class="form-input">
            </div>
            <div class="form-group">
              <label>Min. Pencairan (Rp)</label>
              <input v-model.number="feeSettings.min_withdrawal" type="number" class="form-input">
            </div>
            <div class="form-group">
              <label>Max. Pencairan (Rp)</label>
              <input v-model.number="feeSettings.max_withdrawal" type="number" class="form-input">
            </div>
          </div>
        </section>

        <!-- Notification Settings -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon-box orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <h3>Notifikasi</h3>
              <p>Pengaturan notifikasi sistem</p>
            </div>
          </div>
          <div class="card-body">
            <div class="toggle-group">
              <div class="toggle-item">
                <span>Notifikasi Email</span>
                <label class="toggle">
                  <input type="checkbox" v-model="notificationSettings.email_notifications">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="toggle-item">
                <span>Push Notification</span>
                <label class="toggle">
                  <input type="checkbox" v-model="notificationSettings.push_notifications">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="toggle-item">
                <span>SMS Notification</span>
                <label class="toggle">
                  <input type="checkbox" v-model="notificationSettings.sms_notifications">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Security Settings -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon-box purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <h3>Keamanan</h3>
              <p>Pengaturan keamanan akun</p>
            </div>
          </div>
          <div class="card-body">
            <div class="toggle-group">
              <div class="toggle-item">
                <span>Two-Factor Authentication</span>
                <label class="toggle">
                  <input type="checkbox" v-model="securitySettings.two_factor_enabled">
                  <span class="slider"></span>
                </label>
              </div>
              <div class="toggle-item">
                <span>Verifikasi Email Wajib</span>
                <label class="toggle">
                  <input type="checkbox" v-model="securitySettings.require_email_verification">
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            <div class="form-group" style="margin-top: 20px;">
              <label>Session Timeout (jam)</label>
              <input v-model.number="securitySettings.session_timeout" type="number" min="1" max="168" class="form-input">
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.page-header h1 { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.page-header h1 svg { width: 28px; height: 28px; color: #0A4568; }
.subtitle { font-size: 14px; color: #64748B; }

.btn-save { padding: 12px 24px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-save:disabled { opacity: 0.7; }

.loading-state { display: flex; justify-content: center; padding: 80px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }

.settings-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; }
.card-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.card-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-icon-box svg { width: 24px; height: 24px; }
.card-icon-box.blue { background: #DBEAFE; color: #3B82F6; }
.card-icon-box.green { background: #D1FAE5; color: #10B981; }
.card-icon-box.orange { background: #FEF3C7; color: #F59E0B; }
.card-icon-box.purple { background: #EDE9FE; color: #8B5CF6; }
.card-header h3 { font-size: 16px; font-weight: 600; color: #1E293B; margin-bottom: 2px; }
.card-header p { font-size: 13px; color: #64748B; }
.card-body { padding: 24px; }

.form-group { margin-bottom: 20px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; }
.form-input:focus { outline: none; border-color: #0A4568; }

.toggle-group { display: flex; flex-direction: column; gap: 16px; }
.toggle-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #F8FAFC; border-radius: 12px; }
.toggle-item span { font-size: 14px; font-weight: 500; color: #1E293B; }

.toggle { position: relative; width: 48px; height: 26px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #CBD5E1; border-radius: 26px; transition: 0.3s; }
.slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .slider { background: #10B981; }
.toggle input:checked + .slider:before { transform: translateX(22px); }

.toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; font-weight: 500; z-index: 200; }
.toast.success { background: #D1FAE5; color: #059669; }
.toast.error { background: #FEE2E2; color: #DC2626; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s; }
.slide-enter-from, .slide-leave-to { transform: translateX(100px); opacity: 0; }

@media (max-width: 1024px) { .settings-grid { grid-template-columns: 1fr; } }
</style>