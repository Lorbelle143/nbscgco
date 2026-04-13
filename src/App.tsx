import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './contexts/ToastContext';
import LoadingSpinner from './components/LoadingSpinner';
import SessionWarningModal from './components/SessionWarningModal';
import OfflineBanner from './components/OfflineBanner';

// Lazy-load all pages — reduces initial bundle size
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const InventoryForm = lazy(() => import('./pages/InventoryForm'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const MentalHealthAssessment = lazy(() => import('./pages/MentalHealthAssessment'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Home = lazy(() => import('./pages/Home'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <LoadingSpinner size="xl" color="white" text="Loading..." />
    </div>
  );
}

function App() {
  const { user, isAdmin, sessionChecked, initializeAuth } = useAuthStore();

  useEffect(() => {
    if (!sessionChecked) {
      initializeAuth();
    }
  }, []);

  if (!sessionChecked) {
    return <PageLoader />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <OfflineBanner />
        <SessionWarningModal />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
            <Route path="/admin-login" element={!user ? <AdminLogin /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
            <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={user && !isAdmin ? <StudentDashboard /> : <Navigate to="/login" replace />} />
            <Route path="/edit-profile" element={user && !isAdmin ? <EditProfile /> : <Navigate to="/login" replace />} />
            <Route path="/mental-health-assessment" element={user && !isAdmin ? <MentalHealthAssessment /> : <Navigate to="/login" replace />} />
            <Route path="/admin" element={user && isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />
            <Route path="/inventory-form" element={user ? <InventoryForm /> : <Navigate to="/login" replace />} />
            <Route path="/" element={user ? <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace /> : <Home />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
