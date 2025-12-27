<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!email.value || !password.value) { error.value = 'Email dan password wajib diisi'; return }
  loading.value = true
  error.value = ''
  try {
    await authStore.signIn(email.value, password.value)
    const redirect = route.query.redirect
    if (redirect) {
      router.push(redirect)
    } else {
      // Student goes to home, other roles go to dashboard
      const role = authStore.userRole || 'student'
      if (role === 'student') {
        router.push('/')
      } else {
        router.push(`/${role}/dashboard`)
      }
    }
  } catch (err) { error.value = err.message || 'Login gagal. Silakan coba lagi.' }
  finally { loading.value = false }
}

async function handleGoogleLogin() {
  try { await authStore.signInWithGoogle() }
  catch (err) { error.value = err.message || 'Login dengan Google gagal' }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-illustration">
        <div class="illustration-content">
          <div class="illustration-shapes"><div class="shape shape-1"></div><div class="shape shape-2"></div><div class="shape shape-3"></div></div>
          <div class="illustration-text">
            <router-link to="/" class="logo"><span class="logo-text">Mariles</span></router-link>
            <h1>Selamat Datang<br>Kembali!</h1>
            <p>Masuk ke akun Anda untuk melanjutkan pencarian tempat les terbaik.</p>
            <div class="illustration-features">
              <div class="feature"><span class="check">✓</span><span>10,000+ Siswa Aktif</span></div>
              <div class="feature"><span class="check">✓</span><span>1,500+ Tempat Les</span></div>
              <div class="feature"><span class="check">✓</span><span>Pembayaran Aman</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="login-form-container">
        <div class="login-form-wrapper">
          <div class="form-header">
            <h2>Masuk</h2>
            <p>Belum punya akun? <router-link to="/register" class="link">Daftar sekarang</router-link></p>
          </div>

          <form @submit.prevent="handleLogin" class="login-form">
            <div v-if="error" class="alert alert-error">{{ error }}</div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="email" type="email" class="form-input" placeholder="nama@email.com" autocomplete="email">
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input v-model="password" type="password" class="form-input" placeholder="Masukkan password" autocomplete="current-password">
            </div>

            <div class="form-options">
              <label class="checkbox-label"><input type="checkbox"><span>Ingat saya</span></label>
              <a href="#" class="link">Lupa password?</a>
            </div>

            <button type="submit" class="btn btn-secondary btn-lg w-full" :disabled="loading">
              <span v-if="loading" class="loading-spinner" style="width:20px;height:20px;"></span>
              <span v-else>Masuk</span>
            </button>

            <div class="divider-text">atau masuk dengan</div>

            <button type="button" class="btn btn-outline w-full social-btn" @click="handleGoogleLogin">
              <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </form>

          <div class="form-footer"><router-link to="/" class="back-link">← Kembali ke Beranda</router-link></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page{min-height:100vh;background:var(--background)}
.login-container{display:flex;min-height:100vh}
.login-illustration{flex:1;background:linear-gradient(135deg,var(--secondary),#0A4568);display:flex;align-items:center;justify-content:center;padding:var(--spacing-2xl);position:relative;overflow:hidden}
.illustration-content{position:relative;z-index:1;max-width:480px}
.illustration-shapes{position:absolute;inset:0}
.shape{position:absolute;border-radius:50%;opacity:0.1}
.shape-1{width:400px;height:400px;background:white;top:-100px;left:-100px;animation:float 6s ease-in-out infinite}
.shape-2{width:300px;height:300px;background:var(--primary);bottom:-50px;right:-80px;animation:float 8s ease-in-out infinite reverse}
.shape-3{width:200px;height:200px;background:var(--accent);top:50%;right:20%;animation:float 7s ease-in-out infinite}
.illustration-text{color:white}
.illustration-text .logo{display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:var(--spacing-2xl)}
.illustration-text .logo-text{font-size:var(--font-size-2xl);font-weight:700;color:white;background:none;-webkit-text-fill-color:white}
.illustration-text h1{font-size:var(--font-size-4xl);font-weight:700;line-height:1.2;margin-bottom:var(--spacing-lg);color:white}
.illustration-text p{font-size:var(--font-size-lg);opacity:0.9;margin-bottom:var(--spacing-2xl);line-height:1.6}
.illustration-features{display:flex;flex-direction:column;gap:var(--spacing-md)}
.feature{display:flex;align-items:center;gap:var(--spacing-sm);font-size:var(--font-size-base)}
.feature .check{color:#4ade80;font-weight:bold}
.login-form-container{flex:1;display:flex;align-items:center;justify-content:center;padding:var(--spacing-2xl)}
.login-form-wrapper{width:100%;max-width:440px}
.form-header{text-align:center;margin-bottom:var(--spacing-2xl)}
.form-header h2{font-size:var(--font-size-3xl);font-weight:700;margin-bottom:var(--spacing-sm)}
.form-header p{color:var(--text-secondary)}
.link{color:var(--secondary);font-weight:500;transition:color var(--transition-fast)}
.link:hover{color:var(--primary)}
.login-form{display:flex;flex-direction:column;gap:var(--spacing-lg)}
.alert{padding:var(--spacing-md);border-radius:var(--radius-lg);display:flex;align-items:center;gap:var(--spacing-sm)}
.alert-error{background:var(--error-bg);color:var(--error)}
.form-options{display:flex;justify-content:space-between;align-items:center}
.checkbox-label{display:flex;align-items:center;gap:var(--spacing-sm);cursor:pointer;font-size:var(--font-size-sm);color:var(--text-secondary)}
.checkbox-label input{width:18px;height:18px;accent-color:var(--secondary)}
.social-btn{display:flex;align-items:center;justify-content:center;gap:var(--spacing-sm)}
.google-icon{flex-shrink:0}
.form-footer{margin-top:var(--spacing-xl);text-align:center}
.back-link{color:var(--text-secondary);font-size:var(--font-size-sm);transition:color var(--transition-fast)}
.back-link:hover{color:var(--secondary)}
@media(max-width:1024px){.login-illustration{display:none}.login-form-container{padding:var(--spacing-lg)}}
@media(max-width:640px){.form-options{flex-direction:column;gap:var(--spacing-sm);align-items:flex-start}}
</style>
