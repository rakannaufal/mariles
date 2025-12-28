<script setup>
import TeacherSidebar from '@/components/TeacherSidebar.vue'
import OwnerSidebar from '@/components/OwnerSidebar.vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { createQuiz, updateQuiz, deleteQuiz, getTeacherQuizzes, getQuizStatistics } from '@/services/quizService'

const route = useRoute()
const authStore = useAuthStore()
const isOwner = computed(() => route.path.startsWith('/owner'))

const loading = ref(true)
const quizzes = ref([])
const programs = ref([])
const showModal = ref(false)
const editingQuiz = ref(null)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// Results modal
const showResultsModal = ref(false)
const selectedQuiz = ref(null)
const quizResults = ref([])
const resultsLoading = ref(false)

// Quiz form
const quizForm = ref({
  title: '',
  description: '',
  programId: '',
  duration: 30,
  passingScore: 70,
  questions: [],
  startDate: '',
  endDate: ''
})

// Current question being edited
const currentQuestion = ref({
  id: '',
  question: '',
  type: 'multiple', // 'multiple' or 'truefalse'
  options: ['', '', '', ''],
  correctAnswer: 0
})

onMounted(async () => {
  await Promise.all([fetchQuizzes(), fetchPrograms()])
})

// Fetch programs for dropdown
async function fetchPrograms() {
  try {
    // Get teacher's les_place_id first
    const { data: teacher } = await supabase
      .from('teachers')
      .select('les_place_id')
      .eq('user_id', authStore.user.id)
      .single()

    if (teacher?.les_place_id) {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('les_place_id', teacher.les_place_id)
        .eq('is_active', true)
        .order('name')

      if (!error) {
        programs.value = data || []
      }
    }
  } catch (err) {
    console.error('Error fetching programs:', err)
  }
}

