import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, role }) {
  const { user, isCheckingAuth } = useAuthStore();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Role check — admin can access everything
  if (role && user.role !== role && user.role !== 'admin') {
    const paths = { student: '/student', teacher: '/teacher', admin: '/admin', parent: '/parent' };
    return <Navigate to={paths[user.role] || '/'} replace />;
  }

  // Onboarding guard: if user already took placement exam,
  // block access to onboarding routes (except result page)
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const isResultRoute = location.pathname === '/onboarding/result';

  if (isOnboardingRoute && !isResultRoute && user.placementExamTaken) {
    // User already took the exam — redirect appropriately
    if (user.assignedLevel) {
      return <Navigate to="/student" replace />;
    } else {
      return <Navigate to="/waiting-approval" replace />;
    }
  }

  return children;
}
