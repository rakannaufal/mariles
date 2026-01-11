<script setup>
import { ref } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'

const faqs = ref([
  {
    category: 'Umum',
    items: [
      {
        question: 'Apa itu Mariles?',
        answer: 'Mariles adalah platform terpercaya untuk menemukan dan mendaftar ke tempat les berkualitas di seluruh Indonesia. Kami menghubungkan siswa dengan tempat les terbaik sesuai kebutuhan belajar mereka.',
        open: false
      },
      {
        question: 'Bagaimana cara mendaftar di Mariles?',
        answer: 'Untuk mendaftar, klik tombol "Daftar" di pojok kanan atas halaman. Isi formulir pendaftaran dengan data diri Anda, pilih peran (siswa atau pemilik les), dan verifikasi email Anda. Setelah itu, Anda bisa langsung menggunakan layanan Mariles.',
        open: false
      },
      {
        question: 'Apakah mendaftar di Mariles gratis?',
        answer: 'Ya, pendaftaran akun di Mariles sepenuhnya gratis. Anda hanya perlu membayar biaya les sesuai dengan program yang Anda pilih dari tempat les yang terdaftar.',
        open: false
      }
    ]
  },
  {
    category: 'Mencari Tempat Les',
    items: [
      {
        question: 'Bagaimana cara mencari tempat les?',
        answer: 'Gunakan fitur pencarian di halaman utama atau halaman "Cari Les". Anda bisa mencari berdasarkan nama tempat les, mata pelajaran, lokasi, atau kategori. Filter pencarian tersedia untuk mempersempit hasil sesuai kebutuhan Anda.',
        open: false
      },
      {
        question: 'Apakah saya bisa melihat review dari siswa lain?',
        answer: 'Ya, setiap tempat les memiliki halaman detail yang menampilkan rating dan ulasan dari siswa yang sudah mendaftar. Anda bisa membaca pengalaman mereka untuk membantu keputusan Anda.',
        open: false
      },
      {
        question: 'Bagaimana cara mengetahui jadwal dan harga les?',
        answer: 'Setiap tempat les menampilkan informasi program, jadwal, dan harga di halaman detail mereka. Anda juga bisa menghubungi tempat les melalui fitur chat untuk informasi lebih lanjut.',
        open: false
      }
    ]
  },
  {
    category: 'Pembayaran',
    items: [
      {
        question: 'Metode pembayaran apa saja yang tersedia?',
        answer: 'Mariles mendukung berbagai metode pembayaran termasuk transfer bank, e-wallet (GoPay, OVO, Dana), dan kartu kredit/debit. Pilih metode yang paling nyaman untuk Anda.',
        open: false
      },
      {
        question: 'Apakah pembayaran di Mariles aman?',
        answer: 'Ya, semua transaksi di Mariles dilindungi dengan enkripsi dan sistem keamanan berlapis. Kami bekerja sama dengan payment gateway terpercaya untuk memastikan keamanan data pembayaran Anda.',
        open: false
      },
      {
        question: 'Bagaimana jika saya ingin membatalkan pendaftaran?',
        answer: 'Kebijakan pembatalan dan refund berbeda untuk setiap tempat les. Silakan lihat syarat dan ketentuan di halaman detail tempat les atau hubungi customer service kami untuk bantuan lebih lanjut.',
        open: false
      }
    ]
  },
  {
    category: 'Akun & Keamanan',
    items: [
      {
        question: 'Bagaimana cara mengubah password akun saya?',
        answer: 'Masuk ke halaman profil Anda, kemudian pilih menu "Keamanan" atau "Ubah Password". Masukkan password lama dan password baru Anda, lalu simpan perubahan.',
        open: false
      },
      {
        question: 'Apa yang harus saya lakukan jika lupa password?',
        answer: 'Klik "Lupa Password" di halaman login, masukkan email yang terdaftar, dan kami akan mengirimkan link untuk reset password ke email Anda.',
        open: false
      },
      {
        question: 'Bagaimana Mariles melindungi data pribadi saya?',
        answer: 'Kami menerapkan standar keamanan tinggi untuk melindungi data pribadi Anda. Untuk informasi lebih detail, silakan baca Kebijakan Privasi kami.',
        open: false
      }
    ]
  },
  {
    category: 'Bantuan Lainnya',
    items: [
      {
        question: 'Bagaimana cara menghubungi customer service?',
        answer: 'Anda bisa menghubungi kami melalui email di support@mariles.id atau melalui fitur chat di aplikasi. Tim customer service kami siap membantu Senin-Jumat pukul 08.00-17.00 WIB.',
        open: false
      },
      {
        question: 'Saya pemilik tempat les, bagaimana cara mendaftarkan tempat les saya?',
        answer: 'Silakan daftar akun sebagai "Pemilik Les" dan lengkapi informasi tempat les Anda. Setelah verifikasi, tempat les Anda akan tampil di platform kami. Lihat halaman "Panduan Partner" untuk informasi lebih lengkap.',
        open: false
      }
    ]
  }
])

