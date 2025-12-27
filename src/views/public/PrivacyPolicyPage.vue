<script setup>
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
</script>

<template>
  <div class="privacy-page">
    <Navbar />
    
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Kebijakan Privasi</h1>
        <p class="header-subtitle">Terakhir diperbarui: 11 Desember 2025</p>
      </div>
    </div>

    <main class="main-content">
      <div class="container">

        <div class="content">
          <section class="section">
            <h2>1. Pendahuluan</h2>
            <p>Mariles ("kami", "kita", atau "Platform") menghargai privasi Anda dan berkomitmen untuk melindungi data pribadi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda saat menggunakan layanan kami.</p>
          </section>

          <section class="section">
            <h2>2. Informasi yang Kami Kumpulkan</h2>
            <h3>2.1 Informasi yang Anda Berikan</h3>
            <ul>
              <li>Nama lengkap, alamat email, nomor telepon</li>
              <li>Informasi akun (username, password terenkripsi)</li>
              <li>Foto profil dan dokumen pendukung</li>
              <li>Informasi pembayaran (diproses melalui penyedia layanan pembayaran pihak ketiga)</li>
            </ul>

            <h3>2.2 Informasi yang Dikumpulkan Otomatis</h3>
            <ul>
              <li>Data penggunaan platform (halaman yang dikunjungi, fitur yang digunakan)</li>
              <li>Informasi perangkat (jenis browser, sistem operasi, alamat IP)</li>
              <li>Cookies dan teknologi pelacakan serupa</li>
            </ul>
          </section>

          <section class="section">
            <h2>3. Penggunaan Informasi</h2>
            <p>Kami menggunakan informasi yang dikumpulkan untuk:</p>
            <ul>
              <li>Menyediakan, mengoperasikan, dan memelihara layanan kami</li>
              <li>Memproses pendaftaran dan pembayaran</li>
              <li>Mengirimkan notifikasi penting terkait layanan</li>
              <li>Meningkatkan pengalaman pengguna</li>
              <li>Mencegah penipuan dan aktivitas tidak sah</li>
              <li>Mematuhi kewajiban hukum</li>
            </ul>
          </section>

          <section class="section">
            <h2>4. Keamanan Data</h2>
            <p>Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang sesuai untuk melindungi data pribadi Anda, termasuk:</p>
            <ul>
              <li>Enkripsi data menggunakan SSL/TLS</li>
              <li>Autentikasi dua faktor (opsional)</li>
              <li>Akses terbatas ke data pribadi</li>
              <li>Pemantauan keamanan berkelanjutan</li>
            </ul>
          </section>

          <section class="section">
            <h2>5. Berbagi Informasi</h2>
            <p>Kami tidak menjual data pribadi Anda. Informasi Anda hanya dibagikan dalam situasi berikut:</p>
            <ul>
              <li>Dengan tempat les yang Anda daftar (informasi kontak dan data pendaftaran)</li>
              <li>Dengan penyedia layanan pihak ketiga yang membantu operasional kami</li>
              <li>Jika diwajibkan oleh hukum atau proses hukum</li>
            </ul>
          </section>

          <section class="section">
            <h2>6. Hak Anda</h2>
            <p>Anda memiliki hak untuk:</p>
            <ul>
              <li>Mengakses dan mendapatkan salinan data pribadi Anda</li>
              <li>Memperbaiki data yang tidak akurat</li>
              <li>Menghapus data Anda (dengan ketentuan tertentu)</li>
              <li>Membatasi pemrosesan data Anda</li>
              <li>Menolak penggunaan data untuk tujuan pemasaran</li>
            </ul>
          </section>

          <section class="section">
            <h2>7. Cookies</h2>
            <p>Kami menggunakan cookies untuk meningkatkan pengalaman Anda. Anda dapat mengatur browser Anda untuk menolak cookies, namun ini mungkin mempengaruhi fungsionalitas platform.</p>
          </section>

          <section class="section">
            <h2>8. Perubahan Kebijakan</h2>
            <p>Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan akan diposting di halaman ini dengan tanggal pembaruan yang baru.</p>
          </section>

          <section class="section">
            <h2>9. Hubungi Kami</h2>
            <p>Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami:</p>
            <ul>
              <li>Email: privacy@mariles.id</li>
              <li>Alamat: [Alamat Kantor Mariles]</li>
            </ul>
          </section>
        </div>
      </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.privacy-page {
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
  max-width: 700px;
  margin: 0 auto;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
}

.header-subtitle {
  font-size: 14px;
  color: white;
  opacity: 0.85;
  margin: 0;
}

.main-content {
  padding: 24px 0 var(--spacing-3xl);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
}

.content {
  background: white;
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-md);
}

.section {
  margin-bottom: var(--spacing-2xl);
}

.section:last-child {
  margin-bottom: 0;
}

.section h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--spacing-md);
}

.section h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin: var(--spacing-md) 0 var(--spacing-sm);
}

.section p {
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: var(--spacing-sm);
}

.section ul {
  color: var(--text-secondary);
  line-height: 1.8;
  padding-left: var(--spacing-xl);
  margin: var(--spacing-sm) 0;
}

.section li {
  margin-bottom: var(--spacing-xs);
}

@media (max-width: 768px) {
  .content {
    padding: var(--spacing-lg);
  }
  
  .page-title {
    font-size: var(--font-size-2xl);
  }
}
</style>
