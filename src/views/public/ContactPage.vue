<script setup>
import { ref } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import { useContacts } from '@/composables/useContacts'

const { submitContact, loading: isSubmitting, error: submitError } = useContacts()

const formData = ref({
  name: '',
  email: '',
  subject: '',
  message: ''
})

const isSubmitted = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  
  const result = await submitContact(formData.value)
  
  if (result.success) {
    isSubmitted.value = true
    formData.value = { name: '', email: '', subject: '', message: '' }
  } else {
    errorMessage.value = result.error || 'Gagal mengirim pesan. Silakan coba lagi.'
  }
}
</script>

<template>
  <div class="contact-page">
    <Navbar />
    
    <main class="main-content">
      <section class="hero-section">
        <div class="container">
          <h1 class="page-title">Hubungi Kami</h1>
          <p class="page-subtitle">Ada pertanyaan atau masukan? Kami siap membantu Anda</p>
        </div>
      </section>

      <section class="contact-section">
        <div class="container">
          <div class="contact-grid">
            <div class="contact-info">
              <h2>Informasi Kontak</h2>
              <p>Hubungi kami melalui salah satu channel berikut:</p>
              
              <div class="contact-items">
                <div class="contact-item">
                  <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></div>
                  <div>
                    <h4>Email</h4>
                    <p>support@mariles.id</p>
                  </div>
                </div>
                <div class="contact-item">
                  <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div>
                  <div>
                    <h4>WhatsApp</h4>
                    <p>+62 812-3456-7890</p>
                  </div>
                </div>
                <div class="contact-item">
                  <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                  <div>
                    <h4>Alamat</h4>
                    <p>Pekanbaru, Indonesia</p>
                  </div>
                </div>
                <div class="contact-item">
                  <div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                  <div>
                    <h4>Jam Operasional</h4>
                    <p>Senin - Jumat: 09:00 - 17:00 WIB</p>
                  </div>
                </div>
              </div>

              <div class="social-links">
                <h4>Ikuti Kami</h4>
                <div class="social-icons">
                  <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>
                  <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>
                </div>
              </div>
            </div>

            <div class="contact-form-wrapper">
              <div v-if="isSubmitted" class="success-message">
                <div class="success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
                <h3>Pesan Terkirim!</h3>
                <p>Terima kasih telah menghubungi kami. Tim kami akan segera merespons pesan Anda.</p>
                <button class="btn btn-primary" @click="isSubmitted = false">Kirim Pesan Lagi</button>
              </div>
              
              <form v-else @submit.prevent="handleSubmit" class="contact-form">
                <h2>Kirim Pesan</h2>
                <div class="form-group">
                  <label for="name">Nama Lengkap</label>
                  <input v-model="formData.name" type="text" id="name" placeholder="Masukkan nama Anda" required>
                </div>
                <div class="form-group">
                  <label for="email">Email</label>
                  <input v-model="formData.email" type="email" id="email" placeholder="email@example.com" required>
                </div>
                <div class="form-group">
                  <label for="subject">Subjek</label>
                  <select v-model="formData.subject" id="subject" required>
                    <option value="">Pilih subjek</option>
                    <option value="general">Pertanyaan Umum</option>
                    <option value="technical">Bantuan Teknis</option>
                    <option value="payment">Masalah Pembayaran</option>
                    <option value="partnership">Kerjasama</option>
                    <option value="feedback">Saran & Masukan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="message">Pesan</label>
                  <textarea v-model="formData.message" id="message" rows="5" placeholder="Tulis pesan Anda..." required></textarea>
                </div>
                <div v-if="errorMessage" class="error-message">
                  {{ errorMessage }}
                </div>
                <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="isSubmitting">
                  {{ isSubmitting ? 'Mengirim...' : 'Kirim Pesan' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section class="faq-section">
        <div class="container">
          <h2>Pertanyaan Umum</h2>
          <p>Mungkin pertanyaan Anda sudah terjawab di sini</p>
          <div class="faq-grid">
            <div class="faq-item"><h4>Bagaimana cara mendaftar?</h4><p>Klik tombol "Daftar" dan ikuti langkah-langkah registrasi.</p></div>
            <div class="faq-item"><h4>Apakah ada biaya pendaftaran?</h4><p>Pendaftaran akun gratis. Anda hanya membayar program les.</p></div>
            <div class="faq-item"><h4>Bagaimana cara pembayaran?</h4><p>Transfer bank, e-wallet, dan kartu kredit tersedia.</p></div>
            <div class="faq-item"><h4>Bagaimana jika ada masalah?</h4><p>Hubungi tim support kami melalui form di atas.</p></div>
          </div>
          <div class="faq-action"><router-link to="/faq" class="btn btn-outline">Lihat Semua FAQ</router-link></div>
        </div>
      </section>
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.contact-page{min-height:100vh;background:var(--background)}
.main-content{padding-top:64px}
.container{max-width:1200px;margin:0 auto;padding:0 var(--spacing-lg)}
.hero-section{background:var(--primary);padding:var(--spacing-3xl) 0;text-align:center;color:white}
.page-title{font-size:var(--font-size-3xl);font-weight:700;margin-bottom:var(--spacing-md);color:white}
.page-subtitle{font-size:var(--font-size-lg);opacity:0.9}
.contact-section{padding:var(--spacing-3xl) 0}
.contact-grid{display:grid;grid-template-columns:1fr 1.5fr;gap:var(--spacing-2xl)}
.contact-info h2{font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--spacing-sm)}
.contact-info>p{color:var(--text-secondary);margin-bottom:var(--spacing-xl)}
.contact-items{display:flex;flex-direction:column;gap:var(--spacing-lg);margin-bottom:var(--spacing-xl)}
.contact-item{display:flex;gap:var(--spacing-md);align-items:flex-start}
.contact-icon{width:44px;height:44px;background:var(--primary);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0}
.contact-icon svg{width:22px;height:22px}
.contact-item h4{font-size:var(--font-size-sm);font-weight:600;margin-bottom:2px}
.contact-item p{color:var(--text-secondary);font-size:var(--font-size-sm)}
.social-links h4{font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--spacing-sm)}
.social-icons{display:flex;gap:var(--spacing-sm)}
.social-icons a{width:40px;height:40px;background:var(--background);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);transition:all var(--transition-fast)}
.social-icons a:hover{background:var(--primary);color:white}
.social-icons svg{width:20px;height:20px}
.contact-form-wrapper{background:white;padding:var(--spacing-xl);border-radius:var(--radius-xl);box-shadow:var(--shadow-lg)}
.contact-form h2{font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--spacing-lg)}
.form-group{margin-bottom:var(--spacing-md)}
.form-group label{display:block;font-size:var(--font-size-sm);font-weight:500;margin-bottom:var(--spacing-xs)}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:var(--spacing-sm) var(--spacing-md);border:1px solid var(--border);border-radius:var(--radius-lg);font-size:var(--font-size-sm);transition:border-color var(--transition-fast)}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--primary)}
.btn-block{width:100%}
.success-message{text-align:center;padding:var(--spacing-xl)}
.success-icon{width:64px;height:64px;background:var(--success);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--spacing-md);color:white}
.success-icon svg{width:32px;height:32px}
.success-message h3{font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--spacing-sm)}
.success-message p{color:var(--text-secondary);margin-bottom:var(--spacing-lg)}
.faq-section{padding:var(--spacing-3xl) 0;background:white;text-align:center}
.faq-section h2{font-size:var(--font-size-xl);font-weight:700;margin-bottom:var(--spacing-xs)}
.faq-section>p{color:var(--text-secondary);margin-bottom:var(--spacing-xl)}
.faq-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--spacing-md);text-align:left;max-width:800px;margin:0 auto var(--spacing-xl)}
.faq-item{background:var(--background);padding:var(--spacing-lg);border-radius:var(--radius-xl)}
.faq-item h4{font-size:var(--font-size-sm);font-weight:600;margin-bottom:var(--spacing-xs)}
.faq-item p{color:var(--text-secondary);font-size:var(--font-size-sm)}
.faq-action{margin-top:var(--spacing-lg)}
.error-message{background:var(--error-light, #fee2e2);color:var(--error, #dc2626);padding:var(--spacing-sm) var(--spacing-md);border-radius:var(--radius-lg);font-size:var(--font-size-sm);margin-bottom:var(--spacing-md)}
@media(max-width:1024px){.contact-grid{grid-template-columns:1fr}}
@media(max-width:768px){.faq-grid{grid-template-columns:1fr}}
</style>