async function fetchQuizzes() {
  loading.value = true
  try {
    const result = await getTeacherQuizzes(authStore.user.id)
    if (result.success) {
      quizzes.value = result.quizzes
    }
  } catch (err) {
    console.error('Error fetching quizzes:', err)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingQuiz.value = null
  quizForm.value = {
    title: '',
    description: '',
    programId: '',
    duration: 30,
    passingScore: 70,
    questions: [],
    startDate: '',
    endDate: ''
  }
  showModal.value = true
}

function openEditModal(quiz) {
  editingQuiz.value = quiz
  quizForm.value = {
    title: quiz.title,
    description: quiz.description || '',
    programId: quiz.program_id || '',
    duration: quiz.duration_minutes,
    passingScore: quiz.passing_score,
    questions: quiz.questions || [],
    startDate: quiz.start_date ? quiz.start_date.slice(0, 16) : '',
    endDate: quiz.end_date ? quiz.end_date.slice(0, 16) : ''
  }
  showModal.value = true
}

function addQuestion() {
  const newQ = {
    id: Date.now().toString(),
    question: '',
    type: 'multiple',
    options: ['', '', '', ''],
    correctAnswer: 0
  }
  quizForm.value.questions.push(newQ)
}

function removeQuestion(index) {
  quizForm.value.questions.splice(index, 1)
}

async function handleSaveQuiz() {
  if (!quizForm.value.title) {
    showError('Judul quiz harus diisi')
    return
  }

  if (quizForm.value.questions.length === 0) {
    showError('Tambahkan minimal 1 pertanyaan')
    return
  }

  try {
    if (editingQuiz.value) {
      await updateQuiz(editingQuiz.value.id, {
        title: quizForm.value.title,
        description: quizForm.value.description,
        program_id: quizForm.value.programId || null,
        duration_minutes: quizForm.value.duration,
        passing_score: quizForm.value.passingScore,
        questions: quizForm.value.questions,
        start_date: quizForm.value.startDate || null,
        end_date: quizForm.value.endDate || null
      })
      showSuccess('Quiz berhasil diperbarui')
    } else {
      // Get les_place_id from teacher
      const { data: teacher } = await supabase
        .from('teachers')
        .select('les_place_id')
        .eq('user_id', authStore.user.id)
        .single()

      await createQuiz({
        lesPlaceId: teacher?.les_place_id,
        programId: quizForm.value.programId || null,
        teacherId: authStore.user.id,
        title: quizForm.value.title,
        description: quizForm.value.description,
        questions: quizForm.value.questions,
        duration: quizForm.value.duration,
        passingScore: quizForm.value.passingScore,
        isPublished: false,
        startDate: quizForm.value.startDate || null,
        endDate: quizForm.value.endDate || null
      })
      showSuccess('Quiz berhasil dibuat')
    }
    showModal.value = false
    await fetchQuizzes()
  } catch (err) {
    console.error('Error saving quiz:', err)
    showError('Gagal menyimpan quiz')
  }
}

async function togglePublish(quiz) {
  try {
    await updateQuiz(quiz.id, { is_published: !quiz.is_published })
    await fetchQuizzes()
    showSuccess(quiz.is_published ? 'Quiz disembunyikan' : 'Quiz dipublikasikan')
  } catch (err) {
    console.error('Error toggling publish:', err)
  }
}

async function handleDeleteQuiz(quiz) {
  if (!confirm('Hapus quiz ini?')) return
  try {
    await deleteQuiz(quiz.id)
    await fetchQuizzes()
    showSuccess('Quiz berhasil dihapus')
  } catch (err) {
    console.error('Error deleting quiz:', err)
  }
}

function showSuccess(msg) {
  toastMessage.value = msg
  toastType.value = 'success'
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

function showError(msg) {
  toastMessage.value = msg
  toastType.value = 'error'
  showToast.value = true
  setTimeout(() => showToast.value = false, 3000)
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function openResultsModal(quiz) {
  selectedQuiz.value = quiz
  showResultsModal.value = true
  resultsLoading.value = true
  
  try {
    // Fetch quiz attempts - student name is now stored in results field
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quiz.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
    
    if (attemptsError) throw attemptsError
    
    // Map attempts with student info from results field
    quizResults.value = (attempts || []).map(a => ({
      ...a,
      student: {
        full_name: a.results?.student_name || 'Siswa',
        email: a.results?.student_email || '-'
      }
    }))
  } catch (err) {
    console.error('Error fetching quiz results:', err)
    quizResults.value = []
  } finally {
    resultsLoading.value = false
  }
}

function formatDateTime(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function deleteAttempt(attemptId) {
  if (!confirm('Hapus hasil quiz ini?')) return
  
  try {
    const { error } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('id', attemptId)
    
    if (error) throw error
    
    // Remove from local state
    quizResults.value = quizResults.value.filter(r => r.id !== attemptId)
    showToastMessage('Hasil quiz berhasil dihapus', 'success')
  } catch (err) {
    console.error('Error deleting attempt:', err)
    showToastMessage('Gagal menghapus hasil quiz', 'error')
  }
}
</script>

<template>
  <div class="dashboard">
    <OwnerSidebar v-if="isOwner" />
    <TeacherSidebar v-else />

    <!-- Toast -->
    <Transition name="fade">
      <div v-if="showToast" :class="['toast', toastType]">
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <main class="main">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Quiz & Ujian
          </h1>
          <p class="subtitle">Buat dan kelola quiz untuk siswa Anda</p>
        </div>
        <button class="btn-primary" @click="openCreateModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Buat Quiz
        </button>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="quizzes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h3>Belum Ada Quiz</h3>
        <p>Buat quiz pertama Anda untuk menguji pemahaman siswa</p>
        <button class="btn-primary" @click="openCreateModal">Buat Quiz</button>
      </div>

      <div v-else class="quiz-grid">
        <div v-for="quiz in quizzes" :key="quiz.id" class="quiz-card">
          <div class="quiz-header">
            <h3>{{ quiz.title }}</h3>
            <span class="status-badge" :class="quiz.is_published ? 'published' : 'draft'">
              {{ quiz.is_published ? 'Published' : 'Draft' }}
            </span>
          </div>
          <p class="quiz-desc">{{ quiz.description || 'Tidak ada deskripsi' }}</p>
          <div class="program-badge" :class="quiz.programs?.name ? 'specific' : 'general'">
            {{ quiz.programs?.name || 'Semua Program' }}
          </div>
          <div class="quiz-meta">
            <div class="meta-item">
              <span class="meta-label">Soal</span>
              <span class="meta-value">{{ quiz.questions?.length || 0 }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Durasi</span>
              <span class="meta-value">{{ quiz.duration_minutes }} menit</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">KKM</span>
              <span class="meta-value">{{ quiz.passing_score }}</span>
            </div>
          </div>
          <div class="quiz-footer">
            <span class="date">Dibuat: {{ formatDate(quiz.created_at) }}</span>
            <div class="quiz-actions">
              <button class="btn-icon results" @click="openResultsModal(quiz)" title="Lihat Hasil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20V10"/>
                  <path d="M18 20V4"/>
                  <path d="M6 20v-4"/>
                </svg>
              </button>
              <button class="btn-icon" @click="togglePublish(quiz)" :title="quiz.is_published ? 'Sembunyikan' : 'Publikasikan'">
                <svg v-if="quiz.is_published" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button class="btn-icon edit" @click="openEditModal(quiz)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn-icon delete" @click="handleDeleteQuiz(quiz)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Quiz Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal quiz-modal">
        <div class="modal-header">
          <h3>{{ editingQuiz ? 'Edit Quiz' : 'Buat Quiz Baru' }}</h3>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Judul Quiz</label>
            <input v-model="quizForm.title" type="text" class="input-field" placeholder="contoh: Ulangan Harian Matematika">
          </div>
          <div class="form-group">
            <label>Deskripsi (opsional)</label>
            <textarea v-model="quizForm.description" rows="2" class="input-field" placeholder="Deskripsi singkat tentang quiz"></textarea>
          </div>
          <div class="form-group">
            <label>Program</label>
            <select v-model="quizForm.programId" class="input-field">
              <option value="">-- Semua Program (Umum) --</option>
              <option v-for="prog in programs" :key="prog.id" :value="prog.id">{{ prog.name }}</option>
            </select>
            <small class="form-hint">Pilih program spesifik atau biarkan kosong untuk quiz umum</small>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Durasi (menit)</label>
              <input v-model.number="quizForm.duration" type="number" min="5" max="180" class="input-field">
            </div>
            <div class="form-group">
              <label>Nilai Minimum (KKM)</label>
              <input v-model.number="quizForm.passingScore" type="number" min="0" max="100" class="input-field">
            </div>
          </div>

          <!-- Scheduling Section -->
          <div class="schedule-section">
            <h4>Jadwal Quiz (Opsional)</h4>
            <p class="schedule-hint">Jika diatur, quiz hanya bisa dikerjakan dalam rentang waktu ini</p>
            <div class="form-row">
              <div class="form-group">
                <label>Waktu Mulai</label>
                <input v-model="quizForm.startDate" type="datetime-local" class="input-field">
              </div>
              <div class="form-group">
                <label>Waktu Selesai</label>
                <input v-model="quizForm.endDate" type="datetime-local" class="input-field">
              </div>
            </div>
          </div>

          <div class="questions-section">
            <div class="section-header">
              <h4>Pertanyaan ({{ quizForm.questions.length }})</h4>
              <button class="btn-add-q" @click="addQuestion">+ Tambah Soal</button>
            </div>

            <div v-for="(q, idx) in quizForm.questions" :key="q.id" class="question-card">
              <div class="q-header">
                <span class="q-number">Soal {{ idx + 1 }}</span>
                <button class="btn-remove-q" @click="removeQuestion(idx)">&times;</button>
              </div>
              <div class="form-group">
                <label>Pertanyaan</label>
                <textarea v-model="q.question" rows="2" class="input-field" placeholder="Tulis pertanyaan..."></textarea>
              </div>
              <div class="options-grid">
                <div v-for="(opt, oi) in q.options" :key="oi" class="option-item">
                  <input type="radio" :name="'correct-'+q.id" :value="oi" v-model="q.correctAnswer">
                  <input v-model="q.options[oi]" type="text" class="input-field" :placeholder="'Opsi ' + String.fromCharCode(65+oi)">
                </div>
              </div>
              <p class="helper">Pilih jawaban yang benar dengan radio button</p>
            </div>

            <div v-if="quizForm.questions.length === 0" class="no-questions">
              <p>Belum ada pertanyaan. Klik "Tambah Soal" untuk mulai.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showModal = false">Batal</button>
          <button class="btn-primary" @click="handleSaveQuiz">Simpan Quiz</button>
        </div>
      </div>
    </div>

    <!-- Results Modal -->
    <div v-if="showResultsModal" class="modal-overlay" @click.self="showResultsModal = false">
      <div class="modal results-modal">
        <div class="modal-header">
          <h3>Hasil Quiz: {{ selectedQuiz?.title }}</h3>
          <button class="close-btn" @click="showResultsModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="resultsLoading" class="loading-state">
            <div class="spinner"></div>
          </div>
          <div v-else-if="quizResults.length === 0" class="empty-results">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-4"/>
            </svg>
            <p>Belum ada siswa yang mengerjakan quiz ini</p>
          </div>
          <div v-else class="results-table-container">
            <table class="results-table">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Nilai</th>
                  <th>Status</th>
                  <th>Waktu</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="result in quizResults" :key="result.id">
                  <td class="student-cell">
                    <span class="student-name">{{ result.student?.full_name || 'Siswa' }}</span>
                    <span class="student-email">{{ result.student?.email || '-' }}</span>
                  </td>
                  <td>
                    <span class="score-badge" :class="result.passed ? 'passed' : 'failed'">
                      {{ result.score }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" :class="result.passed ? 'passed' : 'failed'">
                      {{ result.passed ? 'Lulus' : 'Tidak Lulus' }}
                    </span>
                  </td>
                  <td class="time-cell">{{ formatDateTime(result.completed_at) }}</td>
                  <td>
                    <button class="btn-delete-attempt" @click="deleteAttempt(result.id)" title="Hapus">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <div class="results-summary" v-if="quizResults.length > 0">
            <span>Total: {{ quizResults.length }} siswa</span>
            <span>Lulus: {{ quizResults.filter(r => r.passed).length }}</span>
            <span>Tidak Lulus: {{ quizResults.filter(r => !r.passed).length }}</span>
          </div>
          <button class="btn-primary" @click="showResultsModal = false">Tutup</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { display: flex; min-height: 100vh; background: var(--background); }
.main { flex: 1; padding: 32px; overflow-y: auto; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.header-left h1 { display: flex; align-items: center; gap: 12px; font-size: 24px; color: var(--text); margin-bottom: 4px; }
.header-left h1 svg { width: 28px; height: 28px; color: var(--primary); }
.subtitle { color: var(--text-muted); font-size: 14px; }

.btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--primary); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-primary svg { width: 18px; height: 18px; }
.btn-primary:hover { background: var(--primary-dark); }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 1px solid var(--border-light); }
.empty-state svg { width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 16px; }
.empty-state h3 { font-size: 18px; margin-bottom: 8px; }
.empty-state p { color: var(--text-muted); margin-bottom: 20px; }

/* Quiz Grid */
.quiz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

.quiz-card { background: white; border-radius: 14px; border: 1px solid var(--border-light); padding: 20px; }
.quiz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.quiz-header h3 { font-size: 16px; font-weight: 600; }
.status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.status-badge.published { background: #dcfce7; color: #16a34a; }
.status-badge.draft { background: #fef3c7; color: #d97706; }

.quiz-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.5; }

.program-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-bottom: 12px; }
.program-badge.specific { background: #e0f2fe; color: #0369a1; }
.program-badge.general { background: #f3e8ff; color: #7c3aed; }

.quiz-meta { display: flex; gap: 16px; padding: 12px; background: var(--background); border-radius: 10px; margin-bottom: 16px; }
.meta-item { text-align: center; flex: 1; }
.meta-label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.meta-value { font-size: 16px; font-weight: 700; color: var(--text); }

.quiz-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-light); }
.date { font-size: 12px; color: var(--text-muted); }

.quiz-actions { display: flex; gap: 8px; }
.btn-icon { width: 32px; height: 32px; border-radius: 8px; border: none; background: var(--background); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-icon svg { width: 16px; height: 16px; color: var(--text-muted); }
.btn-icon:hover { background: var(--border-light); }
.btn-icon:hover svg { color: var(--text); }
.btn-icon.delete:hover svg { color: #dc2626; }
.btn-icon.edit:hover svg { color: #2563eb; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 700px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border-light); }
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn { background: none; border: none; font-size: 28px; color: var(--text-muted); cursor: pointer; line-height: 1; }
.modal-body { flex: 1; overflow-y: auto; padding: 20px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid var(--border-light); }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
.input-field { width: 100%; padding: 12px 14px; border: 1px solid var(--border-light); border-radius: 10px; font-size: 14px; }
.input-field:focus { outline: none; border-color: var(--primary); }
.form-hint { display: block; font-size: 12px; color: var(--text-muted); margin-top: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.btn-secondary { padding: 12px 20px; background: var(--background); color: var(--text); border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }

/* Questions Section */
.questions-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-light); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h4 { font-size: 15px; font-weight: 600; }
.btn-add-q { padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }

.question-card { background: var(--background); border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid var(--border-light); }
.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.q-number { font-size: 13px; font-weight: 600; color: var(--primary); }
.btn-remove-q { background: none; border: none; font-size: 20px; color: #dc2626; cursor: pointer; }

.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.option-item { display: flex; align-items: center; gap: 8px; }
.option-item input[type="radio"] { width: 18px; height: 18px; accent-color: var(--primary); }
.option-item .input-field { flex: 1; }

.helper { font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.no-questions { text-align: center; padding: 24px; color: var(--text-muted); }

/* Schedule Section */
.schedule-section { margin: 20px 0; padding: 16px; background: linear-gradient(135deg, rgba(136, 208, 228, 0.1), rgba(251, 113, 133, 0.08)); border-radius: 12px; border: 1px dashed var(--border); }
.schedule-section h4 { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.schedule-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }

/* Toast */
.toast { position: fixed; top: 20px; right: 20px; padding: 14px 20px; border-radius: 10px; font-weight: 500; z-index: 200; animation: slideIn 0.3s ease; }
.toast.success { background: #dcfce7; color: #16a34a; }
.toast.error { background: #fee2e2; color: #dc2626; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

@media (max-width: 768px) {
  .quiz-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .options-grid { grid-template-columns: 1fr; }
}

/* Results Button */
.btn-icon.results:hover svg { color: #8b5cf6; }

/* Results Modal */
.results-modal { max-width: 800px; }

.empty-results {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-results svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
}

.results-table-container {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th,
.results-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-light);
}

.results-table th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  background: var(--background);
}

.student-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student-name {
  font-weight: 500;
}

.student-email {
  font-size: 12px;
  color: var(--text-muted);
}

.score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 14px;
}

.score-badge.passed {
  background: #dcfce7;
  color: #16a34a;
}

.score-badge.failed {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.passed {
  background: #dcfce7;
  color: #16a34a;
}

.status-badge.failed {
  background: #fee2e2;
  color: #dc2626;
}

.time-cell {
  font-size: 13px;
  color: var(--text-secondary);
}

.results-summary {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.results-modal .modal-footer {
  justify-content: space-between;
}

.btn-delete-attempt {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-delete-attempt svg {
  width: 18px;
  height: 18px;
  color: #999;
}

.btn-delete-attempt:hover {
  background: #fee2e2;
}

.btn-delete-attempt:hover svg {
  color: #dc2626;
}
</style>
