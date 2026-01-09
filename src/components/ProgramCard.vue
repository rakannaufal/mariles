<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  program: {
    type: Object,
    required: true
  }
})

const router = useRouter()

// Format harga
const formattedPrice = computed(() => {
  if (!props.program.price) return 'Hubungi'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(props.program.price)
})

// Get les place info
const lesPlace = computed(() => props.program.les_places || {})

// Get category name
const categoryName = computed(() => {
  return props.program.categories?.name || props.program.category_name || 'Umum'
})

// Get level badge color
const levelColor = computed(() => {
  const level = props.program.level?.toLowerCase() || ''
  if (level.includes('sd')) return '#4CAF50'
  if (level.includes('smp')) return '#2196F3'
  if (level.includes('sma')) return '#9C27B0'
  if (level.includes('kuliah') || level.includes('universitas')) return '#FF9800'
  return '#607D8B'
})

// Get class type badge
const classTypeLabel = computed(() => {
  const type = props.program.class_type?.toLowerCase() || ''
  if (type === 'online') return 'Online'
  if (type === 'offline') return 'Offline'
  return 'Hybrid'
})

const classTypeColor = computed(() => {
  const type = props.program.class_type?.toLowerCase() || ''
  if (type === 'online') return '#4CAF50'
  if (type === 'offline') return '#2196F3'
  return '#9C27B0'
})

// Get first photo
const coverPhoto = computed(() => {
  const photos = lesPlace.value?.photos
  if (photos && photos.length > 0) return photos[0]
  return 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400'
})

// Navigate to les place detail
function goToDetail() {
  router.push(`/les/${lesPlace.value.id}`)
}
</script>

<template>
  <div class="program-card" @click="goToDetail">
    <!-- Image -->
    <div class="card-image">
      <img :src="coverPhoto" :alt="program.name" loading="lazy">
      <span class="class-badge" :style="{ background: classTypeColor }">
        {{ classTypeLabel }}
      </span>
    </div>
    
    <!-- Content -->
    <div class="card-content">
      <!-- Category & Level -->
      <div class="badges-row">
        <span class="category-badge">{{ categoryName }}</span>
        <span v-if="program.level" class="level-badge" :style="{ background: levelColor }">
          {{ program.level }}
        </span>
      </div>
      
      <!-- Program Name -->
      <h3 class="program-name">{{ program.name }}</h3>
      
      <!-- Les Place Name -->
      <p class="les-place-name">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        {{ lesPlace.name }}
      </p>
      
      <!-- Location -->
      <p class="location">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        {{ lesPlace.city || 'Indonesia' }}
      </p>
      
      <!-- Program Details -->
      <div class="details-row">
        <span v-if="program.duration_months" class="detail-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {{ program.duration_months }} bulan
        </span>
        <span v-if="program.sessions_per_week" class="detail-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {{ program.sessions_per_week }}x/minggu
        </span>
      </div>
      
      <!-- Rating -->
      <div v-if="lesPlace.rating" class="rating-row">
        <span class="stars">⭐</span>
        <span class="rating-value">{{ lesPlace.rating?.toFixed(1) }}</span>
        <span class="review-count">({{ lesPlace.total_reviews || 0 }} ulasan)</span>
      </div>
      
      <!-- Price -->
      <div class="price-row">
        <span class="price">{{ formattedPrice }}</span>
        <span v-if="program.price_type" class="price-type">
          /{{ program.price_type === 'session' ? 'sesi' : 'paket' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.program-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #E5E7EB;
  cursor: pointer;
  transition: all 0.2s ease;
}

.program-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.card-image {
  position: relative;
  height: 160px;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.class-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.card-content {
  padding: 16px;
}

.badges-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.category-badge {
  background: #EEF2FF;
  color: #4F46E5;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.level-badge {
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.program-name {
  font-size: 16px;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 8px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.les-place-name, .location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748B;
  margin-bottom: 4px;
}

.les-place-name svg, .location svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.details-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F1F5F9;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748B;
}

.detail-item svg {
  width: 14px;
  height: 14px;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
}

.stars {
  font-size: 12px;
}

.rating-value {
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
}

.review-count {
  font-size: 12px;
  color: #94A3B8;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #F1F5F9;
}

.price {
  font-size: 18px;
  font-weight: 700;
  color: #0D5782;
}

.price-type {
  font-size: 13px;
  color: #64748B;
}
</style>
