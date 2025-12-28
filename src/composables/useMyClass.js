import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useMyClass() {
  const enrolledCourses = ref([])
  const currentCourse = ref(null)
  const materials = ref([])
  const tests = ref([])
  const grades = ref([])
  const attendance = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Fetch student's enrolled/active courses (paid bookings)
  async function fetchEnrolledCourses(userId) {
    loading.value = true
    error.value = null

    try {
      // 1. Get Student ID from User ID
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single()
      
      if (studentError || !studentData) {
        // If no student profile, implies no bookings yet
        enrolledCourses.value = []
        return []
      }

      const studentId = studentData.id

      // 2. Fetch Bookings
      const { data, error: err } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          payment_status,
          start_date,
          end_date,
          program:programs (
            id,
            name,
            description,
            subject,
            schedule,
            sessions_per_week,
            session_duration_minutes,
            les_place:les_places (
              id,
              name,
              photos,
              address,
              city
            )
          )
        `)
        .eq('student_id', studentId)
        .in('status', ['active', 'confirmed'])
        .in('payment_status', ['paid', 'settlement', 'capture']) // Broaden payment status
        .order('start_date', { ascending: false })

      if (err) throw err
      enrolledCourses.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching enrolled courses:', err)
    } finally {
      loading.value = false
    }

    return enrolledCourses.value
  }

  // Fetch single course details
  async function fetchCourseDetail(bookingId, studentId) {
    loading.value = true
    error.value = null

    try {
      // 1. Get Student ID
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', studentId) // studentId arg is actually userId from component
        .single()
      
      const sid = studentData?.id

      const { data: bookingData, error: err } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          payment_status,
          start_date,
          end_date,
          notes,
          student_id,
          program:programs (
            id,
            name,
            description,
            subject,
            schedule,
            sessions_per_week,
            session_duration_minutes,
            level,
            type,
            meeting_url,
            les_place_id,
            les_place:les_places (
              id,
              name,
              photos,
              address,
              city,
              type
            )
          )
        `)
        .eq('id', bookingId)
        .eq('student_id', sid)
        .single()

      if (err) throw err
      currentCourse.value = bookingData
    } catch (err) {
      error.value = err.message
      console.error('Error fetching course detail:', err)
    } finally {
      loading.value = false
    }

    return currentCourse.value
  }

  // Fetch course materials (modules and videos)
  async function fetchMaterials(programId, userId) {
    try {
      // Get student ID for progress filtering (if needed by RLS or modify query)
      // Assuming RLS handles visibility of progress, or we filter below
      
      const { data, error: err } = await supabase
        .from('course_materials')
        .select(`
          id,
          title,
          description,
          type,
          content,
          video_url,
          thumbnail_url,
          duration_minutes,
          order_index,
          progress:material_progress!left (
            student_id,
            is_completed,
            progress_percent,
            last_accessed_at
          )
        `)
        .eq('program_id', programId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (err) throw err
      
      materials.value = (data || []).map(m => {
        // Find progress for this specific student
        const userProgress = Array.isArray(m.progress) 
          ? (m.progress.find(p => p.student_id === userId) || { is_completed: false, progress_percent: 0 })
          : (m.progress || { is_completed: false, progress_percent: 0 })
        
        return {
          ...m,
          progress: userProgress
        }
      })
    } catch (err) {
      console.error('Error fetching materials:', err)
      materials.value = []
    }

    return materials.value
  }

  // Fetch quizzes for a program (from quizzes table - same as teacher uses)
  async function fetchTests(programId, userId) {
    try {
      // First get les_place_id from program
      const { data: program } = await supabase
        .from('programs')
        .select('les_place_id')
        .eq('id', programId)
        .single()

      if (!program?.les_place_id) {
        tests.value = []
        return tests.value
      }

      // Fetch quizzes for this program or general quizzes (program_id = null)
      const { data, error: err } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          duration_minutes,
          passing_score,
          start_date,
          end_date,
          is_published,
          questions,
          max_attempts,
          program_id,
          created_at
        `)
        .eq('les_place_id', program.les_place_id)
        .eq('is_published', true)
        .or(`program_id.eq.${programId},program_id.is.null`)
        .order('created_at', { ascending: false })

      if (err) throw err

      // Fetch attempts for this student (using userId directly since quiz_attempts.student_id = users.id)
      let attemptsMap = {}
      if (userId && data?.length) {
        const quizIds = data.map(q => q.id)
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, score, passed, completed_at')
          .eq('student_id', userId)
          .in('quiz_id', quizIds)
          .not('completed_at', 'is', null)

        if (attempts) {
          attempts.forEach(a => {
            if (!attemptsMap[a.quiz_id]) attemptsMap[a.quiz_id] = []
            attemptsMap[a.quiz_id].push(a)
          })
        }
      }

      // Map quizzes with attempt info and schedule status
      const now = new Date()
      tests.value = (data || []).map(q => {
        const attempts = attemptsMap[q.id] || []
        const startDate = q.start_date ? new Date(q.start_date) : null
        const endDate = q.end_date ? new Date(q.end_date) : null
        
        // Determine schedule status
        let scheduleStatus = 'available' // no schedule set
        if (startDate && now < startDate) {
          scheduleStatus = 'upcoming'
        } else if (endDate && now > endDate) {
          scheduleStatus = 'expired'
        } else if (startDate || endDate) {
          scheduleStatus = 'active'
        }

        return {
          ...q,
          test_type: 'quiz',
          time_limit_minutes: q.duration_minutes,
          max_attempts: q.max_attempts || 1, // use database value or default to 1
          attempts,
          bestScore: attempts.length ? Math.max(...attempts.map(a => a.score || 0)) : null,
          attemptCount: attempts.length,
          isLocked: attempts.length >= (q.max_attempts || 1), // Quiz locked after completing max attempts
          questionCount: q.questions?.length || 0,
          scheduleStatus,
          startDate: q.start_date,
          endDate: q.end_date
        }
      })
    } catch (err) {
      console.error('Error fetching quizzes:', err)
      tests.value = []
    }

    return tests.value
  }

  // Fetch grades for a booking
  async function fetchGrades(bookingId) {
    try {
      const { data, error: err } = await supabase
        .from('grades')
        .select(`
          id,
          subject,
          score,
          max_score,
          grade_type,
          notes,
          created_at,
          teacher:teachers (
            user:users (
              name
            )
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (err) throw err
      grades.value = data || []
    } catch (err) {
      console.error('Error fetching grades:', err)
      grades.value = []
    }

    return grades.value
  }

  // Fetch attendance for a booking
  async function fetchAttendance(bookingId) {
    try {
      const { data, error: err } = await supabase
        .from('attendance')
        .select(`
          id,
          session_date,
          status,
          notes,
          teacher:teachers (
            user:users (
              name
            )
          )
        `)
        .eq('booking_id', bookingId)
        .order('session_date', { ascending: false })

      if (err) throw err
      attendance.value = data || []
    } catch (err) {
      console.error('Error fetching attendance:', err)
      attendance.value = []
    }

    return attendance.value
  }

  // Update material progress
  async function updateMaterialProgress(materialId, studentId, progressData) {
    try {
      if (!studentId) {
        throw new Error('Student ID is required for progress tracking')
      }

      const { error: err } = await supabase
        .from('material_progress')
        .upsert({
          material_id: materialId,
          student_id: studentId,
          ...progressData,
          last_accessed_at: new Date().toISOString()
        }, { onConflict: 'material_id,student_id' })

      if (err) throw err
      return true
    } catch (err) {
      console.error('Error updating progress:', err)
      return false
    }
  }

  // Calculate overall course progress
  function calculateCourseProgress() {
    // Count all learning items
    const moduleVideos = materials.value || []
    const quizList = tests.value || []
    const exerciseList = exercises.value || []
    
    // Separate modules and videos
    const moduleItems = moduleVideos.filter(m => m.type !== 'video')
    const videoItems = moduleVideos.filter(m => m.type === 'video')
    
    // Count total items
    const totalModules = moduleItems.length
    const totalVideos = videoItems.length
    const totalQuizzes = quizList.length
    const totalExercises = exerciseList.length
    
    const totalItems = totalModules + totalVideos + totalQuizzes + totalExercises
    if (totalItems === 0) return 0
    
    // Count completed items
    // Modules: progress.is_completed or progress.is_read
    const completedModules = moduleItems.filter(m => 
      m.progress?.is_completed || m.progress?.is_read
    ).length
    
    // Videos: progress.is_watched or progress.watch_percentage >= 80
    const completedVideos = videoItems.filter(v => 
      v.progress?.is_watched || (v.progress?.watch_percentage || 0) >= 80
    ).length
    
    // Quizzes: have bestScore (completed at least once)
    const completedQuizzes = quizList.filter(q => q.bestScore !== null).length
    
    // Exercises: have at least one submission
    const completedExercises = exerciseList.filter(e => 
      e.submissionCount > 0 || e.submissions?.length > 0
    ).length
    
    const completedItems = completedModules + completedVideos + completedQuizzes + completedExercises
    
    return Math.round((completedItems / totalItems) * 100)
  }

  // Get schedule for display
  function getScheduleDisplay(schedule) {
    if (!schedule) return []
    
    const days = {
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Minggu',
      senin: 'Senin',
      selasa: 'Selasa',
      rabu: 'Rabu',
      kamis: 'Kamis',
      jumat: 'Jumat',
      sabtu: 'Sabtu',
      minggu: 'Minggu'
    }

    // Helper to format time
    function formatTime(time) {
      if (!time) return '-'
      // If time is an object with start/end
      if (typeof time === 'object' && time !== null) {
        const start = time.start || time.start_time || ''
        const end = time.end || time.end_time || ''
        if (start && end) return `${start} - ${end}`
        if (start) return start
        return '-'
      }
      // If time is already a string
      return time
    }

    if (Array.isArray(schedule)) {
      return schedule.map(s => ({
        day: days[s.day?.toLowerCase()] || s.day,
        time: s.time ? formatTime(s.time) : `${s.start_time || ''} - ${s.end_time || ''}`
      }))
    }

    // Handle object format { "Senin": { start: "09:00", end: "11:00" }, ... }
    return Object.entries(schedule).map(([day, time]) => ({
      day: days[day.toLowerCase()] || day,
      time: formatTime(time)
    }))
  }

  // Report card data
  const reportCard = ref({
    quizScores: [],
    latihanScores: [],
    quizAverage: 0,
    latihanAverage: 0,
    finalGrade: 0,
    isPassed: false,
    settings: { passing_grade: 70, quiz_weight: 60, latihan_weight: 40 }
  })

  // Fetch report card data (quiz scores, latihan scores, calculate final grade)
  async function fetchReportCard(userId, program) {
    if (!program?.les_place_id) return reportCard.value

    try {
      loading.value = true

      // 1. Fetch grade settings from les_place
      const { data: lesPlaceData } = await supabase
        .from('les_places')
        .select('settings')
        .eq('id', program.les_place_id)
        .single()

      const settings = {
        passing_grade: lesPlaceData?.settings?.passing_grade ?? 70,
        quiz_weight: lesPlaceData?.settings?.quiz_weight ?? 60,
        latihan_weight: lesPlaceData?.settings?.latihan_weight ?? 40
      }

      // 2. Fetch quiz attempts for this student (only for this program or general quizzes)
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, program_id')
        .eq('les_place_id', program.les_place_id)
        .eq('is_published', true)
        .or(`program_id.eq.${program.id},program_id.is.null`)

      const quizIds = quizzes?.map(q => q.id) || []
      let quizScores = []

      if (quizIds.length > 0) {
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('student_id', userId)
          .in('quiz_id', quizIds)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })

        // Get best score per quiz
        const quizBestScores = {}
        attempts?.forEach(a => {
          const quiz = quizzes.find(q => q.id === a.quiz_id)
          if (!quizBestScores[a.quiz_id] || quizBestScores[a.quiz_id].score < a.score) {
            quizBestScores[a.quiz_id] = {
              id: a.quiz_id,
              title: quiz?.title || 'Quiz',
              score: a.score,
              passed: a.passed,
              date: a.completed_at
            }
          }
        })
        quizScores = Object.values(quizBestScores)
      }

      // 3. Fetch latihan scores from grades table (type = exercise/latihan)
      // For now, use quiz scores only since latihan scoring isn't implemented yet
      // 3. Fetch latihan scores from exercise_submissions
      const { data: exercises } = await supabase
        .from('course_materials')
        .select('id, title')
        .eq('program_id', program.id)
        .eq('type', 'exercise')
        .eq('is_active', true)

      const materialIds = exercises?.map(e => e.id) || []
      let latihanScores = []

      if (materialIds.length > 0) {
        const { data: subData } = await supabase
          .from('exercise_submissions')
          .select('*')
          .eq('student_id', userId)
          .in('material_id', materialIds)
          .not('score', 'is', null)

        latihanScores = subData?.map(s => {
          const ex = exercises.find(e => e.id === s.material_id)
          return {
            id: s.id,
            title: ex?.title || 'Latihan',
            score: s.score,
            date: s.graded_at
          }
        }) || []
      }

      // 4. Calculate Final Grade
      const quizAvg = quizScores.length > 0 
        ? Math.round(quizScores.reduce((sum, q) => sum + q.score, 0) / quizScores.length) 
        : 0
      
      const latihanAvg = latihanScores.length > 0
        ? Math.round(latihanScores.reduce((sum, l) => sum + l.score, 0) / latihanScores.length)
        : 0

      const finalGrade = Math.round(
        (quizAvg * (settings.quiz_weight / 100)) + 
        (latihanAvg * (settings.latihan_weight / 100))
      )

      reportCard.value = {
        quiz_avg: quizAvg,
        latihan_avg: latihanAvg,
        final_grade: finalGrade,
        quizScores,
        latihanScores,
        quizAverage: quizAvg,
        latihanAverage: latihanAvg,
        finalGrade,
        isPassed: finalGrade >= settings.passing_grade,
        settings
      }

      return reportCard.value
    } catch (err) {
      console.error('Error fetching report card:', err)
      error.value = err.message
      return reportCard.value
    } finally {
      loading.value = false
    }
  }

  // ==================== EXERCISES (LATIHAN) ====================
  const exercises = ref([])

  // Fetch exercises for a program
  async function fetchExercises(programId, userId) {
    if (!programId) return []

    try {
      loading.value = true

      // Get exercises from course_materials with type='exercise'
      const { data: exerciseData, error: exErr } = await supabase
        .from('course_materials')
        .select('*')
        .eq('program_id', programId)
        .eq('type', 'exercise')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (exErr) throw exErr

      // Get student's submissions for these exercises
      const exerciseIds = exerciseData?.map(e => e.id) || []
      let submissionsMap = {}

      if (exerciseIds.length > 0 && userId) {
        const { data: submissions } = await supabase
          .from('exercise_submissions')
          .select('*')
          .eq('student_id', userId)
          .in('material_id', exerciseIds)

        submissions?.forEach(s => {
          submissionsMap[s.material_id] = s
        })
      }

      // Combine exercises with submission status
      exercises.value = exerciseData?.map(ex => ({
        ...ex,
        submission: submissionsMap[ex.id] || null,
        status: submissionsMap[ex.id] 
          ? (submissionsMap[ex.id].graded_at ? 'graded' : 'submitted')
          : 'pending'
      })) || []

      return exercises.value
    } catch (err) {
      console.error('Error fetching exercises:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Submit exercise answer
  async function submitExercise(materialId, userId, submissionUrl, notes = '') {
    try {
      const { data, error: err } = await supabase
        .from('exercise_submissions')
        .upsert({
          material_id: materialId,
          student_id: userId,
          submission_url: submissionUrl,
          submission_notes: notes,
          submitted_at: new Date().toISOString()
        }, { onConflict: 'material_id,student_id' })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (err) {
      console.error('Error submitting exercise:', err)
      error.value = err.message
      return null
    }
  }

  return {
    enrolledCourses,
    currentCourse,
    materials,
    tests,
    grades,
    attendance,
    exercises,
    reportCard,
    loading,
    error,
    fetchEnrolledCourses,
    fetchCourseDetail,
    fetchMaterials,
    fetchTests,
    fetchGrades,
    fetchAttendance,
    fetchExercises,
    submitExercise,
    fetchReportCard,
    updateMaterialProgress,
    calculateCourseProgress,
    getScheduleDisplay
  }
}
