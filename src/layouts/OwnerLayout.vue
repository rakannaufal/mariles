<script setup>
import OwnerSidebar from '@/components/OwnerSidebar.vue'
</script>

<template>
  <div class="owner-layout">
    <OwnerSidebar />
    <div class="content-area">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.owner-layout {
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
.content-area :deep(.dashboard-layout),
.content-area :deep(.owner-layout) {
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
