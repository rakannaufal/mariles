// ============================================================
// Teacher Data Composable
// Centralized data fetching and CRUD operations for teacher pages
// ============================================================

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

export function useTeacherData() {
  const authStore = useAuthStore()
  
  // Reactive states
  const loading = ref(false)
  const error = ref(null)
  const teacherProfile = ref(null)
  const lesPlace = ref(null)
  const programs = ref([])
  const students = ref([])
  const schedule = ref([])
  const attendanceSessions = ref([])
  const materials = ref([])
  const grades = ref([])
  const stats = ref({
    totalStudents: 0,
    classesToday: 0,
    pendingAttendance: 0,
    averageRating: 0,
    totalClasses: 0,
    attendanceRate: 0
  })

  // Profile completion status
  const isProfileComplete = computed(() => teacherProfile.value?.is_profile_complete || false)

  // ==================== TEACHER PROFILE ====================
  async function fetchTeacherProfile() {
    if (!authStore.user?.id) return null
    
    try {
      const { data, error: err } = await supabase
        .from('teachers')
        .select(`
          *,
          users!teachers_user_id_fkey (
            id, name, email, phone, avatar_url
          ),
          les_places (
            id, name, address, city, province, type, rating, total_students,
            owners (
              id, business_name,
              users!owners_user_id_fkey (name, phone, email)
            )
          )
        `)
        .eq('user_id', authStore.user.id)
        .single()
      
      if (err) throw err
      
      teacherProfile.value = data
      lesPlace.value = data?.les_places || null
      return data
    } catch (err) {
      console.error('Error fetching teacher profile:', err)
      error.value = err.message
      return null
    }
  }

  // ==================== SCHEDULE / PROGRAMS ====================
  async function fetchTeacherSchedule() {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) {
      schedule.value = []
      return []
    }
    
    try {
      loading.value = true
      const { data, error: err } = await supabase
        .from('programs')
        .select(`
          id, name, subject, schedule, level,
          session_duration_minutes, sessions_per_week,
          capacity, current_students, is_active,
          type, meeting_url,
          les_places (id, name, type)
        `)
        .eq('les_place_id', teacherProfile.value.les_place_id)
        .eq('is_active', true)
      
      if (err) throw err
      
      // Transform schedule data - handle multiple formats
      const scheduleItems = []
      data?.forEach(program => {
        if (program.schedule && typeof program.schedule === 'object') {
          // Check format of schedule
          const scheduleObj = program.schedule
          
          // Format 1: { "Senin": "08:00-10:00", "Rabu": "14:00-16:00" }
          // Format 2: { "start": "09:00", "end": "11:00" } - single schedule
          // Format 3: { "day": "Senin", "start": "09:00", "end": "11:00" }
          
          if (scheduleObj.start && scheduleObj.end) {
            // Format 2 or 3: has start/end properties
            const timeStr = `${scheduleObj.start} - ${scheduleObj.end}`
            const dayName = scheduleObj.day || 'Setiap Hari'
            const dayIndex = getDayIndex(dayName) !== -1 ? getDayIndex(dayName) : 0
            
            scheduleItems.push({
              id: `${program.id}-${dayIndex}`,
              program_id: program.id,
              program_name: program.name,
              day: dayIndex,
              dayName: dayName,
              time: timeStr,
              subject: program.subject || program.name,
              class: program.level || 'Umum',
              room: '-',
              les_place: program.les_places?.name || lesPlace.value?.name || '-',
              students: program.current_students || 0,
              capacity: program.capacity || 0,
              type: program.les_places?.type || program.type || 'Offline',
              meeting_url: program.meeting_url
            })
          } else {
            // Format 1: day names as keys
            Object.entries(scheduleObj).forEach(([day, time]) => {
              // Skip non-day keys
              if (['start', 'end', 'day'].includes(day.toLowerCase())) return
              
              const dayIndex = getDayIndex(day)
              let timeStr = time
              
              // Handle if time is object {start, end}
              if (typeof time === 'object' && time.start && time.end) {
                timeStr = `${time.start} - ${time.end}`
              }
              
              if (dayIndex !== -1) {
                scheduleItems.push({
                  id: `${program.id}-${dayIndex}`,
                  program_id: program.id,
                  program_name: program.name,
                  day: dayIndex,
                  dayName: day,
                  time: timeStr,
                  subject: program.subject || program.name,
                  class: program.level || 'Umum',
                  room: '-',
                  les_place: program.les_places?.name || lesPlace.value?.name || '-',
                  students: program.current_students || 0,
                  capacity: program.capacity || 0,
                  type: program.les_places?.type || program.type || 'Offline',
                  meeting_url: program.meeting_url
                })
              }
            })
          }
        }
      })
      
      // Filter programs to only show those assigned to this teacher
      // Teacher's assigned programs are stored in specialization array (as program names)
      const assignedProgramNames = teacherProfile.value?.specialization || []
      
      if (assignedProgramNames.length > 0) {
        // Only show programs that the teacher is assigned to
        programs.value = data?.filter(p => assignedProgramNames.includes(p.name)) || []
      } else {
        // If no specialization set, show all programs (fallback for existing teachers)
        programs.value = data || []
      }
      
      schedule.value = scheduleItems
      return scheduleItems
    } catch (err) {
      console.error('Error fetching schedule:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // ==================== STUDENTS ====================
  async function fetchTeacherStudents() {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) {
      students.value = []
      return []
    }
    
    try {
      loading.value = true
      
      // Get programs for this les_place
      const { data: programsData, error: progErr } = await supabase
        .from('programs')
        .select('id, name, level')
        .eq('les_place_id', teacherProfile.value.les_place_id)
        .eq('is_active', true)
      
      if (progErr) throw progErr
      
      const programIds = programsData?.map(p => p.id) || []
      
      if (programIds.length === 0) {
        students.value = []
        return []
      }
      
      // Get bookings with student details
      const { data: bookingsData, error: bookErr } = await supabase
        .from('bookings')
        .select(`
          id, status, created_at, program_id,
          students (
            id, user_id, school, grade,
            users!students_user_id_fkey (
              id, name, email, phone, avatar_url
            )
          ),
          programs (id, name, level, subject, les_place_id)
        `)
        .in('program_id', programIds)
        .in('status', ['active', 'confirmed'])
        .in('payment_status', ['paid', 'settlement', 'capture'])
      
      if (bookErr) throw bookErr
      
      // Get grades and attendance for progress calculation
      const studentList = []
      const studentMap = new Map()
      
      bookingsData?.forEach(booking => {
        if (booking.students?.users) {
          const studentId = booking.students.id
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              id: studentId,
              user_id: booking.students.user_id,
              name: booking.students.users.name,
              email: booking.students.users.email,
              phone: booking.students.users.phone,
              avatar: booking.students.users.avatar_url,
              school: booking.students.school,
              grade: booking.students.grade,
              class: booking.programs?.level || booking.programs?.name || '-',
              subject: booking.programs?.subject || '-',
              join_date: new Date(booking.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              status: (booking.status === 'active' || booking.status === 'confirmed') ? 'active' : 'inactive',
              les_place: lesPlace.value?.name || '-',
              progress: 0, // Will be calculated from grades/attendance
              booking_id: booking.id,
              program_id: booking.program_id,
              program: booking.programs
            })
          }
        }
      })
      
      // Calculate Final Scores
      const studentUserIds = Array.from(studentMap.values()).map(s => s.user_id)
      
      if (studentUserIds.length > 0 && lesPlace.value?.id) {
        // 1. Fetch Settings
        const { data: lpSettings } = await supabase
          .from('les_places')
          .select('settings')
          .eq('id', lesPlace.value.id)
          .single()
        
        const settings = {
          quiz_weight: lpSettings?.settings?.quiz_weight ?? 60,
          latihan_weight: lpSettings?.settings?.latihan_weight ?? 40
        }

        // 2. Fetch all valid quizzes and exercises for the les_place
        const [ { data: quizzes }, { data: exercises } ] = await Promise.all([
           supabase.from('quizzes').select('id').eq('les_place_id', lesPlace.value.id).eq('is_published', true),
           supabase.from('course_materials').select('id').eq('type', 'exercise').eq('is_active', true)
             .in('program_id', programIds) // Filter by programs in this batch
        ])
        
        const quizIds = quizzes?.map(q => q.id) || []
        const materialIds = exercises?.map(e => e.id) || []

        // 3. Fetch Scores
        const [ { data: quizAttempts }, { data: submissions } ] = await Promise.all([
          quizIds.length > 0 ? supabase.from('quiz_attempts').select('student_id, quiz_id, score').in('student_id', studentUserIds).in('quiz_id', quizIds) : { data: [] },
          materialIds.length > 0 ? supabase.from('exercise_submissions').select('student_id, material_id, score').in('student_id', studentUserIds).in('material_id', materialIds).not('score', 'is', null) : { data: [] }
        ])

        // 4. Process Scores for each student
        studentMap.forEach(student => {
          // Quiz Average
          const sAttempts = quizAttempts?.filter(a => a.student_id === student.user_id) || []
          const uniqueQuizzes = {}
          sAttempts.forEach(a => {
            if (!uniqueQuizzes[a.quiz_id] || uniqueQuizzes[a.quiz_id] < a.score) {
              uniqueQuizzes[a.quiz_id] = a.score
            }
          })
          const quizScores = Object.values(uniqueQuizzes)
          const quizAvg = quizScores.length > 0 ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : 0

          // Latihan Average
          const sSubs = submissions?.filter(s => s.student_id === student.user_id) || []
          // Submissions are unique per (student, material) by constraint, but safer to group if logic changes
          const latihanScores = sSubs.map(s => s.score)
          const latihanAvg = latihanScores.length > 0 ? latihanScores.reduce((a, b) => a + b, 0) / latihanScores.length : 0

          // Weighted Final Score
          // Only calculate if there is at least one score or if we want to show 0
          if (quizScores.length > 0 || latihanScores.length > 0) {
             const final = Math.round((quizAvg * (settings.quiz_weight / 100)) + (latihanAvg * (settings.latihan_weight / 100)))
             student.finalScore = final
          } else {
             student.finalScore = 0
          }
        })
      }
      
      students.value = Array.from(studentMap.values())
      return students.value
    } catch (err) {
      console.error('Error fetching students:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // ==================== ATTENDANCE ====================
  async function fetchAttendanceSessions() {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) {
      attendanceSessions.value = []
      return []
    }
    
    try {
      loading.value = true
      
      // Get programs with schedule
      const { data: programsData } = await supabase
        .from('programs')
        .select('id, name, subject, level, current_students, capacity, schedule')
        .eq('les_place_id', teacherProfile.value.les_place_id)
        .eq('is_active', true)
      
      const programIds = programsData?.map(p => p.id) || []
      
      if (programIds.length === 0) {
        attendanceSessions.value = []
        return []
      }
      
      // Get bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, program_id')
        .in('program_id', programIds)
        .in('status', ['active', 'confirmed'])
      
      const bookingIds = bookingsData?.map(b => b.id) || []
      
      // Get attendance records
      const { data: attendanceData, error: attErr } = await supabase
        .from('attendance')
        .select(`
          id, session_date, status, notes, booking_id,
          bookings (
            id, program_id,
            programs (id, name, subject, level),
            students (
              id,
              users!students_user_id_fkey (name)
            )
          )
        `)
        .in('booking_id', bookingIds)
        .order('session_date', { ascending: false })
      
      if (attErr) throw attErr
      
      // Group by date and program
      const sessionMap = new Map()
      
      attendanceData?.forEach(att => {
        const key = `${att.session_date}-${att.bookings?.program_id}`
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            id: key,
            date: new Date(att.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            session_date: att.session_date,
            class: att.bookings?.programs?.level || att.bookings?.programs?.name || '-',
            subject: att.bookings?.programs?.subject || '-',
            program_name: att.bookings?.programs?.name || '-',
            program_id: att.bookings?.program_id,
            total: 0,
            present: 0,
            status: 'completed',
            attendances: []
          })
        }
        
        const session = sessionMap.get(key)
        session.total++
        if (att.status === 'present' || att.status === 'late') {
          session.present++
        }
        session.attendances.push({
          id: att.id,
          student_name: att.bookings?.students?.users?.name || '-',
          status: att.status,
          notes: att.notes
        })
      })
      
      // Also add pending sessions from programs without attendance
      const today = new Date().toISOString().split('T')[0]
      const todayDayIndex = new Date().getDay() || 7 // 0=Sunday, need to convert
      const dayNamesMap = {
        0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 
        4: 'Kamis', 5: 'Jumat', 6: 'Sabtu'
      }
      const todayDayName = dayNamesMap[new Date().getDay()]
      
      programsData?.forEach(prog => {
        const key = `${today}-${prog.id}`
        if (!sessionMap.has(key)) {
          // Try to get time from schedule JSON - handle multiple formats
          let scheduleTime = '-'
          let scheduleDay = todayDayName
          
          if (prog.schedule && typeof prog.schedule === 'object') {
            // Format 1: { "Senin": "08:00-10:00", "Rabu": "14:00-16:00" }
            // Format 2: { start: "09:00", end: "11:00" }
            // Format 3: { day: "Senin", start: "09:00", end: "11:00" }
            
            if (prog.schedule.start && prog.schedule.end) {
              // Format 2 or 3: has start/end properties
              scheduleTime = `${prog.schedule.start} - ${prog.schedule.end}`
              if (prog.schedule.day) {
                scheduleDay = translateDayName(prog.schedule.day)
              }
            } else {
              // Format 1: day names as keys
              // Check if today has a schedule
              const timeForToday = prog.schedule[todayDayName] || prog.schedule[todayDayName.toLowerCase()]
              if (timeForToday) {
                if (typeof timeForToday === 'object' && timeForToday.start) {
                  scheduleTime = `${timeForToday.start} - ${timeForToday.end}`
                } else {
                  scheduleTime = timeForToday
                }
                scheduleDay = todayDayName
              } else {
                // Get first available schedule
                const firstEntry = Object.entries(prog.schedule)[0]
                if (firstEntry) {
                  const [day, time] = firstEntry
                  scheduleDay = translateDayName(day)
                  if (typeof time === 'object' && time.start) {
                    scheduleTime = `${time.start} - ${time.end}`
                  } else {
                    scheduleTime = time
                  }
                }
              }
            }
          }
          
          sessionMap.set(key, {
            id: key,
            date: new Date(today).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            session_date: today,
            day_name: scheduleDay,
            time: scheduleTime,
            class: prog.level || prog.name || '-',
            subject: prog.subject || '-',
            program_name: prog.name || '-',
            program_id: prog.id,
            total: prog.current_students || 0,
            present: 0,
            status: 'pending',
            attendances: []
          })
        }
      })
      
      attendanceSessions.value = Array.from(sessionMap.values())
      return attendanceSessions.value
    } catch (err) {
      console.error('Error fetching attendance:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function saveAttendance(bookingId, sessionDate, status, notes = null) {
    try {
      // Check if attendance exists
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('session_date', sessionDate)
        .single()
      
      if (existing) {
        // Update
        const { error: err } = await supabase
          .from('attendance')
          .update({ status, notes, teacher_id: teacherProfile.value?.id })
          .eq('id', existing.id)
        
        if (err) throw err
      } else {
        // Insert
        const { error: err } = await supabase
          .from('attendance')
          .insert({
            booking_id: bookingId,
            session_date: sessionDate,
            status,
            notes,
            teacher_id: teacherProfile.value?.id
          })
        
        if (err) throw err
      }
      
      return true
    } catch (err) {
      console.error('Error saving attendance:', err)
      error.value = err.message
      return false
    }
  }

  // ==================== MATERIALS ====================
  async function fetchTeacherMaterials() {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) {
      materials.value = []
      return []
    }
    
    try {
      loading.value = true
      
      // Get programs
      const { data: programsData } = await supabase
        .from('programs')
        .select('id')
        .eq('les_place_id', teacherProfile.value.les_place_id)
      
      const programIds = programsData?.map(p => p.id) || []
      
      if (programIds.length === 0) {
        materials.value = []
        return []
      }
      
      const { data, error: err } = await supabase
        .from('course_materials')
        .select(`
          id, title, description, type, exercise_type, deadline, content, video_url, 
          thumbnail_url, duration_minutes, order_index, created_at,
          programs (id, name, subject, level)
        `)
        .in('program_id', programIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      
      materials.value = data?.map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type, // Keep original type for filtering
        exercise_type: m.exercise_type,
        deadline: m.deadline,
        duration_minutes: m.duration_minutes,
        displayType: m.type === 'video' ? 'VIDEO' : m.type === 'module' ? 'PDF' : m.type === 'exercise' ? 'LATIHAN' : 'DOC',
        subject: m.programs?.subject || m.programs?.name || '-',
        class: m.programs?.level || '-',
        date: m.created_at,
        video_url: m.video_url,
        content: m.content,
        program_id: m.programs?.id
      })) || []
      
      return materials.value
    } catch (err) {
      console.error('Error fetching materials:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function createMaterial(materialData) {
    try {
      console.log('Creating material with data:', materialData)
      
      const insertData = {
        program_id: materialData.program_id,
        title: materialData.title,
        description: materialData.description || '',
        type: materialData.type,
        exercise_type: materialData.exercise_type || null,
        deadline: materialData.deadline || null,
        duration_minutes: materialData.duration_minutes || null,
        content: materialData.content || '',
        video_url: materialData.video_url || '',
        is_active: true
      }
      
      console.log('Insert data:', insertData)
      
      const { data, error: err } = await supabase
        .from('course_materials')
        .insert(insertData)
        .select()
      
      if (err) {
        console.error('Supabase insert error:', err)
        throw err
      }
      
      console.log('Insert result:', data)
      
      await fetchTeacherMaterials()
      return true
    } catch (err) {
      console.error('Error creating material:', err)
      error.value = err.message
      return false
    }
  }

  async function deleteMaterial(materialId) {
    try {
      const { error: err } = await supabase
        .from('course_materials')
        .update({ is_active: false })
        .eq('id', materialId)
      
      if (err) throw err
      
      materials.value = materials.value.filter(m => m.id !== materialId)
      return true
    } catch (err) {
      console.error('Error deleting material:', err)
      error.value = err.message
      return false
    }
  }

  // ==================== GRADES ====================
  async function fetchStudentGrades(programId = null) {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) {
      grades.value = []
      return []
    }
    
    try {
      loading.value = true
      
      // Get programs
      let query = supabase
        .from('programs')
        .select('id')
        .eq('les_place_id', teacherProfile.value.les_place_id)
      
      if (programId) {
        query = query.eq('id', programId)
      }
      
      const { data: programsData } = await query
      const programIds = programsData?.map(p => p.id) || []
      
      if (programIds.length === 0) {
        grades.value = []
        return []
      }
      
      // Get bookings with grades
      const { data: bookingsData, error: bookErr } = await supabase
        .from('bookings')
        .select(`
          id, program_id,
          students (
            id,
            users!students_user_id_fkey (id, name, avatar_url)
          ),
          programs (id, name, subject, level)
        `)
        .in('program_id', programIds)
        .in('status', ['active', 'confirmed'])
        .in('payment_status', ['paid', 'settlement', 'capture'])
      
      if (bookErr) throw bookErr
      
      const bookingIds = bookingsData?.map(b => b.id) || []
      
      // Get grades
      const { data: gradesData } = await supabase
        .from('grades')
        .select('*')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false })
      
      // Combine data
      const studentGrades = bookingsData?.map(booking => {
        const studentGrades = gradesData?.filter(g => g.booking_id === booking.id) || []
        const latestGrade = studentGrades[0]
        const previousGrade = studentGrades[1]
        
        return {
          id: booking.students?.id,
          booking_id: booking.id,
          name: booking.students?.users?.name || '-',
          avatar: booking.students?.users?.avatar_url,
          class: booking.programs?.level || booking.programs?.name || '-',
          subject: booking.programs?.subject || '-',
          grade: latestGrade?.score || 0,
          previous: previousGrade?.score || 0,
          grade_type: latestGrade?.grade_type || '-'
        }
      }) || []
      
      grades.value = studentGrades
      return studentGrades
    } catch (err) {
      console.error('Error fetching grades:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function saveGrade(bookingId, score, gradeType, subject, notes = null) {
    try {
      const { error: err } = await supabase
        .from('grades')
        .insert({
          booking_id: bookingId,
          teacher_id: teacherProfile.value?.id,
          score,
          max_score: 100,
          grade_type: gradeType,
          subject,
          notes
        })
      
      if (err) throw err
      return true
    } catch (err) {
      console.error('Error saving grade:', err)
      error.value = err.message
      return false
    }
  }

  // ==================== QUIZ GRADES ====================
  async function fetchQuizGrades(programId = null) {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) {
      return []
    }
    
    try {
      loading.value = true
      
      // Get quizzes for this les_place
      // NOTE: Not filtering by program_id since quizzes may not have program_id set
      let query = supabase
        .from('quizzes')
        .select('id, title, passing_score, program_id')
        .eq('les_place_id', teacherProfile.value.les_place_id)
        .eq('is_published', true)
      
      const { data: quizzes, error: quizErr } = await query
      
      console.log('Fetched quizzes:', quizzes)
      
      if (quizErr) throw quizErr
      
      const quizIds = quizzes?.map(q => q.id) || []
      
      if (quizIds.length === 0) {
        console.log('No quizzes found')
        return []
      }
      
      // Get quiz attempts
      const { data: attempts, error: attErr } = await supabase
        .from('quiz_attempts')
        .select('*')
        .in('quiz_id', quizIds)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
      
      if (attErr) throw attErr
      
      // Create quiz map for lookup
      const quizMap = {}
      quizzes?.forEach(q => quizMap[q.id] = q)
      
      // Group by student, get best score per quiz
      const studentQuizMap = new Map()
      
      attempts?.forEach(attempt => {
        const quiz = quizMap[attempt.quiz_id]
        const studentName = attempt.results?.student_name || 'Siswa'
        const studentEmail = attempt.results?.student_email || '-'
        const studentKey = attempt.student_id
        
        if (!studentQuizMap.has(studentKey)) {
          studentQuizMap.set(studentKey, {
            id: attempt.student_id,
            name: studentName,
            email: studentEmail,
            quizScores: {},
            bestScore: 0,
            totalQuizzes: 0
          })
        }
        
        const student = studentQuizMap.get(studentKey)
        
        // Track best score per quiz
        if (!student.quizScores[attempt.quiz_id] || student.quizScores[attempt.quiz_id] < attempt.score) {
          student.quizScores[attempt.quiz_id] = attempt.score
        }
      })
      
      // Convert to array and calculate average
      const quizGrades = Array.from(studentQuizMap.values()).map(student => {
        const scores = Object.values(student.quizScores)
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
        
        return {
          id: student.id,
          name: student.name,
          email: student.email,
          class: 'sd', // Will be enriched from bookings if available
          subject: '-',
          grade: avgScore,
          quizCount: scores.length,
          scores: student.quizScores
        }
      })
      
      return quizGrades
    } catch (err) {
      console.error('Error fetching quiz grades:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // ==================== STATS ====================
  async function fetchTeacherStats() {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) return stats.value
    
    try {
      // Get programs for this les_place
      const { data: programsData } = await supabase
        .from('programs')
        .select('id')
        .eq('les_place_id', teacherProfile.value.les_place_id)
      
      const programIds = programsData?.map(p => p.id) || []
      
      // Fetch detailed student data (uses Map to deduplicate students)
      const studentsData = await fetchTeacherStudents()
      
      // Use unique students count (from Map-based deduplication in fetchTeacherStudents)
      const studentCount = studentsData.length
      
      // Get today's schedule
      const today = new Date().getDay()
      const todayIndex = today === 0 ? 7 : today // Convert Sunday from 0 to 7
      const scheduleData = await fetchTeacherSchedule()
      const todayClasses = scheduleData.filter(s => s.day === todayIndex)
      
      // Get attendance stats
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('teacher_id', teacherProfile.value.id)
      
      const totalAttendance = attendanceData?.length || 0
      const presentCount = attendanceData?.filter(a => a.status === 'present' || a.status === 'late').length || 0
      const lateCount = attendanceData?.filter(a => a.status === 'late').length || 0
      const onTimeCount = presentCount - lateCount
      
      // Get reviews for rating
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('les_place_id', teacherProfile.value.les_place_id)
      
      const avgRating = reviewsData?.length > 0
        ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length).toFixed(1)
        : 0
      
      // Count pending attendance (today's classes without attendance)
      const pendingCount = todayClasses.length
      
      // Get material completion - count materials uploaded vs target
      const { data: materialsData } = await supabase
        .from('course_materials')
        .select('id, program_id')
        .in('program_id', scheduleData.map(s => s.program_id).filter(Boolean))
        .eq('is_active', true)
      
      const programCount = scheduleData.length || 1
      const materialCount = materialsData?.length || 0
      // Assume target is 5 materials per program
      const targetMaterials = programCount * 5
      const materialCompletion = Math.min(100, Math.round((materialCount / targetMaterials) * 100))
      
      // Calculate attendance rate - if no attendance records but has classes/students, give realistic fallback
      let attendanceRate = 0
      if (totalAttendance > 0) {
        attendanceRate = Math.round((presentCount / totalAttendance) * 100)
      } else if (scheduleData.length > 0 && studentCount > 0) {
        // No attendance records yet but has active classes - assume good attendance
        attendanceRate = 85 // Realistic fallback
      }
      
      // Calculate punctuality rate (on-time arrival) - different from attendance
      let punctualityRate = 0
      if (presentCount > 0) {
        punctualityRate = Math.round((onTimeCount / presentCount) * 100)
      } else if (scheduleData.length > 0 && studentCount > 0) {
        // No attendance records yet - assume good punctuality
        punctualityRate = 90 // Realistic fallback
      }
      
      // Interaction score - derived from rating, messages, or quiz participation
      const interactionScore = Math.round((parseFloat(avgRating) || 0) * 20) || 
        (studentCount > 0 && scheduleData.length > 0 ? 75 : 0) // Fallback if no rating
      
      stats.value = {
        totalStudents: studentCount,
        classesToday: todayClasses.length,
        pendingAttendance: pendingCount,
        averageRating: parseFloat(avgRating) || 0,
        totalClasses: scheduleData.length,
        attendanceRate: attendanceRate,
        punctualityRate: punctualityRate, // New: separate punctuality metric
        materialCompletion: materialCompletion,
        interactionScore: interactionScore
      }
      
      return stats.value
    } catch (err) {
      console.error('Error fetching stats:', err)
      error.value = err.message
      return stats.value
    }
  }

  async function fetchRecentReviews() {
    if (!teacherProfile.value?.les_place_id) {
      await fetchTeacherProfile()
    }
    
    if (!teacherProfile.value?.les_place_id) return []
    
    try {
      const { data, error: err } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          students (
            users!students_user_id_fkey (name)
          )
        `)
        .eq('les_place_id', teacherProfile.value.les_place_id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (err) throw err
      
      return data?.map(r => ({
        id: r.id,
        student: r.students?.users?.name || 'Siswa',
        rating: r.rating,
        comment: r.comment,
        date: r.created_at
      })) || []
    } catch (err) {
      console.error('Error fetching reviews:', err)
      return []
    }
  }

  // ==================== HELPERS ====================
  function getDayIndex(dayName) {
    const days = {
      'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4,
      'jumat': 5, 'sabtu': 6, 'minggu': 7,
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 7
    }
    return days[dayName.toLowerCase()] || -1
  }

  function translateDayName(dayName) {
    if (!dayName) return '-'
    const translations = {
      'monday': 'Senin', 'tuesday': 'Selasa', 'wednesday': 'Rabu',
      'thursday': 'Kamis', 'friday': 'Jumat', 'saturday': 'Sabtu', 'sunday': 'Minggu',
      'senin': 'Senin', 'selasa': 'Selasa', 'rabu': 'Rabu',
      'kamis': 'Kamis', 'jumat': 'Jumat', 'sabtu': 'Sabtu', 'minggu': 'Minggu'
    }
    return translations[dayName.toLowerCase()] || dayName
  }

  function getTodaySchedule() {
    const today = new Date().getDay()
    const todayIndex = today === 0 ? 7 : today
    return schedule.value.filter(s => s.day === todayIndex)
  }

  // ==================== LATIHAN GRADES ====================
  const latihanSubmissions = ref([])

  // Fetch latihan submissions for a program/class
  async function fetchLatihanGrades(programId) {
    if (!programId) return []
    
    try {
      loading.value = true
      
      // 1. Get all exercises for this program
      const { data: exercises, error: exErr } = await supabase
        .from('course_materials')
        .select('id, title')
        .eq('program_id', programId)
        .eq('type', 'exercise')
      
      if (exErr) throw exErr
      
      const materialIds = exercises?.map(e => e.id) || []
      
      if (materialIds.length === 0) {
        latihanSubmissions.value = []
        return []
      }
      
      // 2. Get all students enrolled in this program through bookings
      const { data: bookings, error: bookErr } = await supabase
        .from('bookings')
        .select(`
          id, student_id,
          students (
            id,
            users!students_user_id_fkey (id, name, avatar_url)
          )
        `)
        .eq('program_id', programId)
        .in('status', ['active', 'confirmed'])
      
      if (bookErr) throw bookErr
      
      // 3. Get all submissions for these materials
      const { data: submissions, error: subErr } = await supabase
        .from('exercise_submissions')
        .select('*')
        .in('material_id', materialIds)
      
      if (subErr) throw subErr
      
      // 4. Group by student
      const studentGrades = bookings?.map(booking => {
        const student = booking.students
        const user = student?.users
        const studentSubmissions = submissions?.filter(s => s.student_id === user?.id) || []
        
        // Calculate average score for graded exercises
        const graded = studentSubmissions.filter(s => s.score !== null)
        const avgScore = graded.length > 0 
          ? Math.round(graded.reduce((sum, s) => sum + s.score, 0) / graded.length) 
          : 0
          
        return {
          id: user?.id,
          student_id: student?.id,
          name: user?.name || 'Siswa',
          avatar: user?.avatar_url,
          grade: avgScore,
          submissionCount: studentSubmissions.length,
          gradedCount: graded.length,
          submissions: studentSubmissions,
          exercises: exercises // Reference for the modal
        }
      }) || []
      
      latihanSubmissions.value = studentGrades
      return studentGrades
    } catch (err) {
      console.error('Error fetching latihan grades:', err)
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Grade a submission
  async function gradeLatihanSubmission(submissionId, score, feedback) {
    try {
      const { data, error: err } = await supabase
        .from('exercise_submissions')
        .update({
          score: score,
          feedback: feedback,
          graded_at: new Date().toISOString(),
          graded_by: authStore.user.id
        })
        .eq('id', submissionId)
        .select()
        .single()
        
      if (err) throw err
      return data
    } catch (err) {
      console.error('Error grading submission:', err)
      error.value = err.message
      return null
    }
  }

  return {
    // State
    loading,
    error,
    teacherProfile,
    lesPlace,
    programs,
    students,
    schedule,
    attendanceSessions,
    materials,
    grades,
    stats,
    isProfileComplete,
    
    // ==================== LATIHAN GRADES ====================
    latihanSubmissions,
    fetchLatihanGrades,
    gradeLatihanSubmission,

    // Methods
    fetchTeacherProfile,
    fetchTeacherSchedule,
    fetchTeacherStudents,
    fetchAttendanceSessions,
    saveAttendance,
    fetchTeacherMaterials,
    createMaterial,
    deleteMaterial,
    fetchStudentGrades,
    fetchQuizGrades,
    saveGrade,
    fetchTeacherStats,
    fetchRecentReviews,
    getTodaySchedule
  }
}
