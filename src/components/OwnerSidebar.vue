<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import OwnerSidebarPribadi from './OwnerSidebarPribadi.vue'
import OwnerSidebarUmum from './OwnerSidebarUmum.vue'
import FloatingChatWidget from './FloatingChatWidget.vue'

const route = useRoute()
const authStore = useAuthStore()
const ownerType = ref('')
const isLoaded = ref(false)

// Hide floating chat when on chat page
const isChatPage = computed(() => route.path.includes('/owner/chat'))

const fetchOwnerType = async () => {
  if (!authStore.user?.id) return

  try {
    // Get owner_type directly from owners table
    const { data: ownerData, error } = await supabase
      .from('owners')
      .select('owner_type')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (ownerData) {
      ownerType.value = ownerData.owner_type
    }
    if (error) throw error
    
  } catch (err) {
    console.error('Error fetching owner type:', err)
  } finally {
    isLoaded.value = true
  }
}

onMounted(() => {
  if (authStore.user?.id) {
    fetchOwnerType()
  }
})

watch(() => authStore.user, (newUser) => {
  if (newUser?.id) {
    fetchOwnerType()
  }
}, { immediate: true })
</script>

<template>
  <div v-if="isLoaded">
    <OwnerSidebarPribadi v-if="ownerType === 'pribadi'" />
    <OwnerSidebarUmum v-else />
    <!-- Floating Chat Widget - hidden on chat page -->
    <FloatingChatWidget v-if="!isChatPage" user-role="owner" />
  </div>
  <!-- Optional loading skeleton could go here -->
  <aside v-else class="sidebar loading">
    <div class="logo">Mariles</div>
    <!-- Simple loading state -->
  </aside>
</template>

<style scoped>
.sidebar.loading {
  width: 280px;
  background: linear-gradient(180deg, var(--secondary) 0%, var(--secondary-dark) 100%);
  color: white;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.logo {
  font-size: var(--font-size-xl);
  font-weight: 700;
  opacity: 0.7;
}
</style>
