<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFavorites } from '@/composables/useFavorites'
import StudentSidebar from '@/components/StudentSidebar.vue'
import LesCard from '@/components/LesCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const { favorites, loading, fetchFavorites } = useFavorites()

onMounted(async () => {
  if (authStore.user?.id) {
    await fetchFavorites(authStore.user.id)
  }
})

function goToSearch() {
  router.push('/search')
}
</script>

<template>
  <div class="dashboard">
    <StudentSidebar />

    <main class="main">
      <header class="page-header">
        <div>
          <h1>Favorit Saya</h1>
          <p>Daftar tempat les yang Anda simpan</p>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="favorites.length > 0" class="favorites-grid">
        <LesCard 
          v-for="fav in favorites" 
          :key="fav.id" 
          :les-place="fav.les_places"
        />
      </div>

      <div v-else class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h3>Belum ada favorit</h3>
        <p>Simpan tempat les yang Anda minati di sini</p>
        <button class="btn btn-primary" @click="goToSearch">Cari Tempat Les</button>
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
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-header p {
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 480px) {
  .favorites-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  color: var(--text-secondary);
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  color: var(--text);
  margin-bottom: 8px;
}

.empty-state p {
  margin-bottom: 24px;
}

.btn-primary {
  padding: 10px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

@media (max-width: 768px) {
  .dashboard {
    flex-direction: column;
  }
  
  .main {
    padding: 16px;
  }
  
  .favorites-grid {
    grid-template-columns: 1fr;
  }
}
</style>
