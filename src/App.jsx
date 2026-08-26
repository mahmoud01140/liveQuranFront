import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import useAuthStore from './store/authStore';

// Shared
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ScrollToTop from './components/shared/ScrollToTop';

// Pages — lazy loaded (code-split per route)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Onboarding
const RegistrationTypePage = lazy(() => import('./pages/onboarding/RegistrationTypePage'));
const SurveyPage = lazy(() => import('./pages/onboarding/SurveyPage'));
const WrittenExamPage = lazy(() => import('./pages/onboarding/WrittenExamPage'));
const OralExamPage = lazy(() => import('./pages/onboarding/OralExamPage'));
const ResultPage = lazy(() => import('./pages/onboarding/ResultPage'));
const WaitingApprovalPage = lazy(() => import('./pages/onboarding/WaitingApprovalPage'));

// Student
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const MyGroupPage = lazy(() => import('./pages/student/MyGroupPage'));
const LiveClassPage = lazy(() => import('./pages/student/LiveClassPage'));
const CurriculumPage = lazy(() => import('./pages/student/CurriculumPage'));
const ExamsPage = lazy(() => import('./pages/student/ExamsPage'));
const ProgressPage = lazy(() => import('./pages/student/ProgressPage'));
const HomeworkPage = lazy(() => import('./pages/student/HomeworkPage'));
const TakeExamPage = lazy(() => import('./pages/student/TakeExamPage'));
const DiscussionPage = lazy(() => import('./pages/student/DiscussionPage'));
const StudentResourcesPage = lazy(() => import('./pages/student/StudentResourcesPage'));
const LessonPage = lazy(() => import('./pages/student/LessonPage'));
const QuranViewerPage = lazy(() => import('./pages/student/QuranViewerPage'));
const SubscriptionPage = lazy(() => import('./pages/student/SubscriptionPage'));

