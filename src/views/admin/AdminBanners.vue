<script setup>
import AdminSidebar from '@/components/AdminSidebar.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

const loading = ref(true)
const saving = ref(false)
const banners = ref([])

// Modal
const showModal = ref(false)
const editingBanner = ref(null)
const bannerForm = ref({
  title: '',
  subtitle: '',
  image_url: '',
  link: '',
  is_active: true
})

// Image upload
const uploading = ref(false)
const fileInput = ref(null)

// Toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

onMounted(async () => {
  await fetchBanners()
})

async function fetchBanners() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    banners.value = data || []
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal memuat banner', 'error')
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingBanner.value = null
  bannerForm.value = { title: '', subtitle: '', image_url: '', link: '', is_active: true }
  showModal.value = true
}

function openEditModal(banner) {
  editingBanner.value = banner
  bannerForm.value = { ...banner }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingBanner.value = null
}

async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast('File harus berupa gambar', 'error')
    return
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast('Ukuran file maksimal 5MB', 'error')
    return
  }
  
  uploading.value = true
  try {
    const fileName = `banner_${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage
      .from('banners')
      .upload(fileName, file)
    
    if (error) throw error
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('banners')
      .getPublicUrl(fileName)
    
    bannerForm.value.image_url = urlData.publicUrl
    toast('Gambar berhasil diupload', 'success')
  } catch (err) {
    console.error('Upload error:', err)
    toast('Gagal upload gambar. Pastikan bucket "banners" sudah dibuat di Supabase Storage.', 'error')
  } finally {
    uploading.value = false
  }
}

async function saveBanner() {
  if (!bannerForm.value.title || !bannerForm.value.image_url) {
    toast('Judul dan gambar wajib diisi', 'error')
    return
  }
  
  saving.value = true
  try {
    if (editingBanner.value) {
      // Update existing
      const { error } = await supabase
        .from('banners')
        .update({
          title: bannerForm.value.title,
          subtitle: bannerForm.value.subtitle,
          image_url: bannerForm.value.image_url,
          link: bannerForm.value.link,
          is_active: bannerForm.value.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingBanner.value.id)
      
      if (error) throw error
      toast('Banner berhasil diperbarui', 'success')
    } else {
      // Create new
      const maxOrder = Math.max(...banners.value.map(b => b.sort_order || 0), 0)
      const { error } = await supabase
        .from('banners')
        .insert({
          title: bannerForm.value.title,
          subtitle: bannerForm.value.subtitle,
          image_url: bannerForm.value.image_url,
          link: bannerForm.value.link,
          is_active: bannerForm.value.is_active,
          sort_order: maxOrder + 1
        })
      
      if (error) throw error
      toast('Banner berhasil ditambahkan', 'success')
    }
    
    closeModal()
    await fetchBanners()
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal menyimpan banner', 'error')
  } finally {
    saving.value = false
  }
}

async function toggleActive(banner) {
  try {
    await supabase
      .from('banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id)
    
    banner.is_active = !banner.is_active
    toast(banner.is_active ? 'Banner diaktifkan' : 'Banner dinonaktifkan', 'success')
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal mengubah status', 'error')
  }
}

async function deleteBanner(banner) {
  if (!confirm(`Hapus banner "${banner.title}"?`)) return
  
  try {
    await supabase.from('banners').delete().eq('id', banner.id)
    banners.value = banners.value.filter(b => b.id !== banner.id)
    toast('Banner berhasil dihapus', 'success')
  } catch (err) {
    console.error('Error:', err)
    toast('Gagal menghapus banner', 'error')
  }
}

async function moveUp(index) {
  if (index === 0) return
  const current = banners.value[index]
  const prev = banners.value[index - 1]
  
  try {
    await Promise.all([
      supabase.from('banners').update({ sort_order: prev.sort_order }).eq('id', current.id),
      supabase.from('banners').update({ sort_order: current.sort_order }).eq('id', prev.id)
    ])
    await fetchBanners()
  } catch (err) {
    console.error('Error:', err)
  }
}

async function moveDown(index) {
  if (index === banners.value.length - 1) return
  const current = banners.value[index]
  const next = banners.value[index + 1]
  
  try {
    await Promise.all([
      supabase.from('banners').update({ sort_order: next.sort_order }).eq('id', current.id),
      supabase.from('banners').update({ sort_order: current.sort_order }).eq('id', next.id)
    ])
    await fetchBanners()
  } catch (err) {
    console.error('Error:', err)
  }
}

function toast(msg, type = 'success') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <Transition name="slide">
      <div v-if="showToast" :class="['toast', toastType]">{{ toastMessage }}</div>
    </Transition>

    <main class="main-content">
      <header class="page-header">
        <div class="header-left">
          <h1>Kelola Banner</h1>
          <p class="subtitle">Atur banner yang tampil di halaman utama</p>
        </div>
        <button class="btn-add" @click="openAddModal">
          + Tambah Banner
        </button>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Banner List -->
      <div v-else class="banners-grid">
        <div v-if="banners.length === 0" class="empty-state">
          <p>Belum ada banner. Klik tombol "Tambah Banner" untuk mulai.</p>
        </div>
        
        <div 
          v-for="(banner, index) in banners" 
          :key="banner.id" 
          class="banner-card"
          :class="{ inactive: !banner.is_active }"
        >
          <div class="banner-image">
            <img :src="banner.image_url" :alt="banner.title">
            <span class="banner-order">#{{ index + 1 }}</span>
            <span v-if="!banner.is_active" class="inactive-badge">Nonaktif</span>
          </div>
          <div class="banner-info">
            <h4>{{ banner.title }}</h4>
            <p v-if="banner.subtitle">{{ banner.subtitle }}</p>
          </div>
          <div class="banner-actions">
            <button class="btn-icon" @click="moveUp(index)" :disabled="index === 0" title="Pindah ke atas">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <button class="btn-icon" @click="moveDown(index)" :disabled="index === banners.length - 1" title="Pindah ke bawah">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <button class="btn-icon toggle" @click="toggleActive(banner)" :title="banner.is_active ? 'Nonaktifkan' : 'Aktifkan'">
              <svg v-if="banner.is_active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            </button>
            <button class="btn-icon edit" @click="openEditModal(banner)" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="btn-icon delete" @click="deleteBanner(banner)" title="Hapus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingBanner ? 'Edit Banner' : 'Tambah Banner Baru' }}</h3>
          <button class="btn-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Judul *</label>
            <input v-model="bannerForm.title" type="text" class="form-input" placeholder="Judul banner">
          </div>
          <div class="form-group">
            <label>Subtitle</label>
            <input v-model="bannerForm.subtitle" type="text" class="form-input" placeholder="Deskripsi singkat (opsional)">
          </div>
          <div class="form-group">
            <label>Gambar *</label>
            <div class="image-upload">
              <div v-if="bannerForm.image_url" class="image-preview">
                <img :src="bannerForm.image_url" alt="Preview">
              </div>
              <div class="upload-controls">
                <input type="file" ref="fileInput" accept="image/*" @change="handleFileUpload" style="display: none">
                <button type="button" class="btn-upload" @click="fileInput.click()" :disabled="uploading">
                  {{ uploading ? 'Mengupload...' : 'Upload Gambar' }}
                </button>
                <span class="or-text">atau</span>
                <input v-model="bannerForm.image_url" type="url" class="form-input" placeholder="Masukkan URL gambar">
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Link (Opsional)</label>
            <input v-model="bannerForm.link" type="text" class="form-input" placeholder="/search atau URL eksternal">
          </div>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" v-model="bannerForm.is_active">
              <span>Aktif (tampil di homepage)</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Batal</button>
          <button class="btn-save" @click="saveBanner" :disabled="saving">
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #F8FAFC; }
.main-content { flex: 1; padding: 32px; overflow-y: auto; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.page-header h1 { font-size: 28px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
.subtitle { font-size: 14px; color: #64748B; }

.btn-add { padding: 12px 24px; background: var(--secondary); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-add:hover { background: var(--secondary-dark); }

.loading-state { display: flex; justify-content: center; padding: 80px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E2E8F0; border-top-color: var(--secondary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 60px; background: white; border-radius: 16px; border: 1px dashed #CBD5E1; color: #64748B; grid-column: 1 / -1; }

.banners-grid { display: flex; flex-direction: column; gap: 16px; }

.banner-card { display: flex; align-items: center; gap: 20px; background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 16px; transition: all 0.2s; }
.banner-card:hover { border-color: #CBD5E1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.banner-card.inactive { opacity: 0.6; }

.banner-image { position: relative; width: 200px; height: 100px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.banner-image img { width: 100%; height: 100%; object-fit: cover; }
.banner-order { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.inactive-badge { position: absolute; top: 8px; right: 8px; background: #F59E0B; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }

.banner-info { flex: 1; min-width: 0; }
.banner-info h4 { font-size: 16px; font-weight: 600; color: #1E293B; margin-bottom: 4px; }
.banner-info p { font-size: 14px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.banner-actions { display: flex; gap: 8px; }
.btn-icon { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.btn-icon svg { width: 18px; height: 18px; color: #64748B; }
.btn-icon:hover { border-color: #CBD5E1; }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-icon.edit:hover { background: #DBEAFE; border-color: #3B82F6; }
.btn-icon.edit:hover svg { color: #3B82F6; }
.btn-icon.delete:hover { background: #FEE2E2; border-color: #EF4444; }
.btn-icon.delete:hover svg { color: #EF4444; }
.btn-icon.toggle:hover { background: #D1FAE5; border-color: #10B981; }
.btn-icon.toggle:hover svg { color: #10B981; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E2E8F0; }
.modal-header h3 { font-size: 20px; font-weight: 700; }
.btn-close { width: 36px; height: 36px; border-radius: 8px; border: none; background: #F1F5F9; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 24px; border-top: 1px solid #E2E8F0; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 600; color: #1E293B; margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 14px; }
.form-input:focus { outline: none; border-color: var(--secondary); }

.image-upload { display: flex; flex-direction: column; gap: 12px; }
.image-preview { width: 100%; height: 150px; border-radius: 10px; overflow: hidden; background: #F8FAFC; }
.image-preview img { width: 100%; height: 100%; object-fit: cover; }
.upload-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.btn-upload { padding: 10px 20px; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-upload:hover { background: #E2E8F0; }
.btn-upload:disabled { opacity: 0.6; cursor: not-allowed; }
.or-text { color: #94A3B8; font-size: 13px; }
.upload-controls .form-input { flex: 1; min-width: 200px; }

.toggle-label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle-label input { width: 18px; height: 18px; }

.btn-cancel { padding: 12px 24px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-save { padding: 12px 24px; background: var(--secondary); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-save:disabled { opacity: 0.6; }

.toast { position: fixed; top: 20px; right: 20px; padding: 14px 24px; border-radius: 10px; font-weight: 500; z-index: 200; }
.toast.success { background: #D1FAE5; color: #059669; }
.toast.error { background: #FEE2E2; color: #DC2626; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s; }
.slide-enter-from, .slide-leave-to { transform: translateX(100px); opacity: 0; }

@media (max-width: 768px) {
  .banner-card { flex-direction: column; align-items: flex-start; }
  .banner-image { width: 100%; height: 150px; }
  .banner-actions { width: 100%; justify-content: flex-end; }
}
</style>
