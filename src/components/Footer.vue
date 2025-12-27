<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <span class="footer-logo">Mariles</span>
          <p class="footer-desc">Platform terpercaya untuk menemukan tempat les berkualitas di seluruh Indonesia.</p>
          <div class="footer-social">
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="#" aria-label="Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-links-grid">
          <div class="footer-links">
            <h4>Untuk Siswa</h4>
            <ul>
              <li><router-link to="/search">Cari Tempat Les</router-link></li>
              <li><router-link to="/how-it-works">Cara Kerja</router-link></li>
              <li><router-link to="/register">Daftar Akun</router-link></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Untuk Guru</h4>
            <ul>
              <li><router-link to="/teacher-guide">Panduan Guru</router-link></li>
              <li><router-link to="/register">Daftar Sebagai Guru</router-link></li>
              <li><router-link to="/how-it-works">Cara Mengajar</router-link></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Untuk Pemilik Les</h4>
            <ul>
              <li><router-link to="/partner-guide">Panduan Partner</router-link></li>
              <li><router-link to="/register">Daftarkan Tempat Les</router-link></li>
              <li><router-link to="/how-it-works">Cara Kerja Platform</router-link></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Perusahaan</h4>
            <ul>
              <li><router-link to="/about">Tentang Kami</router-link></li>
              <li><router-link to="/contact">Hubungi Kami</router-link></li>
              <li><router-link to="/privacy-policy">Kebijakan Privasi</router-link></li>
              <li><router-link to="/terms">Syarat & Ketentuan</router-link></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Bantuan</h4>
            <ul>
              <li><router-link to="/faq">FAQ</router-link></li>
              <li><router-link to="/contact">Pusat Bantuan</router-link></li>
              <li><router-link to="/how-it-works">Panduan Pengguna</router-link></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2025 Mariles. All rights reserved.</p>
        <div class="footer-bottom-links">
          <router-link to="/privacy-policy">Privasi</router-link>
          <router-link to="/terms">Ketentuan</router-link>
          <router-link to="/contact">Kontak</router-link>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--secondary);
  padding: var(--spacing-2xl) 0 var(--spacing-lg);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-lg);
}

.footer-top {
  display: flex;
  gap: var(--spacing-3xl);
  margin-bottom: var(--spacing-xl);
}

.footer-brand {
  flex: 1;
  max-width: 300px;
}

.footer-logo {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: white;
}

.footer-desc {
  color: #fff;
  margin: var(--spacing-sm) 0 var(--spacing-md);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.footer-social {
  display: flex;
  gap: var(--spacing-sm);
}

.footer-social a {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all var(--transition-fast);
}

.footer-social a:hover {
  background: white;
  color: var(--primary);
}

.footer-social svg {
  width: 18px;
  height: 18px;
}

.footer-links-grid {
  flex: 3;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-lg);
}

.footer-links h4 {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: white;
  margin-bottom: var(--spacing-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.footer-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.footer-links a {
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: white;
  text-decoration: underline;
}

.footer-bottom {
  padding-top: var(--spacing-lg);
  border-top: 1px solid rgba(255,255,255,0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.footer-bottom p {
  margin: 0;
}

.footer-bottom-links {
  display: flex;
  gap: var(--spacing-md);
}

.footer-bottom-links a {
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 500;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-bottom-links a:hover {
  color: white;
}

@media (max-width: 1024px) {
  .footer-links-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .footer-top {
    flex-direction: column;
    gap: var(--spacing-xl);
  }
  
  .footer-brand {
    max-width: 100%;
  }
  
  .footer-links-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .footer-bottom {
    flex-direction: column;
    gap: var(--spacing-sm);
    text-align: center;
  }
}

@media (max-width: 480px) {
  .footer-links-grid {
    grid-template-columns: 1fr;
  }
}
</style>
