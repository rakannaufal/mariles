<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar />

    <main class="main">
      <header class="header">
        <h1>Pengaturan</h1>
      </header>

      <div class="settings-container">
        <div class="settings-card">
          <h3>Notifikasi</h3>
          <div class="setting-item">
            <div>
              <strong>Email Notifikasi</strong>
              <p>Terima notifikasi via email</p>
            </div>
            <label class="toggle">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div>
              <strong>Pendaftaran Baru</strong>
              <p>Notifikasi saat ada siswa mendaftar</p>
            </div>
            <label class="toggle">
              <input type="checkbox" checked>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-card">
          <h3>Akun</h3>
          <div class="setting-item">
            <div>
              <strong>Ubah Password</strong>
              <p>Perbarui password akun Anda</p>
            </div>
            <button class="btn btn-outline btn-sm">Ubah</button>
          </div>
          <div class="setting-item danger">
            <div>
              <strong>Hapus Akun</strong>
              <p>Hapus akun dan semua data</p>
            </div>
            <button class="btn btn-error btn-sm">Hapus</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard{display:flex;min-height:100vh;background:var(--background)}
.sidebar{width:280px;background:linear-gradient(180deg,#0a4568 0%,#083350 100%);color:white;padding:var(--spacing-lg);display:flex;flex-direction:column}
.logo{font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--spacing-sm)}
.role-badge{font-size:var(--font-size-xs);background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:var(--radius-full);width:fit-content;margin-bottom:var(--spacing-xl)}
.nav{flex:1;display:flex;flex-direction:column;gap:var(--spacing-xs)}
.nav-item{padding:var(--spacing-md);border-radius:var(--radius-lg);color:rgba(255,255,255,0.7);font-size:var(--font-size-sm)}
.nav-item:hover,.nav-item.active{background:rgba(255,255,255,0.1);color:white}
.logout-btn{padding:var(--spacing-md);border-radius:var(--radius-lg);color:rgba(255,255,255,0.7);margin-top:auto;background:transparent;border:1px solid rgba(255,255,255,0.2);font-size:var(--font-size-sm)}
.logout-btn:hover{background:rgba(255,255,255,0.1);color:white}
.main{flex:1;padding:var(--spacing-xl)}
.header{margin-bottom:var(--spacing-xl)}
.header h1{font-size:var(--font-size-2xl)}
.settings-container{display:flex;flex-direction:column;gap:var(--spacing-lg);max-width:600px}
.settings-card{background:white;border-radius:var(--radius-xl);padding:var(--spacing-lg);box-shadow:var(--shadow-sm)}
.settings-card h3{font-size:var(--font-size-lg);margin-bottom:var(--spacing-lg);padding-bottom:var(--spacing-md);border-bottom:1px solid var(--border)}
.setting-item{display:flex;justify-content:space-between;align-items:center;padding:var(--spacing-md) 0;border-bottom:1px solid var(--border-light)}
.setting-item:last-child{border-bottom:none}
.setting-item strong{display:block;margin-bottom:4px}
.setting-item p{color:var(--text-muted);font-size:var(--font-size-sm)}
.toggle{position:relative;width:50px;height:26px}
.toggle input{opacity:0;width:0;height:0}
.slider{position:absolute;cursor:pointer;inset:0;background:#ccc;border-radius:26px;transition:0.3s}
.slider::before{content:'';position:absolute;height:20px;width:20px;left:3px;bottom:3px;background:white;border-radius:50%;transition:0.3s}
.toggle input:checked + .slider{background:var(--primary)}
.toggle input:checked + .slider::before{transform:translateX(24px)}
.btn-error{background:var(--error);color:white}
@media(max-width:768px){.sidebar{display:none}}
</style>
