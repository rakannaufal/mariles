<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar />

    <main class="main">
      <header class="header">
        <h1>Statistik</h1>
      </header>

      <div class="coming-soon">
        <h2>Coming Soon</h2>
        <p>Fitur statistik dan analitik sedang dalam pengembangan</p>
        <router-link to="/owner/dashboard" class="btn btn-primary">Kembali ke Dashboard</router-link>
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
.coming-soon{background:white;border-radius:var(--radius-xl);padding:var(--spacing-3xl);text-align:center}
.coming-soon h2{margin-bottom:var(--spacing-sm)}
.coming-soon p{color:var(--text-muted);margin-bottom:var(--spacing-lg)}
@media(max-width:768px){.sidebar{display:none}}
</style>
