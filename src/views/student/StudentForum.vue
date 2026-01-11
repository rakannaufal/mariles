<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useCategories } from '@/composables/useCategories'
import Navbar from '@/components/Navbar.vue'

const authStore = useAuthStore()

// State
const loading = ref(true)
const posts = ref([])

// Menggunakan kategori dari database
const { categories: dbCategories, fetchCategories: loadCategories } = useCategories()

// Computed untuk mendapatkan nama kategori
const categories = computed(() => 
  dbCategories.value.map(c => c.name)
)

const selectedCategory = ref('')
const searchQuery = ref('')
const sortBy = ref('newest')
const searchCategory = ref('') 

// Modal state
const showPostModal = ref(false)
const showDetailModal = ref(false)
const selectedPost = ref(null)
const postComments = ref([])
const loadingComments = ref(false)

// Forms
const newPost = ref({
  title: '',
  content: '',
  category: 'Matematika'
})
const newComment = ref('')
const submitting = ref(false)

// Edit states
const editingComment = ref(null)
const editCommentText = ref('')
const editingPost = ref(false)
const editPostData = ref({ title: '', content: '', category: '' })

// Like State (Client Side Persistence)
const likedPostIds = ref(new Set())

// Init User Likes
function initLikes() {
  const stored = localStorage.getItem(`forum_likes_${authStore.user?.id}`)
  if (stored) {
    likedPostIds.value = new Set(JSON.parse(stored))
  }
}

function saveLikes() {
  if (authStore.user?.id) {
    localStorage.setItem(`forum_likes_${authStore.user.id}`, JSON.stringify([...likedPostIds.value]))
  }
const reportTarget = ref(null) // { id, type }
const showReportModal = ref(false)
const reportReason = ref('')
const reportDescription = ref('')
const reportOptions = [
  'Spam atau iklan',
  'Kata-kata kasar/tidak sopan',
  'Informasi palsu',
  'Pelecehan atau bullying',
  'Lainnya'
]

// Open Report Modal
function openReport(target, type) {
  if (!authStore.user) return alert('Login untuk melaporkan')
  reportTarget.value = { ...target, type }
  reportReason.value = ''
  reportDescription.value = ''
  showReportModal.value = true
}

async function submitReport() {
  if (!reportReason.value) return alert('Pilih alasan pelaporan')
  
  try {
    const { error } = await supabase.from('reports').insert({
      reporter_id: authStore.user.id,
      target_type: reportTarget.value.type, // 'forum_post' or 'forum_comment'
      target_id: reportTarget.value.id,
      reason: reportReason.value,
      description: reportDescription.value,
      status: 'pending'
    })
    
    if (error) throw error
    alert('Laporan berhasil dikirim. Terima kasih telah membantu menjaga komunitas.')
    showReportModal.value = false
  } catch (err) {
    console.error('Report error:', err)
    alert('Gagal mengirim laporan')
  }
}

// Fetch all posts (Optimized with limit)
async function fetchPosts() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        id, title, content, category, tags, views, likes, is_pinned, created_at,
        user:users(id, name, avatar_url)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50) 

    if (error) throw error
    posts.value = data || []
    initLikes()
  } catch (err) {
    console.error('Error fetching posts:', err)
  } finally {
    loading.value = false
  }
}

// Create new post
async function createPost() {
  if (!newPost.value.title.trim() || !newPost.value.content.trim()) {
    alert('Judul dan konten harus diisi')
    return
  }
  
  submitting.value = true
  try {
    const { error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: authStore.user.id,
        title: newPost.value.title,
        content: newPost.value.content,
        category: newPost.value.category,
        tags: []
      })

    if (error) throw error
    
    newPost.value = { title: '', content: '', category: 'Matematika' }
    showPostModal.value = false
    await fetchPosts()
  } catch (err) {
    console.error('Error creating post:', err)
    alert('Gagal membuat post: ' + err.message)
  } finally {
    submitting.value = false
  }
}

