/**
 * Layanan Kuis
 * ============
 * 
 * Menangani operasi kuis untuk pengajar dan siswa
 */

import { supabase } from '@/lib/supabase'

// ============================================================
// MANAJEMEN KUIS (Pengajar)
// ============================================================

/**
 * Buat kuis baru
 * @param {Object} quizData - Data kuis
 */
export async function createQuiz({
  lesPlaceId,
  programId,
  teacherId,
  title,
  description = '',
  questions = [],
  duration = 30, // menit
  passingScore = 70,
  isPublished = false,
  startDate = null,
  endDate = null
}) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        les_place_id: lesPlaceId,
        program_id: programId,
        teacher_id: teacherId,
        title,
        description,
        questions,
        duration_minutes: duration,
        passing_score: passingScore,
        is_published: isPublished,
        start_date: startDate,
        end_date: endDate
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, quiz: data }
  } catch (error) {
    console.error('Create quiz error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update kuis
 * @param {string} quizId - ID Kuis
 * @param {Object} updates - Field yang akan diupdate
 */
export async function updateQuiz(quizId, updates) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single()

    if (error) throw error

    return { success: true, quiz: data }
  } catch (error) {
    console.error('Update quiz error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Hapus kuis
 * @param {string} quizId - ID Kuis
 */
export async function deleteQuiz(quizId) {
  try {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Delete quiz error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Dapatkan kuis untuk pengajar
 * @param {string} teacherId - ID Pengajar
 */
export async function getTeacherQuizzes(teacherId) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, programs(name)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, quizzes: data || [] }
  } catch (error) {
    console.error('Get teacher quizzes error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// MENGERJAKAN KUIS (Siswa)
// ============================================================

/**
 * Mulai percobaan kuis
 * @param {string} quizId - ID Kuis
 * @param {string} studentId - ID Siswa
 */
export async function startQuizAttempt(quizId, studentId) {
  try {
    // Cek percobaan yang belum selesai
    const { data: existing } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .is('completed_at', null)
      .single()

    if (existing) {
      return { success: false, error: 'Anda sudah memiliki percobaan yang belum selesai' }
    }

    // Dapatkan detail kuis
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    if (!quiz || !quiz.is_published) {
      return { success: false, error: 'Quiz tidak ditemukan atau belum dipublikasikan' }
    }

    // Buat percobaan
    const endTime = new Date(Date.now() + quiz.duration_minutes * 60 * 1000)
    
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        started_at: new Date().toISOString(),
        end_time: endTime.toISOString(),
        answers: {}
      })
      .select()
      .single()

    if (error) throw error

    return { 
      success: true, 
      attempt,
      quiz: {
        ...quiz,
        // Jangan kirim jawaban benar ke client
        questions: quiz.questions.map(q => ({
          ...q,
          correctAnswer: undefined
        }))
      },
      endTime: endTime.toISOString()
    }
  } catch (error) {
    console.error('Start quiz attempt error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Simpan jawaban untuk pertanyaan
 * @param {string} attemptId - ID Percobaan
 * @param {string} questionId - ID Pertanyaan
 * @param {any} answer - Jawaban siswa
 */
export async function saveAnswer(attemptId, questionId, answer) {
  try {
    // Dapatkan jawaban saat ini
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('answers')
      .eq('id', attemptId)
      .single()

    if (!attempt) {
      return { success: false, error: 'Attempt tidak ditemukan' }
    }

    // Update jawaban
    const updatedAnswers = {
      ...attempt.answers,
      [questionId]: answer
    }

    const { error } = await supabase
      .from('quiz_attempts')
      .update({ answers: updatedAnswers })
      .eq('id', attemptId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Save answer error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Kirim percobaan kuis
 * @param {string} attemptId - ID Percobaan
 */
export async function submitQuizAttempt(attemptId) {
  try {
    // Dapatkan percobaan dengan kuis
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('id', attemptId)
      .single()

    if (!attempt) {
      return { success: false, error: 'Attempt tidak ditemukan' }
    }

    // Hitung skor
    const quiz = attempt.quizzes
    const questions = quiz.questions
    const answers = attempt.answers || {}
    
    let correctCount = 0
    const results = questions.map(q => {
      const studentAnswer = answers[q.id]
      const isCorrect = studentAnswer === q.correctAnswer
      if (isCorrect) correctCount++
      return {
        questionId: q.id,
        studentAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect
      }
    })

    const score = Math.round((correctCount / questions.length) * 100)
    const passed = score >= quiz.passing_score

    // Update percobaan
    const { error } = await supabase
      .from('quiz_attempts')
      .update({
        completed_at: new Date().toISOString(),
        score,
        passed,
        results
      })
      .eq('id', attemptId)

    if (error) throw error

    return { 
      success: true, 
      score, 
      passed, 
      correctCount, 
      totalQuestions: questions.length,
      results
    }
  } catch (error) {
    console.error('Submit quiz attempt error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Dapatkan percobaan kuis untuk siswa
 * @param {string} studentId - ID Siswa
 */
export async function getStudentAttempts(studentId) {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(title, passing_score)')
      .eq('student_id', studentId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (error) throw error

    return { success: true, attempts: data || [] }
  } catch (error) {
    console.error('Get student attempts error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Dapatkan statistik kuis (Pengajar)
 * @param {string} quizId - ID Kuis
 */
export async function getQuizStatistics(quizId) {
  try {
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('score, passed, students(users(name))')
      .eq('quiz_id', quizId)
      .not('completed_at', 'is', null)

    if (error) throw error

    if (!attempts || attempts.length === 0) {
      return { 
        success: true, 
        stats: { 
          totalAttempts: 0, 
          averageScore: 0, 
          passRate: 0,
          attempts: []
        } 
      }
    }

    const totalAttempts = attempts.length
    const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0)
    const passedCount = attempts.filter(a => a.passed).length

    return { 
      success: true, 
      stats: {
        totalAttempts,
        averageScore: Math.round(totalScore / totalAttempts),
        passRate: Math.round((passedCount / totalAttempts) * 100),
        attempts
      }
    }
  } catch (error) {
    console.error('Get quiz statistics error:', error)
    return { success: false, error: error.message }
  }
}
