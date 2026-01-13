<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '@/components/AdminSidebar.vue'

// State
const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editMode = ref(false)
const searchQuery = ref('')

// Data form
const formData = ref({
  id: null,
  name: '',
  icon: '',
  description: '',
  is_active: true
})

// Opsi ikon
const iconOptions = [
  { value: '📚', label: '📚 Akademik' },
  { value: '🎨', label: '🎨 Seni' },
  { value: '⚽', label: '⚽ Olahraga' },
  { value: '🎵', label: '🎵 Musik' },
  { value: '💻', label: '💻 Teknologi' },
  { value: '🔬', label: '🔬 Sains' },
  { value: '📐', label: '📐 Matematika' },
  { value: '🌍', label: '🌍 Bahasa' },
  { value: '🎭', label: '🎭 Drama' },
  { value: '📸', label: '📸 Fotografi' },
  { value: '✏️', label: '✏️ Umum' }
]

// Ambil kategori
async function fetchCategories() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) throw error
    categories.value = data || []
  } catch (err) {
    console.error('Error fetching categories:', err)
  } finally {
    loading.value = false
  }
}

// Buka modal untuk tambah/edit
function openModal(category = null) {
  if (category) {
    editMode.value = true
    formData.value = { ...category }
  } else {
    editMode.value = false
    formData.value = {
      id: null,
      name: '',
      icon: '📚',
      description: '',
      is_active: true
    }
  }
  showModal.value = true
}

// Simpan kategori
async function saveCategory() {
  if (!formData.value.name.trim()) {
    alert('Nama kategori harus diisi')
    return
  }
  
  saving.value = true
  try {
    if (editMode.value) {
      const { error } = await supabase
        .from('categories')
        .update({
          name: formData.value.name,
          icon: formData.value.icon,
          description: formData.value.description,
          is_active: formData.value.is_active
        })
        .eq('id', formData.value.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('categories')
        .insert({
          name: formData.value.name,
          icon: formData.value.icon,
          description: formData.value.description,
          is_active: formData.value.is_active
        })
      
      if (error) throw error
    }
    
    showModal.value = false
    await fetchCategories()
  } catch (err) {
    console.error('Error saving category:', err)
    alert('Gagal menyimpan kategori: ' + err.message)
  } finally {
    saving.value = false
  }
}

// Toggle status aktif
async function toggleActive(category) {
  try {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id)
    
    if (error) throw error
    category.is_active = !category.is_active
  } catch (err) {
    console.error('Error toggling status:', err)
  }
}

// Hapus kategori
async function deleteCategory(category) {
  if (!confirm(`Hapus kategori "${category.name}"?`)) return
  
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
    
    if (error) throw error
    await fetchCategories()
  } catch (err) {
    console.error('Error deleting category:', err)
    alert('Gagal menghapus kategori: ' + err.message)
  }
}

// Kategori yang difilter
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value
  const q = searchQuery.value.toLowerCase()
  return categories.value.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.description?.toLowerCase().includes(q)
  )
})

import { computed } from 'vue'

onMounted(fetchCategories)
</script>