// View post detail
async function viewPost(post) {
  selectedPost.value = post
  showDetailModal.value = true
  
  // Increment view count (Optimistic UI)
  post.views = (post.views || 0) + 1
  
  // Silent update
  await supabase
    .from('forum_posts')
    .update({ views: post.views })
    .eq('id', post.id)
  
  await fetchComments(post.id)
}

// Fetch comments for a post
async function fetchComments(postId) {
  loadingComments.value = true
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .select(`
        id, content, likes, created_at, parent_id, post_id, user_id,
        user:users(id, name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) throw error
    postComments.value = data || []
  } catch (err) {
    console.error('Error fetching comments:', err)
  } finally {
    loadingComments.value = false
  }
}

// Add comment
async function addComment() {
  if (!newComment.value.trim() || !selectedPost.value) return
  
  submitting.value = true
  try {
    const { error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: selectedPost.value.id,
        user_id: authStore.user.id,
        content: newComment.value
      })

    if (error) throw error
    
    newComment.value = ''
    await fetchComments(selectedPost.value.id)
  } catch (err) {
    console.error('Error adding comment:', err)
    alert('Gagal mengirim komentar')
  } finally {
    submitting.value = false
  }
}

// Toggle Like (Like/Unlike)
async function toggleLike(post, event) {
  if (event) event.stopPropagation()
  if (!authStore.user) {
    alert('Silakan login untuk menyukai postingan')
    return
  }

  const isLiked = likedPostIds.value.has(post.id)
  const newCount = (post.likes || 0) + (isLiked ? -1 : 1)
  
  // Optimistic Update
  post.likes = newCount < 0 ? 0 : newCount
  if (isLiked) {
    likedPostIds.value.delete(post.id)
  } else {
    likedPostIds.value.add(post.id)
  }
  saveLikes()

  // DB Update
  try {
    await supabase
      .from('forum_posts')
      .update({ likes: post.likes })
      .eq('id', post.id)
  } catch (err) {
    console.error('Error updating like:', err)
  }
}

// Delete post (own posts only)
async function deletePost(post) {
  if (post.user?.id !== authStore.user?.id) return
  if (!confirm('Hapus post ini?')) return
  
  try {
    await supabase.from('forum_comments').delete().eq('post_id', post.id)
    await supabase.from('forum_posts').delete().eq('id', post.id)
    showDetailModal.value = false
    await fetchPosts()
  } catch (err) { console.error(err) }
}

// Edit comment functions
function startEditComment(comment) {
  editingComment.value = comment.id
  editCommentText.value = comment.content
}

function cancelEditComment() {
  editingComment.value = null
  editCommentText.value = ''
}

async function saveEditComment(comment) {
  if (!editCommentText.value.trim()) return
  
  try {
    const { error } = await supabase
      .from('forum_comments')
      .update({ content: editCommentText.value, updated_at: new Date().toISOString() })
      .eq('id', comment.id)

    if (error) throw error
    
    comment.content = editCommentText.value
    cancelEditComment()
  } catch (err) {
    console.error('Error editing comment:', err)
    alert('Gagal mengedit komentar')
  }
}

// Delete comment
async function deleteComment(comment) {
  if (!confirm('Hapus komentar ini?')) return
  
  try {
    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', comment.id)

    if (error) throw error
    postComments.value = postComments.value.filter(c => c.id !== comment.id)
  } catch (err) {
    console.error('Error deleting comment:', err)
    alert('Gagal menghapus komentar')
  }
}

// Edit post functions
function startEditPost() {
  editingPost.value = true
  editPostData.value = {
    title: selectedPost.value.title,
    content: selectedPost.value.content,
    category: selectedPost.value.category
  }
}

function cancelEditPost() {
  editingPost.value = false
  editPostData.value = { title: '', content: '', category: '' }
}

async function saveEditPost() {
  if (!editPostData.value.title.trim() || !editPostData.value.content.trim()) {
    alert('Judul dan konten harus diisi')
    return
  }
  
  submitting.value = true
  try {
    const { error } = await supabase
      .from('forum_posts')
      .update({
        title: editPostData.value.title,
        content: editPostData.value.content,
        category: editPostData.value.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedPost.value.id)

    if (error) throw error
    
    selectedPost.value.title = editPostData.value.title
    selectedPost.value.content = editPostData.value.content
    selectedPost.value.category = editPostData.value.category
    
    cancelEditPost()
    await fetchPosts()
  } catch (err) {
    console.error('Error editing post:', err)
    alert('Gagal mengedit post')
  } finally {
    submitting.value = false
  }
}

// Filtered posts
const filteredPosts = computed(() => {
  let result = [...posts.value]
  
  if (selectedCategory.value) {
    result = result.filter(p => p.category === selectedCategory.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.content.toLowerCase().includes(q)
    )
  }
  
  if (sortBy.value === 'popular') {
    result.sort((a, b) => (b.likes || 0) - (a.likes || 0))
  } else if (sortBy.value === 'views') {
    result.sort((a, b) => (b.views || 0) - (a.views || 0))
  }
  
  return result
})

// Helpers
function formatDate(date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Baru saja'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm lalu'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'j lalu'
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'h lalu'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const isLoggedIn = computed(() => !!authStore.user)

onMounted(async () => {
  await loadCategories()
  await fetchPosts()
})
</script>

<template>
  <div class="forum-page">
    <Navbar />
    
    <div class="content-container">
      <!-- Header -->
      <div class="header-section">
        <h1>Forum Diskusi</h1>
        <p>Tempat berbagi ilmu dan diskusi sesama pelajar Mariles</p>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <!-- Search -->
        <div class="search-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Cari topik..." 
            class="search-input"
          >
        </div>
        
        <!-- Category Dropdown (Mobile/Desktop friendly) -->
        <div class="category-dropdown-wrapper">
           <select v-model="selectedCategory" class="category-select">
              <option value="">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
           </select>
        </div>

        <button v-if="isLoggedIn" class="btn-primary" @click="showPostModal = true">
          <span class="plus-icon">+</span>
          Buat Diskusi
        </button>
      </div>

      <!-- Quick Categories Chips (Scrollable) -->
      <div class="filter-bar">
        <div class="categories-scroll">
          <button 
            :class="['filter-chip', { active: selectedCategory === '' }]"
            @click="selectedCategory = ''"
          >Semua</button>
          <button 
            v-for="cat in categories" 
            :key="cat"
            :class="['filter-chip', { active: selectedCategory === cat }]"
            @click="selectedCategory = cat"
          >{{ cat }}</button>
        </div>
      </div>

      <!-- Post List -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat diskusi...</p>
      </div>

      <div v-else-if="filteredPosts.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>Belum Ada Diskusi</h3>
        <p>Jadilah yang pertama memulai diskusi topik ini!</p>
      </div>

      <div v-else class="post-stack">
        <div 
          v-for="post in filteredPosts" 
          :key="post.id" 
          class="post-card"
          @click="viewPost(post)"
        >
           <!-- Vote Sidebar (Desktop) or Footer (Mobile) -->
           <div class="vote-section">
              <button 
                class="btn-vote" 
                :class="{ 'liked': likedPostIds.has(post.id) }"
                @click.stop="toggleLike(post)"
              >
                  <svg viewBox="0 0 24 24" fill="currentColor" class="heart-icon">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span class="like-count">{{ post.likes || 0 }}</span>
              </button>
           </div>

           <div class="post-main">
              <div class="post-header-row">
                 <div class="user-row">
                    <img v-if="post.user?.avatar_url" :src="post.user.avatar_url" class="post-avatar">
                    <div v-else class="post-avatar-placeholder">{{ getInitials(post.user?.name) }}</div>
                    <span class="post-author">{{ post.user?.name }}</span>
                    <span class="post-dot">•</span>
                    <span class="post-time">{{ formatDate(post.created_at) }}</span>
                 </div>
                 <span class="category-badge">{{ post.category }}</span>
              </div>
              
              <h3 class="post-title">{{ post.title }}</h3>
              <p class="post-snippet">{{ post.content.substring(0, 160) }}{{ post.content.length > 160 ? '...' : '' }}</p>
              
              <div class="post-footer-row">
                 <div class="footer-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {{ post.views || 0 }}
                 </div>
                 <div class="footer-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    {{ 0 }} <!-- Comments count placeholder -->
                 </div>
                 <!-- Report Button Post -->
                  <div class="footer-item" @click.stop="openReport(post, 'forum_post')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                    Lapor
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Modals (Simplified for brevity, assuming standard modal structure) -->
    <div v-if="showPostModal" class="modal-overlay" @click.self="showPostModal = false">
       <div class="modal">
          <h3>Buat Diskusi Baru</h3>
          <form @submit.prevent="createPost" class="modal-form">
             <input v-model="newPost.title" placeholder="Judul" required class="input-field">
             <select v-model="newPost.category" class="input-field">
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
             </select>
             <textarea v-model="newPost.content" placeholder="Isi diskusi..." rows="5" required class="input-field"></textarea>
             <div class="modal-actions">
                <button type="button" @click="showPostModal = false" class="btn-cancel">Batal</button>
                <button type="submit" class="btn-primary">Posting</button>
             </div>
          </form>
       </div>
    </div>
    
    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedPost" class="modal-overlay" @click.self="showDetailModal = false">
       <div class="modal detail-modal">
          <div class="modal-header-simple">
             <div class="user-row large">
                <div class="post-avatar-placeholder">{{ getInitials(selectedPost.user?.name) }}</div>
                <div>
                   <div class="author-name">{{ selectedPost.user?.name }}</div>
                   <div class="post-time">{{ formatDate(selectedPost.created_at) }}</div>
                </div>
             </div>
             <button class="close-btn" @click="showDetailModal = false">&times;</button>
          </div>
          
          <h2 class="detail-title">{{ selectedPost.title }}</h2>
          <div class="detail-body">{{ selectedPost.content }}</div>
          
          <div class="detail-actions">
              <button 
                class="btn-vote-large" 
                :class="{ 'liked': likedPostIds.has(selectedPost.id) }"
                @click="toggleLike(selectedPost)"
              >
                  <svg viewBox="0 0 24 24" fill="currentColor" class="heart-icon">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span>{{ selectedPost.likes || 0 }} Suka</span>
              </button>
          </div>

          <!-- Comments -->
          <div class="comments-section">
             <h4>Komentar ({{ postComments.length }})</h4>
             <div v-if="isLoggedIn" class="comment-input-box">
                <input v-model="newComment" placeholder="Tulis komentar..." @keyup.enter="addComment">
                <button @click="addComment">Kirim</button>
             </div>
             
             <div class="comments-list-simple">
                <div v-for="c in postComments" :key="c.id" class="comment-simple">
                   
                   <!-- Normal View -->
                   <div v-if="editingComment !== c.id" class="comment-view-mode">
                      <div class="comment-main">
                         <div class="comment-header">
                            <span class="comment-author">{{ c.user?.name }}</span>
                            <span class="comment-time">{{ formatDate(c.created_at) }}</span>
                         </div>
                         <div class="comment-text">{{ c.content }}</div>
                      </div>
                      
                      <!-- Actions (Right Aligned) -->
                      <div v-if="authStore.user?.id === c.user_id" class="comment-actions">
                         <button @click="startEditComment(c)" class="btn-action edit" title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                         </button>
                         <button @click="deleteComment(c)" class="btn-action delete" title="Hapus">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                         </button>
                      </div>
                   </div>

                   <!-- Edit View -->
                   <div v-else class="comment-edit-mode">
                      <input v-model="editCommentText" class="edit-comment-input" @keyup.enter="saveEditComment(c)">
                      <div class="edit-actions-row">
                         <button @click="cancelEditComment" class="btn-mini secondary">Batal</button>
                         <button @click="saveEditComment(c)" class="btn-mini primary">Simpan</button>
                      </div>
                   </div>

                </div>
             </div>
          </div>
       </div>
       </div>
    </div>

    <!-- Report Modal -->
    <div v-if="showReportModal" class="modal-overlay" @click.self="showReportModal = false">
      <div class="modal">
        <h3>Laporkan Konten</h3>
        <p class="section-subtitle">Mengapa Anda melaporkan konten ini?</p>
        
        <div class="report-form">
          <label v-for="opt in reportOptions" :key="opt" class="radio-label">
            <input type="radio" v-model="reportReason" :value="opt">
            {{ opt }}
          </label>
          
          <textarea 
            v-if="reportReason === 'Lainnya'"
            v-model="reportDescription" 
            placeholder="Jelaskan detail pelanggaran..." 
            rows="3" 
            class="input-field mt-2"
          ></textarea>
          
          <div class="modal-actions">
             <button @click="showReportModal = false" class="btn-cancel">Batal</button>
             <button @click="submitReport" class="btn-primary danger">Kirim Laporan</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Base Layout */
.forum-page {
  min-height: 100vh;
  background-color: #F8FAFC;
  padding-bottom: 40px;
}
.radio-label { display: flex; gap: 8px; padding: 8px 0; cursor: pointer; color: #475569; }
.btn-primary.danger { background-color: #EF4444; }
.btn-primary.danger:hover { background-color: #DC2626; }
.btn-action.flag { color: #94A3B8; }
.btn-action.flag:hover { color: #F59E0B; background:#FFF7ED; }
.mt-2 { margin-top: 8px; }

.content-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 100px 20px 20px;
}

/* Header */
.header-section {
  text-align: center;
  margin-bottom: 32px;
}

.header-section h1 {
  font-size: 28px;
  font-weight: 800;
  color: #1E293B;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.header-section p {
  color: #64748B;
  font-size: 15px;
}

/* Action Bar */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05); /* Soft shadow */
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-wrapper {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  background: #F1F5F9;
  border-radius: 8px;
  padding: 0 12px;
}

.search-icon {
  width: 18px;
  height: 18px;
  color: #94A3B8;
  margin-right: 8px;
}

.search-input {
  width: 100%;
  padding: 10px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #334155;
}
.search-input:focus { outline: none; }

.category-dropdown-wrapper {
  flex-shrink: 0;
  min-width: 180px;
}

.category-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  background: white;
  color: #334155;
  font-size: 14px;
  cursor: pointer;
}
.category-select:focus { outline: none; border-color: #0F172A; }

.btn-primary {
  background-color: #0F172A;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.btn-primary:hover { background-color: #1E293B; }
.plus-icon { font-size: 18px; font-weight: 300; line-height: 1; }

/* Filter Bar (Horizontal Chips) */
.filter-bar {
  margin-bottom: 24px;
  overflow: hidden;
}

.categories-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -ms-overflow-style: none; /* Hide scrollbar IE/Edge */
  scrollbar-width: none; /* Hide scrollbar Firefox */
}
.categories-scroll::-webkit-scrollbar { display: none; /* Hide scrollbar Chrome */ }

.filter-chip {
  padding: 6px 14px;
  border-radius: 20px;
  background: white;
  border: 1px solid #E2E8F0;
  color: #64748B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.filter-chip.active {
  background: #0F172A;
  color: white;
  border-color: #0F172A;
}
.filter-chip:hover:not(.active) { background: #F1F5F9; }

/* POST STACK - NEW LAYOUT */
.post-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #F1F5F9;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  cursor: pointer;
  display: flex; /* Horizontal Layout: Vote | Content */
  gap: 16px;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: #E2E8F0;
}

/* Vote Section (Left Side) */
.vote-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.btn-vote {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  color: #94A3B8; /* Default Grey */
  transition: transform 0.1s;
}

.btn-vote:hover {
  color: #64748B;
  transform: scale(1.1);
}

.btn-vote.liked {
  color: #EF4444; /* Red when liked */
}

.heart-icon {
  width: 24px;
  height: 24px;
}

.like-count {
  font-size: 13px;
  font-weight: 600;
}

/* Post Content (Right Side) */
.post-main {
  flex: 1;
  min-width: 0;
}

.post-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.post-avatar, .post-avatar-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}
.post-avatar-placeholder {
  background: #CBD5E1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.post-author { font-weight: 600; color: #334155; }
.post-dot { color: #CBD5E1; }
.post-time { color: #94A3B8; font-size: 12px; }

.category-badge {
  background: #F1F5F9;
  color: #64748B;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.post-title {
  font-size: 16px;
  font-weight: 700;
  color: #1E293B;
  margin: 0 0 6px 0;
  line-height: 1.4;
}

.post-snippet {
  font-size: 14px;
  color: #64748B;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.post-footer-row {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #94A3B8;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.footer-item .icon { width: 14px; height: 14px; }


/* Simplified Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

.input-field {
  width: 100%;
  padding: 12px;
  border: 1px solid #E2E8F0;
  background: #F8FAFC;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}
.input-field:focus { outline-color: #0F172A; background: white; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.btn-cancel {
  background: #F1F5F9;
  color: #475569;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* Detail Modal Specifics */
.detail-modal { max-width: 700px; }

.modal-header-simple {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #F1F5F9;
  padding-bottom: 16px;
}

.user-row.large .post-avatar-placeholder { width: 40px; height: 40px; font-size: 14px; }
.user-row.large .author-name { font-weight: 700; font-size: 16px; color: #1E293B; }

.detail-title { font-size: 24px; margin-bottom: 16px; color: #1E293B; }
.detail-body { font-size: 16px; line-height: 1.7; color: #334155; margin-bottom: 24px; white-space: pre-wrap; }

.detail-actions {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.btn-vote-large {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 32px;
  border-radius: 50px;
  border: 2px solid #E2E8F0;
  background: white;
  color: #64748B;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-vote-large:hover { border-color: #CBD5E1; }
.btn-vote-large.liked {
  border-color: #FECACA;
  background: #FEF2F2;
  color: #EF4444;
}

/* Comments Section */
.comments-section h4 { margin: 0 0 12px 0; color: #1E293B; }

.comment-input-box {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.comment-input-box input {
  flex: 1;
  padding: 10px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
}
.comment-input-box button {
  background: #0F172A;
  color: white;
  border: none;
  padding: 0 20px;
  border-radius: 8px;
  cursor: pointer;
}

.comment-simple {
  padding: 12px;
  background: #F8FAFC;
  border-radius: 8px;
  margin-bottom: 8px;
}

.comment-view-mode {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.comment-main { flex: 1; }

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-author { font-weight: 600; font-size: 13px; color: #334155; }
.comment-time { font-size: 10px; color: #94A3B8; }
.comment-text { font-size: 14px; color: #475569; line-height: 1.4; }

.comment-actions {
  display: flex;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}
.comment-actions:hover { opacity: 1; }

.btn-action {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-action:hover { background: #E2E8F0; color: #334155; }
.btn-action.delete:hover { background: #FEE2E2; color: #EF4444; }
.btn-action svg { width: 14px; height: 14px; }

/* Edit Mode Styles */
.comment-edit-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edit-comment-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  font-size: 14px;
}
.edit-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-mini {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.btn-mini.secondary { background: #F1F5F9; color: #64748B; }
.btn-mini.primary { background: #0F172A; color: white; }

/* Mobile */
@media (max-width: 640px) {
  .post-card { flex-direction: column; }
  .vote-section { 
    flex-direction: row; 
    border-right: none; 
    border-bottom: 1px solid #F1F5F9;
    width: 100%;
    padding-bottom: 8px;
    margin-bottom: 8px;
    justify-content: flex-start;
    gap: 8px;
  }
  .btn-vote { flex-direction: row; }
  .action-bar { flex-direction: column; align-items: stretch; }
  .category-dropdown-wrapper { width: 100%; }
}
</style>
