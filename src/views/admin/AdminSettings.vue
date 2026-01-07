<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const saving = ref(false)
const tableExists = ref(true)

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// Settings
const platformInfo = ref({
  platform_name: 'Mariles',
  tagline: 'Platform Les Terbaik di Indonesia',
  support_email: 'support@mariles.id',
  support_phone: '+62 812 3456 7890',
  whatsapp_number: '+6281234567890'
})

const platformFees = ref({
  platform_fee_percent: 10,
  withdrawal_fee: 5000,
  min_withdrawal: 50000,
  max_withdrawal: 10000000
})

const maintenanceMode = ref({
  enabled: false,
  message: 'Platform sedang dalam perbaikan.'
})

const dummyDataMode = ref({
  enabled: true
})

const hasChanges = ref(false)

onMounted(async () => {
  await loadSettings()
})

async function loadSettings() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value')

    if (error) {
      console.error('Error loading settings:', error)
      tableExists.value = false
      toast('Gagal memuat pengaturan dari database', 'error')
      loading.value = false
      return
    }

    if (data && data.length > 0) {
      data.forEach(setting => {
        if (setting.key === 'platform_info') platformInfo.value = { ...platformInfo.value, ...setting.value }
        if (setting.key === 'platform_fees') platformFees.value = { ...platformFees.value, ...setting.value }
        if (setting.key === 'maintenance_mode') maintenanceMode.value = { ...maintenanceMode.value, ...setting.value }
        if (setting.key === 'dummy_data_mode') dummyDataMode.value = { ...dummyDataMode.value, ...setting.value }
      })
      tableExists.value = true
    }
    hasChanges.value = false
  } catch (err) {
    console.error('Load error:', err)
    tableExists.value = false
  } finally {
    loading.value = false
  }
}

async function saveSetting(key, value) {
  const user = (await supabase.auth.getUser()).data.user
  const { error } = await supabase
    .from('platform_settings')
    .update({ 
      value: value,
      updated_by: user?.id,
      updated_at: new Date().toISOString()
    })
    .eq('key', key)
  
  if (error) throw error
}

async function saveAllSettings() {
  if (!tableExists.value) {
    toast('Database belum tersedia', 'error')
    return
  }
  
  saving.value = true
  try {
    await saveSetting('platform_info', platformInfo.value)
    await saveSetting('platform_fees', platformFees.value)
    await saveSetting('maintenance_mode', maintenanceMode.value)
    await saveSetting('dummy_data_mode', dummyDataMode.value)
    
    hasChanges.value = false
    toast('Pengaturan berhasil disimpan', 'success')
  } catch (err) {
    console.error('Save error:', err)
    toast('Gagal menyimpan: ' + err.message, 'error')
  } finally {
    saving.value = false
  }
}

async function toggleDummyData() {
  if (!tableExists.value) return
  
  const newValue = !dummyDataMode.value.enabled
  dummyDataMode.value.enabled = newValue
  
  try {
    await saveSetting('dummy_data_mode', dummyDataMode.value)
    toast(newValue ? 'Mode Data Dummy diaktifkan' : 'Mode Data Asli diaktifkan', 'success')
    setTimeout(() => window.location.reload(), 1500)
  } catch (err) {
    toast('Gagal menyimpan', 'error')
    dummyDataMode.value.enabled = !newValue
  }
}

async function toggleMaintenance() {
  if (!tableExists.value) return
  
  const newValue = !maintenanceMode.value.enabled
  maintenanceMode.value.enabled = newValue
  
  try {
    await saveSetting('maintenance_mode', maintenanceMode.value)
    toast(newValue ? 'Mode Maintenance diaktifkan' : 'Mode Maintenance dinonaktifkan', 'success')
    setTimeout(() => window.location.reload(), 1500)
  } catch (err) {
    toast('Gagal menyimpan', 'error')
    maintenanceMode.value.enabled = !newValue
  }
}

