<script setup>
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import CTASection from '@/components/CTASection.vue'
</script>

<template>
  <div class="teacher-guide-page">
    <Navbar />
    
    <main class="main-content">
      <section class="hero-section">
        <div class="container">
          <span class="hero-badge">Untuk Guru & Pengajar</span>
          <h1 class="page-title">Bergabung Menjadi Guru di Mariles</h1>
          <p class="page-subtitle">Kembangkan karir mengajar Anda dan raih lebih banyak siswa</p>
          <router-link to="/register" class="btn btn-white btn-lg">Daftar Sebagai Guru</router-link>
        </div>
      </section>

      <section class="benefits-section">
        <div class="container">
          <h2>Mengapa Mengajar di Mariles?</h2>
          <div class="benefits-grid">
            <div class="benefit-card">
              <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
              <h3>Jangkau Lebih Banyak Siswa</h3>
              <p>Akses ke ribuan siswa di seluruh Indonesia</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
              <h3>Kelola Jadwal Fleksibel</h3>
              <p>Atur jadwal mengajar sesuai ketersediaan Anda</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
              <h3>Penghasilan Transparan</h3>
              <p>Pembayaran jelas dan tepat waktu</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
              <h3>Kelola Materi</h3>
              <p>Upload dan bagikan materi pembelajaran</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
              <h3>Tracking Performa</h3>
              <p>Pantau rating dan perkembangan performa</p>
            </div>
            <div class="benefit-card">
              <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
              <h3>Komunikasi Mudah</h3>
              <p>Chat langsung dengan siswa dan pemilik les</p>
            </div>
          </div>
        </div>
      </section>

      <section class="join-section">
        <div class="container">
          <h2>Cara Bergabung</h2>
          <div class="join-steps">
            <div class="join-step"><div class="step-num">1</div><div><h3>Daftar Akun</h3><p>Buat akun gratis dan lengkapi profil Anda</p></div></div>
            <div class="join-step"><div class="step-num">2</div><div><h3>Gabung Tempat Les</h3><p>Hubungi pemilik les atau terima undangan</p></div></div>
            <div class="join-step"><div class="step-num">3</div><div><h3>Mulai Mengajar</h3><p>Kelola kelas melalui dashboard guru</p></div></div>
          </div>
        </div>
      </section>

      <section class="features-section">
        <div class="container">
          <h2>Fitur untuk Guru</h2>
          <div class="features-grid">
            <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><div><h4>Manajemen Jadwal</h4><p>Lihat dan atur jadwal dalam tampilan kalender</p></div></div>
            <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div><div><h4>Data Siswa</h4><p>Akses informasi lengkap siswa yang Anda ajar</p></div></div>
            <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg></div><div><h4>Absensi Digital</h4><p>Catat kehadiran siswa secara digital</p></div></div>
            <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div><div><h4>Upload Materi</h4><p>Bagikan materi dalam berbagai format</p></div></div>
            <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><div><h4>Input Nilai</h4><p>Berikan penilaian progress siswa</p></div></div>
            <div class="feature-item"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div><div><h4>Laporan Keuangan</h4><p>Pantau penghasilan dan pembayaran</p></div></div>
          </div>
        </div>
      </section>

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
.teacher-guide-page{min-height:100vh;background:var(--background)}
.main-content{padding-top:64px}
.container{max-width:1200px;margin:0 auto;padding:0 var(--spacing-lg)}
.hero-section{background:var(--secondary);padding:var(--spacing-3xl) 0;text-align:center;color:white}
.hero-badge{display:inline-block;padding:var(--spacing-xs) var(--spacing-lg);background:rgba(255,255,255,0.2);border-radius:var(--radius-full);font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--spacing-lg)}
.page-title{font-size:var(--font-size-3xl);font-weight:700;margin-bottom:var(--spacing-md);color:white}
.page-subtitle{font-size:var(--font-size-lg);opacity:0.9;margin-bottom:var(--spacing-xl)}
.btn-white{background:white;color:var(--secondary);border:none;padding:var(--spacing-sm) var(--spacing-xl);border-radius:var(--radius-lg);font-weight:600}
.benefits-section,.join-section,.features-section{padding:var(--spacing-3xl) 0}
.benefits-section{background:white}
.join-section{background:var(--background)}
.features-section{background:white}
.benefits-section h2,.join-section h2,.features-section h2{text-align:center;font-size:var(--font-size-2xl);font-weight:700;margin-bottom:var(--spacing-xl)}
.benefits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--spacing-lg)}
.benefit-card{background:var(--background);padding:var(--spacing-xl);border-radius:var(--radius-xl);text-align:center}
.benefit-icon{width:60px;height:60px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--spacing-md);color:white}
.benefit-icon svg{width:28px;height:28px}
.benefit-card h3{font-size:var(--font-size-base);font-weight:600;margin-bottom:var(--spacing-sm)}
.benefit-card p{color:var(--text-secondary);font-size:var(--font-size-sm)}
.join-steps{max-width:700px;margin:0 auto}
.join-step{display:flex;gap:var(--spacing-lg);padding:var(--spacing-lg);background:white;border-radius:var(--radius-xl);margin-bottom:var(--spacing-md);box-shadow:var(--shadow-sm)}
.step-num{width:48px;height:48px;background:var(--secondary);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--font-size-xl);flex-shrink:0}
.join-step h3{font-size:var(--font-size-lg);font-weight:600;margin-bottom:4px}
.join-step p{color:var(--text-secondary)}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--spacing-lg)}
.feature-item{display:flex;gap:var(--spacing-md);padding:var(--spacing-lg);background:var(--background);border-radius:var(--radius-xl)}
.feature-icon{width:48px;height:48px;background:var(--secondary);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0}
.feature-icon svg{width:24px;height:24px}
.feature-item h4{font-size:var(--font-size-base);font-weight:600;margin-bottom:4px}
.feature-item p{color:var(--text-secondary);font-size:var(--font-size-sm)}
@media(max-width:1024px){.benefits-grid,.features-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:768px){.benefits-grid,.features-grid{grid-template-columns:1fr}}
</style>
