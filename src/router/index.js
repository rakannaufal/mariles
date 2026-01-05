import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

// =====================================================
// LAZY LOADING - Komponen dimuat hanya saat dibutuhkan
// =====================================================

const routes = [
  // Public Routes
  { 
    path: '/', 
    name: 'home', 
    component: () => import('@/views/public/HomePage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/search', 
    name: 'search', 
    component: () => import('@/views/public/SearchPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/les/:id', 
    name: 'les-detail', 
    component: () => import('@/views/public/LesDetailPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/login', 
    name: 'login', 
    component: () => import('@/views/public/LoginPage.vue'), 
    meta: { public: true, authPage: true } 
  },
  { 
    path: '/register', 
    name: 'register', 
    component: () => import('@/views/public/RegisterPage.vue'), 
    meta: { public: true, authPage: true } 
  },
  { 
    path: '/faq', 
    name: 'faq', 
    component: () => import('@/views/public/FAQPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/partner-guide', 
    name: 'partner-guide', 
    component: () => import('@/views/public/PartnerGuidePage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/about', 
    name: 'about', 
    component: () => import('@/views/public/AboutPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/privacy-policy', 
    name: 'privacy-policy', 
    component: () => import('@/views/public/PrivacyPolicyPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/terms', 
    name: 'terms', 
    component: () => import('@/views/public/TermsPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/how-it-works', 
    name: 'how-it-works', 
    component: () => import('@/views/public/HowItWorksPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/teacher-guide', 
    name: 'teacher-guide', 
    component: () => import('@/views/public/TeacherGuidePage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/contact', 
    name: 'contact', 
    component: () => import('@/views/public/ContactPage.vue'), 
    meta: { public: true } 
  },
  { 
    path: '/auth/callback', 
    name: 'auth-callback', 
    component: () => import('@/views/public/AuthCallback.vue'), 
    meta: { public: true } 
  },

  // Student Routes
  { 
    path: '/student/dashboard', 
    name: 'student-dashboard', 
    component: () => import('@/views/student/dashboard/StudentDashboard.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/bookings', 
    name: 'student-bookings', 
    component: () => import('@/views/student/dashboard/StudentBookings.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/myclass', 
    name: 'student-myclass', 
    component: () => import('@/views/student/StudentMyClass.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/myclass/:bookingId', 
    name: 'student-myclass-detail', 
    component: () => import('@/views/student/MyClassDetail.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/quiz/:quizId', 
    name: 'student-quiz', 
    component: () => import('@/views/student/StudentQuiz.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/progress', 
    name: 'student-progress', 
    component: () => import('@/views/student/dashboard/StudentProgress.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/payment/:bookingId', 
    name: 'student-payment', 
    component: () => import('@/views/student/StudentPayment.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/payment/success', 
    name: 'payment-success', 
    component: () => import('@/views/student/PaymentSuccess.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/payment/pending', 
    name: 'payment-pending', 
    component: () => import('@/views/student/PaymentPending.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/favorites', 
    name: 'student-favorites', 
    component: () => import('@/views/student/dashboard/StudentFavorites.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/profile', 
    name: 'student-profile', 
    component: () => import('@/views/student/dashboard/StudentProfile.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/settings', 
    name: 'student-settings', 
    component: () => import('@/views/student/dashboard/StudentSettings.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/chat', 
    name: 'student-chat', 
    component: () => import('@/views/student/StudentChat.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/forum', 
    name: 'student-forum', 
    component: () => import('@/views/student/StudentForum.vue'), 
    meta: { role: 'student' } 
  },
  { 
    path: '/student/notifications', 
    name: 'student-notifications', 
    component: () => import('@/views/student/StudentNotifications.vue'), 
    meta: { role: 'student' } 
  },

  // Owner Routes
  { 
    path: '/owner/dashboard', 
    name: 'owner-dashboard', 
    component: () => import('@/views/owner/OwnerDashboard.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/les', 
    name: 'owner-les', 
    component: () => import('@/views/owner/OwnerLesManagement.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/vouchers', 
    name: 'owner-vouchers', 
    component: () => import('@/views/owner/OwnerVouchers.vue'), 
    meta: { requiresAuth: true, role: 'owner' } 
  },
  { 
    path: '/owner/programs', 
    name: 'owner-programs', 
    component: () => import('@/views/owner/OwnerPrograms.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/teachers', 
    name: 'owner-teachers', 
    component: () => import('@/views/owner/OwnerTeachers.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/registrations', 
    name: 'owner-registrations', 
    component: () => import('@/views/owner/OwnerRegistrations.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/statistics', 
    name: 'owner-statistics', 
    component: () => import('@/views/owner/OwnerStatistics.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/finance', 
    name: 'owner-finance', 
    component: () => import('@/views/owner/OwnerFinance.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/reviews', 
    name: 'owner-reviews', 
    component: () => import('@/views/owner/OwnerReviews.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/profile', 
    name: 'owner-profile', 
    component: () => import('@/views/owner/OwnerProfile.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/settings', 
    name: 'owner-settings', 
    component: () => import('@/views/owner/OwnerSettings.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/chat', 
    name: 'owner-chat', 
    component: () => import('@/views/owner/OwnerChat.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/notifications', 
    name: 'owner-notifications', 
    component: () => import('@/views/owner/OwnerNotifications.vue'), 
    meta: { role: 'owner' } 
  },
  // Pribadi Owner Routes (Teacher-like features for pribadi owners)
  { 
    path: '/owner/schedule', 
    name: 'owner-schedule', 
    component: () => import('@/views/teacher/TeacherSchedule.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/students', 
    name: 'owner-students', 
    component: () => import('@/views/teacher/TeacherStudents.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/attendance', 
    name: 'owner-attendance', 
    component: () => import('@/views/teacher/TeacherAttendance.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/materials', 
    name: 'owner-materials', 
    component: () => import('@/views/teacher/TeacherMaterials.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/grades', 
    name: 'owner-grades', 
    component: () => import('@/views/teacher/TeacherGrades.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/performance', 
    name: 'owner-performance', 
    component: () => import('@/views/teacher/TeacherPerformance.vue'), 
    meta: { role: 'owner' } 
  },
  { 
    path: '/owner/quiz', 
    name: 'owner-quiz', 
    component: () => import('@/views/teacher/TeacherQuiz.vue'), 
    meta: { role: 'owner' } 
  },

  // Teacher Routes
  { 
    path: '/teacher/dashboard', 
    name: 'teacher-dashboard', 
    component: () => import('@/views/teacher/TeacherDashboard.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/schedule', 
    name: 'teacher-schedule', 
    component: () => import('@/views/teacher/TeacherSchedule.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/students', 
    name: 'teacher-students', 
    component: () => import('@/views/teacher/TeacherStudents.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/attendance', 
    name: 'teacher-attendance', 
    component: () => import('@/views/teacher/TeacherAttendance.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/materials', 
    name: 'teacher-materials', 
    component: () => import('@/views/teacher/TeacherMaterials.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/grades', 
    name: 'teacher-grades', 
    component: () => import('@/views/teacher/TeacherGrades.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/performance', 
    name: 'teacher-performance', 
    component: () => import('@/views/teacher/TeacherPerformance.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/finance', 
    name: 'teacher-finance', 
    component: () => import('@/views/teacher/TeacherFinance.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/profile', 
    name: 'teacher-profile', 
    component: () => import('@/views/teacher/TeacherProfile.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/chat', 
    name: 'teacher-chat', 
    component: () => import('@/views/teacher/TeacherChat.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/quiz', 
    name: 'teacher-quiz', 
    component: () => import('@/views/teacher/TeacherQuiz.vue'), 
    meta: { role: 'teacher' } 
  },
  { 
    path: '/teacher/notifications', 
    name: 'teacher-notifications', 
    component: () => import('@/views/teacher/TeacherNotifications.vue'), 
    meta: { role: 'teacher' } 
  },

  // Admin Routes
  { 
    path: '/admin/dashboard', 
    name: 'admin-dashboard', 
    component: () => import('@/views/admin/AdminDashboard.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/users', 
    name: 'admin-users', 
    component: () => import('@/views/admin/AdminUsers.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/les-places', 
    name: 'admin-les-places', 
    component: () => import('@/views/admin/AdminLesPlaces.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/moderation', 
    name: 'admin-moderation', 
    component: () => import('@/views/admin/AdminModeration.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/analytics', 
    name: 'admin-analytics', 
    component: () => import('@/views/admin/AdminAnalytics.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/categories', 
    name: 'admin-categories', 
    component: () => import('@/views/admin/AdminCategories.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/banners', 
    name: 'admin-banners', 
    component: () => import('@/views/admin/AdminBanners.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/settings', 
    name: 'admin-settings', 
    component: () => import('@/views/admin/AdminSettings.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/reports', 
    name: 'admin-reports', 
    component: () => import('@/views/admin/AdminReports.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/vouchers', 
    name: 'admin-vouchers', 
    component: () => import('@/views/admin/AdminVouchers.vue'), 
    meta: { role: 'admin' } 
  },
  { 
    path: '/admin/notifications', 
    name: 'admin-notifications', 
    component: () => import('@/views/admin/AdminNotifications.vue'), 
    meta: { role: 'admin' } 
  },

  // Catch-all redirect
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

// Helper function to get user role
async function getUserRole(userId) {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  return data?.role || 'student'
}

// Navigation Guard
router.beforeEach(async (to, from, next) => {
  // IMPORTANT: Let AuthCallback.vue handle OAuth redirects
  // Skip OAuth processing if going to /auth/callback
  if (to.path === '/auth/callback') {
    return next()
  }
  
  // Check for OAuth callback (hash contains access_token)
  // This handles cases where Google redirects with hash token
  if (window.location.hash && window.location.hash.includes('access_token')) {
    // Redirect to our callback handler to process the OAuth
    return next({ path: '/auth/callback' })
  }

  const { data: { user } } = await supabase.auth.getUser()
  
  // Allow public routes
  if (to.meta.public) {
    // If user is logged in
    if (user) {
      const role = await getUserRole(user.id)
      
      // Always redirect owner and teacher to their dashboard from public pages
      if (role === 'owner' || role === 'teacher' || role === 'admin') {
        return next({ name: `${role}-dashboard` })
      }
      
      // Only redirect students from login/register pages
      if (to.meta.authPage && role === 'student') {
        return next({ name: 'home' })
      }
    }
    return next()
  }

  // Protected routes - check authentication
  if (!user) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  // Check role authorization
  if (to.meta.role) {
    const role = await getUserRole(user.id)
    
    // Strict role check - user must have the correct role
    if (role !== to.meta.role) {
      // Redirect to appropriate dashboard based on user's actual role
      if (role === 'student') {
        return next({ name: 'home' })
      }
      return next({ name: `${role}-dashboard` })
    }
  }

  next()
})

export default router

