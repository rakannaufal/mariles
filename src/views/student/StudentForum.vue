<script setup>
import Navbar from '@/components/Navbar.vue'
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
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Fitur Segera Hadir</h3>
        <p>Forum diskusi sedang dalam pengembangan. Nantikan update selanjutnya!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: var(--background);
  padding-top: 64px;
}

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
  margin: 0 0 8px 0;
}

.header-subtitle {
  opacity: 0.9;
  font-size: 15px;
  margin: 0;
}

.forum-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 24px;
  display: flex;
  justify-content: center;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  max-width: 400px;
  width: 100%;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
  color: var(--primary);
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

.empty-state p {
  color: var(--text-secondary);
}
</style>

// UI State
const showNewPostModal = ref(false)
const selectedPost = ref(null)
const newPostTitle = ref('')
const newPostContent = ref('')
const newPostCategory = ref('Umum')
const newPostImage = ref(null)
const newPostImagePreview = ref(null)
const newCommentText = ref('')

// Handle new post image upload
function handleImageUpload(event) {
  const file = event.target.files[0]
  if (file) {
    newPostImage.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      newPostImagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

function removeImage() {
  newPostImage.value = null
  newPostImagePreview.value = null
}

// Submit new post
function submitPost() {
  if (!newPostTitle.value.trim() || !newPostContent.value.trim()) return
  
  addPost({
    title: newPostTitle.value.trim(),
    content: newPostContent.value.trim(),
    category: newPostCategory.value,
    image_url: newPostImagePreview.value
  })
  
  // Reset form
  newPostTitle.value = ''
  newPostContent.value = ''
  newPostCategory.value = 'Umum'
  newPostImage.value = null
  newPostImagePreview.value = null
  showNewPostModal.value = false
}

// Submit comment
function submitComment() {
  if (!selectedPost.value || !newCommentText.value.trim()) return
  
  addComment(selectedPost.value.id, newCommentText.value.trim())
  newCommentText.value = ''
}

// Format date
function formatDate(date) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 7) return `${diffDays} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function openPost(post) {
  selectedPost.value = post
}

function closePost() {
  selectedPost.value = null
  newCommentText.value = ''
}

function handleLike(postId) {
  toggleLike(postId)
}
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
      <!-- Sidebar -->
      <aside class="forum-sidebar">
        <!-- Search -->
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Cari diskusi...">
        </div>

        <!-- Categories -->
        <div class="categories">
          <h3>Kategori</h3>
          <button 
            v-for="cat in forumCategories" 
            :key="cat"
            class="category-btn"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <!-- New Post Button -->
        <button class="new-post-btn" @click="showNewPostModal = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Buat Diskusi Baru
        </button>
      </aside>

      <!-- Posts List -->
      <main class="posts-container">
        <div v-if="filteredPosts.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <h3>Belum ada diskusi</h3>
          <p>Jadilah yang pertama memulai diskusi!</p>
        </div>

        <div v-else class="posts-list">
          <article 
            v-for="post in filteredPosts" 
            :key="post.id" 
            class="post-card"
            @click="openPost(post)"
          >
            <div class="post-header">
              <div class="author-avatar">
                <img v-if="post.author.avatar_url" :src="post.author.avatar_url" :alt="post.author.name">
                <span v-else>{{ post.author.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="author-info">
                <span class="author-name">{{ post.author.name }}</span>
                <span class="post-time">{{ formatDate(post.created_at) }}</span>
              </div>
              <span class="post-category">{{ post.category }}</span>
            </div>

            <h2 class="post-title">{{ post.title }}</h2>
            <p class="post-content">{{ post.content }}</p>

            <img v-if="post.image_url" :src="post.image_url" alt="Post image" class="post-image">

            <div class="post-footer">
              <button class="action-btn" @click.stop="handleLike(post.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{{ post.likes }}</span>
              </button>
              <button class="action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>{{ post.comments_count }}</span>
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>

    <!-- New Post Modal -->
    <Teleport to="body">
      <div v-if="showNewPostModal" class="modal-overlay" @click.self="showNewPostModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>Buat Diskusi Baru</h2>
            <button class="close-btn" @click="showNewPostModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>Judul</label>
              <input v-model="newPostTitle" type="text" placeholder="Tulis judul diskusi...">
            </div>

            <div class="form-group">
              <label>Kategori</label>
              <select v-model="newPostCategory">
                <option v-for="cat in forumCategories.filter(c => c !== 'Semua')" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Isi Diskusi</label>
              <textarea v-model="newPostContent" placeholder="Tulis isi diskusi..." rows="5"></textarea>
            </div>

            <div class="form-group">
              <label>Gambar (Opsional)</label>
              <div v-if="newPostImagePreview" class="image-preview">
                <img :src="newPostImagePreview" alt="Preview">
                <button class="remove-image" @click="removeImage">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <label v-else class="upload-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Upload Gambar</span>
                <input type="file" accept="image/*" @change="handleImageUpload" hidden>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="showNewPostModal = false">Batal</button>
            <button class="btn-primary" @click="submitPost" :disabled="!newPostTitle.trim() || !newPostContent.trim()">
              Posting
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Post Detail Modal -->
    <Teleport to="body">
      <div v-if="selectedPost" class="modal-overlay" @click.self="closePost">
        <div class="modal post-detail-modal">
          <div class="modal-header">
            <h2>Diskusi</h2>
            <button class="close-btn" @click="closePost">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body post-detail-body">
            <div class="post-header">
              <div class="author-avatar">
                <img v-if="selectedPost.author.avatar_url" :src="selectedPost.author.avatar_url" :alt="selectedPost.author.name">
                <span v-else>{{ selectedPost.author.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="author-info">
                <span class="author-name">{{ selectedPost.author.name }}</span>
                <span class="post-time">{{ formatDate(selectedPost.created_at) }}</span>
              </div>
              <span class="post-category">{{ selectedPost.category }}</span>
            </div>

            <h2 class="post-title">{{ selectedPost.title }}</h2>
            <p class="post-content-full">{{ selectedPost.content }}</p>

            <img v-if="selectedPost.image_url" :src="selectedPost.image_url" alt="Post image" class="post-image-full">

            <div class="post-footer">
              <button class="action-btn" @click="handleLike(selectedPost.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>{{ selectedPost.likes }}</span>
              </button>
              <button class="action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>{{ selectedPost.comments.length }} Komentar</span>
              </button>
            </div>

            <!-- Comments Section -->
            <div class="comments-section">
              <h3>Komentar</h3>
              
              <div v-if="selectedPost.comments.length === 0" class="no-comments">
                <p>Belum ada komentar. Jadilah yang pertama berkomentar!</p>
              </div>

              <div v-else class="comments-list">
                <div v-for="comment in selectedPost.comments" :key="comment.id" class="comment">
                  <div class="comment-avatar">
                    <img v-if="comment.author.avatar_url" :src="comment.author.avatar_url" :alt="comment.author.name">
                    <span v-else>{{ comment.author.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div class="comment-content">
                    <div class="comment-header">
                      <span class="comment-author">{{ comment.author.name }}</span>
                      <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
                    </div>
                    <p>{{ comment.content }}</p>
                  </div>
                </div>
              </div>

              <!-- New Comment Input -->
              <div class="new-comment">
                <input 
                  v-model="newCommentText" 
                  type="text" 
                  placeholder="Tulis komentar..."
                  @keyup.enter="submitComment"
                >
                <button class="send-btn" :disabled="!newCommentText.trim()" @click="submitComment">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: var(--background);
  padding-top: 64px;
}

/* Page Header */
.page-header {
  background:var(--primary);
  padding: 32px 24px;
  color: white;
  text-align: center;
}
.page-header h1{
    color:#fff  ;
 }
.header-content {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.title-icon-wrapper {
  width: 52px;
  height: 52px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.2);
}

.title-icon {
  width: 26px;
  height: 26px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.header-subtitle {
  opacity: 0.9;
  font-size: 15px;
  margin: 0;
}

/* Forum Content */
.forum-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}

/* Sidebar */
.forum-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.search-box svg {
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.categories {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--border);
}

.categories h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.category-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover {
  background: var(--background);
}

.category-btn.active {
  background: var(--primary);
  color: white;
}

.new-post-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.new-post-btn:hover {
  background: var(--secondary);
  transform: translateY(-2px);
}

.new-post-btn svg {
  width: 20px;
  height: 20px;
}

/* Posts Container */
.posts-container {
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--text);
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Post Card */
.post-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.post-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
}

.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-info {
  flex: 1;
}

.author-name {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
}

.post-time {
  font-size: 12px;
  color: var(--text-muted);
}

.post-category {
  padding: 4px 10px;
  background: var(--background);
  border-radius: 20px;
  font-size: 12px;
  color: var(--primary);
  font-weight: bold;
}

.post-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.post-content {
  font-size: 14px;
  color: #000;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: 12px;
  margin-top: 12px;
}

.post-footer {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--background);
  color: var(--primary);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.post-detail-modal {
  max-width: 700px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--border);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.post-detail-body {
  padding: 20px 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.image-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
}

.remove-image {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
}

.remove-image svg {
  width: 16px;
  height: 16px;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px;
  border: 2px dashed var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-muted);
}

.upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.upload-btn svg {
  width: 32px;
  height: 32px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
}

.btn-secondary,
.btn-primary {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--background);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-primary {
  background: var(--primary);
  border: none;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--secondary);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Post Detail */
.post-content-full {
  font-size: 15px;
  color: var(--text);
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: 16px;
}

.post-image-full {
  width: 100%;
  border-radius: 12px;
  margin-bottom: 16px;
}

/* Comments Section */
.comments-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.comments-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.no-comments {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 14px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.comment {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  overflow: hidden;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-content {
  flex: 1;
  background: var(--background);
  padding: 12px 16px;
  border-radius: 12px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-author {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
}

.comment-time {
  font-size: 12px;
  color: var(--text-muted);
}

.comment-content p {
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
}

.new-comment {
  display: flex;
  gap: 12px;
  align-items: center;
}

.new-comment input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.new-comment input:focus {
  border-color: var(--primary);
}

.new-comment .send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.new-comment .send-btn:hover:not(:disabled) {
  background: var(--secondary);
}

.new-comment .send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.new-comment .send-btn svg {
  width: 20px;
  height: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .forum-content {
    grid-template-columns: 1fr;
  }

  .forum-sidebar {
    order: -1;
  }

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
  }

  .categories h3 {
    width: 100%;
    margin-bottom: 8px;
  }

  .category-btn {
    width: auto;
    padding: 8px 16px;
  }
}
</style>
