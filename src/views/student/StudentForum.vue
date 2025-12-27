<script setup>
import Navbar from '@/components/Navbar.vue'
</script>

<template>
  <div class="forum-page">
    <Navbar />
    
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Forum Diskusi</h1>
        <p class="header-subtitle">Tempat berbagi pengetahuan dan berdiskusi dengan sesama pelajar</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="forum-content">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Fitur Segera Hadir</h3>
        <p>Forum diskusi sedang dalam pengembangan. Nantikan update selanjutnya!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: var(--background);
  padding-top: 64px;
}

.page-header {
  background: var(--primary);
  padding: 32px 24px;
  color: white;
  text-align: center;
}

.header-content {
  max-width: 600px;
  margin: 0 auto;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.header-subtitle {
  opacity: 0.9;
  font-size: 15px;
  margin: 0;
}

.forum-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 24px;
  display: flex;
  justify-content: center;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  max-width: 400px;
  width: 100%;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
  color: var(--primary);
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

.empty-state p {
  color: var(--text-secondary);
}
</style>
