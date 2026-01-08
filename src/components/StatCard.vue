<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  trend: {
    type: String,
    default: ''
  },
  trendUp: {
    type: Boolean,
    default: true
  },
  iconColor: {
    type: String,
    default: 'blue', // blue, green, purple, orange
    validator: (value) => ['blue', 'green', 'purple', 'orange', 'red', 'yellow', 'primary', 'success', 'warning', 'info'].includes(value)
  },
  active: {
    type: Boolean,
    default: false
  },
  loading: {
      type: Boolean,
      default: false
  } 
})
</script>

<template>
  <div class="stat-card" :class="{ active: active }">
    <div class="icon-wrapper" :class="iconColor">
      <slot name="icon"></slot>
    </div>
    <div class="stat-content">
      <span class="label">{{ label }}</span>
      <h3 v-if="!loading" class="value">{{ value }}</h3>
      <div v-else class="skeleton-value"></div>
      
      <span v-if="trend" class="trend">
        {{ trend }}
      </span>
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: white;
  padding: 20px 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  align-items: center;
  gap: 16px;
  border: 2px solid transparent;
  transition: all 0.25s ease;
  cursor: default;
  width: 100%;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.08); /* From provided CSS */
}

/* Active State for Filters */
.stat-card.active {
  border-color: #0A4568;
  box-shadow: 0 6px 20px rgba(10,69,104,0.15);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #F1F5F9; /* Default background from user request */
  color: #0D5782;     /* Default color from user request */
}

/* Ensure SVGs inside are sized correctly */
.icon-wrapper :deep(svg) {
  width: 26px;
  height: 26px;
}

/* Colors - Note: User provided CSS has identical colors for all classes, 
   but keeping classes for potential future differentiation or if user decides to change them back */
.icon-wrapper.blue { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.green { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.purple { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.orange { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.red { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.yellow { background: #F1F5F9; color: #0D5782; }

/* Mappings for other systems properties */
.icon-wrapper.primary { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.success { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.warning { background: #F1F5F9; color: #0D5782; }
.icon-wrapper.info { background: #F1F5F9; color: #0D5782; }


.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-content .label {
  display: block;
  font-size: 13px;
  color: #64748B;
  font-weight: 500;
}

.stat-content .value {
  font-size: 20px;
  font-weight: 800;
  color: #0F172A;
  line-height: 1;
}

.stat-content .trend {
  font-size: 10px;
  font-weight: 500;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #64748B;
}

.skeleton-value {
    height: 24px;
    width: 60%;
    background: #e2e8f0;
    border-radius: 4px;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}
</style>
