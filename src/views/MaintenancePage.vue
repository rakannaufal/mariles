<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const message = ref('Platform sedang dalam perbaikan. Silakan coba beberapa saat lagi.')
const platformInfo = ref({
  platform_name: 'Mariles',
  support_email: 'support@mariles.id',
  whatsapp_number: '+6281234567890'
})

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'platform_info'])

    if (!error && data) {
      data.forEach(setting => {
        if (setting.key === 'maintenance_mode' && setting.value?.message) {
          message.value = setting.value.message
        }
        if (setting.key === 'platform_info' && setting.value) {
          platformInfo.value = { ...platformInfo.value, ...setting.value }
        }
      })
    }
  } catch (err) {
    console.error('Error loading maintenance info:', err)
  } finally {
    loading.value = false
  }
})

function getWhatsAppLink() {
  if (!platformInfo.value.whatsapp_number) return '#'
  return `https://wa.me/${platformInfo.value.whatsapp_number.replace(/\+/g, '')}`
}
</script>

<template>
  <div class="maintenance-page">
    <div class="maintenance-container">
      <div class="maintenance-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
      
      <h1>Sedang Dalam Perbaikan</h1>
      <p class="message">{{ message }}</p>
      
      <div v-if="!loading" class="contact-info">
        <p>Butuh bantuan? Hubungi kami:</p>
        <div class="contact-links">
          <a :href="`mailto:${platformInfo.support_email}`" class="contact-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            {{ platformInfo.support_email }}
          </a>
          <a :href="getWhatsAppLink()" target="_blank" class="contact-item whatsapp">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>
      
      <div class="brand">
        <span class="brand-name">{{ platformInfo.platform_name }}</span>
      </div>
    </div>
    
    <div class="background-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>
  </div>
</template>

<style scoped>
.maintenance-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0A4568 0%, #1E6B8C 50%, #3498db 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.maintenance-container {
  background: white;
  border-radius: 24px;
  padding: 48px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 10;
}

.maintenance-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.maintenance-icon svg {
  width: 40px;
  height: 40px;
  color: #D97706;
}

h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 16px;
}

.message {
  font-size: 16px;
  color: #64748B;
  line-height: 1.6;
  margin-bottom: 32px;
}

.contact-info {
  background: #F8FAFC;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.contact-info > p {
  font-size: 13px;
  color: #64748B;
  margin-bottom: 12px;
}

.contact-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-radius: 10px;
  color: #334155;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  border: 1px solid #E2E8F0;
}

.contact-item:hover {
  background: #F1F5F9;
  transform: translateY(-2px);
}

.contact-item svg {
  width: 18px;
  height: 18px;
}

.contact-item.whatsapp {
  background: #25D366;
  color: white;
  border-color: #25D366;
}

.contact-item.whatsapp:hover {
  background: #20BD5A;
}

.brand {
  padding-top: 24px;
  border-top: 1px solid #E2E8F0;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #0A4568, #3498db);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.background-shapes {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.shape-1 {
  width: 400px;
  height: 400px;
  background: white;
  top: -100px;
  right: -100px;
  animation: float 6s ease-in-out infinite;
}

.shape-2 {
  width: 300px;
  height: 300px;
  background: white;
  bottom: -50px;
  left: -50px;
  animation: float 8s ease-in-out infinite reverse;
}

.shape-3 {
  width: 200px;
  height: 200px;
  background: white;
  top: 50%;
  left: 20%;
  animation: float 7s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

@media (max-width: 480px) {
  .maintenance-container {
    padding: 32px 24px;
  }
  
  h1 {
    font-size: 24px;
  }
}
</style>
