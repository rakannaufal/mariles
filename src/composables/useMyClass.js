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
          program:programs (
            id,
            name,
            description,
            subject,
            schedule,
            sessions_per_week,
            session_duration_minutes,
            level,
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
            is_completed,
            progress_percent,
            last_accessed_at
          )
        `)
        .eq('program_id', programId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (err) throw err
      
      materials.value = (data || []).map(m => ({
        ...m,
        progress: m.progress?.find(p => true) || { is_completed: false, progress_percent: 0 }
      }))
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

      // Get student ID for checking attempts
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single()

      const studentId = studentData?.id

      // Fetch quizzes for this les place or specific program
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
          created_at
        `)
        .eq('les_place_id', program.les_place_id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (err) throw err

      // Fetch attempts for this student
      let attemptsMap = {}
      if (studentId && data?.length) {
        const quizIds = data.map(q => q.id)
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('quiz_id, score, passed, completed_at')
          .eq('student_id', studentId)
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
          max_attempts: 3, // default max attempts
          attempts,
          bestScore: attempts.length ? Math.max(...attempts.map(a => a.score || 0)) : null,
          attemptCount: attempts.length,
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
    if (!materials.value.length) return 0
    const completed = materials.value.filter(m => m.progress?.is_completed).length
    return Math.round((completed / materials.value.length) * 100)
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

    if (Array.isArray(schedule)) {
      return schedule.map(s => ({
        day: days[s.day?.toLowerCase()] || s.day,
        time: s.time || `${s.start_time} - ${s.end_time}`
      }))
    }

    return Object.entries(schedule).map(([day, time]) => ({
      day: days[day.toLowerCase()] || day,
      time: time
    }))
  }

  return {
    enrolledCourses,
    currentCourse,
    materials,
    tests,
    grades,
    attendance,
    loading,
    error,
    fetchEnrolledCourses,
    fetchCourseDetail,
    fetchMaterials,
    fetchTests,
    fetchGrades,
    fetchAttendance,
    updateMaterialProgress,
    calculateCourseProgress,
    getScheduleDisplay
  }
}
