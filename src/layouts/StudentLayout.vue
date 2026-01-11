<script setup>
import StudentSidebar from '@/components/StudentSidebar.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Hide sidebar for MyClass pages (they have their own Navbar)
const showSidebar = computed(() => {
  return !['student-myclass', 'student-myclass-detail', 'student-forum', 'student-payment'].includes(route.name)
})
</script>

<template>
  <div class="student-layout">
    <StudentSidebar v-if="showSidebar" />
    <div class="content-area">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.student-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #F8FAFC;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Force all child wrappers to fill space */
.content-area :deep(> *) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.content-area :deep(.dashboard),
.content-area :deep(.dashboard-layout) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.content-area :deep(.main),
.content-area :deep(.main-content) {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
