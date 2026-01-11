<script setup>
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'

const steps = [
  {
    number: 1,
    title: 'Daftar Akun Partner',
    description: 'Buat akun sebagai pemilik tempat les dan lengkapi profil bisnis Anda dengan informasi yang lengkap dan akurat.',
    icon: 'user-plus'
  },
  {
    number: 2,
    title: 'Tambahkan Tempat Les',
    description: 'Masukkan detail tempat les Anda termasuk nama, alamat, deskripsi, fasilitas, dan foto-foto yang menarik.',
    icon: 'building'
  },
  {
    number: 3,
    title: 'Atur Program & Jadwal',
    description: 'Buat program les dengan harga dan jadwal yang sesuai. Anda bisa membuat beberapa program dengan kategori berbeda.',
    icon: 'calendar'
  },
  {
    number: 4,
    title: 'Verifikasi & Publikasi',
    description: 'Tim kami akan memverifikasi informasi Anda. Setelah disetujui, tempat les Anda akan tampil di platform.',
    icon: 'check-circle'
  },
  {
    number: 5,
    title: 'Terima Siswa & Kelola',
    description: 'Mulai terima pendaftaran siswa dan kelola semua aktivitas melalui dashboard partner yang lengkap.',
    icon: 'users'
  }
]

const features = [
  {
    title: 'Dashboard Lengkap',
    description: 'Pantau pendaftaran, pembayaran, dan statistik tempat les Anda dalam satu dashboard yang mudah digunakan.',
    icon: 'chart'
  },
  {
    title: 'Manajemen Siswa',
    description: 'Kelola data siswa, absensi, nilai, dan jadwal dengan fitur manajemen siswa yang terintegrasi.',
    icon: 'users'
  },
  {
    title: 'Laporan Keuangan',
    description: 'Pantau pendapatan dan buat laporan keuangan secara otomatis untuk memudahkan pengelolaan bisnis.',
    icon: 'money'
  },
  {
    title: 'Promosi & Marketing',
    description: 'Tingkatkan visibilitas tempat les Anda dengan fitur promosi dan tools marketing yang kami sediakan.',
    icon: 'megaphone'
  }
]

const faqs = [
  {
    question: 'Berapa biaya untuk bergabung sebagai partner?',
    answer: 'Pendaftaran sebagai partner Mariles sepenuhnya GRATIS. Kami hanya mengambil komisi kecil dari setiap transaksi yang berhasil.'
  },
  {
    question: 'Berapa lama proses verifikasi?',
    answer: 'Proses verifikasi biasanya memakan waktu 1-3 hari kerja. Pastikan semua dokumen dan informasi yang Anda berikan lengkap dan valid.'
  },
  {
    question: 'Dokumen apa saja yang diperlukan?',
    answer: 'Anda perlu menyiapkan: KTP pemilik, foto tempat les, izin usaha (jika ada), dan dokumen pendukung lainnya sesuai jenis usaha.'
  },
  {
    question: 'Bagaimana sistem pembayaran dari siswa?',
    answer: 'Siswa melakukan pembayaran melalui platform Mariles. Dana akan ditransfer ke rekening Anda sesuai jadwal pencairan yang disepakati.'
  }
]
</script>

