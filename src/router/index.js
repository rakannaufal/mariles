import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "@/lib/supabase";

// LAZY LOADING - Komponen dimuat hanya saat dibutuhkan

const routes = [
  // Public Routes
  {
    path: "/",
    name: "home",
    component: () => import("@/views/public/HomePage.vue"),
    meta: { public: true },
  },
  {
    path: "/search",
    name: "search",
    component: () => import("@/views/public/SearchPage.vue"),
    meta: { public: true },
  },
  {
    path: "/les/:id",
    name: "les-detail",
    component: () => import("@/views/public/LesDetailPage.vue"),
    meta: { public: true },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/public/LoginPage.vue"),
    meta: { public: true, authPage: true },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("@/views/public/RegisterPage.vue"),
    meta: { public: true, authPage: true },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: () => import("@/views/public/ForgotPasswordPage.vue"),
    meta: { public: true, authPage: true },
  },
  {
    path: "/update-password",
    name: "update-password",
    component: () => import("@/views/public/UpdatePasswordPage.vue"),
    meta: { public: true, recovery: true },
  },
  {
    path: "/faq",
    name: "faq",
    component: () => import("@/views/public/FAQPage.vue"),
    meta: { public: true },
  },
  {
    path: "/partner-guide",
    name: "partner-guide",
    component: () => import("@/views/public/PartnerGuidePage.vue"),
    meta: { public: true },
  },
  {
    path: "/about",
    name: "about",
    component: () => import("@/views/public/AboutPage.vue"),
    meta: { public: true },
  },
  {
    path: "/privacy-policy",
    name: "privacy-policy",
    component: () => import("@/views/public/PrivacyPolicyPage.vue"),
    meta: { public: true },
  },
  {
    path: "/terms",
    name: "terms",
    component: () => import("@/views/public/TermsPage.vue"),
    meta: { public: true },
  },
  {
    path: "/how-it-works",
    name: "how-it-works",
    component: () => import("@/views/public/HowItWorksPage.vue"),
    meta: { public: true },
  },
  {
    path: "/teacher-guide",
    name: "teacher-guide",
    component: () => import("@/views/public/TeacherGuidePage.vue"),
    meta: { public: true },
  },
  {
    path: "/contact",
    name: "contact",
    component: () => import("@/views/public/ContactPage.vue"),
    meta: { public: true },
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: () => import("@/views/public/AuthCallback.vue"),
    meta: { public: true },
  },

  // Student Routes - Using nested layout for persistent sidebar
  {
    path: "/student",
    component: () => import("@/layouts/StudentLayout.vue"),
    meta: { role: "student" },
    children: [
      {
        path: "dashboard",
        name: "student-dashboard",
        component: () =>
          import("@/views/student/dashboard/StudentDashboard.vue"),
      },
      {
        path: "bookings",
        name: "student-bookings",
        component: () =>
          import("@/views/student/dashboard/StudentBookings.vue"),
      },
      {
        path: "myclass",
        name: "student-myclass",
        component: () => import("@/views/student/StudentMyClass.vue"),
      },
      {
        path: "myclass/:bookingId",
        name: "student-myclass-detail",
        component: () => import("@/views/student/MyClassDetail.vue"),
      },
      {
        path: "quiz/:quizId",
        name: "student-quiz",
        component: () => import("@/views/student/StudentQuiz.vue"),
      },
      {
        path: "progress",
        name: "student-progress",
        component: () =>
          import("@/views/student/dashboard/StudentProgress.vue"),
      },
      {
        path: "payment/:bookingId",
        name: "student-payment",
        component: () => import("@/views/student/StudentPayment.vue"),
      },
      {
        path: "payment/success",
        name: "payment-success",
        component: () => import("@/views/student/PaymentSuccess.vue"),
      },
      {
        path: "payment/pending",
        name: "payment-pending",
        component: () => import("@/views/student/PaymentPending.vue"),
      },
      {
        path: "favorites",
        name: "student-favorites",
        component: () =>
          import("@/views/student/dashboard/StudentFavorites.vue"),
      },
      {
        path: "profile",
        name: "student-profile",
        component: () => import("@/views/student/dashboard/StudentProfile.vue"),
      },
      {
        path: "settings",
        name: "student-settings",
        component: () =>
          import("@/views/student/dashboard/StudentSettings.vue"),
      },
      {
        path: "chat",
        name: "student-chat",
        component: () => import("@/views/student/StudentChat.vue"),
      },
      {
        path: "forum",
        name: "student-forum",
        component: () => import("@/views/student/StudentForum.vue"),
      },
      {
        path: "notifications",
        name: "student-notifications",
        component: () => import("@/views/student/StudentNotifications.vue"),
      },
      {
        path: "refund",
        name: "student-refund",
        component: () => import("@/views/student/StudentRefund.vue"),
      },
    ],
  },

  // Owner Routes - Using nested layout for persistent sidebar
  {
    path: "/owner",
    component: () => import("@/layouts/OwnerLayout.vue"),
    meta: { role: "owner" },
    children: [
      {
        path: "dashboard",
        name: "owner-dashboard",
        component: () => import("@/views/owner/OwnerDashboard.vue"),
      },
      {
        path: "les",
        name: "owner-les",
        component: () => import("@/views/owner/OwnerLesManagement.vue"),
      },
      {
        path: "vouchers",
        name: "owner-vouchers",
        component: () => import("@/views/owner/OwnerVouchers.vue"),
      },
      {
        path: "programs",
        name: "owner-programs",
        component: () => import("@/views/owner/OwnerPrograms.vue"),
      },
      {
        path: "teachers",
        name: "owner-teachers",
        component: () => import("@/views/owner/OwnerTeachers.vue"),
      },
      {
        path: "registrations",
        name: "owner-registrations",
        component: () => import("@/views/owner/OwnerRegistrations.vue"),
      },
      {
        path: "statistics",
        name: "owner-statistics",
        component: () => import("@/views/owner/OwnerStatistics.vue"),
      },
      {
        path: "finance",
        name: "owner-finance",
        component: () => import("@/views/owner/OwnerFinance.vue"),
      },
      {
        path: "reviews",
        name: "owner-reviews",
        component: () => import("@/views/owner/OwnerReviews.vue"),
      },
      {
        path: "profile",
        name: "owner-profile",
        component: () => import("@/views/owner/OwnerProfile.vue"),
      },
      {
        path: "settings",
        name: "owner-settings",
        component: () => import("@/views/owner/OwnerSettings.vue"),
      },
      {
        path: "chat",
        name: "owner-chat",
        component: () => import("@/views/owner/OwnerChat.vue"),
      },
      {
        path: "notifications",
        name: "owner-notifications",
        component: () => import("@/views/owner/OwnerNotifications.vue"),
      },
      // Pribadi Owner Routes (Teacher-like features)
      {
        path: "schedule",
        name: "owner-schedule",
        component: () => import("@/views/teacher/TeacherSchedule.vue"),
      },
      {
        path: "students",
        name: "owner-students",
        component: () => import("@/views/teacher/TeacherStudents.vue"),
      },
      {
        path: "student-management",
        name: "owner-student-management",
        component: () => import("@/views/teacher/TeacherStudentManagement.vue"),
      },
      {
        path: "attendance",
        name: "owner-attendance",
        component: () => import("@/views/teacher/TeacherAttendance.vue"),
      },
      {
        path: "materials",
        name: "owner-materials",
        component: () => import("@/views/teacher/TeacherMaterials.vue"),
      },
      {
        path: "grades",
        name: "owner-grades",
        component: () => import("@/views/teacher/TeacherGrades.vue"),
      },
      {
        path: "performance",
        name: "owner-performance",
        component: () => import("@/views/teacher/TeacherPerformance.vue"),
      },
      {
        path: "quiz",
        name: "owner-quiz",
        component: () => import("@/views/teacher/TeacherQuiz.vue"),
      },
    ],
  },

  // Teacher Routes - Using nested layout for persistent sidebar
  {
    path: "/teacher",
    component: () => import("@/layouts/TeacherLayout.vue"),
    meta: { role: "teacher" },
    children: [
      {
        path: "dashboard",
        name: "teacher-dashboard",
        component: () => import("@/views/teacher/TeacherDashboard.vue"),
      },
      {
        path: "schedule",
        name: "teacher-schedule",
        component: () => import("@/views/teacher/TeacherSchedule.vue"),
      },
      {
        path: "students",
        name: "teacher-students",
        component: () => import("@/views/teacher/TeacherStudents.vue"),
      },
      {
        path: "student-management",
        name: "teacher-student-management",
        component: () => import("@/views/teacher/TeacherStudentManagement.vue"),
      },
      {
        path: "attendance",
        name: "teacher-attendance",
        component: () => import("@/views/teacher/TeacherAttendance.vue"),
      },
      {
        path: "materials",
        name: "teacher-materials",
        component: () => import("@/views/teacher/TeacherMaterials.vue"),
      },
      {
        path: "grades",
        name: "teacher-grades",
        component: () => import("@/views/teacher/TeacherGrades.vue"),
      },
      {
        path: "performance",
        name: "teacher-performance",
        component: () => import("@/views/teacher/TeacherPerformance.vue"),
      },
      {
        path: "finance",
        name: "teacher-finance",
        component: () => import("@/views/teacher/TeacherFinance.vue"),
      },
      {
        path: "profile",
        name: "teacher-profile",
        component: () => import("@/views/teacher/TeacherProfile.vue"),
      },
      {
        path: "chat",
        name: "teacher-chat",
        component: () => import("@/views/teacher/TeacherChat.vue"),
      },
      {
        path: "quiz",
        name: "teacher-quiz",
        component: () => import("@/views/teacher/TeacherQuiz.vue"),
      },
      {
        path: "notifications",
        name: "teacher-notifications",
        component: () => import("@/views/teacher/TeacherNotifications.vue"),
      },
    ],
  },

  // Admin Routes
  {
    path: "/admin/dashboard",
    name: "admin-dashboard",
    component: () => import("@/views/admin/AdminDashboard.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/users",
    name: "admin-users",
    component: () => import("@/views/admin/AdminUsers.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/les-places",
    name: "admin-les-places",
    component: () => import("@/views/admin/AdminLesPlaces.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/moderation",
    name: "admin-moderation",
    component: () => import("@/views/admin/AdminModeration.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/analytics",
    name: "admin-analytics",
    component: () => import("@/views/admin/AdminAnalytics.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/categories",
    name: "admin-categories",
    component: () => import("@/views/admin/AdminCategories.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/banners",
    name: "admin-banners",
    component: () => import("@/views/admin/AdminBanners.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/settings",
    name: "admin-settings",
    component: () => import("@/views/admin/AdminSettings.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/reports",
    name: "admin-reports",
    component: () => import("@/views/admin/AdminReports.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/vouchers",
    name: "admin-vouchers",
    component: () => import("@/views/admin/AdminVouchers.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/finance",
    name: "admin-finance",
    component: () => import("@/views/admin/AdminFinance.vue"),
    meta: { role: "admin" },
  },
  {
    path: "/admin/notifications",
    name: "admin-notifications",
    component: () => import("@/views/admin/AdminNotifications.vue"),
    meta: { role: "admin" },
  },

  // Catch-all redirect
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

// ROLE CACHING - Menghindari query berulang setiap navigasi
let cachedRole = null;
let cachedUserId = null;

// Helper function to get user role WITH CACHE
async function getUserRole(userId) {
  // Return cached role if same user
  if (cachedUserId === userId && cachedRole) {
    return cachedRole;
  }

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  // Cache the result
  cachedUserId = userId;
  cachedRole = data?.role || "student";

  return cachedRole;
}

// Function to clear cache (call on logout)
export function clearRoleCache() {
  cachedRole = null;
  cachedUserId = null;
}

// Navigation Guard
router.beforeEach(async (to, from, next) => {
  // IMPORTANT: Let AuthCallback.vue handle OAuth redirects
  // Skip OAuth processing if going to /auth/callback
  if (to.path === "/auth/callback") {
    return next();
  }

  // Check for OAuth callback (hash contains access_token)
  // This handles cases where Google redirects with hash token
  if (window.location.hash && window.location.hash.includes("access_token")) {
    // Redirect to our callback handler to process the OAuth
    return next({ path: "/auth/callback" });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow public routes
  if (to.meta.public) {
    // If user is logged in
    if (user) {
      const role = await getUserRole(user.id);
      
      // RESTRICT HOMEPAGE for Owner/Teacher/Admin
      // User requested that Owner/Teacher cannot access homepage, redirect to dashboard
      if (to.path === '/' && role !== 'student') {
         return next({ name: `${role}-dashboard` });
      }

      // HANYA redirect dari halaman auth (login/register)
      if (
        (role === "owner" || role === "teacher" || role === "admin") &&
        to.meta.authPage
      ) {
        return next({ name: `${role}-dashboard` });
      }

      // Only redirect students from login/register pages
      if (to.meta.authPage && role === "student") {
        return next({ name: "home" });
      }
    }
    return next();
  }

  // Protected routes - check authentication
  if (!user) {
    return next({ name: "login", query: { redirect: to.fullPath } });
  }

  // Check role authorization
  if (to.meta.role) {
    const role = await getUserRole(user.id);

    // Strict role check - user must have the correct role
    if (role !== to.meta.role) {
      // Redirect to appropriate dashboard based on user's actual role
      if (role === "student") {
        return next({ name: "home" });
      }
      return next({ name: `${role}-dashboard` });
    }
  }

  next();
});

export default router;