function markAsChanged() {
  hasChanges.value = true
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
      <div v-if="showToast" :class="['toast', toastType]">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toastMessage }}
      </div>
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
          <p class="subtitle">Kelola konfigurasi sistem platform</p>
        </div>
        <div class="header-actions">
          <span v-if="hasChanges" class="unsaved-badge">Belum Disimpan</span>
          <button class="btn-save" @click="saveAllSettings" :disabled="saving || !hasChanges || !tableExists">
            <svg v-if="saving" class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="40" stroke-linecap="round"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Memuat pengaturan...</p>
      </div>

      <div v-else class="settings-grid">
        <!-- Platform Info -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
              <h3>Informasi Platform</h3>
              <p>Nama dan kontak website</p>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Nama Platform</label>
              <input v-model="platformInfo.platform_name" @input="markAsChanged" type="text" class="form-input">
            </div>
            <div class="form-group">
              <label>Tagline</label>
              <input v-model="platformInfo.tagline" @input="markAsChanged" type="text" class="form-input">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Email Support</label>
                <input v-model="platformInfo.support_email" @input="markAsChanged" type="email" class="form-input">
              </div>
              <div class="form-group">
                <label>Telepon Support</label>
                <input v-model="platformInfo.support_phone" @input="markAsChanged" type="tel" class="form-input">
              </div>
            </div>
            <div class="form-group">
              <label>Nomor WhatsApp</label>
              <input v-model="platformInfo.whatsapp_number" @input="markAsChanged" type="tel" class="form-input">
            </div>
          </div>
        </section>

        <!-- Fee Settings -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon green">
              <span class="rp-icon">Rp</span>
            </div>
            <div>
              <h3>Pengaturan Biaya</h3>
              <p>Komisi dan biaya transaksi</p>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Komisi Platform (%)</label>
              <input v-model.number="platformFees.platform_fee_percent" @input="markAsChanged" type="number" min="0" max="50" class="form-input">
            </div>
            <div class="form-group">
              <label>Biaya Pencairan (Rp)</label>
              <input v-model.number="platformFees.withdrawal_fee" @input="markAsChanged" type="number" min="0" class="form-input">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Min. Pencairan (Rp)</label>
                <input v-model.number="platformFees.min_withdrawal" @input="markAsChanged" type="number" min="0" class="form-input">
              </div>
              <div class="form-group">
                <label>Max. Pencairan (Rp)</label>
                <input v-model.number="platformFees.max_withdrawal" @input="markAsChanged" type="number" min="0" class="form-input">
              </div>
            </div>
          </div>
        </section>

        <!-- Dummy Data Toggle -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon" :class="dummyDataMode.enabled ? 'orange' : 'teal'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <div>
              <h3>Mode Data</h3>
              <p>Pilih sumber data tampilan</p>
            </div>
          </div>
          <div class="card-body">
            <div class="toggle-section" :class="{ active: dummyDataMode.enabled }">
              <div class="toggle-info">
                <span class="toggle-title">{{ dummyDataMode.enabled ? 'Data Dummy (Demo)' : 'Data Asli (Database)' }}</span>
                <span class="toggle-desc">{{ dummyDataMode.enabled ? 'Menampilkan data contoh untuk demonstrasi' : 'Menampilkan data nyata dari Supabase' }}</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" :checked="dummyDataMode.enabled" @change="toggleDummyData">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Maintenance Mode -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-icon" :class="maintenanceMode.enabled ? 'red' : 'purple'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <div>
              <h3>Mode Maintenance</h3>
              <p>Nonaktifkan website sementara</p>
            </div>
          </div>
          <div class="card-body">
            <div class="toggle-section" :class="{ danger: maintenanceMode.enabled }">
              <div class="toggle-info">
                <span class="toggle-title">{{ maintenanceMode.enabled ? 'Maintenance Aktif' : 'Website Normal' }}</span>
                <span class="toggle-desc">{{ maintenanceMode.enabled ? 'Pengguna tidak dapat mengakses website' : 'Semua pengguna dapat mengakses website' }}</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" :checked="maintenanceMode.enabled" @change="toggleMaintenance">
                <span class="toggle-slider" :class="{ danger: maintenanceMode.enabled }"></span>
              </label>
            </div>
            <div v-if="maintenanceMode.enabled" class="form-group mt-4">
              <label>Pesan Maintenance</label>
              <textarea v-model="maintenanceMode.message" @input="markAsChanged" class="form-textarea" rows="2" placeholder="Pesan untuk pengguna..."></textarea>
              <span class="form-hint">Klik "Simpan Perubahan" untuk menyimpan pesan</span>
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

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
.page-header h1 { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.page-header h1 svg { width: 26px; height: 26px; color: #0A4568; }
.subtitle { font-size: 14px; color: #64748B; }

.header-actions { display: flex; align-items: center; gap: 12px; }
.unsaved-badge { padding: 8px 14px; background: #FEF3C7; color: #B45309; font-size: 13px; font-weight: 600; border-radius: 8px; }

.btn-save { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #0A4568; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-save:not(:disabled):hover { background: #083350; }
.btn-save svg { width: 18px; height: 18px; }
.spinner { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.loading-state { display: flex; flex-direction: column; align-items: center; padding: 80px; color: #64748B; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: #0A4568; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }

.settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }

.settings-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

.card-header { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.card-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-icon svg { width: 26px; height: 26px; }
.card-icon.blue { background: #F1F5F9; color: #0D5782; }
.card-icon.green { background: #F1F5F9; color: #0D5782; }
.card-icon.purple { background: #F1F5F9; color: #0D5782; }
.card-icon.red { background: #F1F5F9; color: #0D5782; }
.card-icon.orange { background: #F1F5F9; color: #0D5782; }
.card-icon.teal { background: #F1F5F9; color: #0D5782; }
.rp-icon { font-size: 18px; font-weight: 800; }

.card-header h3 { font-size: 15px; font-weight: 600; color: #1E293B; margin-bottom: 2px; }
.card-header p { font-size: 13px; color: #64748B; }
.card-body { padding: 24px; }

.form-group { margin-bottom: 18px; }
.form-group:last-child { margin-bottom: 0; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.form-input { width: 100%; padding: 11px 14px; border: 1px solid #D1D5DB; border-radius: 10px; font-size: 14px; transition: all 0.2s; }
.form-input:focus { outline: none; border-color: #0A4568; box-shadow: 0 0 0 3px rgba(10,69,104,0.1); }
.form-textarea { width: 100%; padding: 11px 14px; border: 1px solid #D1D5DB; border-radius: 10px; font-size: 14px; font-family: inherit; resize: vertical; transition: all 0.2s; }
.form-textarea:focus { outline: none; border-color: #0A4568; box-shadow: 0 0 0 3px rgba(10,69,104,0.1); }
.form-hint { display: block; font-size: 12px; color: #94A3B8; margin-top: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.toggle-section { display: flex; justify-content: space-between; align-items: center; padding: 18px; background: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; transition: all 0.2s; }
.toggle-section.active { background: #FFF7ED; border-color: #FDBA74; }
.toggle-section.danger { background: #FEF2F2; border-color: #FECACA; }
.toggle-info { display: flex; flex-direction: column; gap: 4px; }
.toggle-title { font-size: 14px; font-weight: 600; color: #1E293B; }
.toggle-desc { font-size: 13px; color: #64748B; }

.toggle-switch { position: relative; width: 52px; height: 28px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #CBD5E1; border-radius: 28px; transition: 0.3s; }
.toggle-slider:before { position: absolute; content: ""; height: 22px; width: 22px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.toggle-switch input:checked + .toggle-slider { background: #10B981; }
.toggle-switch input:checked + .toggle-slider.danger { background: #EF4444; }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(24px); }

.mt-4 { margin-top: 16px; }

.toast { position: fixed; top: 20px; right: 20px; display: flex; align-items: center; gap: 10px; padding: 14px 20px; border-radius: 10px; font-weight: 500; font-size: 14px; z-index: 200; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.toast svg { width: 18px; height: 18px; }
.toast.success { background: #D1FAE5; color: #059669; }
.toast.error { background: #FEE2E2; color: #DC2626; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s; }
.slide-enter-from, .slide-leave-to { transform: translateX(100px); opacity: 0; }

@media (max-width: 1024px) { 
  .settings-grid { grid-template-columns: 1fr; } 
  .form-row { grid-template-columns: 1fr; }
}
</style>