<template>
  <div class="partner-guide-page">
    <Navbar />
    
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Panduan Partner Mariles</h1>
        <p class="header-subtitle">Pelajari cara mendaftarkan dan mengelola tempat les Anda di platform Mariles</p>
        <router-link to="/register" class="btn-cta">Daftar Sebagai Partner</router-link>
      </div>
    </div>

    <main class="main-content">

      <!-- Steps Section -->
      <section class="steps-section">
        <div class="container">
          <h2 class="section-title">Cara Bergabung</h2>
          <p class="section-subtitle">5 langkah mudah untuk memulai</p>
          
          <div class="steps-timeline">
            <div v-for="step in steps" :key="step.number" class="step-item">
              <div class="step-number">{{ step.number }}</div>
              <div class="step-content">
                <h3>{{ step.title }}</h3>
                <p>{{ step.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="container">
          <h2 class="section-title">Fitur untuk Partner</h2>
          <p class="section-subtitle">Kelola tempat les Anda dengan lebih mudah</p>
          
          <div class="features-grid">
            <div v-for="feature in features" :key="feature.title" class="feature-card">
              <div class="feature-icon">
                <svg v-if="feature.icon === 'chart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 20V10M12 20V4M6 20v-6"></path>
                </svg>
                <svg v-else-if="feature.icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <div v-else-if="feature.icon === 'money'" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                  <span style="font-weight: 800; font-size: 20px; color: white;">Rp</span>
                </div>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m3 11 18-5v12L3 14v-3z"></path>
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>
                </svg>
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="faq-section">
        <div class="container">
          <h2 class="section-title">Pertanyaan Umum Partner</h2>
          
          <div class="faq-list">
            <div v-for="(faq, index) in faqs" :key="index" class="faq-item">
              <h4>{{ faq.question }}</h4>
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <div class="cta-content">
            <h2>Siap Mengembangkan Bisnis Les Anda?</h2>
            <p>Bergabunglah dengan ribuan partner Mariles dan jangkau lebih banyak siswa</p>
            <router-link to="/register" class="btn btn-primary btn-lg">Daftar Sekarang - Gratis!</router-link>
          </div>
        </div>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.partner-guide-page {
  min-height: 100vh;
  background: var(--background);
  padding-top: 64px;
}

/* Page Header */
.page-header {
  background: var(--primary);
  padding: 40px 24px;
  color: white;
  text-align: center;
}

.header-content {
  max-width: 700px;
  margin: 0 auto;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 12px 0;
}

.header-subtitle {
  font-size: 15px;
  color: white;
  opacity: 0.9;
  margin: 0 0 20px 0;
}

.btn-cta {
  display: inline-block;
  padding: 12px 28px;
  background: white;
  color: var(--primary);
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-cta:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
}


.main-content {
  padding: 0;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Steps Section */
.steps-section {
  padding: var(--spacing-3xl) 0;
  background: white;
}

.section-title {
  text-align: center;
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
}

.section-subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-2xl);
}

.steps-timeline {
  max-width: 700px;
  margin: 0 auto;
  position: relative;
}

.steps-timeline::before {
  content: '';
  position: absolute;
  left: 24px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-light);
}

.step-item {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg) 0;
  position: relative;
}

.step-number {
  width: 50px;
  height: 50px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--font-size-lg);
  flex-shrink: 0;
  z-index: 1;
}

.step-content h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--text);
}

.step-content p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Features Section */
.features-section {
  padding: var(--spacing-3xl) 0;
  background: var(--background);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.feature-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-icon {
  width: 50px;
  height: 50px;
  background: var(--primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
}

.feature-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.feature-card h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--text);
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* FAQ Section */
.faq-section {
  padding: var(--spacing-3xl) 0;
  background: white;
}

.faq-list {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.faq-item {
  background: var(--background);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
}

.faq-item h4 {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.faq-item p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* CTA Section */
.cta-section {
  padding: var(--spacing-3xl) 0;
  background: var(--primary);
}

.cta-content {
  text-align: center;
  color: white;
}

.cta-content h2 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: white;
  margin-bottom: var(--spacing-sm);
}

.cta-content p {
  font-size: var(--font-size-lg);
  color: white;
  opacity: 0.9;
  margin-bottom: var(--spacing-xl);
}

.cta-section .btn {
  background: white;
  color: var(--primary);
}

.cta-section .btn:hover {
  background: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .hero-title {
    font-size: var(--font-size-2xl);
  }
  
  .steps-timeline::before {
    left: 20px;
  }
  
  .step-number {
    width: 40px;
    height: 40px;
    font-size: var(--font-size-base);
  }
}
</style>
