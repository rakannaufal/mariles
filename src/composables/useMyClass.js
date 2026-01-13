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

  // Ambil kursus terdaftar/aktif siswa (booking berbayar)
  async function fetchEnrolledCourses(userId) {
    loading.value = true
    error.value = null

    try {
      // 1. Dapatkan ID Siswa dari ID Pengguna
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single()
      
      if (studentError || !studentData) {
        // Jika tidak ada profil siswa, berarti belum ada booking
        enrolledCourses.value = []
        return []
      }

      const studentId = studentData.id

      // 2. Ambil Booking
      const { data: bookingsData, error: err } = await supabase
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
        .in('status', ['active', 'confirmed', 'completed']) // Include completed for MyClass display
        .in('payment_status', ['paid', 'settlement', 'capture']) // Broaden payment status
        .neq('status', 'refunded') // Basic check
        .order('start_date', { ascending: false })

      if (err) throw err

      // 3. CEK DEFENSIF: Ambil refund yang disetujui untuk mengecualikannya
      // Ini menangani kasus dimana status booking tidak diupdate dengan benar
      const { data: approvedRefunds } = await supabase
        .from('refunds')
        .select('transaction_id, transactions(booking_id, program_id)')
        .eq('student_id', userId) // Use userId argument (which is the auth user id)
        .eq('status', 'approved')
      
      let filteredBookings = bookingsData || []

      if (approvedRefunds && approvedRefunds.length > 0) {
        console.log('Found approved refunds:', approvedRefunds)
        
        // Buat set ID program dan booking yang di-refund
        // cek keduanya program_id dan booking_id untuk keamanan
        const refundedProgramIds = new Set()
        const refundedBookingIds = new Set()
        
        approvedRefunds.forEach(r => {
          if (r.transactions?.program_id) refundedProgramIds.add(r.transactions.program_id)
          if (r.transactions?.booking_id) refundedBookingIds.add(r.transactions.booking_id)
        })
        
        console.log('Refunded Programs:', [...refundedProgramIds])
        console.log('Refunded Bookings:', [...refundedBookingIds])

        // Filter booking yang cocok dengan program yang di-refund
        filteredBookings = filteredBookings.filter(b => {
          const isRefundedBooking = refundedBookingIds.has(b.id)
          const isRefundedProgram = b.program?.id && refundedProgramIds.has(b.program.id)
          
          if (isRefundedBooking || isRefundedProgram) {
            console.log(`Booking ${b.id} (${b.program?.name}) excluded due to refund record`)
            return false
          }
          return true
        })
      }

      enrolledCourses.value = filteredBookings
    } catch (err) {
      error.value = err.message
      console.error('Error fetching enrolled courses:', err)
    } finally {
      loading.value = false
    }

    return enrolledCourses.value
  }

  // Ambil detail kursus tunggal
  async function fetchCourseDetail(bookingId, studentId) {
    loading.value = true
    error.value = null

    try {
      // 1. Dapatkan ID Siswa
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', studentId) // arg studentId sebenarnya userId dari komponen
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

  // Ambil materi kursus (modul dan video)
  async function fetchMaterials(programId, userId) {
    try {
      // Dapatkan ID siswa untuk filter progres (jika diperlukan RLS atau modifikasi query)
      // Asumsi RLS menangani visibilitas progres, atau kita filter di bawah
      
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
        // Cari progres untuk siswa spesifik ini
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

  // Ambil kuis untuk program (dari tabel quizzes - sama dengan yang digunakan pengajar)
  // studentId: students.id (ID tabel)
  // authUserId: auth.users.id opsional untuk fallback matching
  async function fetchTests(programId, studentId, authUserId = null) {
    try {
      // Pertama dapatkan les_place_id dari program
      const { data: program } = await supabase
        .from('programs')
        .select('les_place_id')
        .eq('id', programId)
        .single()

      if (!program?.les_place_id) {
        tests.value = []
        return tests.value
      }

      // Ambil kuis untuk program ini atau kuis umum (program_id = null)
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

      // Ambil percobaan untuk siswa ini - query dengan kedua ID untuk dukungan legacy
      let attemptsMap = {}
      if ((studentId || authUserId) && data?.length) {
        const quizIds = data.map(q => q.id)
        
        // Bangun query dengan kondisi OR untuk kedua ID
        let query = supabase
          .from('quiz_attempts')
          .select('quiz_id, score, passed, completed_at')
          .in('quiz_id', quizIds)
          .not('completed_at', 'is', null)
        
        // Gunakan kondisi OR jika kedua ID disediakan dan berbeda
        if (studentId && authUserId && studentId !== authUserId) {
          query = query.or(`student_id.eq.${studentId},student_id.eq.${authUserId}`)
        } else {
          query = query.eq('student_id', studentId || authUserId)
        }

        const { data: attempts } = await query

        if (attempts) {
          attempts.forEach(a => {
            if (!attemptsMap[a.quiz_id]) attemptsMap[a.quiz_id] = []
            attemptsMap[a.quiz_id].push(a)
          })
        }
      }

      // Map kuis dengan info percobaan dan status jadwal
      const now = new Date()
      tests.value = (data || []).map(q => {
        const attempts = attemptsMap[q.id] || []
        const startDate = q.start_date ? new Date(q.start_date) : null
        const endDate = q.end_date ? new Date(q.end_date) : null
        
        // Tentukan status jadwal
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
          max_attempts: q.max_attempts || 1, // gunakan nilai database atau default ke 1
          attempts,
          bestScore: attempts.length ? Math.max(...attempts.map(a => a.score || 0)) : null,
          attemptCount: attempts.length,
          isLocked: attempts.length >= (q.max_attempts || 1), // Kuis terkunci setelah menyelesaikan percobaan maksimal
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

  // Ambil nilai untuk booking
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

  // Ambil kehadiran untuk booking
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

  // Update progres materi
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

  // Tandai kursus/booking sebagai selesai
  async function markCourseAsCompleted(bookingId) {
    if (!bookingId) return false
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)
      
      if (error) throw error
      console.log('Course marked as completed:', bookingId)
      return true
    } catch (err) {
      console.error('Error marking course as completed:', err)
      return false
    }
  }

  // Hitung progres kursus keseluruhan
  function calculateCourseProgress(bookingId = null, currentStatus = null) {
    // Hitung semua item pembelajaran
    const moduleVideos = materials.value || []
    const quizList = tests.value || []
    const exerciseList = exercises.value || []
    
    // Pisahkan modul dan video
    const moduleItems = moduleVideos.filter(m => m.type !== 'video')
    const videoItems = moduleVideos.filter(m => m.type === 'video')
    
    // Hitung total item
    const totalModules = moduleItems.length
    const totalVideos = videoItems.length
    const totalQuizzes = quizList.length
    const totalExercises = exerciseList.length
    
    const totalItems = totalModules + totalVideos + totalQuizzes + totalExercises
    if (totalItems === 0) return 0
    
    // Hitung item yang selesai
    // Modul: progress.is_completed atau progress.is_read
    const completedModules = moduleItems.filter(m => 
      m.progress?.is_completed || m.progress?.is_read
    ).length
    
    // Video: progress.is_completed (diset oleh openMaterial), is_watched, atau watch_percentage >= 80
    const completedVideos = videoItems.filter(v => 
      v.progress?.is_completed || v.progress?.is_watched || (v.progress?.watch_percentage || 0) >= 80
    ).length
    
    // Kuis: punya bestScore (selesai setidaknya sekali) atau attemptCount > 0
    const completedQuizzes = quizList.filter(q => 
      q.bestScore !== null || q.attemptCount > 0
    ).length
    
    // Latihan: punya objek submission, submissionCount > 0, atau status 'submitted' atau 'graded'
    const completedExercises = exerciseList.filter(e => 
      e.submission || e.submissionCount > 0 || e.submissions?.length > 0 || 
      e.status === 'submitted' || e.status === 'graded'
    ).length
    
    const completedItems = completedModules + completedVideos + completedQuizzes + completedExercises
    
    // Log debug untuk troubleshooting
    console.log('Progress Debug:', {
      modules: `${completedModules}/${totalModules}`,
      videos: `${completedVideos}/${totalVideos}`,
      quizzes: `${completedQuizzes}/${totalQuizzes}`,
      exercises: `${completedExercises}/${totalExercises}`,
      total: `${completedItems}/${totalItems}`,
      percent: Math.round((completedItems / totalItems) * 100)
    })
    
    const percent = Math.round((completedItems / totalItems) * 100)
    
    // Auto-selesaikan booking saat progres mencapai 100%
    if (percent === 100 && bookingId && currentStatus !== 'completed') {
      markCourseAsCompleted(bookingId)
    }
    
    return percent
  }

  // Dapatkan jadwal untuk tampilan
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

    // Helper untuk format waktu
    function formatTime(time) {
      if (!time) return '-'
      // Jika time adalah objek dengan start/end
      if (typeof time === 'object' && time !== null) {
        const start = time.start || time.start_time || ''
        const end = time.end || time.end_time || ''
        if (start && end) return `${start} - ${end}`
        if (start) return start
        return '-'
      }
      // Jika time sudah berupa string
      return time
    }

    if (Array.isArray(schedule)) {
      return schedule.map(s => ({
        day: days[s.day?.toLowerCase()] || s.day,
        time: s.time ? formatTime(s.time) : `${s.start_time || ''} - ${s.end_time || ''}`
      }))
    }

    // Tangani format objek { "Senin": { start: "09:00", end: "11:00" }, ... }
    return Object.entries(schedule).map(([day, time]) => ({
      day: days[day.toLowerCase()] || day,
      time: formatTime(time)
    }))
  }

  // Data rapor
  const reportCard = ref({
    quizScores: [],
    latihanScores: [],
    quizAverage: 0,
    latihanAverage: 0,
    finalGrade: 0,
    isPassed: false,
    settings: { passing_grade: 70, quiz_weight: 60, latihan_weight: 40 }
  })

  // Ambil data rapor (skor kuis, skor latihan, hitung nilai akhir)
  // studentId: students.id (ID tabel)
  // authUserId: auth.users.id opsional untuk fallback matching
  async function fetchReportCard(studentId, program, authUserId = null) {
    if (!program?.les_place_id) return reportCard.value

    try {
      loading.value = true

      // 1. Ambil pengaturan nilai dari les_place
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

      // 2. Ambil percobaan kuis untuk siswa ini (hanya untuk program ini atau kuis umum)
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, program_id')
        .eq('les_place_id', program.les_place_id)
        .eq('is_published', true)
        .or(`program_id.eq.${program.id},program_id.is.null`)

      const quizIds = quizzes?.map(q => q.id) || []
      let quizScores = []

      if (quizIds.length > 0) {
        // Bangun query dengan kondisi OR untuk kedua ID
        let quizQuery = supabase
          .from('quiz_attempts')
          .select('*')
          .in('quiz_id', quizIds)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
        
        if (studentId && authUserId && studentId !== authUserId) {
          quizQuery = quizQuery.or(`student_id.eq.${studentId},student_id.eq.${authUserId}`)
        } else {
          quizQuery = quizQuery.eq('student_id', studentId || authUserId)
        }

        const { data: attempts } = await quizQuery

        // Dapatkan skor terbaik per kuis
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

      // 3. Ambil skor latihan dari exercise_submissions
      const { data: exercises } = await supabase
        .from('course_materials')
        .select('id, title')
        .eq('program_id', program.id)
        .eq('type', 'exercise')
        .eq('is_active', true)

      const materialIds = exercises?.map(e => e.id) || []
      let latihanScores = []

      if (materialIds.length > 0) {
        // Bangun query dengan kondisi OR untuk kedua ID
        let latihanQuery = supabase
          .from('exercise_submissions')
          .select('*')
          .in('material_id', materialIds)
          .not('score', 'is', null)
        
        if (studentId && authUserId && studentId !== authUserId) {
          latihanQuery = latihanQuery.or(`student_id.eq.${studentId},student_id.eq.${authUserId}`)
        } else {
          latihanQuery = latihanQuery.eq('student_id', studentId || authUserId)
        }

        const { data: subData } = await latihanQuery

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

      // 4. Hitung Nilai Akhir
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

  // ==================== LATIHAN ====================
  const exercises = ref([])

  // Ambil latihan untuk program
  // studentId: students.id (ID tabel)
  // authUserId: auth.users.id opsional untuk fallback matching
  async function fetchExercises(programId, studentId, authUserId = null) {
    if (!programId) return []

    try {
      loading.value = true

      // Dapatkan latihan dari course_materials dengan type='exercise'
      const { data: exerciseData, error: exErr } = await supabase
        .from('course_materials')
        .select('*')
        .eq('program_id', programId)
        .eq('type', 'exercise')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (exErr) throw exErr

      // Dapatkan submission siswa untuk latihan ini
      // Query dengan studentId (ID tabel) dan authUserId (ID auth) untuk menangani data legacy
      const exerciseIds = exerciseData?.map(e => e.id) || []
      let submissionsMap = {}

      if (exerciseIds.length > 0 && (studentId || authUserId)) {
        // Bangun query untuk mencocokkan ID tabel siswa atau ID pengguna auth
        let query = supabase
          .from('exercise_submissions')
          .select('*')
          .in('material_id', exerciseIds)
        
        // Gunakan kondisi OR jika kedua ID disediakan
        if (studentId && authUserId && studentId !== authUserId) {
          query = query.or(`student_id.eq.${studentId},student_id.eq.${authUserId}`)
        } else {
          query = query.eq('student_id', studentId || authUserId)
        }

        const { data: submissions } = await query

        submissions?.forEach(s => {
          submissionsMap[s.material_id] = s
        })
      }

      // Gabungkan latihan dengan status submission
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

  // Submit jawaban latihan
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
    getScheduleDisplay,
    markCourseAsCompleted
  }
}
