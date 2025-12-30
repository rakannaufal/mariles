<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
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
      console.log('Login Success. User:', authStore.user)
      console.log('User Profile:', authStore.userProfile)
      console.log('Detected Role:', authStore.userRole)
      
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
          <div class="illustration-text">
            <h1>Selamat Datang Kembali!</h1>
            <p>Masuk ke akun Anda untuk melanjutkan pencarian tempat les terbaik.</p>
          </div>
          <img src="/images/belajar_1.png" alt="Ilustrasi siswa belajar" class="illustration-image">
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
              <div class="password-wrapper">
                <input 
                  v-model="password" 
                  :type="showPassword ? 'text' : 'password'" 
                  class="form-input password-input" 
                  placeholder="Masukkan password" 
                  autocomplete="current-password"
                >
                <button type="button" class="password-toggle" @click="showPassword = !showPassword">
                  <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" class="toggle-icon">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" class="toggle-icon">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
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
.illustration-content{display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;z-index:1;width:100%;max-width:520px}
.illustration-text{color:white;margin-bottom:var(--spacing-md)}
.illustration-text .logo{display:inline-flex;align-items:center;gap:var(--spacing-sm);margin-bottom:var(--spacing-xl)}
.illustration-text .logo-text{font-size:var(--font-size-2xl);font-weight:700;color:white;background:none;-webkit-text-fill-color:white}
.illustration-text h1{font-size:var(--font-size-3xl);font-weight:700;line-height:1.2;margin-bottom:var(--spacing-sm);color:white}
.illustration-text p{font-size:var(--font-size-base);opacity:0.9;line-height:1.6}
.illustration-image{width:100%;max-width:480px;height:auto;object-fit:contain;margin:var(--spacing-md) auto 0}
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
.password-wrapper{position:relative}
.password-input{padding-right:40px}
.password-toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-secondary);opacity:0.6;transition:all 0.2s;padding:4px;display:flex;align-items:center;justify-content:center}
.password-toggle:hover{opacity:1;color:var(--primary)}
.toggle-icon{width:20px;height:20px}
@media(max-width:1024px){.login-illustration{display:none}.login-form-container{padding:var(--spacing-lg)}}
@media(max-width:640px){.form-options{flex-direction:column;gap:var(--spacing-sm);align-items:flex-start}}
</style>