function toggleFaq(categoryIndex, itemIndex) {
  faqs.value[categoryIndex].items[itemIndex].open = !faqs.value[categoryIndex].items[itemIndex].open
}
</script>

<template>
  <div class="faq-page">
    <Navbar />
    
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Frequently Asked Questions</h1>
        <p class="header-subtitle">Temukan jawaban untuk pertanyaan yang sering diajukan tentang Mariles</p>
      </div>
    </div>

    <main class="main-content">
      <div class="container">

        <!-- FAQ Content -->
        <section class="faq-content">
          <div v-for="(category, catIndex) in faqs" :key="catIndex" class="faq-category">
            <h2 class="category-title">{{ category.category }}</h2>
            
            <div class="faq-list">
              <div 
                v-for="(faq, faqIndex) in category.items" 
                :key="faqIndex" 
                class="faq-item"
                :class="{ open: faq.open }"
              >
                <button class="faq-question" @click="toggleFaq(catIndex, faqIndex)">
                  <span>{{ faq.question }}</span>
                  <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div class="faq-answer">
                  <p>{{ faq.answer }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Contact CTA -->
        <section class="contact-cta">
          <div class="cta-box">
            <h3>Masih punya pertanyaan?</h3>
            <p>Tim customer service kami siap membantu Anda</p>
            <a href="mailto:support@mariles.id" class="btn btn-primary">Hubungi Kami</a>
          </div>
        </section>
      </div>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.faq-page {
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
  padding: 24px 0 var(--spacing-3xl);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}

/* FAQ Content */
.faq-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

.faq-category {
  background: white;
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
}

.category-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--border-light);
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.faq-item {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-base);
}

.faq-item:hover {
  border-color: var(--primary);
}

.faq-item.open {
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: white;
  border: none;
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.faq-question:hover {
  background: var(--background);
}

.faq-item.open .faq-question {
  background: var(--background);
}

.chevron {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform var(--transition-base);
}

.faq-item.open .chevron {
  transform: rotate(180deg);
  color: var(--primary);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition-base), padding var(--transition-base);
}

.faq-item.open .faq-answer {
  max-height: 300px;
  padding: 0 var(--spacing-lg) var(--spacing-lg);
}

.faq-answer p {
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}

/* Contact CTA */
.contact-cta {
  margin-top: var(--spacing-3xl);
}

.cta-box {
  background: var(--primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  text-align: center;
  color: white;
}

.cta-box h3 {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: white;
  margin-bottom: var(--spacing-xs);
}

.cta-box p {
  color: white;
  opacity: 0.9;
  margin-bottom: var(--spacing-lg);
}

.cta-box .btn {
  background: white;
  color: var(--primary);
  font-weight: 600;
}

.cta-box .btn:hover {
  background: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .page-title {
    font-size: var(--font-size-2xl);
  }
  
  .faq-category {
    padding: var(--spacing-lg);
  }
  
  .faq-question {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-sm);
  }
}
</style>
