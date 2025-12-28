<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/Navbar.vue'

const authStore = useAuthStore()

// State
const loading = ref(true)
const posts = ref([])
const categories = ref(['Umum', 'Matematika', 'Bahasa', 'Sains', 'Seni', 'Teknologi', 'Lainnya'])
const selectedCategory = ref('')
const searchQuery = ref('')
const sortBy = ref('newest')

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
  category: 'Umum'
})
const newComment = ref('')
const submitting = ref(false)

// Fetch all posts
async function fetchPosts() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        id,
        title,
        content,
        category,
        tags,
        views,
        likes,
        is_pinned,
        created_at,
        user:users(id, name, avatar_url)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    posts.value = data || []
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
    
    newPost.value = { title: '', content: '', category: 'Umum' }
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
  
  // Increment view count
  await supabase
    .from('forum_posts')
    .update({ views: (post.views || 0) + 1 })
    .eq('id', post.id)
  
  post.views = (post.views || 0) + 1
  await fetchComments(post.id)
}

// Fetch comments for a post
async function fetchComments(postId) {
  loadingComments.value = true
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .select(`
        id,
        content,
        likes,
        created_at,
        parent_id,
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

// Like post
async function likePost(post) {
  try {
    await supabase
      .from('forum_posts')
      .update({ likes: (post.likes || 0) + 1 })
      .eq('id', post.id)
    
    post.likes = (post.likes || 0) + 1
  } catch (err) {
    console.error('Error liking post:', err)
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
  } catch (err) {
    console.error('Error deleting post:', err)
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
  if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' jam lalu'
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' hari lalu'
  
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const isLoggedIn = computed(() => !!authStore.user)

onMounted(fetchPosts)
</script>

<template>
  <div class="forum-page">
    <Navbar />
    
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Forum Diskusi</h1>
        <p class="header-subtitle">Tempat berbagi pengetahuan dan berdiskusi dengan sesama pelajar</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="forum-content">
      <div class="forum-layout">
        <!-- Sidebar -->
        <aside class="forum-sidebar">
          <button v-if="isLoggedIn" class="btn btn-primary btn-block" @click="showPostModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat Diskusi Baru
          </button>
          <router-link v-else to="/login" class="btn btn-primary btn-block">
            Login untuk Berdiskusi
          </router-link>

          <div class="filter-section">
            <h4>Kategori</h4>
            <div class="category-list">
              <button 
                :class="{ active: selectedCategory === '' }" 
                @click="selectedCategory = ''"
              >Semua</button>
              <button 
                v-for="cat in categories" 
                :key="cat" 
                :class="{ active: selectedCategory === cat }"
                @click="selectedCategory = cat"
              >{{ cat }}</button>
            </div>
          </div>

          <div class="filter-section">
            <h4>Urutkan</h4>
            <select v-model="sortBy" class="sort-select">
              <option value="newest">Terbaru</option>
              <option value="popular">Terpopuler</option>
              <option value="views">Paling Dilihat</option>
            </select>
          </div>
        </aside>

        <!-- Posts List -->
        <div class="posts-container">
          <div class="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Cari diskusi...">
          </div>

          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Memuat diskusi...</p>
          </div>

          <div v-else-if="!filteredPosts.length" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>Belum Ada Diskusi</h3>
            <p>{{ searchQuery ? 'Coba kata kunci lain' : 'Jadilah yang pertama memulai diskusi!' }}</p>
          </div>

          <div v-else class="posts-list">
            <div 
              v-for="post in filteredPosts" 
              :key="post.id" 
              class="post-card"
              :class="{ pinned: post.is_pinned }"
              @click="viewPost(post)"
            >
              <div class="post-avatar">
                <img v-if="post.user?.avatar_url" :src="post.user.avatar_url" :alt="post.user?.name">
                <span v-else class="avatar-placeholder">{{ getInitials(post.user?.name) }}</span>
              </div>
              <div class="post-content">
                <div class="post-meta">
                  <span class="author">{{ post.user?.name || 'Anonim' }}</span>
                  <span class="dot">•</span>
                  <span class="date">{{ formatDate(post.created_at) }}</span>
                  <span v-if="post.is_pinned" class="pinned-badge">📌 Disematkan</span>
                </div>
                <h3 class="post-title">{{ post.title }}</h3>
                <p class="post-excerpt">{{ post.content.slice(0, 150) }}{{ post.content.length > 150 ? '...' : '' }}</p>
                <div class="post-footer">
                  <span class="category-tag">{{ post.category }}</span>
                  <div class="post-stats">
                    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {{ post.views || 0 }}</span>
                    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> {{ post.likes || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Post Modal -->
    <div v-if="showPostModal" class="modal-overlay" @click.self="showPostModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Buat Diskusi Baru</h2>
          <button class="close-btn" @click="showPostModal = false">&times;</button>
        </div>
        <form @submit.prevent="createPost" class="modal-body">
          <div class="form-group">
            <label>Judul *</label>
            <input v-model="newPost.title" type="text" placeholder="Judul diskusi Anda..." required>
          </div>
          <div class="form-group">
            <label>Kategori</label>
            <select v-model="newPost.category">
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Konten *</label>
            <textarea v-model="newPost.content" rows="6" placeholder="Tulis pertanyaan atau diskusi Anda..." required></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showPostModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Memposting...' : 'Posting' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Post Detail Modal -->
    <div v-if="showDetailModal && selectedPost" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal detail-modal">
        <div class="modal-header">
          <div class="header-info">
            <span class="category-tag">{{ selectedPost.category }}</span>
            <span class="date">{{ formatDate(selectedPost.created_at) }}</span>
          </div>
          <button class="close-btn" @click="showDetailModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <h2 class="detail-title">{{ selectedPost.title }}</h2>
          <div class="author-info">
            <div class="author-avatar">
              <img v-if="selectedPost.user?.avatar_url" :src="selectedPost.user.avatar_url">
              <span v-else>{{ getInitials(selectedPost.user?.name) }}</span>
            </div>
            <span class="author-name">{{ selectedPost.user?.name || 'Anonim' }}</span>
          </div>
          <div class="detail-content">{{ selectedPost.content }}</div>
          
          <div class="detail-actions">
            <button class="action-btn" @click="likePost(selectedPost)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              {{ selectedPost.likes || 0 }} Suka
            </button>
            <span class="views">{{ selectedPost.views || 0 }} dilihat</span>
            <button v-if="selectedPost.user?.id === authStore.user?.id" class="action-btn delete" @click="deletePost(selectedPost)">
              Hapus
            </button>
          </div>

          <!-- Comments Section -->
          <div class="comments-section">
            <h3>Komentar ({{ postComments.length }})</h3>
            
            <form v-if="isLoggedIn" @submit.prevent="addComment" class="comment-form">
              <textarea v-model="newComment" rows="2" placeholder="Tulis komentar..."></textarea>
              <button type="submit" class="btn btn-primary btn-sm" :disabled="submitting || !newComment.trim()">
                Kirim
              </button>
            </form>

            <div v-if="loadingComments" class="loading-comments">
              <div class="spinner-sm"></div>
            </div>

            <div v-else-if="!postComments.length" class="no-comments">
              Belum ada komentar. Jadilah yang pertama!
            </div>

            <div v-else class="comments-list">
              <div v-for="comment in postComments" :key="comment.id" class="comment-item">
                <div class="comment-avatar">
                  <img v-if="comment.user?.avatar_url" :src="comment.user.avatar_url">
                  <span v-else>{{ getInitials(comment.user?.name) }}</span>
                </div>
                <div class="comment-content">
                  <div class="comment-header">
                    <span class="name">{{ comment.user?.name || 'Anonim' }}</span>
                    <span class="time">{{ formatDate(comment.created_at) }}</span>
                  </div>
                  <p>{{ comment.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forum-page { min-height: 100vh; background: #f8fafc; padding-top: 64px; }

.page-header { background: linear-gradient(135deg, #0d5782, #0a4568); padding: 40px 24px; color: white; text-align: center; }
.header-content h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px; }
.header-subtitle { opacity: 0.9; font-size: 16px; margin: 0; }

.forum-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
.forum-layout { display: grid; grid-template-columns: 260px 1fr; gap: 24px; }

.forum-sidebar { background: white; border-radius: 16px; padding: 20px; height: fit-content; position: sticky; top: 88px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; text-decoration: none; }
.btn svg { width: 18px; height: 18px; }
.btn-primary { background: linear-gradient(135deg, #0d5782, #0a4568); color: white; }
.btn-secondary { background: #f1f5f9; color: #475569; }
.btn-block { width: 100%; }
.btn-sm { padding: 8px 16px; font-size: 13px; }

.filter-section { margin-top: 24px; }
.filter-section h4 { font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase; }
.category-list { display: flex; flex-wrap: wrap; gap: 8px; }
.category-list button { padding: 6px 12px; background: #f1f5f9; border: none; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.category-list button:hover, .category-list button.active { background: #0d5782; color: white; }
.sort-select { width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 14px; }

.posts-container { }
.search-bar { display: flex; align-items: center; gap: 12px; background: white; padding: 14px 18px; border-radius: 14px; margin-bottom: 20px; }
.search-bar svg { width: 20px; height: 20px; color: #94a3b8; }
.search-bar input { flex: 1; border: none; outline: none; font-size: 15px; }

.loading-state, .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d5782; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state svg { width: 64px; height: 64px; color: #cbd5e1; margin-bottom: 16px; }

.posts-list { display: flex; flex-direction: column; gap: 16px; }
.post-card { display: flex; gap: 16px; background: white; padding: 20px; border-radius: 16px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; }
.post-card:hover { border-color: #0d5782; transform: translateY(-2px); }
.post-card.pinned { background: #fffbeb; border-color: #fcd34d; }
.post-avatar { width: 48px; height: 48px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: #e2e8f0; }
.post-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #0d5782; color: white; font-weight: 600; }
.post-content { flex: 1; min-width: 0; }
.post-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; margin-bottom: 8px; }
.author { font-weight: 600; color: #475569; }
.pinned-badge { background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
.post-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #1e293b; }
.post-excerpt { font-size: 14px; color: #64748b; margin: 0 0 12px; line-height: 1.5; }
.post-footer { display: flex; justify-content: space-between; align-items: center; }
.category-tag { background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.post-stats { display: flex; gap: 16px; font-size: 13px; color: #64748b; }
.post-stats span { display: flex; align-items: center; gap: 4px; }
.post-stats svg { width: 16px; height: 16px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; overflow-y: auto; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.detail-modal { max-width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; z-index: 1; }
.modal-header h2 { font-size: 20px; font-weight: 700; margin: 0; }
.header-info { display: flex; gap: 12px; align-items: center; }
.close-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f1f5f9; font-size: 24px; cursor: pointer; }
.modal-body { padding: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #0d5782; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }

.detail-title { font-size: 24px; font-weight: 700; margin: 0 0 16px; }
.author-info { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.author-avatar { width: 40px; height: 40px; border-radius: 10px; overflow: hidden; background: #0d5782; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
.author-avatar img { width: 100%; height: 100%; object-fit: cover; }
.author-name { font-weight: 600; }
.detail-content { font-size: 15px; line-height: 1.7; color: #475569; padding: 20px; background: #f8fafc; border-radius: 12px; margin-bottom: 20px; white-space: pre-wrap; }
.detail-actions { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 10px; font-size: 14px; cursor: pointer; }
.action-btn:hover { background: #e2e8f0; }
.action-btn.delete { color: #dc2626; }
.action-btn svg { width: 18px; height: 18px; }
.views { font-size: 14px; color: #64748b; }

.comments-section { border-top: 1px solid #e2e8f0; padding-top: 24px; }
.comments-section h3 { font-size: 16px; font-weight: 700; margin: 0 0 16px; }
.comment-form { display: flex; gap: 12px; margin-bottom: 20px; }
.comment-form textarea { flex: 1; padding: 12px; border: 2px solid #e2e8f0; border-radius: 12px; resize: none; font-size: 14px; }
.comment-form textarea:focus { outline: none; border-color: #0d5782; }
.loading-comments { text-align: center; padding: 20px; }
.spinner-sm { width: 24px; height: 24px; border: 2px solid #e2e8f0; border-top-color: #0d5782; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
.no-comments { text-align: center; color: #94a3b8; padding: 24px; background: #f8fafc; border-radius: 12px; }
.comments-list { display: flex; flex-direction: column; gap: 16px; }
.comment-item { display: flex; gap: 12px; }
.comment-avatar { width: 36px; height: 36px; border-radius: 10px; overflow: hidden; background: #64748b; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; flex-shrink: 0; }
.comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-content { flex: 1; background: #f8fafc; padding: 12px 16px; border-radius: 12px; }
.comment-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.comment-header .name { font-weight: 600; font-size: 14px; }
.comment-header .time { font-size: 12px; color: #94a3b8; }
.comment-content p { margin: 0; font-size: 14px; line-height: 1.5; }

@media (max-width: 768px) {
  .forum-layout { grid-template-columns: 1fr; }
  .forum-sidebar { position: static; }
  .post-card { flex-direction: column; gap: 12px; }
  .post-avatar { width: 40px; height: 40px; }
}
</style>
