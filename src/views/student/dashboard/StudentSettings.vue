<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import StudentSidebar from '@/components/StudentSidebar.vue'

const authStore = useAuthStore()
const router = useRouter()

const saving = ref(false)
const message = ref({ type: '', text: '' })

const settings = ref(JSON.parse(JSON.stringify(DUMMY_STUDENT_SETTINGS)))

async function handleSave() {
  saving.value = true
  message.value = { type: '', text: '' }
  
  try {
    // Simulate saving
    await new Promise(r => setTimeout(r, 1000))
    
    if (!USE_DUMMY_DATA) {
      // Here you would save to Supabase
      // await supabase.from('user_settings').upsert(...)
    }
    
    message.value = { type: 'success', text: 'Pengaturan berhasil disimpan!' }
    setTimeout(() => { message.value = { type: '', text: '' } }, 3000)
  } catch (err) {
    message.value = { type: 'error', text: 'Gagal menyimpan: ' + err.message }
  } finally {
    saving.value = false
  }
}

async function handleLogout() {
  try {
    await authStore.signOut()
    router.push('/')
  } catch (err) {
    console.error('Logout error:', err)
  }
}

function resetSettings() {
  settings.value = JSON.parse(JSON.stringify(DUMMY_STUDENT_SETTINGS))
  message.value = { type: 'success', text: 'Pengaturan direset ke default!' }
  setTimeout(() => { message.value = { type: '', text: '' } }, 3000)
}
</script>

<template>
  <div class="dashboard">
    <StudentSidebar />

    <main class="main">
      <header class="page-header">
        <h1>Pengaturan</h1>
        <p>Kelola preferensi akun kamu</p>
      </header>

      <div v-if="message.text" :class="['alert', message.type]">
        <svg v-if="message.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        {{ message.text }}
      </div>

      <div class="settings-grid">
        <!-- Notifications -->
        <section class="settings-card">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <h2>Notifikasi</h2>
          </div>
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Notifikasi Email</span>
                <span class="setting-desc">Terima pemberitahuan melalui email</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.notifications.email">
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Notifikasi Push</span>
                <span class="setting-desc">Terima notifikasi di browser</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.notifications.push">
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Notifikasi SMS</span>
                <span class="setting-desc">Terima pemberitahuan via SMS</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.notifications.sms">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Privacy -->
        <section class="settings-card">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <h2>Privasi</h2>
          </div>
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Tampilkan Profil</span>
                <span class="setting-desc">Profil dapat dilihat pengguna lain</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.privacy.show_profile">
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Tampilkan Progress</span>
                <span class="setting-desc">Progress belajar publik</span>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.privacy.show_progress">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        <!-- Preferences -->
        <section class="settings-card">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <h2>Preferensi</h2>
          </div>
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Bahasa</span>
                <span class="setting-desc">Pilih bahasa tampilan</span>
              </div>
              <select v-model="settings.preferences.language" class="select-input">
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Tema</span>
                <span class="setting-desc">Pilih tema tampilan</span>
              </div>
              <select v-model="settings.preferences.theme" class="select-input">
                <option value="light">Terang</option>
                <option value="dark">Gelap</option>
                <option value="auto">Otomatis</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Account Actions -->
        <section class="settings-card danger">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <h2>Akun</h2>
          </div>
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-label">Keluar dari Akun</span>
                <span class="setting-desc">Keluar dari semua sesi</span>
              </div>
              <button class="btn-logout" @click="handleLogout">Keluar</button>
            </div>
          </div>
        </section>
      </div>

      <div class="form-actions">
        <button class="btn-secondary" @click="resetSettings">Reset ke Default</button>
        <button class="btn-save" :disabled="saving" @click="handleSave">
          <svg v-if="!saving" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.main{flex:1;padding:24px}
.page-header{margin-bottom:24px}
.page-header h1{font-size:24px;font-weight:700;margin-bottom:4px}
.page-header p{color:var(--text-secondary);font-size:14px}

.alert{display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:12px;margin-bottom:24px;font-size:14px;font-weight:500}
.alert svg{width:20px;height:20px}
.alert.success{background:#dcfce7;color:#16a34a}
.alert.error{background:#fee2e2;color:#dc2626}

.settings-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:24px}

.settings-card{background:white;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.settings-card.danger .card-header svg{color:#ef4444}
.card-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border-light)}
.card-header svg{width:24px;height:24px;color:var(--secondary)}
.card-header h2{font-size:16px;font-weight:600}

.settings-list{display:flex;flex-direction:column;gap:16px}
.setting-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0}
.setting-label{display:block;font-weight:500;margin-bottom:2px}
.setting-desc{font-size:12px;color:var(--text-muted)}

.toggle{position:relative;display:inline-block;width:48px;height:26px}
.toggle input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;inset:0;background:var(--border);border-radius:26px;transition:0.3s}
.toggle-slider:before{position:absolute;content:"";height:20px;width:20px;left:3px;bottom:3px;background:white;border-radius:50%;transition:0.3s}
.toggle input:checked+.toggle-slider{background:var(--secondary)}
.toggle input:checked+.toggle-slider:before{transform:translateX(22px)}

.select-input{padding:10px 14px;border:2px solid var(--border);border-radius:10px;font-size:14px;background:white;min-width:140px;cursor:pointer}
.select-input:focus{outline:none;border-color:var(--primary)}

.btn-logout{padding:10px 18px;background:transparent;color:#ef4444;border:1px solid #ef4444;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s}
.btn-logout:hover{background:#ef4444;color:white}

.form-actions{display:flex;justify-content:flex-end;gap:12px}
.btn-secondary{padding:14px 24px;background:var(--background);color:var(--text);border:2px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-secondary:hover{background:var(--border)}
.btn-save{display:flex;align-items:center;gap:8px;padding:14px 28px;background:var(--secondary);color:white;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s}
.btn-save svg{width:18px;height:18px}
.btn-save:hover{background:var(--primary)}
.btn-save:disabled{opacity:0.6;cursor:not-allowed}

@media(max-width:1024px){.settings-grid{grid-template-columns:1fr}}
</style>
