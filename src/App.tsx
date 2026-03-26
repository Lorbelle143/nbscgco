import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { ToastProvider } from './contexts/ToastContext';
import AdminLogin from './pages/AdminLogin';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import InventoryForm from './pages/InventoryForm';
import ForgotPassword from './pages/ForgotPassword';
import EditProfile from './pages/EditProfile';
import MentalHealthAssessment from './pages/MentalHealthAssessment';
import NotFound from './pages/NotFound';
import LoadingSpinner from './components/LoadingSpinner';
import SessionWarningModal from './components/SessionWarningModal';

function App() {
  const { user, isAdmin, sessionChecked, initializeAuth } = useAuthStore();

  useEffect(() => {
    if (!sessionChecked) {
      initializeAuth();
    }
  }, []); // Only run once on mount

  // Show loading screen only until session is first checked
  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" color="white" text="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <SessionWarningModal />
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
          <Route path="/" element={<Navigate to={user ? (isAdmin ? "/admin" : "/dashboard") : "/login"} replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