// Teacher
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const MyGroupsPage = lazy(() => import('./pages/teacher/MyGroupsPage'));
const LiveBroadcastPage = lazy(() => import('./pages/teacher/LiveBroadcastPage'));
const TeacherReviewCenterPage = lazy(() => import('./pages/teacher/TeacherReviewCenterPage'));
const CreateExamPage = lazy(() => import('./pages/teacher/CreateExamPage'));
const TeacherDailyReviewPage = lazy(() => import('./pages/teacher/TeacherDailyReviewPage'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'));
const GroupsManagement = lazy(() => import('./pages/admin/GroupsManagement'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const AdminLivePage = lazy(() => import('./pages/admin/AdminLivePage'));
const AdminGroupCurriculumPage = lazy(() => import('./pages/admin/AdminGroupCurriculumPage'));
const AdminExamResultsPage = lazy(() => import('./pages/admin/AdminExamResultsPage'));
const AdminDailyReviewPage = lazy(() => import('./pages/admin/AdminDailyReviewPage'));
const AdminResourcesPage = lazy(() => import('./pages/admin/AdminResourcesPage'));

// Parent
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));

export default function App() {
  const { checkAuth, isCheckingAuth, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white">
        <LoadingSpinner size="lg" text="جارٍ التحقق من الجلسة..." />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size="md" text="جارٍ التحميل..." />
          </div>
        }>
          <Routes location={location} key={location.pathname}>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={user ? <Navigate to={getDashboardPath(user)} /> : <LoginPage />} />
            <Route path="/register" element={user ? <Navigate to={getDashboardPath(user)} /> : <RegisterPage />} />
            <Route path="/forgot-password" element={user ? <Navigate to={getDashboardPath(user)} /> : <ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={user ? <Navigate to={getDashboardPath(user)} /> : <ResetPasswordPage />} />

            {/* Waiting approval — user took exam but awaiting review */}
            <Route path="/waiting-approval" element={
              <ProtectedRoute>
                <WaitingApprovalPage />
              </ProtectedRoute>
            } />

            {/* Onboarding — requires auth, guarded against re-entry if exam taken */}
            <Route path="/onboarding/type" element={<ProtectedRoute><RegistrationTypePage /></ProtectedRoute>} />
            <Route path="/onboarding/survey" element={<ProtectedRoute><SurveyPage /></ProtectedRoute>} />
            <Route path="/onboarding/written-exam" element={<ProtectedRoute><WrittenExamPage /></ProtectedRoute>} />
            <Route path="/onboarding/oral-exam" element={<ProtectedRoute><OralExamPage /></ProtectedRoute>} />
            <Route path="/onboarding/result" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />

            {/* Student routes */}
            <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/group" element={<ProtectedRoute role="student"><MyGroupPage /></ProtectedRoute>} />
            <Route path="/student/live" element={<ProtectedRoute role="student"><LiveClassPage /></ProtectedRoute>} />
            <Route path="/student/curriculum" element={<ProtectedRoute role="student"><CurriculumPage /></ProtectedRoute>} />
            <Route path="/student/exams" element={<ProtectedRoute role="student"><ExamsPage /></ProtectedRoute>} />
            <Route path="/student/progress" element={<ProtectedRoute role="student"><ProgressPage /></ProtectedRoute>} />
            <Route path="/student/subscription" element={<ProtectedRoute role="student"><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/student/homework" element={<ProtectedRoute role="student"><Navigate to="/student/curriculum" replace /></ProtectedRoute>} />
            <Route path="/student/exams/:examId/take" element={<ProtectedRoute role="student"><TakeExamPage /></ProtectedRoute>} />
            <Route path="/student/discussion" element={<ProtectedRoute role="student"><DiscussionPage /></ProtectedRoute>} />
            <Route path="/student/daily-tracker" element={<ProtectedRoute role="student"><Navigate to="/student/exams" replace /></ProtectedRoute>} />
            <Route path="/student/resources" element={<ProtectedRoute role="student"><StudentResourcesPage /></ProtectedRoute>} />
            <Route path="/student/quran" element={<ProtectedRoute role="student"><QuranViewerPage /></ProtectedRoute>} />
            <Route path="/student/lessons/:lessonId" element={<ProtectedRoute role="student"><LessonPage /></ProtectedRoute>} />

            {/* Teacher routes */}
            <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/groups" element={<ProtectedRoute role="teacher"><MyGroupsPage /></ProtectedRoute>} />
            <Route path="/teacher/broadcast" element={<ProtectedRoute role="teacher"><LiveBroadcastPage /></ProtectedRoute>} />
            <Route path="/teacher/review" element={<ProtectedRoute role="teacher"><TeacherReviewCenterPage /></ProtectedRoute>} />
            <Route path="/teacher/homework" element={<ProtectedRoute role="teacher"><Navigate to="/teacher/review" replace /></ProtectedRoute>} />
            <Route path="/teacher/recordings" element={<ProtectedRoute role="teacher"><Navigate to="/teacher/review" replace /></ProtectedRoute>} />
            <Route path="/teacher/create-exam" element={<ProtectedRoute role="teacher"><CreateExamPage /></ProtectedRoute>} />
            <Route path="/teacher/discussion" element={<ProtectedRoute role="teacher"><DiscussionPage /></ProtectedRoute>} />
            <Route path="/teacher/daily-review" element={<ProtectedRoute role="teacher"><TeacherDailyReviewPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/payments" element={<ProtectedRoute role="admin"><AdminPaymentsPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="admin"><UsersManagement /></ProtectedRoute>} />
            <Route path="/admin/groups" element={<ProtectedRoute role="admin"><GroupsManagement /></ProtectedRoute>} />
            <Route path="/admin/assign" element={<ProtectedRoute role="admin"><Navigate to="/admin/groups" replace /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute role="admin"><ReportsPage /></ProtectedRoute>} />
            <Route path="/admin/live" element={<ProtectedRoute role="admin"><AdminLivePage /></ProtectedRoute>} />
            <Route path="/admin/groups/:groupId/curriculum" element={<ProtectedRoute role="admin"><AdminGroupCurriculumPage /></ProtectedRoute>} />
            <Route path="/admin/exams/:examId/results" element={<ProtectedRoute role="admin"><AdminExamResultsPage /></ProtectedRoute>} />
            <Route path="/admin/discussions" element={<ProtectedRoute role="admin"><DiscussionPage /></ProtectedRoute>} />
            <Route path="/admin/daily-review" element={<ProtectedRoute role="admin"><AdminDailyReviewPage /></ProtectedRoute>} />
            <Route path="/admin/resources" element={<ProtectedRoute role="admin"><AdminResourcesPage /></ProtectedRoute>} />

            {/* Parent routes */}
            <Route path="/parent" element={<ProtectedRoute role="parent"><ParentDashboard /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}


function getDashboardPath(user) {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'teacher') return '/teacher';
  if (user.role === 'parent') return '/parent';

  // Student flow: check if placement exam was taken
  if (user.placementExamTaken) {
    // Exam was taken — go to dashboard if level assigned, or waiting page
    if (user.assignedLevel) return '/student';
    return '/waiting-approval';
  }

  // New user — hasn't taken exam yet
  if (!user.isVerified || !user.assignedLevel) return '/onboarding/type';
  return '/student';
}
