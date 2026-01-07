<script setup>
import TeacherSidebar from '@/components/TeacherSidebar.vue'
</script>

<template>
  <div class="teacher-layout">
    <TeacherSidebar />
    <div class="content-area">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.teacher-layout {
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
