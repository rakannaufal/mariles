<template>
  <section class="cta-section">
    <div class="container">
      <div class="cta-content">
        <h2>{{ title }}</h2>
        <p>{{ subtitle }}</p>
        <div class="cta-actions">
          <router-link :to="primaryLink" class="btn btn-primary btn-lg">{{ primaryText }}</router-link>
          <router-link :to="secondaryLink" class="btn btn-ghost btn-lg">{{ secondaryText }}</router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'Siap Memulai?'
  },
  subtitle: {
    type: String,
    default: 'Bergabung dengan ribuan siswa dan guru yang sudah merasakan manfaat Mariles'
  },
  primaryText: {
    type: String,
    default: 'Daftar Sekarang'
  },
  primaryLink: {
    type: String,
    default: '/register'
  },
  secondaryText: {
    type: String,
    default: 'Jelajahi Tempat Les'
  },
  secondaryLink: {
    type: String,
    default: '/search'
  }
})
</script>

<style scoped>
.cta-section {
  padding: var(--spacing-3xl) 0;
  background: var(--primary);
  color: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.cta-content {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.cta-content h2 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  color: white;
}

.cta-content p {
  font-size: var(--font-size-lg);
  font-weight: 500;
  color: #fff;
  margin-bottom: var(--spacing-xl);
}

.cta-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.cta-actions .btn-primary {
  background: white;
  color: var(--text);
  border: 2px solid white;
}

.cta-actions .btn-primary:hover {
  background: rgba(255,255,255,0.9);
}

.cta-actions .btn-ghost {
  background: var(--secondary);
  border: 2px solid var(--secondary);
  color: white;
  
}

.cta-actions .btn-ghost:hover {
  background: #0A4568;
  border-color: #0A4568;
}

@media (max-width: 768px) {
  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
