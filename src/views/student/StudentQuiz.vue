<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const quiz = ref(null)
const loading = ref(true)
const isSubmitting = ref(false)
const currentQuestionIndex = ref(0)
const answers = ref({})
const quizStarted = ref(false)
const quizCompleted = ref(false)
const score = ref(null)
const timeLeft = ref(0)
let timerInterval = null

onMounted(async () => {
  await loadQuiz()
})

async function loadQuiz() {
  loading.value = true
  const quizId = route.params.quizId
  
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('is_published', true)
      .single()
    
    if (error) throw error
    quiz.value = data
    timeLeft.value = (data.duration_minutes || 30) * 60
  } catch (err) {
    console.error('Error loading quiz:', err)
  } finally {
    loading.value = false
  }
}

const currentQuestion = computed(() => {
  if (!quiz.value?.questions) return null
  return quiz.value.questions[currentQuestionIndex.value]
})

const totalQuestions = computed(() => quiz.value?.questions?.length || 0)

const progress = computed(() => {
  if (totalQuestions.value === 0) return 0
  return Math.round(((currentQuestionIndex.value + 1) / totalQuestions.value) * 100)
})

const formattedTime = computed(() => {
  const mins = Math.floor(timeLeft.value / 60)
  const secs = timeLeft.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

function startQuiz() {
  quizStarted.value = true
  startTimer()
}

function startTimer() {
  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(timerInterval)
      submitQuiz()
    }
  }, 1000)
}

function selectAnswer(questionId, answerIndex) {
  answers.value[questionId] = answerIndex
}

function nextQuestion() {
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++
  }
}

function prevQuestion() {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

function goToQuestion(index) {
  currentQuestionIndex.value = index
}

async function submitQuiz() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  clearInterval(timerInterval)
  
  // Calculate score
  let correct = 0
  quiz.value.questions.forEach((q, idx) => {
    if (answers.value[q.id] === q.correctAnswer) {
      correct++
    }
  })
  
  const finalScore = Math.round((correct / totalQuestions.value) * 100)
  score.value = finalScore
  
  // Save attempt to database with student info
  try {
    const { error } = await supabase.from('quiz_attempts').insert({
      quiz_id: quiz.value.id,
      student_id: authStore.user.id,
      score: finalScore,
      passed: finalScore >= (quiz.value.passing_score || 70),
      completed_at: new Date().toISOString(),
      answers: answers.value,
      // Store student info in results field for teacher display
      results: {
        student_name: authStore.user.full_name || authStore.user.email?.split('@')[0] || 'Siswa',
        student_email: authStore.user.email || '-',
        correct_answers: correct,
        total_questions: totalQuestions.value
      }
    })
    
    if (error) {
      console.error('Error saving attempt:', error)
    }
  } catch (err) {
    console.error('Error saving attempt:', err)
  }
  
  quizCompleted.value = true
  isSubmitting.value = false
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="quiz-page">
    <Navbar />
    
    <main class="main-content">
      <div class="container">
        <!-- Loading -->
        <div v-if="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Memuat quiz...</p>
        </div>
        
        <!-- Quiz Not Found -->
        <div v-else-if="!quiz" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <h3>Quiz tidak ditemukan</h3>
          <p>Quiz yang Anda cari tidak tersedia atau belum dipublikasikan.</p>
          <button class="btn btn-primary" @click="goBack">Kembali</button>
        </div>
        
        <!-- Quiz Completed -->
        <div v-else-if="quizCompleted" class="result-container">
          <div class="result-card">
            <div class="result-icon" :class="score >= (quiz.passing_score || 70) ? 'passed' : 'failed'">
              <svg v-if="score >= (quiz.passing_score || 70)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <h2>{{ score >= (quiz.passing_score || 70) ? 'Selamat!' : 'Tetap Semangat!' }}</h2>
            <p class="result-message">
              {{ score >= (quiz.passing_score || 70) ? 'Anda berhasil menyelesaikan quiz dengan baik.' : 'Jangan menyerah, terus belajar dan coba lagi!' }}
            </p>
            <div class="score-display">
              <span class="score-value">{{ score }}</span>
              <span class="score-label">Nilai Anda</span>
            </div>
            <div class="passing-info">
              <span>KKM: {{ quiz.passing_score || 70 }}</span>
              <span class="status-badge" :class="score >= (quiz.passing_score || 70) ? 'passed' : 'failed'">
                {{ score >= (quiz.passing_score || 70) ? 'LULUS' : 'TIDAK LULUS' }}
              </span>
            </div>
            <button class="btn btn-primary" @click="goBack">Kembali ke Kelas</button>
          </div>
        </div>
        
        <!-- Quiz Start Screen -->
        <div v-else-if="!quizStarted" class="start-container">
          <div class="start-card">
            <div class="quiz-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2>{{ quiz.title }}</h2>
            <p class="quiz-desc">{{ quiz.description || 'Selamat mengerjakan quiz!' }}</p>
            
            <div class="quiz-meta-grid">
              <div class="meta-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="meta-value">{{ totalQuestions }}</span>
                <span class="meta-label">Soal</span>
              </div>
              <div class="meta-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span class="meta-value">{{ quiz.duration_minutes || 30 }}</span>
                <span class="meta-label">Menit</span>
              </div>
              <div class="meta-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span class="meta-value">{{ quiz.passing_score || 70 }}</span>
                <span class="meta-label">KKM</span>
              </div>
            </div>
            
            <div class="start-actions">
              <button class="btn btn-secondary" @click="goBack">Batal</button>
              <button class="btn btn-primary" @click="startQuiz">Mulai Quiz</button>
            </div>
          </div>
        </div>
        
        <!-- Quiz In Progress -->
        <div v-else class="quiz-container">
          <!-- Header -->
          <div class="quiz-header">
            <div class="quiz-title">{{ quiz.title }}</div>
            <div class="quiz-timer" :class="{ warning: timeLeft < 60 }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {{ formattedTime }}
            </div>
          </div>
          
          <!-- Progress -->
          <div class="quiz-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <span class="progress-label">Pertanyaan {{ currentQuestionIndex + 1 }} dari {{ totalQuestions }}</span>
          </div>
          
          <!-- Question Card -->
          <div class="question-card" v-if="currentQuestion">
            <div class="question-number">Soal {{ currentQuestionIndex + 1 }}</div>
            <p class="question-text">{{ currentQuestion.question }}</p>
            
            <div class="options-list">
              <button 
                v-for="(option, idx) in currentQuestion.options" 
                :key="idx"
                class="option-btn"
                :class="{ selected: answers[currentQuestion.id] === idx }"
                @click="selectAnswer(currentQuestion.id, idx)"
              >
                <span class="option-letter">{{ String.fromCharCode(65 + idx) }}</span>
                <span class="option-text">{{ option }}</span>
              </button>
            </div>
          </div>
          
          <!-- Navigation -->
          <div class="quiz-navigation">
            <button class="btn btn-secondary" @click="prevQuestion" :disabled="currentQuestionIndex === 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Sebelumnya
            </button>
            
            <div class="question-dots">
              <button 
                v-for="(q, idx) in quiz.questions" 
                :key="q.id"
                class="dot"
                :class="{ active: idx === currentQuestionIndex, answered: answers[q.id] !== undefined }"
                @click="goToQuestion(idx)"
              >
                {{ idx + 1 }}
              </button>
            </div>
            
            <button 
              v-if="currentQuestionIndex === totalQuestions - 1"
              class="btn btn-primary"
              @click="submitQuiz"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Mengirim...' : 'Selesai' }}
            </button>
            <button v-else class="btn btn-primary" @click="nextQuestion">
              Selanjutnya
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.quiz-page {
  min-height: 100vh;
  background: var(--background);
}

.main-content {
  padding-top: 80px;
  padding-bottom: 40px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Loading */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-muted);
  margin-bottom: 20px;
}