<template>
  <div class="dashboard">
    <AdminSidebar />

    <main class="main">
      <header class="header">
        <div class="header-left">
          <h1>Kategori</h1>
          <span class="subtitle">Kelola kategori tempat les</span>
        </div>
        <button class="btn btn-primary" @click="openModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Tambah Kategori
        </button>
      </header>

      <!-- Search -->
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Cari kategori...">
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat kategori...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredCategories.length" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <h3>{{ searchQuery ? 'Tidak ada hasil' : 'Belum ada kategori' }}</h3>
        <p>{{ searchQuery ? 'Coba kata kunci lain' : 'Tambahkan kategori pertama Anda' }}</p>
      </div>

      <!-- Categories Grid -->
      <div v-else class="categories-grid">
        <div v-for="cat in filteredCategories" :key="cat.id" class="category-card" :class="{ inactive: !cat.is_active }">
          <div class="card-header">
            <span class="category-icon">{{ cat.icon || '📚' }}</span>
            <div class="card-actions">
              <button class="action-btn" @click="toggleActive(cat)" :title="cat.is_active ? 'Nonaktifkan' : 'Aktifkan'">
                <svg v-if="cat.is_active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
              <button class="action-btn edit" @click="openModal(cat)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="action-btn delete" @click="deleteCategory(cat)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <h3 class="category-name">{{ cat.name }}</h3>
          <p class="category-desc">{{ cat.description || 'Tidak ada deskripsi' }}</p>
          <span class="status-badge" :class="cat.is_active ? 'active' : 'inactive'">
            {{ cat.is_active ? 'Aktif' : 'Nonaktif' }}
          </span>
        </div>
      </div>
    </main>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editMode ? 'Edit Kategori' : 'Tambah Kategori' }}</h2>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <form @submit.prevent="saveCategory" class="modal-body">
          <div class="form-group">
            <label>Nama Kategori *</label>
            <input v-model="formData.name" type="text" placeholder="Contoh: Matematika" required>
          </div>
          <div class="form-group">
            <label>Icon</label>
            <select v-model="formData.icon">
              <option v-for="icon in iconOptions" :key="icon.value" :value="icon.value">
                {{ icon.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Deskripsi</label>
            <textarea v-model="formData.description" rows="3" placeholder="Deskripsi kategori..."></textarea>
          </div>
          <div class="form-group checkbox">
            <label>
              <input type="checkbox" v-model="formData.is_active">
              <span>Aktif</span>
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: #f8fafc; }
.main { flex: 1; padding: 24px 32px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-left h1 { font-size: 28px; font-weight: 700; margin: 0; }
.subtitle { color: #64748b; font-size: 14px; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
.btn svg { width: 18px; height: 18px; }
.btn-primary { background: linear-gradient(135deg, #0d5782, #0a4568); color: white; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(13, 87, 130, 0.3); }
.btn-secondary { background: #f1f5f9; color: #475569; }

.search-bar { display: flex; align-items: center; gap: 12px; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; max-width: 400px; }
.search-bar svg { width: 20px; height: 20px; color: #94a3b8; }
.search-bar input { flex: 1; border: none; outline: none; font-size: 14px; }

.loading-state, .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d5782; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state svg { width: 64px; height: 64px; color: #cbd5e1; margin-bottom: 16px; }
.empty-state h3 { font-size: 18px; margin-bottom: 8px; }
.empty-state p { color: #64748b; }

.categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.category-card { background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; transition: all 0.2s; }
.category-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); }
.category-card.inactive { opacity: 0.6; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.category-icon { font-size: 32px; }
.card-actions { display: flex; gap: 4px; }
.action-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #f1f5f9; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.action-btn svg { width: 16px; height: 16px; color: #64748b; }
.action-btn:hover { background: #e2e8f0; }
.action-btn.edit:hover { background: #dbeafe; }
.action-btn.edit:hover svg { color: #2563eb; }
.action-btn.delete:hover { background: #fee2e2; }
.action-btn.delete:hover svg { color: #dc2626; }
.category-name { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.category-desc { color: #64748b; font-size: 14px; margin-bottom: 12px; line-height: 1.5; }
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.status-badge.active { background: #dcfce7; color: #16a34a; }
.status-badge.inactive { background: #fee2e2; color: #dc2626; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h2 { font-size: 20px; font-weight: 700; margin: 0; }
.close-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f1f5f9; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #475569; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #0d5782; }
.form-group.checkbox label { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.form-group.checkbox input { width: auto; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }

@media (max-width: 768px) {
  .main { padding: 16px; }
  .header { flex-direction: column; gap: 16px; align-items: flex-start; }
  .categories-grid { grid-template-columns: 1fr; }
}
</style>
