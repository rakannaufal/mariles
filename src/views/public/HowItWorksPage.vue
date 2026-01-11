<script setup>
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import CTASection from '@/components/CTASection.vue'
</script>

<template>
  <div class="how-it-works-page">
    <Navbar />
    
    <main class="main-content">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="container">
          <h1 class="page-title">Cara Kerja Mariles</h1>
          <p class="page-subtitle">Temukan tempat les yang tepat dengan 3 langkah mudah</p>
        </div>
      </section>

      <!-- Steps Section -->
      <section class="steps-section">
        <div class="container">
          <div class="steps-grid">
            <div class="step-card">
              <div class="step-number">1</div>
              <div class="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
              <h3>Cari & Temukan</h3>
              <p>Gunakan fitur pencarian kami untuk menemukan tempat les berdasarkan lokasi, mata pelajaran, harga, atau rating. Filter hasil sesuai kebutuhan Anda.</p>
              <ul class="step-features">
                <li>Pencarian berdasarkan lokasi</li>
                <li>Filter kategori mata pelajaran</li>
                <li>Lihat rating dan review</li>
                <li>Bandingkan harga program</li>
              </ul>
            </div>

            <div class="step-card">
              <div class="step-number">2</div>
              <div class="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <polyline points="17 11 19 13 23 9"></polyline>
                </svg>
              </div>
              <h3>Daftar & Bayar</h3>
              <p>Setelah menemukan tempat les yang cocok, daftar ke program pilihan dan lakukan pembayaran dengan berbagai metode yang tersedia.</p>
              <ul class="step-features">
                <li>Pendaftaran online mudah</li>
                <li>Berbagai metode pembayaran</li>
                <li>E-wallet, transfer bank, kartu kredit</li>
                <li>Konfirmasi pembayaran instan</li>
              </ul>
            </div>

            <div class="step-card">
              <div class="step-number">3</div>
              <div class="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              </div>
              <h3>Mulai Belajar</h3>
              <p>Nikmati pembelajaran berkualitas dengan guru-guru terbaik. Pantau progress belajar dan raih prestasi yang lebih baik.</p>
              <ul class="step-features">
                <li>Akses materi pembelajaran</li>
                <li>Jadwal kelas terorganisir</li>
                <li>Tracking progress belajar</li>
                <li>Sertifikat kelulusan</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- For Students Section -->
      <section class="audience-section students">
        <div class="container">
          <div class="audience-content">
            <div class="audience-text">
              <span class="audience-badge">Untuk Siswa</span>
              <h2>Temukan les yang tepat untuk meningkatkan prestasi</h2>
              <p>Mariles menyediakan ribuan pilihan tempat les berkualitas di seluruh Indonesia. Dari pelajaran akademik hingga keterampilan khusus, semua ada di sini.</p>
              <ul class="audience-benefits">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Akses ke ribuan tempat les terverifikasi
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Review dan rating dari siswa lain
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Pembayaran aman dan mudah
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Dashboard untuk memantau progress
                </li>
              </ul>
              <router-link to="/register" class="btn btn-primary btn-lg">Daftar Sebagai Siswa</router-link>
            </div>
            <div class="audience-image">
              <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600" alt="Siswa belajar">
            </div>
          </div>
        </div>
      </section>

      <!-- For Teachers Section -->
      <section class="audience-section teachers">
        <div class="container">
          <div class="audience-content reverse">
            <div class="audience-text">
              <span class="audience-badge teacher">Untuk Guru</span>
              <h2>Bergabung dan kembangkan karir mengajar Anda</h2>
              <p>Gabung dengan jaringan guru profesional di Mariles. Tingkatkan penghasilan dan raih lebih banyak siswa dengan platform kami.</p>
              <ul class="audience-benefits">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Kelola jadwal mengajar dengan mudah
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Upload dan berbagi materi pembelajaran
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Tracking performa dan penilaian siswa
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Penghasilan transparan dan tepat waktu
                </li>
              </ul>
              <router-link to="/teacher-guide" class="btn btn-secondary btn-lg">Pelajari Lebih Lanjut</router-link>
            </div>
            <div class="audience-image">
              <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=600" alt="Guru mengajar">
            </div>
          </div>
        </div>
      </section>

      <!-- For Owners Section -->
      <section class="audience-section owners">
        <div class="container">
          <div class="audience-content">
            <div class="audience-text">
              <span class="audience-badge owner">Untuk Pemilik Les</span>
              <h2>Kembangkan bisnis les Anda bersama Mariles</h2>
              <p>Daftarkan tempat les Anda dan jangkau lebih banyak siswa. Kelola bisnis dengan tools manajemen yang lengkap.</p>
              <ul class="audience-benefits">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Dashboard manajemen lengkap
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Kelola program dan jadwal
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Laporan keuangan real-time
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Promosi dan marketing support
                </li>
              </ul>
              <router-link to="/partner-guide" class="btn btn-primary btn-lg">Daftarkan Tempat Les</router-link>
            </div>
            <div class="audience-image">
              <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600" alt="Manajemen les">
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ Preview -->
      <section class="faq-preview">
        <div class="container">
          <h2>Pertanyaan Umum</h2>
          <div class="faq-grid">
            <div class="faq-item">
              <h4>Apakah pendaftaran di Mariles gratis?</h4>
              <p>Ya, pendaftaran akun di Mariles sepenuhnya gratis untuk siswa. Anda hanya perlu membayar biaya program les yang Anda pilih.</p>
            </div>
            <div class="faq-item">
              <h4>Bagaimana cara memilih tempat les yang tepat?</h4>
              <p>Gunakan filter pencarian untuk menyesuaikan dengan kebutuhan Anda. Baca review dari siswa lain dan bandingkan program yang tersedia.</p>
            </div>
            <div class="faq-item">
              <h4>Apakah pembayaran di Mariles aman?</h4>
              <p>Ya, semua transaksi pembayaran dijamin aman dengan enkripsi SSL dan mitra payment gateway terpercaya.</p>
            </div>
            <div class="faq-item">
              <h4>Bagaimana jika saya ingin membatalkan pendaftaran?</h4>
              <p>Kebijakan pembatalan tergantung pada masing-masing tempat les. Silakan baca syarat dan ketentuan sebelum mendaftar.</p>
            </div>
          </div>
          <div class="faq-action">
            <router-link to="/faq" class="btn btn-outline">Lihat Semua FAQ</router-link>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <CTASection 
        title="Siap Memulai?" 
        subtitle="Bergabung dengan ribuan siswa dan guru yang sudah merasakan manfaat Mariles"
        primaryText="Daftar Sekarang"
        primaryLink="/register"
        secondaryText="Jelajahi Tempat Les"
        secondaryLink="/search"
      />
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.how-it-works-page {
  min-height: 100vh;
  background: var(--background);
}

