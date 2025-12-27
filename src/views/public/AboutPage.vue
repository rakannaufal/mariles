<script setup>
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
</script>

<template>
  <div class="about-page">
    <Navbar />
    
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Tentang Mariles</h1>
        <p class="header-subtitle">Menghubungkan siswa dengan tempat les terbaik di seluruh Indonesia</p>
      </div>
    </div>

    <main class="main-content">

      <section class="story-section">
        <div class="container">
          <h2>Cerita Kami</h2>
          <p>Mariles didirikan dengan satu tujuan sederhana: membantu siswa menemukan tempat les yang tepat dengan lebih mudah. Berawal dari kesulitan orang tua dalam mencari tempat les yang sesuai, kami membangun platform yang menghubungkan ribuan siswa dengan ratusan tempat les terpercaya di seluruh Indonesia.</p>
        </div>
      </section>

      <section class="mission-section">
        <div class="container">
          <div class="mission-grid">
            <div class="mission-card">
              <h2>Visi Kami</h2>
              <p>Menjadi platform #1 di Indonesia yang menghubungkan siswa dengan tempat les berkualitas, sehingga setiap anak dapat mencapai potensi maksimal mereka.</p>
            </div>
            <div class="mission-card">
              <h2>Misi Kami</h2>
              <p>Menyediakan platform yang memudahkan bisnis mereka secara digital.</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background: var(--background);
  padding-top: 64px;
}

/* Page Header */
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
  color: white;
  margin: 0 0 8px 0;
}

.header-subtitle {
  font-size: 15px;
  color: white;
  opacity: 0.9;
  margin: 0;
}

.main-content {
  padding: 0;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Story Section */
.story-section {
  padding: var(--spacing-3xl) 0;
  background: white;
  text-align: center;
}

.story-section h2 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text);
  margin-bottom: var(--spacing-lg);
}

.story-section p {
  max-width: 800px;
  margin: 0 auto;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* Mission Section */
.mission-section {
  padding: var(--spacing-3xl) 0;
  background: white;
}

.mission-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-xl);
}

.mission-card {
  background: var(--background);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  text-align: center;
}

.mission-card h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.mission-card p {
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 768px) {
  .mission-grid {
    grid-template-columns: 1fr;
  }
}
</style>