/* Start Screen */
.start-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.start-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.quiz-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(136, 208, 228, 0.2);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.quiz-icon svg {
  width: 40px;
  height: 40px;
}

.start-card h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.quiz-desc {
  color: var(--text-muted);
  margin-bottom: 32px;
}

.quiz-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.meta-box {
  padding: 20px;
  background: var(--background);
  border-radius: 12px;
  text-align: center;
}

.meta-box svg {
  width: 24px;
  height: 24px;
  color: var(--secondary);
  margin-bottom: 8px;
}

.meta-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}

.meta-label {
  font-size: 12px;
  color: var(--text-muted);
}

.start-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--secondary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary);
}

.btn-secondary {
  background: var(--background);
  color: var(--text);
}

.btn-secondary:hover {
  background: var(--border-light);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn svg {
  width: 18px;
  height: 18px;
}

/* Quiz Container */
.quiz-container {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.quiz-title {
  font-size: 18px;
  font-weight: 600;
}

.quiz-timer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--background);
  border-radius: 20px;
  font-weight: 600;
  color: var(--text);
}

.quiz-timer svg {
  width: 18px;
  height: 18px;
}

.quiz-timer.warning {
  background: #fee2e2;
  color: #dc2626;
}

/* Progress */
.quiz-progress {
  margin-bottom: 24px;
}

.progress-bar {
  height: 8px;
  background: var(--border-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--secondary);
  transition: width 0.3s;
}

.progress-label {
  font-size: 13px;
  color: var(--text-muted);
}

/* Question Card */
.question-card {
  background: var(--background);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.question-number {
  font-size: 13px;
  font-weight: 600;
  color: var(--secondary);
  margin-bottom: 12px;
}

.question-text {
  font-size: 18px;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 24px;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 2px solid var(--border-light);
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  border-color: var(--secondary);
}

.option-btn.selected {
  border-color: var(--secondary);
  background: rgba(136, 208, 228, 0.1);
}

.option-letter {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.option-btn.selected .option-letter {
  background: var(--secondary);
  color: white;
}

.option-text {
  font-size: 15px;
}

/* Navigation */
.quiz-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.question-dots {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  flex: 1;
}

.dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dot.active {
  border-color: var(--secondary);
  color: var(--secondary);
}

.dot.answered {
  background: var(--secondary);
  border-color: var(--secondary);
  color: white;
}

/* Result Screen */
.result-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.result-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.result-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.result-icon.passed {
  background: #dcfce7;
  color: #16a34a;
}

.result-icon.failed {
  background: #fee2e2;
  color: #dc2626;
}

.result-icon svg {
  width: 40px;
  height: 40px;
}

.result-card h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.result-message {
  color: var(--text-muted);
  margin-bottom: 24px;
}

.score-display {
  margin-bottom: 16px;
}

.score-value {
  display: block;
  font-size: 64px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.score-label {
  font-size: 14px;
  color: var(--text-muted);
}

.passing-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--text-secondary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
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

/* Responsive */
@media (max-width: 640px) {
  .quiz-meta-grid {
    grid-template-columns: 1fr;
  }
  
  .start-actions {
    flex-direction: column;
  }
  
  .quiz-navigation {
    flex-direction: column;
  }
  
  .question-dots {
    order: -1;
    margin-bottom: 16px;
  }
}
</style>
