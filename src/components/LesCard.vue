<script setup>
import { computed } from 'vue'

const props = defineProps({
  lesPlace: {
    type: Object,
    required: true
  }
})

const formatPrice = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p)

const minPrice = computed(() => {
  if (!props.lesPlace.programs?.length) return props.lesPlace.price || 0
  const prices = props.lesPlace.programs
    .map(p => p.price)
    .filter(p => p !== null && p !== undefined && !isNaN(p))
  if (!prices.length) return props.lesPlace.price || 0
  return Math.min(...prices)
})

const programCount = computed(() => {
  return props.lesPlace.programs?.length || props.lesPlace.programs_count || 0
})

const modeLabel = computed(() => {
  const type = props.lesPlace.type || 'offline'
  if (type === 'online') return 'Online'
  if (type === 'offline_online') return 'Hybrid'
  return 'Offline'
})

const modeClass = computed(() => {
  const type = props.lesPlace.type || 'offline'
  if (type === 'online') return 'mode-online'
  if (type === 'offline_online') return 'mode-hybrid'
  return 'mode-offline'
})

// Calculate rating from reviews if available, otherwise use database field
const calculatedRating = computed(() => {
  const reviews = props.lesPlace.reviews
  if (reviews?.length) {
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0)
    return (sum / reviews.length).toFixed(1)
  }
  return props.lesPlace.rating?.toFixed(1) || '0.0'
})

const reviewCount = computed(() => {
  return props.lesPlace.reviews?.length || props.lesPlace.total_reviews || 0
})

// Calculate student count from programs if available
const studentCount = computed(() => {
  const programs = props.lesPlace.programs
  if (programs?.length) {
    return programs.reduce((sum, p) => sum + (p.current_students || 0), 0)
  }
  return props.lesPlace.total_students || 0
})
</script>

<template>
  <router-link :to="`/les/${lesPlace.id}`" class="les-card">
    <div class="card-image">
      <img :src="lesPlace.photos?.[0] || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400'" :alt="lesPlace.name">
      <span class="mode-badge" :class="modeClass">{{ modeLabel }}</span>
    </div>
    
    <div class="card-body">
      <h3 class="card-title">{{ lesPlace.name }}</h3>
      <p class="card-location">{{ lesPlace.address }}</p>
      
      <div class="card-stats">
        <span class="stat-item">{{ studentCount }} siswa</span>
        <span class="stat-item accent" v-if="programCount">{{ programCount }} program</span>
      </div>
      
      <div class="card-price">
        <span class="price-prefix">Mulai dari</span>
        <span class="price-value">{{ formatPrice(minPrice) }}</span>
      </div>
      
      <div class="card-footer">
        <span class="city-name">{{ lesPlace.city }}</span>
        <span class="rating-badge">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {{ calculatedRating }}
        </span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.les-card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
}

.les-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 30px rgba(10, 69, 104, 0.15);
}

.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.les-card:hover .card-image img {
  transform: scale(1.08);
}

.mode-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;
  text-transform: capitalize;
}

.mode-offline {
  background: rgba(255, 255, 255, 0.96);
  color: #0a4568;
  backdrop-filter: blur(4px);
}

.mode-online {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.mode-hybrid {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.card-body {
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #1e293b;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-location {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stat-item {
  font-size: 13px;
  color: #64748b;
}

.stat-item.accent {
  color: #0a4568;
  font-weight: 600;
}

.card-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 14px;
}

.price-prefix {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
}

.price-value {
  font-size: 18px;
  font-weight: 800;
  color: #0a4568;
  letter-spacing: -0.3px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.city-name {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.rating-badge svg {
  width: 14px;
  height: 14px;
  color: #fbbf24;
}
</style>
