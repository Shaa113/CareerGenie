import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { apiCall } from './utils/api';
import { logout, syncUser } from './store/authSlice';

// Common Components
import Navbar from './components/common/Navbar';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import JobBoard from './pages/JobBoard';
import JobDetails from './pages/JobDetails';
import StudentDashboard from './pages/StudentDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect if role is unauthorized
    if (user.role === 'student') return <Navigate to="/dashboard/student" replace />;
    if (user.role === 'recruiter') return <Navigate to="/dashboard/recruiter" replace />;
    if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

const AuthBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [ready, setReady] = useState(!token);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!token) {
        setReady(true);
        return;
      }

      try {
        const user = await apiCall('/auth/me');
        if (!cancelled) {
          dispatch(syncUser(user));
        }
      } catch {
        if (!cancelled) {
          dispatch(logout());
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [dispatch, token]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          Restoring session...
        </div>
      </div>
    );
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthBootstrap>
        <div className="min-h-screen flex flex-col text-slate-100">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/jobs" element={<JobBoard />} />
              <Route path="/jobs/:id" element={<JobDetails />} />

              {/* Student Protected Routes */}
              <Route 
                path="/dashboard/student" 
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/resume" 
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <ResumeAnalyzer />
                  </ProtectedRoute>
                } 
              />

              {/* Recruiter Protected Routes */}
              <Route 
                path="/dashboard/recruiter" 
                element={
                  <ProtectedRoute allowedRoles={['recruiter']}>
                    <RecruiterDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Admin Protected Routes */}
              <Route 
                path="/dashboard/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthBootstrap>
    </Router>
  );
}

export default App;