.main-content {
  padding-top: 64px;
}

/* Hero Section */
.hero-section {
  background: var(--primary);
  padding: var(--spacing-3xl) 0;
  text-align: center;
  color: white;
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin-bottom: var(--spacing-md);
  color: white;
}

.page-subtitle {
  font-size: var(--font-size-lg);
  opacity: 0.9;
}

/* Steps Section */
.steps-section {
  padding: var(--spacing-3xl) 0;
  background: white;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xl);
}

.step-card {
  background: var(--background);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  text-align: center;
  position: relative;
  transition: all var(--transition-base);
}

.step-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-xl);
}

.step-number {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--font-size-lg);
}

.step-icon {
  width: 60px;
  height: 60px;
  background: var(--secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--spacing-lg) auto var(--spacing-md);
}

.step-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}

.step-card h3 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--text);
}

.step-card > p {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
}

.step-features {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.step-features li {
  padding: var(--spacing-xs) 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  position: relative;
  padding-left: var(--spacing-md);
}

.step-features li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--success);
  font-weight: 600;
}

/* Audience Sections */
.audience-section {
  padding: var(--spacing-3xl) 0;
}

.audience-section.students {
  background: white;
}

.audience-section.teachers {
  background: var(--background);
}

.audience-section.owners {
  background: white;
}

.audience-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3xl);
  align-items: center;
}

.audience-content.reverse {
  direction: rtl;
}

.audience-content.reverse > * {
  direction: ltr;
}

.audience-badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--primary);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

.audience-badge.teacher {
  background: var(--secondary);
}

.audience-badge.owner {
  background: var(--accent);
}

.audience-text h2 {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-md);
  color: var(--text);
}

.audience-text > p {
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: var(--spacing-lg);
}

.audience-benefits {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-xl) 0;
}

.audience-benefits li {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  color: var(--text);
  font-size: var(--font-size-sm);
}

.audience-benefits li svg {
  width: 20px;
  height: 20px;
  color: var(--success);
  flex-shrink: 0;
}

.audience-image {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-xl);
}

.audience-image img {
  width: 100%;
  height: 400px;
  object-fit: cover;
}

/* FAQ Preview */
.faq-preview {
  padding: var(--spacing-3xl) 0;
  background: var(--background);
}

.faq-preview h2 {
  text-align: center;
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xl);
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.faq-item {
  background: white;
  padding: var(--spacing-lg);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.faq-item h4 {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
  color: var(--text);
}

.faq-item p {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.faq-action {
  text-align: center;
}

/* Responsive */
@media (max-width: 1024px) {
  .steps-grid {
    grid-template-columns: 1fr;
    max-width: 500px;
    margin: 0 auto;
  }
  
  .audience-content {
    grid-template-columns: 1fr;
  }
  
  .audience-content.reverse {
    direction: ltr;
  }
  
  .audience-image {
    order: -1;
  }
  
  .faq-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-title {
    font-size: var(--font-size-2xl);
  }
  
  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
